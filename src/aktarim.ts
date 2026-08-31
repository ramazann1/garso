import { paraGoster } from "./para";
import { bosMenuAlanlari, kategoriUrunleri, varsayilanBirim, urunKdv } from "./menu";
import type { MenuBirim, MenuKategori, MenuKdv, MenuPorsiyon, MenuUrun } from "./types";

// Dosya gerçek .xlsx: çift tıklayınca hiçbir soru sormadan açılıyor. Okuma ve
// yazma kütüphaneleri sekme açıldığında yükleniyor, program açılışına binmiyor.
export const BASLIKLAR = [
  "Ürün No",
  "Ana Kategori",
  "Alt Kategori",
  "Ürün Adı",
  "Ürün Kodu",
  "Barkod",
  "Birim",
  "KDV Oranı",
  "Fiyat",
  "Masa Fiyatı",
  "Gel-Al Fiyatı",
  "Paket Fiyatı",
  "Maliyet",
] as const;

export type AktarimSatiri = Record<(typeof BASLIKLAR)[number], string>;

export type AktarimHatasi = { satir: number; mesaj: string };

// Ürünün dosyada geçtiği yer. Kategori henüz açılmamış olabileceği için burada
// id değil ad tutuluyor; id'ler yazma sırasında çözülüyor.
export type KategoriYeri = { ana: string; alt: string };

export type AktarimUrunu = {
  urun: MenuUrun;
  yerler: KategoriYeri[];
  yeni: boolean;
  /**
   * Ürünün nesi değişiyor — "Fiyat 45,00 ₺ → 50,00 ₺" gibi okunur cümleler.
   * Önizleme penceresi bunu yazıyor: "5 ürün güncellenecek" tek başına hangi
   * ürünün neresine dokunulduğunu söylemiyordu, üzerine yazılan menü de geri
   * alınamıyor.
   */
  degisiklikler: string[];
};

export type AktarimPlani = {
  urunler: AktarimUrunu[];
  yeniKategoriler: KategoriYeri[];
  degismeyen: number;
  hatalar: AktarimHatasi[];
  /**
   * Dosyanın ham satırları planla birlikte taşınıyor: önizleme ile yazma
   * arasında menü değişebiliyor (başka cihaz, aynı ekranda yapılan silme) ve
   * plan yazmadan hemen önce güncel menüyle baştan kuruluyor.
   */
  satirlar: AktarimSatiri[];
};

const kucuk = (s: string) => s.trim().toLocaleLowerCase("tr");

const sayi = (s: string) => {
  const temiz = s.replace(/\s/g, "").replace(",", ".");
  if (temiz === "") return undefined;
  const n = Number(temiz);
  return Number.isFinite(n) ? n : null; // null = yazılmış ama sayı değil
};

// Sayı sütunları Number olarak yazılıyor ki Excel'de sağa yaslansın ve üzerinde
// hesap yapılabilsin. Tip yalnızca derleme sırasında okunuyor, kütüphane bu
// dosyayla birlikte yüklenmiyor.
type Hucre = import("write-excel-file/browser").CellObject | null;

const yazi = (v?: string): Hucre => (v ? { value: v, type: String } : null);
const rakam = (v?: number): Hucre => (v == null ? null : { value: v, type: Number });

// Sütun genişlikleri karakter sayısı: başlık sığacak kadar, bir harf fazla değil.
export const SUTUN_GENISLIKLERI = [8, 15, 13, 20, 10, 11, 7, 10, 8, 11, 12, 11, 8];

