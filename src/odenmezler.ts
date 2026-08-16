import { supabase } from "./supabase";

/**
 * Ödenmezler: ikramın ve personel yemeğinin kime yazıldığı.
 *
 * Personel tablosuna bağlanmıyor — ödenmez yalnız çalışan olmuyor (ev sahibi,
 * tedarikçi, sürekli müşteri) ve işten ayrılanın geçmiş ikramları listede
 * kalmalı. Personelden toplu aktarım var, bağ yok.
 */

export type Odenmez = {
  id: number;
  ad: string;
  unvan: string;
  aktif: boolean;
  sira: number;
};

export async function odenmezleriGetir(hepsi = false): Promise<Odenmez[]> {
  let sorgu = supabase.from("odenmezler").select("id, ad, unvan, aktif, sira");
  if (!hepsi) sorgu = sorgu.eq("aktif", true);
  const { data } = await sorgu.order("sira").order("ad");

  return ((data as any[]) ?? []).map((o) => ({
    id: o.id,
    ad: o.ad,
    unvan: o.unvan ?? "",
    aktif: o.aktif,
    sira: o.sira,
  }));
}

export async function odenmezKaydet(
  id: number | null,
  alanlar: { ad: string; unvan: string; aktif: boolean },
  sira = 0
) {
  const satir = {
    ad: alanlar.ad.trim(),
    unvan: alanlar.unvan.trim() || null,
    aktif: alanlar.aktif,
    ...(id ? {} : { sira }),
  };

  const { error } = id
    ? await supabase.from("odenmezler").update(satir).eq("id", id)
    : await supabase.from("odenmezler").insert(satir);

  if (error) {
    throw new Error(
      error.code === "23505" ? "Bu ad zaten listede var." : "Ödenmez kaydedilemedi."
    );
  }
}

/**
 * Silmek yerine pasife almak doğru yol: geçmiş ikramlar bu satıra bağlı.
 * Hiç kullanılmamış kayıt gerçekten siliniyor — yanlış yazılan ad listede
 * ölü satır olarak kalmasın.
 */
export async function odenmezSil(id: number) {
  const [kalem, adisyon] = await Promise.all([
    supabase
      .from("adisyon_kalemleri")
      .select("id", { count: "exact", head: true })
      .eq("odenmez_id", id),
    supabase
      .from("adisyonlar")
      .select("id", { count: "exact", head: true })
      .eq("odenmez_id", id),
  ]);

  if ((kalem.count ?? 0) + (adisyon.count ?? 0) > 0) {
    const { error } = await supabase
      .from("odenmezler")
      .update({ aktif: false })
      .eq("id", id);
    if (error) throw new Error("Ödenmez pasife alınamadı.");
    return "pasif" as const;
  }

  const { error } = await supabase.from("odenmezler").delete().eq("id", id);
  if (error) throw new Error("Ödenmez silinemedi.");
  return "silindi" as const;
}

/**
 * Personel listesinden toplu aktarım. Aynı adı ikinci kez eklemiyor: liste
 * elle de büyüyor, aktarım her çalıştığında yalnız eksikleri tamamlıyor.
 */
export async function personeldenAktar(): Promise<number> {
  const [{ data: kisiler }, mevcut] = await Promise.all([
    supabase.from("personel").select("ad, roller (ad)").eq("aktif", true),
    odenmezleriGetir(true),
  ]);

  const adlar = new Set(mevcut.map((o) => o.ad.toLocaleLowerCase("tr")));
  const yeniler = ((kisiler as any[]) ?? [])
    .filter((k) => k.ad && !adlar.has(String(k.ad).toLocaleLowerCase("tr")))
    .map((k) => ({ ad: k.ad, unvan: k.roller?.ad ?? null }));

  if (yeniler.length === 0) return 0;

  const { error } = await supabase.from("odenmezler").insert(yeniler);
  if (error) throw new Error("Personel aktarılamadı.");
  return yeniler.length;
}
