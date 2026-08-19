// İstasyon ekranının veri katmanı.
//
// Ekranın birimi adisyon değil TUR: her kaydetme mutfağa ayrı bir kart olarak
// düşüyor. Adisyon bazlı çalışılsaydı iki saat önce girilen ürünle az önce
// söylenen aynı kartta dururdu ve tezgâh "yeni geleni" ayırt edemezdi.
//
// Kalemin hangi tezgâha ait olduğu ürünün istasyonundan geliyor; eşleme mutfak
// fişiyle aynı haritadan okunuyor ki fişe düşen ürünle ekrana düşen ürün
// birbirini tutsun.

import { supabase } from "./supabase";
import { acikOturum } from "./oturum";
import { urunIstasyonlari } from "./yazicilar";
import type { AdisyonTipi } from "./adisyonlar";

export type MutfakKalemi = {
  id: number;
  ad: string;
  porsiyon?: string;
  secimler: string[];
  adet: number;
  not?: string;
  /** Dolu ise kalem hazırlanmış; ekranda "hazırlananlar" tarafına geçiyor. */
  hazirAt?: string;
};

/** Bir tur = mutfağa tek seferde düşen sipariş; ekranda tek kart. */
export type MutfakKarti = {
  turId: number;
  siparisNo?: number;
  /** Turun kaydedildiği an; kartın sayacı bunu sayıyor. */
  olusturma: string;
  masa: string;
  tip: AdisyonTipi;
  adisyonNo?: number;
  garson?: string;
  kisiSayisi?: number;
  /** Adisyonun geneline yazılan not — "acele", "çocuk var" gibi. */
  not?: string;
  kalemler: MutfakKalemi[];
};

const ALANLAR = `id, siparis_no, olusturma,
       garson:personel!turlar_garson_id_fkey (ad),
       adisyon:adisyonlar!inner (adisyon_no, masa_ad, tip, ad, kisi_sayisi, not_metni, durum,
                                 masa:masalar (ad)),
       adisyon_kalemleri (id, urun_id, ad, porsiyon, secimler, adet, durum, not_metni, hazir_at)`;

/**
 * Ekrana düşecek kartlar. `hazirlananlar` false ise tezgâhta bekleyenler,
 * true ise bitmiş olanlar geliyor — ikisi aynı sorgudan çıkıyor, tek fark
 * kalemin hazır olup olmadığı.
 */
export async function kartlariGetir(
  istasyonId: number,
  hazirlananlar = false
): Promise<MutfakKarti[]> {
  const [{ data }, harita] = await Promise.all([
    supabase
      .from("turlar")
      .select(ALANLAR)
      .eq("adisyon.durum", "acik")
      .order("olusturma", { ascending: false })
      .limit(hazirlananlar ? 40 : 200),
    urunIstasyonlari(),
  ]);

  const kartlar: MutfakKarti[] = [];
  for (const t of ((data as any[]) ?? [])) {
    const kalemler = ((t.adisyon_kalemleri as any[]) ?? [])
      // İkram da hazırlanıyor, iptal edilen hazırlanmıyor.
      .filter((k) => (k.durum ?? "normal") !== "iptal")
      // İstasyonu olmayan ürün hiçbir tezgâha düşmüyor: kola için mutfağın
      // ekranında satır çıkmasın.
      .filter((k) => k.urun_id && harita.get(k.urun_id) === istasyonId)
      .filter((k) => (hazirlananlar ? k.hazir_at : !k.hazir_at))
      .map(
        (k): MutfakKalemi => ({
          id: k.id,
          ad: k.ad,
          porsiyon: k.porsiyon ?? undefined,
          secimler: Array.isArray(k.secimler) ? k.secimler : [],
          adet: Number(k.adet),
          not: k.not_metni ?? undefined,
          hazirAt: k.hazir_at ?? undefined,
        })
      );

    if (!kalemler.length) continue;

    kartlar.push({
      turId: t.id,
      siparisNo: t.siparis_no ?? undefined,
      olusturma: t.olusturma,
      // Adisyona serbest ad verilmişse ("Ahmet Bey") o geçerli, yoksa masanın
      // adı. masa_ad eski sütun; masa bağı masa_id'ye taşındığından beri yeni
      // adisyonlarda boş kalıyor, yalnız eski kayıtlar için bakılıyor.
      masa: t.adisyon?.ad || t.adisyon?.masa?.ad || t.adisyon?.masa_ad || "—",
      tip: (t.adisyon?.tip ?? "masa") as AdisyonTipi,
      adisyonNo: t.adisyon?.adisyon_no ?? undefined,
      garson: t.garson?.ad ?? undefined,
      kisiSayisi: t.adisyon?.kisi_sayisi ?? undefined,
      not: t.adisyon?.not_metni ?? undefined,
      kalemler,
    });
  }

  // Bekleyenler en eskiden yeniye: en çok bekleyen tezgâhın önünde dursun.
  // Hazırlananlarda tersi geçerli, en son biten üstte.
  return hazirlananlar ? kartlar : kartlar.reverse();
}

/** Hazır işaretleme. Tek kalem de olabilir, kartın tamamı da. */
export async function hazirYap(kalemIdler: number[]) {
  if (!kalemIdler.length) return;
  const { error } = await supabase
    .from("adisyon_kalemleri")
    .update({ hazir_at: new Date().toISOString(), hazir_kisi: acikOturum()?.id ?? null })
    .in("id", kalemIdler);
  if (error) throw new Error("Kalem hazır işaretlenemedi.");
}

/**
 * Geri alma. Mutfakta hazır düğmesine onay koymuyoruz — eldivenli elle çalışan
 * biri her seferinde iki kez dokunmak istemiyor. Yanlışlıkla basılanın karşılığı
 * onay değil, bu.
 */
export async function hazirGeriAl(kalemIdler: number[]) {
  if (!kalemIdler.length) return;
  const { error } = await supabase
    .from("adisyon_kalemleri")
    .update({ hazir_at: null, hazir_kisi: null })
    .in("id", kalemIdler);
  if (error) throw new Error("Kalem geri alınamadı.");
}

/**
 * Canlı bağlantı: kalem eklenince, iptal edilince ya da başka bir tezgâhta
 * hazır işaretlenince ekran kendini tazeliyor. Yoklamayla beklenseydi garson
 * siparişi kaydettikten sonra mutfak bir tur boyu boş ekrana bakardı.
 */
export function mutfagiDinle(haberVer: () => void) {
  const kanal = supabase
    .channel("istasyon-ekrani")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "adisyon_kalemleri" },
      () => haberVer()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(kanal);
  };
}
