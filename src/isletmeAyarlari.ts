import { supabase } from "./supabase";

export type IsletmeAyarlari = {
  /** Menü fiyatları KDV dahil mi yazılıyor? Türkiye'de olağan olan dahil. */
  kdvDahil: boolean;
};

// Ayar her hesapta lazım ama satış sırasında değişmiyor; bir kez okunup burada
// tutuluyor ki toplam hesabı beklemeden, senkron çalışsın.
let onbellek: IsletmeAyarlari = { kdvDahil: true };

export function ayarlar(): IsletmeAyarlari {
  return onbellek;
}

export async function ayarlariGetir(): Promise<IsletmeAyarlari> {
  const { data } = await supabase
    .from("isletme_ayarlari")
    .select("kdv_dahil")
    .eq("id", 1)
    .maybeSingle();
  onbellek = { kdvDahil: (data as any)?.kdv_dahil ?? true };
  return onbellek;
}

export async function ayarlariKaydet(yeni: IsletmeAyarlari) {
  const { error } = await supabase
    .from("isletme_ayarlari")
    .upsert({ id: 1, kdv_dahil: yeni.kdvDahil });
  if (error) throw new Error("Ayar kaydedilemedi.");
  onbellek = yeni;
}
