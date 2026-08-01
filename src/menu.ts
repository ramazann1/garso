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

// Seçenek grupları porsiyona bağlı; ürün seviyesindeki sayaç ve rozetler için birleştirilir.
export function urunGrupIdleri(u: MenuUrun) {
  return [...new Set(u.porsiyonlar.flatMap((p) => p.grupIdler))];
}

// Bir kategorinin ürünleri — filtreleme ve sıralama tek yerde.
export function kategoriUrunleri(urunler: MenuUrun[], kategoriId: number) {
  return urunler
    .filter((u) => u.kategoriIdler.includes(kategoriId))
    .sort((a, b) => (a.kategoriSira[kategoriId] ?? 0) - (b.kategoriSira[kategoriId] ?? 0));
}

const say = (v: any) => (v == null ? undefined : Number(v));

export async function menuGetir() {
  const [kat, urn, grp, brm] = await Promise.all([
    supabase
      .from("kategoriler")
      .select("id, ad, renk, sira, satista_gorunur, mutfakta_gorunur")
      .order("sira"),
    supabase
      .from("urunler")
      .select(
        "id, ad, kod, renk, favori, satista_gorunur, mutfakta_gorunur, porsiyonlar(id, birim_id, fiyat, maliyet, barkod, masa_fiyat, gelal_fiyat, paket_fiyat, varsayilan, sira, porsiyon_secenek_gruplari(grup_id)), urun_kategorileri(kategori_id, sira)"
      ),
    supabase
      .from("secenek_gruplari")
      .select("id, ad, tekli, zorunlu, sira, secenekler(id, ad, ek_fiyat, sira)")
      .order("sira"),
    supabase.from("birimler").select("id, ad, sira").order("sira"),
  ]);

  const kategoriler: MenuKategori[] = (kat.data ?? []).map((k: any) => ({
    id: k.id,
    ad: k.ad,
    renk: k.renk,
    sira: k.sira,
    satistaGorunur: k.satista_gorunur,
    mutfaktaGorunur: k.mutfakta_gorunur,
  }));
  const birimler = (brm.data ?? []) as MenuBirim[];

  const urunler: MenuUrun[] = (urn.data ?? []).map((u: any) => ({
    id: u.id,
    ad: u.ad,
    kod: u.kod ?? undefined,
    renk: u.renk ?? undefined,
    favori: u.favori,
    satistaGorunur: u.satista_gorunur,
    mutfaktaGorunur: u.mutfakta_gorunur,
    porsiyonlar: (u.porsiyonlar ?? [])
      .slice()
      .sort((a: any, b: any) => a.sira - b.sira)
      .map((p: any) => ({
        id: p.id,
        birimId: p.birim_id ?? undefined,
        ad: birimler.find((b) => b.id === p.birim_id)?.ad ?? "",
        fiyat: Number(p.fiyat),
        maliyet: say(p.maliyet),
        barkod: p.barkod ?? undefined,
        masaFiyat: say(p.masa_fiyat),
        gelalFiyat: say(p.gelal_fiyat),
        paketFiyat: say(p.paket_fiyat),
        varsayilan: p.varsayilan,
        grupIdler: (p.porsiyon_secenek_gruplari ?? []).map((x: any) => x.grup_id),
      })),
    kategoriIdler: (u.urun_kategorileri ?? []).map((x: any) => x.kategori_id),
    kategoriSira: Object.fromEntries(
      (u.urun_kategorileri ?? []).map((x: any) => [x.kategori_id, x.sira])
    ),
  }));

  const gruplar: MenuSecenekGrubu[] = (grp.data ?? []).map((g: any) => ({
    id: g.id,
    ad: g.ad,
    tekli: g.tekli,
    zorunlu: g.zorunlu,
    liste: (g.secenekler ?? [])
      .slice()
      .sort((a: any, b: any) => a.sira - b.sira)
      .map((s: any) => ({ id: s.id, ad: s.ad, ekFiyat: Number(s.ek_fiyat) })),
  }));

  return { kategoriler, urunler, gruplar, birimler };
}

export type KategoriAlanlari = {
  ad: string;
  renk: string;
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
};

const kategoriSatiri = (k: KategoriAlanlari) => ({
  ad: k.ad,
  renk: k.renk,
  satista_gorunur: k.satistaGorunur,
  mutfakta_gorunur: k.mutfaktaGorunur,
});

export async function kategoriEkle(k: KategoriAlanlari, sira: number) {
  await supabase.from("kategoriler").insert({ ...kategoriSatiri(k), sira });
}