export function tabloUret(urunler: MenuUrun[], kategoriler: MenuKategori[], kdvler: MenuKdv[]) {
  const satirlar: Hucre[][] = [
    BASLIKLAR.map((b): Hucre => ({ value: b, type: String, fontWeight: "bold" })),
  ];

  const yaz = (u: MenuUrun, p: MenuPorsiyon, ana: string, alt: string) =>
    satirlar.push([
      rakam(u.id),
      yazi(ana),
      yazi(alt),
      yazi(u.ad),
      yazi(u.kod),
      yazi(p.barkod),
      yazi(p.ad),
      rakam(urunKdv(u, kdvler)?.oran),
      rakam(p.fiyat),
      rakam(p.masaFiyat),
      rakam(p.gelalFiyat),
      rakam(p.paketFiyat),
      rakam(p.maliyet),
    ]);

  // Kampanyalı menüler dışarıda: içerik grupları tabloya sığmıyor, yarım
  // aktarılırsa geri yüklerken içerikleri silinmiş olurdu.
  const yazilabilir = (u: MenuUrun) => !u.menuGruplari.length && u.porsiyonlar.length > 0;

  // Tablonun sırası menünün sırası: kategoriler soldaki listedeki sırayla,
  // her kategorinin içinde ürünler kendi sırasıyla. Ürün iki kategorideyse
  // her ikisinin altında da görünür.
  for (const k of kategoriler) {
    const ust = k.ustId ? kategoriler.find((x) => x.id === k.ustId) : undefined;
    const ana = ust ? ust.ad : k.ad;
    const alt = ust ? k.ad : "";

    for (const u of kategoriUrunleri(urunler, k.id)) {
      if (!yazilabilir(u)) continue;
      for (const p of u.porsiyonlar) yaz(u, p, ana, alt);
    }
  }

  // Hiçbir kategoriye bağlı olmayan ürünler en sona; kategori sütunu boş kalır.
  for (const u of urunler) {
    if (!yazilabilir(u) || u.kategoriIdler.length) continue;
    for (const p of u.porsiyonlar) yaz(u, p, "", "");
  }

  return satirlar;
}

// Okunan tabloda hücreler sayı, yazı ya da boş gelebiliyor; hepsi metne
// çevrilip doğrulamaya öyle giriyor.
const hucreMetni = (v: unknown) => (v == null ? "" : String(v).trim());

export function satirlariOku(tablo: unknown[][]): AktarimSatiri[] {
  const dolu = tablo.filter((s) => s.some((h) => hucreMetni(h) !== ""));
  if (!dolu.length) return [];

  const basliklar = dolu[0].map((b) => kucuk(hucreMetni(b)));
  const yeri = (ad: string) => basliklar.indexOf(kucuk(ad));

  return dolu.slice(1).map((satir) => {
    const kayit = {} as AktarimSatiri;
    for (const b of BASLIKLAR) {
      const i = yeri(b);
      kayit[b] = i >= 0 ? hucreMetni(satir[i]) : "";
    }
    return kayit;
  });
}

type Kaynak = {
  urunler: MenuUrun[];
  kategoriler: MenuKategori[];
  birimler: MenuBirim[];
  kdvler: MenuKdv[];
};

// Bir satırın çözülmüş hali — doğrulamayı geçtiyse plana giriyor.
type CozulmusSatir = {
  satirNo: number;
  urunNo?: number;
  ad: string;
  kod: string;
  barkod: string;
  yer: KategoriYeri;
  kdvMetin: string; // çakışma mesajında oran gösterilsin diye ham hâli
  birimId?: number;
  birimAd: string;
  kdvId?: number;
  fiyat: number;
  masaFiyat?: number;
  gelalFiyat?: number;
  paketFiyat?: number;
  maliyet?: number;
};

// Ürünün menüdeki yeri "Ana › Alt" biçiminde; kategori karşılaştırması bunun
// üzerinden yapılıyor çünkü dosyada id değil ad var.
const yerAnahtari = (ana: string, alt: string) => `${kucuk(ana)}›${kucuk(alt)}`;

const mevcutYerleri = (u: MenuUrun, kategoriler: MenuKategori[]) =>
  u.kategoriIdler.map((id) => {
    const k = kategoriler.find((x) => x.id === id);
    if (!k) return "";
    const ust = k.ustId ? kategoriler.find((x) => x.id === k.ustId) : undefined;
    return ust ? yerAnahtari(ust.ad, k.ad) : yerAnahtari(k.ad, "");
  });


/** Kategorinin okunur adı: "İçecek › Sıcak İçecek". */
const yerAdi = (y: KategoriYeri) => (y.alt ? `${y.ana} › ${y.alt}` : y.ana);

