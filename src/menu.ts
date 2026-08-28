import { supabase } from "./supabase";
import { hataysaFirlat, onbellekliGetir } from "./onbellek";
import type {
  MenuBirim,
  MenuKategori,
  MenuIcerikGrubu,
  MenuIcerikSatiri,
  MenuKdv,
  MenuPorsiyon,
  MenuSecenekGrubu,
  MenuUrun,
  SiparisTuru,
  UrunMedya,
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

// Yeni ürünün ilk porsiyonu hangi birimle açılsın: işaretli varsayılan →
// yoksa "Tam" → o da yoksa listedeki ilk birim.
export function varsayilanBirim(birimler: MenuBirim[]) {
  return (
    birimler.find((b) => b.varsayilan) ??
    birimler.find((b) => b.ad.toLocaleLowerCase("tr") === "tam") ??
    birimler[0]
  );
}

// Bir grubun "tipik" seçimi: önce yıldızlılar, sayı yetmiyorsa kalan satırlardan
// tamamlanır. Maliyet ve karşılaştırma hesapları bunun üzerinden yürür.
export function grubunVarsayilanSecimi(g: MenuIcerikGrubu) {
  const yildizli = g.satirlar.filter((s) => s.varsayilan);
  const digerleri = g.satirlar.filter((s) => !s.varsayilan);
  return [...yildizli, ...digerleri].slice(0, g.secilebilir);
}

// Menü içindeki satırın hangi porsiyonu kullandığı — porsiyon seçilmemişse
// ürünün varsayılanı geçerli.
export function icerikPorsiyonu(s: MenuIcerikSatiri, urunler: MenuUrun[]) {
  const urun = urunler.find((u) => u.id === s.urunId);
  return (
    urun?.porsiyonlar.find((p) => p.id === s.porsiyonId) ??
    urun?.porsiyonlar.find((p) => p.varsayilan) ??
    urun?.porsiyonlar[0]
  );
}

// Menü ürününün maliyeti içindekilerden çıkar, elle girilmez.
export function menuMaliyeti(gruplar: MenuIcerikGrubu[], urunler: MenuUrun[]) {
  let toplam = 0;
  for (const g of gruplar) {
    for (const s of grubunVarsayilanSecimi(g)) {
      toplam += (icerikPorsiyonu(s, urunler)?.maliyet ?? 0) * s.miktar;
    }
  }
  return toplam;
}

// İçerik ürünlerinin hepsinde maliyet girili mi — girili değilse "₺0" yanıltıcı olur.
export function maliyetEksikMi(gruplar: MenuIcerikGrubu[], urunler: MenuUrun[]) {
  return gruplar.some((g) =>
    grubunVarsayilanSecimi(g).some((s) => icerikPorsiyonu(s, urunler)?.maliyet == null)
  );
}

// En fazla bu kadar KDV grubu tanımlanabilir — Adisyo'da da liste kısa tutulmuş.
export const KDV_SINIRI = 8;

// Ürünün KDV grubu: kendi seçtiği → yoksa varsayılan işaretli grup.
export function urunKdv(u: MenuUrun, kdvler: MenuKdv[]) {
  return kdvler.find((k) => k.id === u.kdvId) ?? kdvler.find((k) => k.varsayilan);
}

export function altKategoriler(hepsi: MenuKategori[], ustId: number) {
  return hepsi.filter((k) => k.ustId === ustId).sort((a, b) => a.sira - b.sira);
}

// Liste sırası: her ana kategori, hemen ardından kendi alt kategorileri.
// Üstü silinmiş/gizlenmiş bir alt kategori ortada kalmasın diye kök sayılır.
export function kategoriAgaci(hepsi: MenuKategori[]) {
  const kokler = hepsi
    .filter((k) => !k.ustId || !hepsi.some((x) => x.id === k.ustId))
    .sort((a, b) => a.sira - b.sira);
  return kokler.flatMap((k) => [k, ...altKategoriler(hepsi, k.id)]);
}

// Üst kategoriye basınca alt kategorilerin ürünleri de gelir — sipariş ekranında
// hiçbir ürün erişilemez kalmasın diye. Aynı ürün iki yerdeyse bir kez listelenir.
export function agacUrunleri(urunler: MenuUrun[], kategoriler: MenuKategori[], kategoriId: number) {
  const idler = [kategoriId, ...altKategoriler(kategoriler, kategoriId).map((k) => k.id)];
  const gorulen = new Set<number>();
  const liste: MenuUrun[] = [];
  for (const id of idler) {
    for (const u of kategoriUrunleri(urunler, id)) {
      if (u.id && gorulen.has(u.id)) continue;
      if (u.id) gorulen.add(u.id);
      liste.push(u);
    }
  }
  return liste;
}

/**
 * QR menü alanlarının boş hâli. Yeni ürün açan her yer bu listeyi tek tek
 * yazmasın: alan eklendiğinde tek yerden geliyor.
 */
export const bosMenuAlanlari = () => ({
  aciklama: "",
  hazirlanmaDk: 0,
  kalori: 0,
  gramaj: 0,
  alerjenler: [] as string[],
  tukendi: false,
  medya: [] as UrunMedya[],
});

const say = (v: any) => (v == null ? undefined : Number(v));

// Menü kasadaki en kritik okuma: yüklenemezse garson ürün bile seçemiyor.
// Bağlantı koptuğunda cihazdaki son kopya devreye giriyor (bkz. onbellek.ts).
export function menuGetir() {
  return onbellekliGetir("menu", menuOku);
}

/**
 * Porsiyon maliyetleri menüyle birlikte gelmiyor.
 *
 * Maliyet kâr marjı demek: ne aldığını ve ne kazandığını gösteriyor. Menü
 * her satış ekranında okunuyor, maliyet oraya karışırsa sipariş alan herkes
 * marjı görür. Bu yüzden ayrı bir istek — ve sunucu tarafında `tanim.menu`
 * yetkisi olmayana boş dönüyor. Cihaza da kopyalanmıyor.
 */
export async function maliyetleriGetir(): Promise<Map<number, number>> {
  const { data } = await supabase.from("porsiyon_maliyetleri").select("id, maliyet");
  const harita = new Map<number, number>();
  for (const p of ((data as any[]) ?? [])) {
    if (p.maliyet != null) harita.set(p.id, Number(p.maliyet));
  }
  return harita;
}

/** Menüden gelen ürünlere maliyeti işler — menü ekranları bunu kullanıyor. */
export function maliyetleriIsle(urunler: MenuUrun[], harita: Map<number, number>) {
  return urunler.map((u) => ({
    ...u,
    porsiyonlar: u.porsiyonlar.map((p) => ({
      ...p,
      maliyet: p.id != null ? harita.get(p.id) : undefined,
    })),
  }));
}

async function menuOku() {
  const [kat, urn, grp, brm, kdv] = await Promise.all([
    supabase
      .from("kategoriler")
      .select(
        "id, ad, renk, sira, satista_gorunur, mutfakta_gorunur, ust_id, istasyon_id, aciklama, gorsel"
      )
      .order("sira"),
    supabase
      .from("urunler")
      .select(
        "id, ad, kod, kdv_id, istasyon_id, renk, favori, satista_gorunur, mutfakta_gorunur, aciklama, hazirlanma_dk, kalori, gramaj, alerjenler, etiket, tukendi, urun_medya(id, yol, tur, sira), porsiyonlar(id, birim_id, fiyat, barkod, masa_fiyat, gelal_fiyat, paket_fiyat, varsayilan, sira, porsiyon_secenek_gruplari(grup_id)), urun_kategorileri(kategori_id, sira), menu_gruplari(id, baslik, secilebilir_adet, sira, menu_satirlari(id, urun_id, porsiyon_id, miktar, ek_fiyat, varsayilan, sira))"
      ),
    supabase
      .from("secenek_gruplari")
      .select("id, ad, tekli, zorunlu, en_az, sira, secenekler(id, ad, ek_fiyat, sira, varsayilan)")
      .order("sira"),
    supabase.from("birimler").select("id, ad, sira, varsayilan").order("sira"),
    supabase.from("kdv_gruplari").select("id, ad, oran, varsayilan, sira").order("sira"),
  ]);
  hataysaFirlat(kat, urn, grp, brm, kdv);

  const kategoriler: MenuKategori[] = kategoriAgaci(
    (kat.data ?? []).map((k: any) => ({
      id: k.id,
      ad: k.ad,
      renk: k.renk,
      sira: k.sira,
      ustId: k.ust_id ?? undefined,
      istasyonId: k.istasyon_id ?? undefined,
      satistaGorunur: k.satista_gorunur,
      mutfaktaGorunur: k.mutfakta_gorunur,
      aciklama: k.aciklama ?? "",
      gorsel: k.gorsel ?? undefined,
    }))
  );
  const birimler = (brm.data ?? []) as MenuBirim[];
  const kdvler: MenuKdv[] = (kdv.data ?? []).map((k: any) => ({ ...k, oran: Number(k.oran) }));

  const urunler: MenuUrun[] = (urn.data ?? []).map((u: any) => ({
    id: u.id,
    ad: u.ad,
    kod: u.kod ?? undefined,
    kdvId: u.kdv_id ?? undefined,
    istasyonId: u.istasyon_id ?? undefined,
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
        // Maliyet burada gelmiyor; menü ekranları maliyetleriGetir() ile ekliyor.
        barkod: p.barkod ?? undefined,
        masaFiyat: say(p.masa_fiyat),
        gelalFiyat: say(p.gelal_fiyat),
        paketFiyat: say(p.paket_fiyat),
        varsayilan: p.varsayilan,
        grupIdler: (p.porsiyon_secenek_gruplari ?? []).map((x: any) => x.grup_id),
      })),
    menuGruplari: (u.menu_gruplari ?? [])
      .slice()
      .sort((a: any, b: any) => a.sira - b.sira)
      .map((g: any) => ({
        id: g.id,
        baslik: g.baslik,
        secilebilir: g.secilebilir_adet,
        satirlar: (g.menu_satirlari ?? [])
          .slice()
          .sort((a: any, b: any) => a.sira - b.sira)
          .map((s: any) => ({
            id: s.id,
            urunId: s.urun_id,
            porsiyonId: s.porsiyon_id ?? undefined,
            miktar: Number(s.miktar),
            ekFiyat: Number(s.ek_fiyat),
            varsayilan: s.varsayilan,
          })),
      })),
    kategoriIdler: (u.urun_kategorileri ?? []).map((x: any) => x.kategori_id),
    kategoriSira: Object.fromEntries(
      (u.urun_kategorileri ?? []).map((x: any) => [x.kategori_id, x.sira])
    ),
    aciklama: u.aciklama ?? "",
    hazirlanmaDk: u.hazirlanma_dk ?? 0,
    kalori: u.kalori ?? 0,
    gramaj: u.gramaj ?? 0,
    alerjenler: u.alerjenler ?? [],
    etiket: u.etiket ?? undefined,
    tukendi: u.tukendi ?? false,
    medya: (u.urun_medya ?? [])
      .slice()
      .sort((a: any, b: any) => a.sira - b.sira)
      .map((m: any) => ({ id: m.id, yol: m.yol, tur: m.tur })),
  }));

  const gruplar: MenuSecenekGrubu[] = (grp.data ?? []).map((g: any) => ({
    id: g.id,
    ad: g.ad,
    tekli: g.tekli,
    zorunlu: g.zorunlu,
    enAz: g.en_az ?? 0,
    liste: (g.secenekler ?? [])
      .slice()
      .sort((a: any, b: any) => a.sira - b.sira)
      .map((s: any) => ({
        id: s.id,
        ad: s.ad,
        ekFiyat: Number(s.ek_fiyat),
        varsayilan: s.varsayilan ?? false,
      })),
  }));

  return { kategoriler, urunler, gruplar, birimler, kdvler };
}

