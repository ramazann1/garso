import { supabase } from "./supabase";
import type { SepetKalemi, Tahsilat } from "./types";

type AdisyonVerisi = { sepet: SepetKalemi[]; indirim: number; tahsilatlar: Tahsilat[]; acilis?: string };

export async function adisyonGetir(masaAd: string): Promise<AdisyonVerisi> {
  const { data } = await supabase
    .from("adisyonlar")
    .select("kalemler, tahsilatlar, acilis")
    .eq("masa_ad", masaAd)
    .maybeSingle();
  if (!data) return { sepet: [], indirim: 0, tahsilatlar: [] };
  const k = data.kalemler as any;
  const sepet = Array.isArray(k) ? k : (k?.sepet ?? []);
  const indirim = Array.isArray(k) ? 0 : (k?.indirim ?? 0);
  return { sepet, indirim, tahsilatlar: (data.tahsilatlar as Tahsilat[]) ?? [], acilis: data.acilis };
}

export async function tumAdisyonlar(): Promise<Record<string, SepetKalemi[]>> {
  const { data } = await supabase.from("adisyonlar").select("masa_ad, kalemler");
  const sonuc: Record<string, SepetKalemi[]> = {};
  for (const satir of data ?? []) {
    const k = satir.kalemler as any;
    sonuc[satir.masa_ad] = Array.isArray(k) ? k : (k?.sepet ?? []);
  }
  return sonuc;
}

export async function adisyonKaydet(masaAd: string, veri: AdisyonVerisi) {
  if (veri.sepet.length === 0) {
    await supabase.from("adisyonlar").delete().eq("masa_ad", masaAd);
  } else {
    await supabase.from("adisyonlar").upsert(
      { masa_ad: masaAd, kalemler: { sepet: veri.sepet, indirim: veri.indirim }, tahsilatlar: veri.tahsilatlar, guncelleme: new Date().toISOString(), acilis: veri.acilis ?? new Date().toISOString() },
      { onConflict: "masa_ad" }
    );
  }
}
export type OdemeTipi = { id: number; ad: string; renk: string; sira: number };

export async function odemeTipleriniGetir(): Promise<OdemeTipi[]> {
  const { data } = await supabase
    .from("odeme_tipleri")
    .select("id, ad, renk, sira")
    .eq("aktif", true)
    .order("sira");
  return (data ?? []) as OdemeTipi[];
}