const mevcutYerAdlari = (u: MenuUrun, kategoriler: MenuKategori[]) =>
  u.kategoriIdler.map((id) => {
    const k = kategoriler.find((x) => x.id === id);
    if (!k) return "";
    const ust = k.ustId ? kategoriler.find((x) => x.id === k.ustId) : undefined;
    return ust ? `${ust.ad} › ${k.ad}` : k.ad;
  });

const kdvAdi = (id: number | undefined, kdvler: MenuKdv[]) => {
  const k = kdvler.find((x) => x.id === id);
  return k ? `%${k.oran}` : "varsayılan";
};

/** Tek bir alanın değişimi: değişmemişse hiç satır çıkmıyor. */
const fark = (etiket: string, eski: string, yeni: string) =>
  eski === yeni ? null : `${etiket}: ${eski} → ${yeni}`;

const porsiyonAdi = (p: MenuPorsiyon, birimler: MenuBirim[]) =>
  p.ad || birimler.find((b) => b.id === p.birimId)?.ad || "Porsiyon";

/**
 * Dosyanın üründe neyi değiştirdiği, okunur cümleler hâlinde. Boş dizi dönmesi
 * "bu ürün aynı kalmış" demek; plan da bunu kullanıyor, ayrıca bir karşılaştırma
 * yapılmıyor ki iki yerde iki farklı sonuç çıkmasın.
 */
function urunFarklari(
  mevcut: MenuUrun,
  yeni: MenuUrun,
  yerler: KategoriYeri[],
  kategoriler: MenuKategori[],
  birimler: MenuBirim[],
  kdvler: MenuKdv[]
): string[] {
  const cikan: (string | null)[] = [
    fark("Ad", mevcut.ad, yeni.ad),
    fark("Ürün kodu", mevcut.kod || "yok", yeni.kod || "yok"),
    fark("KDV", kdvAdi(mevcut.kdvId, kdvler), kdvAdi(yeni.kdvId, kdvler)),
  ];

  const eskiYerler = mevcutYerAdlari(mevcut, kategoriler);
  const yeniYerler = yerler.map(yerAdi);
  const eskiAnahtar = mevcutYerleri(mevcut, kategoriler);
  const yeniAnahtar = yerler.map((y) => yerAnahtari(y.ana, y.alt));
  if (
    eskiAnahtar.length !== yeniAnahtar.length ||
    yeniAnahtar.some((y) => !eskiAnahtar.includes(y))
  ) {
    cikan.push(`Kategori: ${eskiYerler.join(", ") || "yok"} → ${yeniYerler.join(", ")}`);
  }

  // Porsiyonlar birime göre eşleşiyor; dosyada olmayan porsiyon silinmediği için
  // burada yalnız "değişti" ve "eklenecek" durumu çıkıyor.
  for (const p of yeni.porsiyonlar) {
    const ad = porsiyonAdi(p, birimler);
    const eski = mevcut.porsiyonlar.find((e) => e.birimId === p.birimId);
    if (!eski) {
      cikan.push(`Yeni porsiyon: ${ad} · ${paraGoster(p.fiyat)}`);
      continue;
    }
    cikan.push(
      fark(`${ad} fiyatı`, paraGoster(eski.fiyat), paraGoster(p.fiyat)),
      fark(`${ad} maliyeti`, paraGoster(eski.maliyet ?? 0), paraGoster(p.maliyet ?? 0)),
      fark(`${ad} barkodu`, eski.barkod || "yok", p.barkod || "yok"),
      fark(`${ad} masa fiyatı`, paraGoster(eski.masaFiyat ?? 0), paraGoster(p.masaFiyat ?? 0)),
      fark(`${ad} gel al fiyatı`, paraGoster(eski.gelalFiyat ?? 0), paraGoster(p.gelalFiyat ?? 0)),
      fark(`${ad} paket fiyatı`, paraGoster(eski.paketFiyat ?? 0), paraGoster(p.paketFiyat ?? 0))
    );
  }

  return cikan.filter((s): s is string => s !== null);
}

