import { supabase } from "./supabase";

export type IndirimTipi = "yuzde" | "tutar";

export type IndirimTanimi = {
  id: number;
  ad: string;
  tip: IndirimTipi;
  deger: number;
  sira: number;
  aktif: boolean;
};

/** Adisyona veya kaleme uygulanan indirimin kaynağı; serbest indirimde boş. */
export type IndirimKaynagi = { id?: number; ad?: string };

const ALANLAR = "id, ad, tip, deger, sira, aktif";

function tanimaCevir(s: any): IndirimTanimi {
  return {
    id: s.id,
    ad: s.ad,
    tip: s.tip as IndirimTipi,
    deger: Number(s.deger),
    sira: s.sira ?? 0,
    aktif: s.aktif ?? true,
  };
}

// Satış ekranı yalnızca açık tanımları görür; ayar ekranı kapalıları da ister.
export async function indirimTanimlariniGetir(hepsi = false): Promise<IndirimTanimi[]> {
  let sorgu = supabase.from("indirim_tanimlari").select(ALANLAR);
  if (!hepsi) sorgu = sorgu.eq("aktif", true);
  const { data } = await sorgu.order("sira").order("id");
  return ((data as any[]) ?? []).map(tanimaCevir);
}

export type IndirimAlanlari = Omit<IndirimTanimi, "id">;

export async function indirimTanimiEkle(alanlar: IndirimAlanlari) {
  const { error } = await supabase.from("indirim_tanimlari").insert(alanlar);
  if (error) throw new Error("İndirim eklenemedi.");
}

export async function indirimTanimiGuncelle(id: number, alanlar: Partial<IndirimAlanlari>) {
  const { error } = await supabase.from("indirim_tanimlari").update(alanlar).eq("id", id);
  if (error) throw new Error("İndirim güncellenemedi.");
}

export async function indirimTanimiSil(id: number) {
  const { error } = await supabase.from("indirim_tanimlari").delete().eq("id", id);
  if (error) throw new Error("İndirim silinemedi.");
}

/** Tanımın verilen tutara denk gelen indirimi. Yüzde tanımlar tutara çevrilir. */
export function tanimTutari(tanim: IndirimTanimi, araToplam: number) {
  const ham = tanim.tip === "yuzde" ? (araToplam * tanim.deger) / 100 : tanim.deger;
  return Math.min(araToplam, Math.round(ham * 100) / 100);
}

export function tanimEtiketi(tanim: IndirimTanimi) {
  return tanim.tip === "yuzde" ? `%${tanim.deger}` : `₺${tanim.deger}`;
}
