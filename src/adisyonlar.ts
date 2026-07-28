import { supabase } from "./supabase";
import type { SepetKalemi } from "./types";

type AdisyonVerisi = { sepet: SepetKalemi[]; indirim: number };

export async function adisyonGetir(masaAd: string): Promise<AdisyonVerisi> {
  const { data } = await supabase
    .from("adisyonlar")
    .select("kalemler")
    .eq("masa_ad", masaAd)
    .maybeSingle();
  const kalemler = data?.kalemler as any;
  if (!kalemler) return { sepet: [], indirim: 0 };
  if (Array.isArray(kalemler)) return { sepet: kalemler, indirim: 0 };
  return { sepet: kalemler.sepet ?? [], indirim: kalemler.indirim ?? 0 };
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
    await supabase
      .from("adisyonlar")
      .upsert({ masa_ad: masaAd, kalemler: veri, guncelleme: new Date().toISOString() }, { onConflict: "masa_ad" });
  }
}