export async function kategoriGuncelle(id: number, k: KategoriAlanlari) {
  await supabase.from("kategoriler").update(kategoriSatiri(k)).eq("id", id);
}

export async function kategoriSil(id: number) {
  await supabase.from("kategoriler").delete().eq("id", id);
}

// Barkod benzersiz olmak zorunda — kopyalanan üründe boş bırakılır.
function porsiyonSatiri(urunId: number, p: MenuPorsiyon, sira: number, barkodlar = true) {
  return {
    urun_id: urunId,
    birim_id: p.birimId ?? null,
    fiyat: p.fiyat,
    maliyet: p.maliyet ?? null,
    barkod: barkodlar ? p.barkod?.trim() || null : null,
    masa_fiyat: p.masaFiyat ?? null,
    gelal_fiyat: p.gelalFiyat ?? null,
    paket_fiyat: p.paketFiyat ?? null,
    varsayilan: p.varsayilan,
    sira,
  };
}

async function porsiyonGruplariYaz(porsiyonId: number, grupIdler: number[]) {
  await supabase.from("porsiyon_secenek_gruplari").delete().eq("porsiyon_id", porsiyonId);
  if (grupIdler.length) {
    await supabase
      .from("porsiyon_secenek_gruplari")
      .insert(grupIdler.map((g) => ({ porsiyon_id: porsiyonId, grup_id: g })));
  }
}

// Hata varsa mesajını döndürür — ürün kodu benzersiz, çakışırsa kullanıcıya söylenmeli.
function yazmaHatasi(hata: { code?: string }) {
  return hata.code === "23505"
    ? "Bu ürün kodu başka bir üründe kullanılıyor."
    : "Ürün kaydedilemedi.";
}

export async function urunKaydet(u: MenuUrun) {
  let id = u.id;
  const alanlar = {
    ad: u.ad,
    kod: u.kod?.trim() || null,
    renk: u.renk ?? null,
    favori: u.favori,
    satista_gorunur: u.satistaGorunur,
    mutfakta_gorunur: u.mutfaktaGorunur,
  };

  if (id) {
    const { error } = await supabase.from("urunler").update(alanlar).eq("id", id);
    if (error) return yazmaHatasi(error);
  } else {
    const { data, error } = await supabase.from("urunler").insert(alanlar).select("id").single();
    if (error) return yazmaHatasi(error);
    id = data?.id;
  }
  if (!id) return;

  // Porsiyonlar silinip yeniden yazılmaz, id'leriyle güncellenir — seçenek grupları
  // porsiyon id'sine bağlı, silinen porsiyonla birlikte bağlantıları da giderdi.
  const { data: eskiPorsiyonlar } = await supabase
    .from("porsiyonlar")
    .select("id")
    .eq("urun_id", id);
  const kalanlar = u.porsiyonlar.map((p) => p.id).filter(Boolean);
  const silinecek = (eskiPorsiyonlar ?? [])
    .map((p: any) => p.id as number)
    .filter((pid) => !kalanlar.includes(pid));
  if (silinecek.length) {
    await supabase.from("porsiyonlar").delete().in("id", silinecek);
  }

  for (const [i, p] of u.porsiyonlar.entries()) {
    let porsiyonId = p.id;
    if (porsiyonId) {
      await supabase.from("porsiyonlar").update(porsiyonSatiri(id, p, i + 1)).eq("id", porsiyonId);
    } else {
      const { data } = await supabase
        .from("porsiyonlar")
        .insert(porsiyonSatiri(id, p, i + 1))
        .select("id")
        .single();
      porsiyonId = data?.id;
    }
    if (porsiyonId) await porsiyonGruplariYaz(porsiyonId, p.grupIdler);
  }

  // Kategori bağlantıları silinip yeniden yazılıyor; ürünün eski sırası korunur,
  // yeni eklenen kategoride sona konur.
  const { data: eskiBaglar } = await supabase
    .from("urun_kategorileri")
    .select("kategori_id, sira")
    .eq("urun_id", id);
  const eskiSira = new Map<number, number>(
    (eskiBaglar ?? []).map((x: any) => [x.kategori_id, x.sira])
  );

  const baglar = [];
  for (const k of u.kategoriIdler) {
    const sira = eskiSira.get(k) ?? (await kategoriSonSira(k)) + 1;
    baglar.push({ urun_id: id, kategori_id: k, sira });
  }

  await supabase.from("urun_kategorileri").delete().eq("urun_id", id);
  if (baglar.length) {
    await supabase.from("urun_kategorileri").insert(baglar);
  }

}