export type KategoriAlanlari = {
  ad: string;
  renk: string;
  ustId?: number;
  istasyonId?: number;
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
  aciklama: string;
  gorsel?: string;
};

const kategoriSatiri = (k: KategoriAlanlari) => ({
  ad: k.ad,
  renk: k.renk,
  ust_id: k.ustId ?? null,
  istasyon_id: k.istasyonId ?? null,
  satista_gorunur: k.satistaGorunur,
  mutfakta_gorunur: k.mutfaktaGorunur,
  aciklama: k.aciklama,
  gorsel: k.gorsel ?? null,
});

// Sıra kardeşler arasında geçerli: ana kategoriler kendi arasında, bir üstün
// altındakiler kendi arasında 1'den başlar.
async function kardesSonSira(ustId?: number) {
  const temel = supabase.from("kategoriler").select("sira");
  const suzulmus = ustId ? temel.eq("ust_id", ustId) : temel.is("ust_id", null);
  const { data } = await suzulmus.order("sira", { ascending: false }).limit(1).maybeSingle();
  return data?.sira ?? 0;
}

export async function kategoriEkle(k: KategoriAlanlari) {
  const sira = (await kardesSonSira(k.ustId)) + 1;
  await supabase.from("kategoriler").insert({ ...kategoriSatiri(k), sira });
}

