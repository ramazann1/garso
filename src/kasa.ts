import { nakitGiderToplami } from "./masraflar";
import { supabase } from "./supabase";

export type Vardiya = {
  id: number;
  acan: string;
  acilis: string;
  acilisTutar: number;
  acilisNot: string;
  kapatan: string;
  kapanis: string | null;
  sayilanTutar: number | null;
  kapanisNot: string;
};

export type Hareket = {
  id: number;
  tip: "giris" | "cikis";
  tutar: number;
  aciklama: string;
  kisi: string;
  olusturma: string;
};

/** Açık vardiyanın o anki tablosu — kasa penceresi bunu gösteriyor. */
export type KasaDurumu = {
  vardiya: Vardiya | null;
  hareketler: Hareket[];
  /** Vardiya açıldıktan sonra alınan, kasaya giren (nakit) tahsilatlar. */
  nakitSatis: number;
  giris: number;
  cikis: number;
  /** Vardiya boyunca nakit ödenen giderler; kasadan çıkmış sayılıyor. */
  nakitGider: number;
  /** Kasada olması gereken: açılış + nakit satış + giriş − çıkış − nakit gider. */
  beklenen: number;
};

const ALANLAR = `id, acilis, acilis_tutar, acilis_not, kapanis, sayilan_tutar, kapanis_not,
                 acan:acan_id (ad), kapatan:kapatan_id (ad)`;

function vardiyayaCevir(s: any): Vardiya {
  return {
    id: s.id,
    acan: s.acan?.ad ?? "",
    acilis: s.acilis,
    acilisTutar: Number(s.acilis_tutar ?? 0),
    acilisNot: s.acilis_not ?? "",
    kapatan: s.kapatan?.ad ?? "",
    kapanis: s.kapanis,
    sayilanTutar: s.sayilan_tutar == null ? null : Number(s.sayilan_tutar),
    kapanisNot: s.kapanis_not ?? "",
  };
}

export async function acikVardiya(): Promise<Vardiya | null> {
  const { data } = await supabase
    .from("kasa_vardiyalari")
    .select(ALANLAR)
    .is("kapanis", null)
    .maybeSingle();
  return data ? vardiyayaCevir(data) : null;
}

// Kasaya hangi ödeme tipinin para koyduğu ayarda işaretli; nakit satış toplamı
// o tiplerin adlarına bakıyor. Tahsilat satırı ödeme tipinin kimliğini değil
// satış anındaki adını taşıyor — tip sonradan silinse bile geçmiş bozulmasın.
async function kasayaGirenTipler(): Promise<string[]> {
  const { data } = await supabase
    .from("odeme_tipleri")
    .select("ad")
    .eq("kasaya_girer", true);
  return ((data as any[]) ?? []).map((t) => t.ad);
}

export async function kasaDurumu(): Promise<KasaDurumu> {
  const vardiya = await acikVardiya();
  if (!vardiya) {
    return {
      vardiya: null,
      hareketler: [],
      nakitSatis: 0,
      giris: 0,
      cikis: 0,
      nakitGider: 0,
      beklenen: 0,
    };
  }

  const tipler = await kasayaGirenTipler();
  const [{ data: hareketVeri }, { data: tahsilatVeri }, nakitGider] = await Promise.all([
    supabase
      .from("kasa_hareketleri")
      .select("id, tip, tutar, aciklama, olusturma, kisi:kisi_id (ad)")
      .eq("vardiya_id", vardiya.id)
      .order("olusturma"),
    tipler.length
      ? supabase
          .from("tahsilatlar")
          .select("tutar")
          .in("tip", tipler)
          .gte("olusturma", vardiya.acilis)
      : Promise.resolve({ data: [] as any[] }),
    nakitGiderToplami(vardiya.acilis),
  ]);

  const hareketler: Hareket[] =((hareketVeri as any[]) ?? []).map((h) => ({
    id: h.id,
    tip: h.tip,
    tutar: Number(h.tutar),
    aciklama: h.aciklama ?? "",
    kisi: h.kisi?.ad ?? "",
    olusturma: h.olusturma,
  }));

  const topla = (tip: "giris" | "cikis") =>
    hareketler.filter((h) => h.tip === tip).reduce((t, h) => t + h.tutar, 0);

  const nakitSatis = ((tahsilatVeri as any[]) ?? []).reduce((t, o) => t + Number(o.tutar), 0);
  const giris = topla("giris");
  const cikis = topla("cikis");

  return {
    vardiya,
    hareketler,
    nakitSatis,
    giris,
    cikis,
    nakitGider,
    beklenen: vardiya.acilisTutar + nakitSatis + giris - cikis - nakitGider,
  };
}

/** Kapanmış vardiyanın hesabı; açık vardiyada sayılan/fark henüz yok. */
export type VardiyaOzeti = Vardiya & {
  nakitSatis: number;
  giris: number;
  cikis: number;
  nakitGider: number;
  beklenen: number;
  /** Sayılan − beklenen. Vardiya açıkken null. */
  fark: number | null;
};

/**
 * Vardiya geçmişi. Beklenen tutar kapanışta ayrıca saklanmıyor, aynı formülle
 * yeniden hesaplanıyor: açılış + nakit satış + giriş − çıkış. Vardiyanın nakit
 * satışı açılış ile kapanış arasındaki tahsilatlar; açık vardiyada üst sınır yok.
 */
