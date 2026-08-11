import { supabase } from "./supabase";

export type OdemeSinifi = "okc" | "klasik";

export type OdemeTipi = {
  id: number;
  ad: string;
  renk: string;
  sira: number;
  sinif: OdemeSinifi;
  acikHesap: boolean;
  aktif: boolean;
  /** Bu tiple alınan ödeme kasadaki nakdi büyütür mü — kasa sayımı buna bakıyor. */
  kasayaGirer: boolean;
};

const ALANLAR = "id, ad, renk, sira, sinif, acik_hesap, aktif, kasaya_girer";

function tipeCevir(s: any): OdemeTipi {
  return {
    id: s.id,
    ad: s.ad,
    renk: s.renk,
    sira: s.sira,
    sinif: (s.sinif as OdemeSinifi) ?? "klasik",
    acikHesap: s.acik_hesap ?? false,
    aktif: s.aktif ?? true,
    kasayaGirer: s.kasaya_girer ?? false,
  };
}

// Satış ekranları yalnızca açık tipleri görür; ayar ekranı kapalıları da
// listeler ki işletmeci kullanmadığı tipi silmeden gizleyebilsin.
export async function odemeTipleriniGetir(hepsi = false): Promise<OdemeTipi[]> {
  let sorgu = supabase.from("odeme_tipleri").select(ALANLAR);
  if (!hepsi) sorgu = sorgu.eq("aktif", true);
  const { data } = await sorgu.order("sinif").order("sira");
  return ((data as any[]) ?? []).map(tipeCevir);
}

export type OdemeTipiAlanlari = {
  ad: string;
  renk: string;
  sinif: OdemeSinifi;
  acikHesap: boolean;
  aktif: boolean;
  kasayaGirer: boolean;
};

function satirAlanlari(a: Partial<OdemeTipiAlanlari> & { sira?: number }) {
  const satir: Record<string, unknown> = {};
  if (a.ad !== undefined) satir.ad = a.ad;
  if (a.renk !== undefined) satir.renk = a.renk;
  if (a.sinif !== undefined) satir.sinif = a.sinif;
  if (a.acikHesap !== undefined) satir.acik_hesap = a.acikHesap;
  if (a.aktif !== undefined) satir.aktif = a.aktif;
  if (a.kasayaGirer !== undefined) satir.kasaya_girer = a.kasayaGirer;
  if (a.sira !== undefined) satir.sira = a.sira;
  return satir;
}

export async function odemeTipiEkle(alanlar: OdemeTipiAlanlari, sira: number) {
  const { data, error } = await supabase
    .from("odeme_tipleri")
    .insert(satirAlanlari({ ...alanlar, sira }))
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as any).id as number;
}

export async function odemeTipiGuncelle(
  id: number,
  alanlar: Partial<OdemeTipiAlanlari> & { sira?: number }
) {
  const { error } = await supabase
    .from("odeme_tipleri")
    .update(satirAlanlari(alanlar))
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function odemeTipiSil(id: number) {
  const { error } = await supabase.from("odeme_tipleri").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
