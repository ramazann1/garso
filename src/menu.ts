import { supabase } from "./supabase";
import type {
  MenuBirim,
  MenuKategori,
  MenuPorsiyon,
  MenuSecenekGrubu,
  MenuUrun,
  SiparisTuru,
} from "./types";

// Sipariş türüne göre fiyat: tür fiyatı boşsa tek fiyat geçerlidir.
export function porsiyonFiyat(p: MenuPorsiyon, tur: SiparisTuru = "masa") {
  const ozel = tur === "masa" ? p.masaFiyat : tur === "gelal" ? p.gelalFiyat : p.paketFiyat;
  return ozel ?? p.fiyat;
}

const say = (v: any) => (v == null ? undefined : Number(v));

export async function menuGetir() {
  const [kat, urn, grp, brm] = await Promise.all([
    supabase.from("kategoriler").select("id, ad, renk, sira").order("sira"),
    supabase
      .from("urunler")
      .select(
        "id, ad, renk, favori, sira, porsiyonlar(birim_id, fiyat, maliyet, barkod, masa_fiyat, gelal_fiyat, paket_fiyat, varsayilan, sira), urun_kategorileri(kategori_id), urun_secenek_gruplari(grup_id)"
      )
      .order("sira"),
    supabase
      .from("secenek_gruplari")
      .select("id, ad, tekli, sira, secenekler(id, ad, ek_fiyat, sira)")
      .order("sira"),
    supabase.from("birimler").select("id, ad, sira").order("sira"),
  ]);

  const kategoriler = (kat.data ?? []) as MenuKategori[];
  const birimler = (brm.data ?? []) as MenuBirim[];

  const urunler: MenuUrun[] = (urn.data ?? []).map((u: any) => ({
    id: u.id,
    ad: u.ad,
    renk: u.renk ?? undefined,
    favori: u.favori,
    porsiyonlar: (u.porsiyonlar ?? [])
      .slice()
      .sort((a: any, b: any) => a.sira - b.sira)
      .map((p: any) => ({
        birimId: p.birim_id ?? undefined,
        ad: birimler.find((b) => b.id === p.birim_id)?.ad ?? "",
        fiyat: Number(p.fiyat),
        maliyet: say(p.maliyet),
        barkod: p.barkod ?? undefined,
        masaFiyat: say(p.masa_fiyat),
        gelalFiyat: say(p.gelal_fiyat),
        paketFiyat: say(p.paket_fiyat),
        varsayilan: p.varsayilan,
      })),
    kategoriIdler: (u.urun_kategorileri ?? []).map((x: any) => x.kategori_id),
    grupIdler: (u.urun_secenek_gruplari ?? []).map((x: any) => x.grup_id),
  }));

  const gruplar: MenuSecenekGrubu[] = (grp.data ?? []).map((g: any) => ({
    id: g.id,
    ad: g.ad,
    tekli: g.tekli,
    liste: (g.secenekler ?? [])
      .slice()
      .sort((a: any, b: any) => a.sira - b.sira)
      .map((s: any) => ({ id: s.id, ad: s.ad, ekFiyat: Number(s.ek_fiyat) })),
  }));

  return { kategoriler, urunler, gruplar, birimler };
}

export async function kategoriEkle(ad: string, renk: string, sira: number) {
  await supabase.from("kategoriler").insert({ ad, renk, sira });
}

export async function kategoriGuncelle(id: number, ad: string, renk: string) {
  await supabase.from("kategoriler").update({ ad, renk }).eq("id", id);
}

export async function kategoriSil(id: number) {
  await supabase.from("kategoriler").delete().eq("id", id);
}

export async function urunKaydet(u: MenuUrun) {
  let id = u.id;

  if (id) {
    await supabase
      .from("urunler")
      .update({ ad: u.ad, renk: u.renk ?? null, favori: u.favori })
      .eq("id", id);
  } else {
    const { data } = await supabase
      .from("urunler")
      .insert({ ad: u.ad, renk: u.renk ?? null, favori: u.favori })
      .select("id")
      .single();
    id = data?.id;
  }
  if (!id) return;

  await supabase.from("porsiyonlar").delete().eq("urun_id", id);
  if (u.porsiyonlar.length) {
    await supabase.from("porsiyonlar").insert(
      u.porsiyonlar.map((p, i) => ({
        urun_id: id,
        birim_id: p.birimId ?? null,
        fiyat: p.fiyat,
        maliyet: p.maliyet ?? null,
        barkod: p.barkod?.trim() || null,
        masa_fiyat: p.masaFiyat ?? null,
        gelal_fiyat: p.gelalFiyat ?? null,
        paket_fiyat: p.paketFiyat ?? null,
        varsayilan: p.varsayilan,
        sira: i + 1,
      }))
    );
  }

  await supabase.from("urun_kategorileri").delete().eq("urun_id", id);
  if (u.kategoriIdler.length) {
    await supabase
      .from("urun_kategorileri")
      .insert(u.kategoriIdler.map((k) => ({ urun_id: id, kategori_id: k })));
  }

  await supabase.from("urun_secenek_gruplari").delete().eq("urun_id", id);
  if (u.grupIdler.length) {
    await supabase
      .from("urun_secenek_gruplari")
      .insert(u.grupIdler.map((g) => ({ urun_id: id, grup_id: g })));
  }
}

export async function urunSil(id: number) {
  await supabase.from("urunler").delete().eq("id", id);
}

export async function grupKaydet(
  id: number | undefined,
  ad: string,
  tekli: boolean,
  liste: { ad: string; ekFiyat: number }[]
) {
  let grupId = id;

  if (grupId) {
    await supabase.from("secenek_gruplari").update({ ad, tekli }).eq("id", grupId);
  } else {
    const { data } = await supabase
      .from("secenek_gruplari")
      .insert({ ad, tekli })
      .select("id")
      .single();
    grupId = data?.id;
  }
  if (!grupId) return;

  await supabase.from("secenekler").delete().eq("grup_id", grupId);
  if (liste.length) {
    await supabase.from("secenekler").insert(
      liste.map((s, i) => ({ grup_id: grupId, ad: s.ad, ek_fiyat: s.ekFiyat, sira: i + 1 }))
    );
  }
}

export async function grupSil(id: number) {
  await supabase.from("secenek_gruplari").delete().eq("id", id);
}

export async function birimleriKaydet(liste: { id?: number; ad: string }[], silinenler: number[]) {
  if (silinenler.length) {
    await supabase.from("birimler").delete().in("id", silinenler);
  }

  const yeniler = liste.filter((b) => !b.id);
  if (yeniler.length) {
    await supabase.from("birimler").insert(
      yeniler.map((b) => ({ ad: b.ad, sira: liste.indexOf(b) + 1 }))
    );
  }

  for (const [i, b] of liste.entries()) {
    if (b.id) await supabase.from("birimler").update({ ad: b.ad, sira: i + 1 }).eq("id", b.id);
  }
}