export async function kategoriGuncelle(id: number, k: KategoriAlanlari) {
  // Üst kategori değiştiyse eski sıra yeni kardeşlerin arasında çakışır — sona alınır.
  const { data: eski } = await supabase
    .from("kategoriler")
    .select("ust_id")
    .eq("id", id)
    .maybeSingle();
  const tasindi = (eski?.ust_id ?? undefined) !== k.ustId;
  const satir = tasindi
    ? { ...kategoriSatiri(k), sira: (await kardesSonSira(k.ustId)) + 1 }
    : kategoriSatiri(k);

  await supabase.from("kategoriler").update(satir).eq("id", id);
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
    kdv_id: u.kdvId ?? null,
    istasyon_id: u.istasyonId ?? null,
    renk: u.renk ?? null,
    favori: u.favori,
    satista_gorunur: u.satistaGorunur,
    mutfakta_gorunur: u.mutfaktaGorunur,
    aciklama: u.aciklama,
    hazirlanma_dk: u.hazirlanmaDk,
    kalori: u.kalori,
    gramaj: u.gramaj,
    alerjenler: u.alerjenler,
    etiket: u.etiket ?? null,
    tukendi: u.tukendi,
  };

  // Güncellemede kaç satır döndüğüne bakılıyor. Ürün bu arada silinmişse
  // (başka cihaz ya da aynı ekranda yapılan silme) veritabanı hata vermiyor,
  // sessizce hiçbir şey yapmıyordu: program "yazıldı" der, ortada hiçbir şey
  // olmazdı. Böyle bir durumda ürün yeniden açılıyor.
  let yenidenAcildi = false;

  if (id) {
    const { data, error } = await supabase
      .from("urunler")
      .update(alanlar)
      .eq("id", id)
      .select("id");
    if (error) return yazmaHatasi(error);
    if (!data?.length) {
      id = undefined;
      yenidenAcildi = true;
    }
  }

  if (!id) {
    const { data, error } = await supabase.from("urunler").insert(alanlar).select("id").single();
    if (error) return yazmaHatasi(error);
    id = data?.id;
  }
  if (!id) return;

  // Ürün yeniden açıldıysa eski porsiyon numaraları da yok; hepsi yeni yazılır.
  if (yenidenAcildi) u = { ...u, porsiyonlar: u.porsiyonlar.map(({ id: _, ...p }) => p) };

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

  await menuGruplariYaz(id, u.menuGruplari);
  await urunMedyasiYaz(id, u.medya);
}