export function planHazirla(satirlar: AktarimSatiri[], kaynak: Kaynak): AktarimPlani {
  const { urunler, kategoriler, birimler, kdvler } = kaynak;
  const hatalar: AktarimHatasi[] = [];
  const cozulenler: CozulmusSatir[] = [];

  satirlar.forEach((s, i) => {
    const satirNo = i + 2; // başlık satırı 1'inci
    const hata = (mesaj: string) => hatalar.push({ satir: satirNo, mesaj });

    const ad = s["Ürün Adı"].trim();
    if (!ad) {
      hata("Ürün adı boş");
      return;
    }

    if (!s["Ana Kategori"].trim()) {
      hata(`"${ad}" — ana kategori boş`);
      return;
    }
    const yer: KategoriYeri = { ana: s["Ana Kategori"].trim(), alt: s["Alt Kategori"].trim() };

    const fiyat = sayi(s["Fiyat"]);
    if (fiyat == null) {
      hata(`"${ad}" — fiyat ${s["Fiyat"].trim() ? "sayı değil" : "boş"}`);
      return;
    }

    let birim: MenuBirim | undefined;
    if (s["Birim"].trim()) {
      birim = birimler.find((b) => kucuk(b.ad) === kucuk(s["Birim"]));
      if (!birim) {
        hata(`"${ad}" — "${s["Birim"].trim()}" diye bir birim yok`);
        return;
      }
    } else birim = varsayilanBirim(birimler);

    let kdvId: number | undefined;
    if (s["KDV Oranı"].trim()) {
      const oran = sayi(s["KDV Oranı"]);
      const kdv = oran == null ? undefined : kdvler.find((k) => k.oran === oran);
      if (!kdv) {
        hata(`"${ad}" — %${s["KDV Oranı"].trim()} oranlı bir KDV grubu yok`);
        return;
      }
      kdvId = kdv.id;
    }

    let urunNo: number | undefined;
    if (s["Ürün No"].trim()) {
      urunNo = Number(s["Ürün No"].trim());
      if (!Number.isInteger(urunNo)) {
        hata(`"${ad}" — ürün no sayı değil`);
        return;
      }
      if (!urunler.some((u) => u.id === urunNo)) {
        hata(`"${ad}" — ${urunNo} numaralı ürün menüde yok`);
        return;
      }
    }

    const sayisal = (baslik: (typeof BASLIKLAR)[number]) => {
      const v = sayi(s[baslik]);
      if (v === null) {
        hata(`"${ad}" — ${baslik.toLocaleLowerCase("tr")} sayı değil`);
        return null;
      }
      return v;
    };

    const masaFiyat = sayisal("Masa Fiyatı");
    const gelalFiyat = sayisal("Gel-Al Fiyatı");
    const paketFiyat = sayisal("Paket Fiyatı");
    const maliyet = sayisal("Maliyet");
    if (masaFiyat === null || gelalFiyat === null || paketFiyat === null || maliyet === null) return;

    cozulenler.push({
      satirNo,
      urunNo,
      ad,
      kod: s["Ürün Kodu"].trim(),
      barkod: s["Barkod"].trim(),
      yer,
      kdvMetin: s["KDV Oranı"].trim(),
      birimId: birim?.id,
      birimAd: birim?.ad ?? "",
      kdvId,
      fiyat,
      masaFiyat,
      gelalFiyat,
      paketFiyat,
      maliyet,
    });
  });

  // Aynı ürünün satırları bir araya toplanır: ürün no → ürün kodu → ürün adı.
  // Ürün no dosyayı indirdiğinde kendiliğinden geliyor; ad ve kod ancak elle
  // yazılmış dosyalarda devreye girer.
  const anahtar = (s: CozulmusSatir) =>
    s.urunNo != null ? `no:${s.urunNo}` : s.kod ? `kod:${kucuk(s.kod)}` : `ad:${kucuk(s.ad)}`;

  const gruplar = new Map<string, CozulmusSatir[]>();
  for (const s of cozulenler) {
    const a = anahtar(s);
    gruplar.set(a, [...(gruplar.get(a) ?? []), s]);
  }

  const cikan: AktarimUrunu[] = [];
  let degismeyen = 0;

  for (const satirGrubu of gruplar.values()) {
    const ilk = satirGrubu[0];

    let mevcut: MenuUrun | undefined;
    if (ilk.urunNo != null) {
      mevcut = urunler.find((u) => u.id === ilk.urunNo);
    } else if (ilk.kod) {
      mevcut = urunler.find((u) => kucuk(u.kod ?? "") === kucuk(ilk.kod));
    } else {
      const adaUyanlar = urunler.filter((u) => kucuk(u.ad) === kucuk(ilk.ad));
      if (adaUyanlar.length > 1) {
        for (const s of satirGrubu) {
          hatalar.push({
            satir: s.satirNo,
            mesaj: `"${ilk.ad}" adında ${adaUyanlar.length} ürün var, hangisi olduğu belli değil — Ürün No sütununu doldur`,
          });
        }
        continue;
      }
      mevcut = adaUyanlar[0];
    }

    // Kampanyalı menüler tabloda temsil edilemiyor; üzerine yazılmaz.
    if (mevcut?.menuGruplari.length) {
      for (const s of satirGrubu) {
        hatalar.push({
          satir: s.satirNo,
          mesaj: `"${mevcut.ad}" kampanyalı bir menü, Excel'den düzenlenemez`,
        });
      }
      continue;
    }

    // Bir ürün birden fazla kategorideyse tabloda birden fazla satırı olur ve o
    // satırlar aynı şeyi söylemek zorundadır. Biri düzeltilip öteki unutulursa
    // hangisinin geçerli olduğunu program bilemez; sessizce birini seçmek yerine
    // ürünü hiç yazmayıp çelişkiyi gösteriyoruz.
    if (satirGrubu.length > 1) {
      const catismalar: string[] = [];
      const kontrol = (
        etiket: string,
        deger: (s: CozulmusSatir) => string | number | undefined,
        kume: CozulmusSatir[]
      ) => {
        const farkli = [...new Set(kume.map((s) => String(deger(s) ?? "")))];
        if (farkli.length > 1) catismalar.push(`${etiket}: ${farkli.join(" / ")}`);
      };

      kontrol("ürün adı", (s) => s.ad, satirGrubu);
      kontrol("ürün kodu", (s) => s.kod, satirGrubu);
      kontrol("KDV oranı", (s) => s.kdvMetin, satirGrubu);

      // Fiyat ve maliyet porsiyona ait; yalnızca aynı birimdeki satırlar kıyaslanır.
      for (const birimId of new Set(satirGrubu.map((s) => s.birimId))) {
        const ayniBirim = satirGrubu.filter((s) => s.birimId === birimId);
        if (ayniBirim.length < 2) continue;
        const not = ayniBirim[0].birimAd ? ` (${ayniBirim[0].birimAd})` : "";
        kontrol(`fiyat${not}`, (s) => s.fiyat, ayniBirim);
        kontrol(`maliyet${not}`, (s) => s.maliyet, ayniBirim);
        kontrol(`barkod${not}`, (s) => s.barkod, ayniBirim);
        kontrol(`masa fiyatı${not}`, (s) => s.masaFiyat, ayniBirim);
        kontrol(`gel-al fiyatı${not}`, (s) => s.gelalFiyat, ayniBirim);
        kontrol(`paket fiyatı${not}`, (s) => s.paketFiyat, ayniBirim);
      }

      if (catismalar.length) {
        const satirNolar = satirGrubu.map((s) => s.satirNo).join(", ");
        hatalar.push({
          satir: ilk.satirNo,
          mesaj:
            `"${ilk.ad}" aynı ürün olarak ${satirNolar}. satırlarda geçiyor ama satırlar ` +
            `farklı şeyler söylüyor — ${catismalar.join("; ")}. Bu satırlarda değerler aynı olmalı.`,
        });
        continue;
      }
    }

    // Porsiyonlar birime göre eşleşir: dosyadaki birim üründe varsa güncellenir,
    // yoksa eklenir. Dosyada geçmeyen porsiyon silinmez — silme Excel'den yapılmaz.
    const porsiyonlar: MenuPorsiyon[] = (mevcut?.porsiyonlar ?? []).map((p) => ({ ...p }));

    for (const s of satirGrubu) {
      const eski = porsiyonlar.find((p) => p.birimId === s.birimId);
      const alanlar = {
        birimId: s.birimId,
        ad: s.birimAd,
        fiyat: s.fiyat,
        maliyet: s.maliyet,
        barkod: s.barkod || undefined,
        masaFiyat: s.masaFiyat,
        gelalFiyat: s.gelalFiyat,
        paketFiyat: s.paketFiyat,
      };
      if (eski) Object.assign(eski, alanlar);
      else porsiyonlar.push({ ...alanlar, varsayilan: false, grupIdler: [] });
    }

    if (!porsiyonlar.some((p) => p.varsayilan)) porsiyonlar[0].varsayilan = true;

    // Ürünün dosyada geçtiği kategoriler; aynı yer iki kez yazılmışsa bir kez sayılır.
    const yerler: KategoriYeri[] = [];
    for (const s of satirGrubu) {
      if (!yerler.some((y) => kucuk(y.ana) === kucuk(s.yer.ana) && kucuk(y.alt) === kucuk(s.yer.alt)))
        yerler.push(s.yer);
    }

    const urun: MenuUrun = {
      // Yeni ürün menünün kendi varsayılanlarıyla açılıyor. Alanlar tek tek
      // yazılsaydı biri unutulurdu: görsel listesi eksik kalınca kaydetme
      // yarıda patlıyordu ve ürün yarım yazılmış hâlde kalıyordu.
      ...(mevcut ?? {
        ...bosMenuAlanlari(),
        favori: false,
        satistaGorunur: true,
        mutfaktaGorunur: true,
        menuGruplari: [],
        kategoriSira: {},
      }),
      id: mevcut?.id,
      ad: ilk.ad,
      kod: ilk.kod || undefined,
      kdvId: ilk.kdvId,
      porsiyonlar,
      kategoriIdler: [],
    } as MenuUrun;

    // Dosyadaki hâli menüdekiyle birebir aynıysa yazmaya gerek yok. Tek fiyat
    // düzeltmek için 200 ürünü baştan yazmak dakikalar sürüyordu.
    const degisiklikler = mevcut
      ? urunFarklari(mevcut, urun, yerler, kategoriler, birimler, kdvler)
      : [];
    if (mevcut && !degisiklikler.length) {
      degismeyen++;
      continue;
    }

    cikan.push({ urun, yerler, yeni: !mevcut, degisiklikler });
  }

  // Menüde olmayan kategori adları açılacaklar listesine giriyor. Liste yalnızca
  // gerçekten yazılacak ürünlerden çıkarılıyor — atlanan bir satırın yazım hatası
  // yüzünden kategori açılmasın. Ana kategori önce geliyor, altı ona bağlanacak.
  const yeniKategoriler: KategoriYeri[] = [];
  const listede = (ana: string, alt: string) =>
    yeniKategoriler.some((y) => kucuk(y.ana) === kucuk(ana) && kucuk(y.alt) === kucuk(alt));

  for (const yer of cikan.flatMap((c) => c.yerler)) {
    const ust = kategoriler.find((k) => !k.ustId && kucuk(k.ad) === kucuk(yer.ana));
    if (!ust && !listede(yer.ana, "")) yeniKategoriler.push({ ana: yer.ana, alt: "" });

    if (!yer.alt) continue;
    const altVar =
      ust && kategoriler.some((k) => k.ustId === ust.id && kucuk(k.ad) === kucuk(yer.alt));
    if (!altVar && !listede(yer.ana, yer.alt)) yeniKategoriler.push(yer);
  }

  return {
    urunler: cikan,
    yeniKategoriler,
    degismeyen,
    hatalar: hatalar.sort((a, b) => a.satir - b.satir),
    satirlar,
  };
}