// Kopya, kaynağın bulunduğu her kategoride onun hemen ardına yerleşir.
// Kod ve barkod benzersiz olduğu için kopyaya geçmez.
export async function urunKopyala(kaynak: MenuUrun, hepsi: MenuUrun[]) {
  const { data } = await supabase
    .from("urunler")
    .insert({
      ad: `${kaynak.ad} (kopya)`,
      kod: null,
      renk: kaynak.renk ?? null,
      favori: kaynak.favori,
      satista_gorunur: kaynak.satistaGorunur,
      mutfakta_gorunur: kaynak.mutfaktaGorunur,
    })
    .select("id")
    .single();

  const id = data?.id as number | undefined;
  if (!id) return;

  for (const [i, p] of kaynak.porsiyonlar.entries()) {
    const { data: yeni } = await supabase
      .from("porsiyonlar")
      .insert(porsiyonSatiri(id, p, i + 1, false))
      .select("id")
      .single();
    if (yeni?.id && p.grupIdler.length) {
      await porsiyonGruplariYaz(yeni.id, p.grupIdler);
    }
  }

  for (const kategoriId of kaynak.kategoriIdler) {
    const sirali = kategoriUrunleri(hepsi, kategoriId).map((u) => u.id!);
    const yer = sirali.indexOf(kaynak.id!) + 1;
    sirali.splice(yer, 0, id);

    await supabase.from("urun_kategorileri").insert({ urun_id: id, kategori_id: kategoriId, sira: yer + 1 });
    await urunSirala(kategoriId, sirali);
  }

  return id;
}

export async function urunSil(id: number) {
  await supabase.from("urunler").delete().eq("id", id);
}

async function kategoriSonSira(kategoriId: number) {
  const { data } = await supabase
    .from("urun_kategorileri")
    .select("sira")
    .eq("kategori_id", kategoriId)
    .order("sira", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.sira ?? 0;
}

export async function kategoriSirala(idler: number[]) {
  await Promise.all(
    idler.map((id, i) => supabase.from("kategoriler").update({ sira: i + 1 }).eq("id", id))
  );
}

export async function urunSirala(kategoriId: number, urunIdler: number[]) {
  await Promise.all(
    urunIdler.map((urunId, i) =>
      supabase
        .from("urun_kategorileri")
        .update({ sira: i + 1 })
        .eq("kategori_id", kategoriId)
        .eq("urun_id", urunId)
    )
  );
}

export type TopluUrun = {
  id: number;
  ad: string;
  kod?: string;
  favori: boolean;
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
};

export type TopluPorsiyon = {
  id: number;
  birimId?: number;
  fiyat: number;
  maliyet?: number;
  masaFiyat?: number;
  gelalFiyat?: number;
  paketFiyat?: number;
};

// Toplu düzenleme tablosu yalnızca dokunulan satırları gönderir — 200 ürünlük
// menüde tek "Kaydet" tuşu 200 istek atmasın diye.
export async function topluKaydet(urunler: TopluUrun[], porsiyonlar: TopluPorsiyon[]) {
  const sonuclar = await Promise.all([
    ...urunler.map((u) =>
      supabase
        .from("urunler")
        .update({
          ad: u.ad,
          kod: u.kod?.trim() || null,
          favori: u.favori,
          satista_gorunur: u.satistaGorunur,
          mutfakta_gorunur: u.mutfaktaGorunur,
        })
        .eq("id", u.id)
    ),
    ...porsiyonlar.map((p) =>
      supabase
        .from("porsiyonlar")
        .update({
          birim_id: p.birimId ?? null,
          fiyat: p.fiyat,
          maliyet: p.maliyet ?? null,
          masa_fiyat: p.masaFiyat ?? null,
          gelal_fiyat: p.gelalFiyat ?? null,
          paket_fiyat: p.paketFiyat ?? null,
        })
        .eq("id", p.id)
    ),
  ]);

  const hata = sonuclar.find((s) => s.error)?.error;
  if (hata) return yazmaHatasi(hata);
}

export async function grupKaydet(
  id: number | undefined,
  ad: string,
  tekli: boolean,
  zorunlu: boolean,
  liste: { ad: string; ekFiyat: number }[]
) {
  let grupId = id;

  if (grupId) {
    await supabase.from("secenek_gruplari").update({ ad, tekli, zorunlu }).eq("id", grupId);
  } else {
    const { data } = await supabase
      .from("secenek_gruplari")
      .insert({ ad, tekli, zorunlu })
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