// Medya satırları silinip yeniden yazılıyor: sıralarını da kullanıcı
// değiştiriyor, tek tek güncellemek yerine liste baştan kuruluyor. Dosyanın
// kendisi depoda duruyor, satırın silinmesi dosyayı silmiyor.
async function urunMedyasiYaz(urunId: number, medya: UrunMedya[]) {
  await supabase.from("urun_medya").delete().eq("urun_id", urunId);
  if (!medya.length) return;
  await supabase.from("urun_medya").insert(
    medya.slice(0, 3).map((m, i) => ({
      urun_id: urunId,
      yol: m.yol,
      tur: m.tur,
      sira: i + 1,
    }))
  );
}

// Menü grupları silinip yeniden yazılıyor — satırlara bağlı başka kayıt yok,
// sipariş kalemleri ürüne bağlı.
async function menuGruplariYaz(urunId: number, gruplar: MenuIcerikGrubu[]) {
  await supabase.from("menu_gruplari").delete().eq("urun_id", urunId);

  for (const [i, g] of gruplar.entries()) {
    const { data } = await supabase
      .from("menu_gruplari")
      .insert({
        urun_id: urunId,
        baslik: g.baslik,
        secilebilir_adet: g.secilebilir,
        sira: i + 1,
      })
      .select("id")
      .single();

    if (!data?.id || !g.satirlar.length) continue;
    await supabase.from("menu_satirlari").insert(
      g.satirlar.map((s, j) => ({
        grup_id: data.id,
        urun_id: s.urunId,
        porsiyon_id: s.porsiyonId ?? null,
        miktar: s.miktar,
        ek_fiyat: s.ekFiyat,
        varsayilan: s.varsayilan,
        sira: j + 1,
      }))
    );
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
      kdv_id: kaynak.kdvId ?? null,
      istasyon_id: kaynak.istasyonId ?? null,
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

  await menuGruplariYaz(id, kaynak.menuGruplari);

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
  kdvId?: number;
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
          kdv_id: u.kdvId ?? null,
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
  enAz: number,
  liste: { ad: string; ekFiyat: number; varsayilan?: boolean }[]
) {
  let grupId = id;

  if (grupId) {
    await supabase.from("secenek_gruplari").update({ ad, tekli, zorunlu, en_az: enAz }).eq("id", grupId);
  } else {
    const { data } = await supabase
      .from("secenek_gruplari")
      .insert({ ad, tekli, zorunlu, en_az: enAz })
      .select("id")
      .single();
    grupId = data?.id;
  }
  if (!grupId) return;

  await supabase.from("secenekler").delete().eq("grup_id", grupId);
  if (liste.length) {
    await supabase.from("secenekler").insert(
      liste.map((s, i) => ({
        grup_id: grupId,
        ad: s.ad,
        ek_fiyat: s.ekFiyat,
        sira: i + 1,
        varsayilan: s.varsayilan ?? false,
      }))
    );
  }
}

export async function grupSil(id: number) {
  await supabase.from("secenek_gruplari").delete().eq("id", id);
}

export async function birimleriKaydet(
  liste: { id?: number; ad: string; varsayilan?: boolean }[],
  silinenler: number[]
) {
  if (silinenler.length) {
    await supabase.from("birimler").delete().in("id", silinenler);
  }

  const yeniler = liste.filter((b) => !b.id);
  if (yeniler.length) {
    await supabase.from("birimler").insert(
      yeniler.map((b) => ({
        ad: b.ad,
        sira: liste.indexOf(b) + 1,
        varsayilan: !!b.varsayilan,
      }))
    );
  }

  for (const [i, b] of liste.entries()) {
    if (b.id)
      await supabase
        .from("birimler")
        .update({ ad: b.ad, sira: i + 1, varsayilan: !!b.varsayilan })
        .eq("id", b.id);
  }
}
export type KdvSatiri = { id?: number; ad: string; oran: number; varsayilan: boolean };

export async function kdvKaydet(liste: KdvSatiri[], silinenler: number[]) {
  if (silinenler.length) {
    // Silinen grubu kullanan ürünler varsayılana düşer.
    await supabase.from("urunler").update({ kdv_id: null }).in("kdv_id", silinenler);
    await supabase.from("kdv_gruplari").delete().in("id", silinenler);
  }

  const yeniler = liste.filter((k) => !k.id);
  if (yeniler.length) {
    await supabase.from("kdv_gruplari").insert(
      yeniler.map((k) => ({
        ad: k.ad,
        oran: k.oran,
        varsayilan: k.varsayilan,
        sira: liste.indexOf(k) + 1,
      }))
    );
  }

  for (const [i, k] of liste.entries()) {
    if (k.id)
      await supabase
        .from("kdv_gruplari")
        .update({ ad: k.ad, oran: k.oran, varsayilan: k.varsayilan, sira: i + 1 })
        .eq("id", k.id);
  }
}
