import { supabase } from "./supabase";
import { fisPaketi } from "./fis";
import { isletmeAdi } from "./isletmeAyarlari";
import { baglantiAdi, type Yazici } from "./yazicilar";

/**
 * Kasa köprüsünün durumu.
 *
 * Köprü kasadaki bilgisayarda sessizce çalışıyor: açık mı, hangi kasada, en son
 * ne zaman haber verdi — hepsi kendi yazdığı satırdan okunuyor. Yazıcının
 * durumu ise ayrı bir yerden değil kuyruğun kendisinden çıkıyor; son denemenin
 * sonucu zaten orada duruyor, yazıcıya ikinci kez sormaya gerek yok.
 */

/**
 * Bu süre boyunca haber gelmezse köprü kapalı sayılıyor. Haber aralığı 20 saniye:
 * sınır bir kaçan haberi tolere edecek kadar geniş, kapanmayı geç fark
 * ettirmeyecek kadar dar.
 */
const SESSIZLIK_SINIRI = 45_000;

export type KopruCihazi = {
  cihaz: string;
  surum: string;
  kisi: string;
  baslangic: string;
  sonGorulme: string;
  calisiyor: boolean;
};

export async function koprulariGetir(): Promise<KopruCihazi[]> {
  const { data, error } = await supabase
    .from("kopru_cihazlari")
    .select("cihaz, surum, kisi, baslangic, son_gorulme")
    .order("son_gorulme", { ascending: false });
  if (error) throw new Error("Köprü durumu okunamadı.");

  const simdi = Date.now();
  return ((data as any[]) ?? []).map((k) => ({
    cihaz: k.cihaz,
    surum: k.surum ?? "",
    kisi: k.kisi ?? "",
    baslangic: k.baslangic,
    sonGorulme: k.son_gorulme,
    calisiyor: simdi - new Date(k.son_gorulme).getTime() < SESSIZLIK_SINIRI,
  }));
}

export type YaziciDurumu = {
  yaziciId: number;
  bekleyen: number;
  sonDurum: "basildi" | "basarisiz" | null;
  sonZaman: string | null;
  sonHata: string | null;
  /** Köprünün son yoklaması: yazıcıya ulaşılabiliyor mu. Köprü kapalıysa boş. */
  cevrimici: boolean | null;
  ulasimHatasi: string | null;
};

const bosDurum = (yaziciId: number): YaziciDurumu => ({
  yaziciId,
  bekleyen: 0,
  sonDurum: null,
  sonZaman: null,
  sonHata: null,
  cevrimici: null,
  ulasimHatasi: null,
});

/**
 * Her yazıcının kuyruktaki hâli: kaç fiş bekliyor ve son deneme ne oldu.
 * Bekleyen fiş birikmesi köprünün kapalı olduğunun ikinci işareti.
 */
export async function yaziciDurumlari(): Promise<Map<number, YaziciDurumu>> {
  const [{ data, error }, { data: yoklama }] = await Promise.all([
    supabase
      .from("yazdirma_kuyrugu")
      .select("yazici_id, durum, hata, olusturma, basilma")
      .in("durum", ["bekliyor", "basildi", "basarisiz"])
      .order("olusturma", { ascending: false })
      .limit(300),
    supabase
      .from("yazici_durumlari")
      .select("yazici_id, cevrimici, hata, son_kontrol")
      .order("son_kontrol", { ascending: false }),
  ]);
  if (error) throw new Error("Yazıcı durumu okunamadı.");

  const durumlar = new Map<number, YaziciDurumu>();

  // Yoklama sonucu köprüden geliyor; eskimişse gösterilmiyor, o köprü kapanmış
  // olabilir ve dünkü "çevrimiçi" bugün yanlış bilgi olur.
  for (const y of ((yoklama as any[]) ?? [])) {
    if (Date.now() - new Date(y.son_kontrol).getTime() > SESSIZLIK_SINIRI + 30_000) continue;
    if (durumlar.has(y.yazici_id)) continue;

    durumlar.set(y.yazici_id, {
      ...bosDurum(y.yazici_id),
      cevrimici: y.cevrimici,
      ulasimHatasi: y.hata ?? null,
    });
  }

  for (const s of ((data as any[]) ?? [])) {
    if (!s.yazici_id) continue;

    const kayit = durumlar.get(s.yazici_id) ?? bosDurum(s.yazici_id);

    if (s.durum === "bekliyor") {
      kayit.bekleyen += 1;
    } else if (!kayit.sonDurum) {
      // Liste yeniden eskiye sıralı; ilk rastlanan sonuç en son denemedir.
      kayit.sonDurum = s.durum;
      kayit.sonZaman = s.basilma ?? s.olusturma;
      kayit.sonHata = s.hata ?? null;
    }

    durumlar.set(s.yazici_id, kayit);
  }

  return durumlar;
}