export async function vardiyaGecmisi(limit = 60): Promise<VardiyaOzeti[]> {
  const [{ data: vardiyaVeri }, tipler] = await Promise.all([
    supabase
      .from("kasa_vardiyalari")
      .select(ALANLAR)
      .order("acilis", { ascending: false })
      .limit(limit),
    kasayaGirenTipler(),
  ]);

  const vardiyalar = ((vardiyaVeri as any[]) ?? []).map(vardiyayaCevir);
  if (vardiyalar.length === 0) return [];

  // Hareketler ve tahsilatlar tek seferde çekilip vardiyalara dağıtılıyor;
  // liste uzadıkça sorgu sayısı artmasın.
  const enEski = vardiyalar[vardiyalar.length - 1].acilis;
  const [{ data: hareketVeri }, { data: tahsilatVeri }, { data: giderVeri }] = await Promise.all([
    supabase
      .from("kasa_hareketleri")
      .select("vardiya_id, tip, tutar")
      .gte("olusturma", enEski),
    tipler.length
      ? supabase
          .from("tahsilatlar")
          .select("tutar, olusturma")
          .in("tip", tipler)
          .gte("olusturma", enEski)
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("masraflar")
      .select("tutar, zaman")
      .eq("odeme_tipi", "nakit")
      .gte("zaman", enEski),
  ]);

  const hareketler = (hareketVeri as any[]) ?? [];
  const tahsilatlar = (tahsilatVeri as any[]) ?? [];
  const giderler = (giderVeri as any[]) ?? [];

  return vardiyalar.map((v) => {
    const kendi = hareketler.filter((h) => h.vardiya_id === v.id);
    const topla = (tip: string) =>
      kendi.filter((h) => h.tip === tip).reduce((t, h) => t + Number(h.tutar), 0);

    const nakitSatis = tahsilatlar
      .filter((o) => o.olusturma >= v.acilis && (!v.kapanis || o.olusturma <= v.kapanis))
      .reduce((t, o) => t + Number(o.tutar), 0);

    const nakitGider = giderler
      .filter((m) => m.zaman >= v.acilis && (!v.kapanis || m.zaman <= v.kapanis))
      .reduce((t, m) => t + Number(m.tutar), 0);

    const giris = topla("giris");
    const cikis = topla("cikis");
    const beklenen = v.acilisTutar + nakitSatis + giris - cikis - nakitGider;

    return {
      ...v,
      nakitSatis,
      giris,
      cikis,
      nakitGider,
      beklenen,
      fark: v.sayilanTutar == null ? null : v.sayilanTutar - beklenen,
    };
  });
}

/** Bir vardiyanın para giriş/çıkış dökümü — detay penceresi için. */
export async function vardiyaHareketleri(vardiyaId: number): Promise<Hareket[]> {
  const { data } = await supabase
    .from("kasa_hareketleri")
    .select("id, tip, tutar, aciklama, olusturma, kisi:kisi_id (ad)")
    .eq("vardiya_id", vardiyaId)
    .order("olusturma");

  return ((data as any[]) ?? []).map((h) => ({
    id: h.id,
    tip: h.tip,
    tutar: Number(h.tutar),
    aciklama: h.aciklama ?? "",
    kisi: h.kisi?.ad ?? "",
    olusturma: h.olusturma,
  }));
}

/**
 * Kapanış saati geçtiği hâlde kasa hâlâ açık mı?
 *
 * Eşik vardiyanın açılışından sonraki ilk kapanış saati: gece 01:00'e kadar
 * çalışan işletme kasayı 09:00'da açıp 01:00'de kapatıyor, bugünün 01:00'i
 * çoktan geçmiş olsa bile hatırlatma gece çıkmalı.
 */
export function kapanisGecikti(acilis: string, uyariSaati: string) {
  if (!uyariSaati) return false;

  const [saat, dakika] = uyariSaati.split(":").map(Number);
  const esik = new Date(acilis);
  esik.setHours(saat, dakika, 0, 0);
  if (esik <= new Date(acilis)) esik.setDate(esik.getDate() + 1);

  return Date.now() >= esik.getTime();
}

export async function kasaAc(acilisTutar: number, not: string) {
  const { error } = await supabase.from("kasa_vardiyalari").insert({
    acilis_tutar: acilisTutar,
    acilis_not: not.trim() || null,
  });
  // Tek açık vardiya kuralı veritabanında; başka bir terminalde kasa açılmışsa
  // ekran onu bilmeden ikincisini açmaya çalışabiliyor.
  if (error) {
    throw new Error(
      error.code === "23505" ? "Kasa zaten açık." : "Kasa açılamadı."
    );
  }
}

export async function kasaKapat(vardiyaId: number, sayilanTutar: number, not: string) {
  const { error } = await supabase
    .from("kasa_vardiyalari")
    .update({
      kapanis: new Date().toISOString(),
      sayilan_tutar: sayilanTutar,
      kapanis_not: not.trim() || null,
    })
    .eq("id", vardiyaId)
    .is("kapanis", null);
  if (error) throw new Error("Kasa kapatılamadı.");
}

export async function hareketEkle(
  vardiyaId: number,
  tip: "giris" | "cikis",
  tutar: number,
  aciklama: string
) {
  const { error } = await supabase.from("kasa_hareketleri").insert({
    vardiya_id: vardiyaId,
    tip,
    tutar,
    aciklama: aciklama.trim() || null,
  });
  if (error) throw new Error("İşlem kaydedilemedi.");
}

/** Kasa kapatılmadan önce sorulur: açık adisyon varken gün kapanmaz. */
export async function acikAdisyonSayisi() {
  const { count } = await supabase
    .from("adisyonlar")
    .select("id", { count: "exact", head: true })
    .eq("durum", "acik");
  return count ?? 0;
}
