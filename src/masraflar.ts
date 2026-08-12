import { acikOturum } from "./oturum";
import { supabase } from "./supabase";

export type MasrafTipi = {
  id: number;
  ad: string;
  sira: number;
  aktif: boolean;
};

/** Gider ödeme tipi satışınkinden ayrı ve sabit; ayarlardan değişmiyor. */
export const ODEME_TIPLERI = [
  { kod: "nakit", ad: "Nakit" },
  { kod: "kart", ad: "Kredi Kartı" },
  { kod: "havale", ad: "Havale" },
  { kod: "cek", ad: "Çek-Senet" },
  { kod: "diger", ad: "Diğer" },
] as const;

export type OdemeKodu = (typeof ODEME_TIPLERI)[number]["kod"];

export const odemeAdi = (kod: string) =>
  ODEME_TIPLERI.find((o) => o.kod === kod)?.ad ?? kod;

/** İlk kurulumda tek tuşla eklenen hazır liste. */
export const HAZIR_TIPLER = [
  "Faturalar",
  "Vergi",
  "Personel",
  "Temizlik",
  "Gıda ve İçecek",
  "Teknik Servis",
  "Kira",
  "Diğer",
];

export type Masraf = {
  id: number;
  tipId: number | null;
  tipAd: string;
  odemeTipi: OdemeKodu;
  zaman: string;
  tutar: number;
  aciklama: string;
  kisi: string;
};

export type MasrafAlanlari = {
  tipId: number | null;
  tipAd: string;
  odemeTipi: OdemeKodu;
  zaman: string;
  tutar: number;
  aciklama: string;
};

export async function masrafTipleriniGetir(): Promise<MasrafTipi[]> {
  const { data } = await supabase
    .from("masraf_tipleri")
    .select("id, ad, sira, aktif")
    .order("sira")
    .order("id");
  return ((data as any[]) ?? []).map((t) => ({
    id: t.id,
    ad: t.ad,
    sira: t.sira,
    aktif: t.aktif,
  }));
}

export async function masrafTipiEkle(ad: string, sira: number) {
  const { data, error } = await supabase
    .from("masraf_tipleri")
    .insert({ ad: ad.trim(), sira })
    .select("id")
    .single();
  if (error) {
    throw new Error(
      error.code === "23505" ? "Bu gider türü zaten var." : "Gider türü eklenemedi."
    );
  }
  return data.id as number;
}

export async function hazirTipleriEkle(mevcut: MasrafTipi[]) {
  const adlar = new Set(mevcut.map((t) => t.ad.toLocaleLowerCase("tr")));
  const yeniler = HAZIR_TIPLER.filter((ad) => !adlar.has(ad.toLocaleLowerCase("tr")));
  if (yeniler.length === 0) return;

  const { error } = await supabase
    .from("masraf_tipleri")
    .insert(yeniler.map((ad, i) => ({ ad, sira: mevcut.length + i })));
  if (error) throw new Error("Hazır gider türleri eklenemedi.");
}

export async function masrafTipiGuncelle(id: number, ad: string) {
  const { error } = await supabase
    .from("masraf_tipleri")
    .update({ ad: ad.trim() })
    .eq("id", id);
  if (error) {
    throw new Error(
      error.code === "23505" ? "Bu gider türü zaten var." : "Gider türü kaydedilemedi."
    );
  }
}

export async function masrafTipiSil(id: number) {
  const { error } = await supabase.from("masraf_tipleri").delete().eq("id", id);
  if (error) throw new Error("Gider türü silinemedi.");
}

/** Verilen tarih aralığındaki giderler; aralık verilmezse son kayıtlar. */
export async function masraflariGetir(baslangic?: string, bitis?: string): Promise<Masraf[]> {
  let sorgu = supabase
    .from("masraflar")
    .select("id, tip_id, tip_ad, odeme_tipi, zaman, tutar, aciklama, kisi:kisi_id (ad)")
    .order("zaman", { ascending: false })
    .limit(300);

  if (baslangic) sorgu = sorgu.gte("zaman", baslangic);
  if (bitis) sorgu = sorgu.lte("zaman", bitis);

  const { data } = await sorgu;
  return ((data as any[]) ?? []).map((m) => ({
    id: m.id,
    tipId: m.tip_id,
    tipAd: m.tip_ad,
    odemeTipi: m.odeme_tipi,
    zaman: m.zaman,
    tutar: Number(m.tutar),
    aciklama: m.aciklama ?? "",
    kisi: m.kisi?.ad ?? "",
  }));
}

export async function masrafEkle(alanlar: MasrafAlanlari) {
  const kisi = acikOturum();
  const { error } = await supabase.from("masraflar").insert({
    tip_id: alanlar.tipId,
    tip_ad: alanlar.tipAd,
    odeme_tipi: alanlar.odemeTipi,
    zaman: alanlar.zaman,
    tutar: alanlar.tutar,
    aciklama: alanlar.aciklama.trim() || null,
    kisi_id: kisi?.id ?? null,
  });
  if (error) throw new Error("Gider kaydedilemedi.");
}

export async function masrafGuncelle(id: number, alanlar: MasrafAlanlari) {
  const { error } = await supabase
    .from("masraflar")
    .update({
      tip_id: alanlar.tipId,
      tip_ad: alanlar.tipAd,
      odeme_tipi: alanlar.odemeTipi,
      zaman: alanlar.zaman,
      tutar: alanlar.tutar,
      aciklama: alanlar.aciklama.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error("Gider kaydedilemedi.");
}

export async function masrafSil(id: number) {
  const { error } = await supabase.from("masraflar").delete().eq("id", id);
  if (error) throw new Error("Gider silinemedi.");
}

/** Nakit ödenen giderlerin toplamı — kasadan düşen tutar. */
export async function nakitGiderToplami(baslangic: string, bitis?: string) {
  let sorgu = supabase
    .from("masraflar")
    .select("tutar")
    .eq("odeme_tipi", "nakit")
    .gte("zaman", baslangic);
  if (bitis) sorgu = sorgu.lte("zaman", bitis);

  const { data } = await sorgu;
  return ((data as any[]) ?? []).reduce((t, m) => t + Number(m.tutar), 0);
}