/** Deneme fişinin içeriği — kâğıtta neyin denendiği yazsın. */
function denemeFisi(yazici: Yazici) {
  return fisPaketi({
    tip: "adisyon",
    puntolar: { isletme_adi: 26, genel: 20, toplam: 24 },
    satirlar: [
      { t: "orta", m: isletmeAdi() || "Garso", alan: "isletme_adi", kalin: true },
      { t: "orta", m: "DENEME FİŞİ", alan: "toplam", kalin: true },
      { t: "cizgi" },
      { t: "ikiUc", sol: "Yazıcı", sag: yazici.ad, alan: "genel" },
      { t: "ikiUc", sol: "Bağlantı", sag: baglantiAdi(yazici.baglanti), alan: "genel" },
      { t: "ikiUc", sol: "Kâğıt", sag: `${yazici.kagitGenislik} mm`, alan: "genel" },
      { t: "ikiUc", sol: "Saat", sag: new Date().toLocaleTimeString("tr-TR"), alan: "genel" },
      { t: "cizgi" },
      { t: "orta", m: "Bu fişi okuyabiliyorsanız yazıcı hazır.", alan: "genel" },
    ],
  });
}

/**
 * Deneme fişini sıraya koyar ve köprünün onu basmasını bekler. Kuyruktan geçmesi
 * önemli: gerçek fişin gittiği yolun aynısı deneniyor, ayrı bir yol açılsaydı
 * "denemede çalıştı ama fiş çıkmıyor" durumu ortaya çıkardı.
 */
export async function yaziciyiDene(yazici: Yazici): Promise<{ tamam: boolean; mesaj: string }> {
  const { data, error } = await supabase
    .from("yazdirma_kuyrugu")
    .insert({ tip: "deneme", yazici_id: yazici.id, icerik: denemeFisi(yazici) })
    .select("id")
    .single();
  if (error) throw new Error("Deneme fişi sıraya konulamadı.");

  const id = (data as any).id as number;

  // Köprü açıksa fiş saniyeler içinde basılıyor; yirmi saniye sonunda hâlâ
  // bekliyorsa kasadaki program çalışmıyor demektir.
  for (let deneme = 0; deneme < 20; deneme++) {
    await bekle(1000);

    const { data: satir } = await supabase
      .from("yazdirma_kuyrugu")
      .select("durum, hata")
      .eq("id", id)
      .single();

    const durum = (satir as any)?.durum;
    if (durum === "basildi") return { tamam: true, mesaj: "Deneme fişi basıldı." };
    if (durum === "basarisiz")
      return { tamam: false, mesaj: (satir as any)?.hata || "Yazıcı basamadı." };
  }

  return {
    tamam: false,
    mesaj: "Fiş sırada bekliyor — kasadaki köprü çalışmıyor olabilir.",
  };
}

const bekle = (ms: number) => new Promise((t) => setTimeout(t, ms));
