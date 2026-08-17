import { supabase } from "./supabase";
import { acikOturum } from "./oturum";

/**
 * Cari hesap: müşteri kayıtları ve borç/alacak hareketleri.
 *
 * Bakiye hiçbir yerde sütun olarak durmuyor — hareketlerin toplamı. İki yerde
 * para tutulursa er geç birbirini tutmaz; tek kaynak `cari_hareketler`.
 * Artı bakiye "müşteri borçlu", eksi bakiye "işletme borçlu" demek.
 */

export type Musteri = {
  id: number;
  no: number;
  ad: string;
  soyad: string;
  telefon: string;
  telefon2: string;
  acikHesap: boolean;
  notlar: string;
  aktif: boolean;
  bakiye: number;
};

export type MusteriAlanlari = {
  ad: string;
  soyad: string;
  telefon: string;
  telefon2: string;
  acikHesap: boolean;
  notlar: string;
  aktif: boolean;
  /** Yalnız yeni kayıtta: devreden borç. Açılış hareketi olarak yazılıyor. */
  acilisBakiye?: number;
};

export type Adres = {
  id: number;
  musteriId: number;
  baslik: string;
  adres: string;
  tarif: string;
  varsayilan: boolean;
};

export const HAREKET_TIPLERI = [
  { kod: "satis", ad: "Satış" },
  { kod: "tahsilat", ad: "Tahsilat" },
  { kod: "duzeltme", ad: "Bakiye düzeltme" },
  { kod: "acilis", ad: "Açılış bakiyesi" },
] as const;

export type HareketTipi = (typeof HAREKET_TIPLERI)[number]["kod"];

export const hareketAdi = (kod: string) =>
  HAREKET_TIPLERI.find((h) => h.kod === kod)?.ad ?? kod;

/** Müşterinin adı listede tek parça okunuyor; soyad boş olabiliyor. */
export const tamAd = (m: { ad: string; soyad: string }) =>
  `${m.ad} ${m.soyad}`.trim();

/**
 * Müşteriler ve bakiyeleri. Hareketler tek sorguda çekilip müşteri başına
 * toplanıyor — müşteri sayısı kadar ayrı sorgu atmaktan ucuz.
 */
export async function musterileriGetir(): Promise<Musteri[]> {
  const { data } = await supabase
    .from("musteriler")
    .select("id, no, ad, soyad, telefon, telefon2, acik_hesap, notlar, aktif")
    .order("no");

  const { data: hareketler } = await supabase
    .from("cari_hareketler")
    .select("musteri_id, borc, alacak");

  const bakiyeler = new Map<number, number>();
  for (const h of (hareketler as any[]) ?? []) {
    const eski = bakiyeler.get(h.musteri_id) ?? 0;
    bakiyeler.set(h.musteri_id, eski + Number(h.borc) - Number(h.alacak));
  }

  return ((data as any[]) ?? []).map((m) => ({
    id: m.id,
    no: m.no,
    ad: m.ad,
    soyad: m.soyad ?? "",
    telefon: m.telefon ?? "",
    telefon2: m.telefon2 ?? "",
    acikHesap: m.acik_hesap,
    notlar: m.notlar ?? "",
    aktif: m.aktif,
    bakiye: bakiyeler.get(m.id) ?? 0,
  }));
}

function musteriSatiri(alanlar: MusteriAlanlari) {
  return {
    ad: alanlar.ad.trim(),
    soyad: alanlar.soyad.trim() || null,
    telefon: alanlar.telefon.trim() || null,
    telefon2: alanlar.telefon2.trim() || null,
    acik_hesap: alanlar.acikHesap,
    notlar: alanlar.notlar.trim() || null,
    aktif: alanlar.aktif,
  };
}

export async function musteriKaydet(id: number | null, alanlar: MusteriAlanlari) {
  const satir = musteriSatiri(alanlar);

  if (id) {
    const { error } = await supabase.from("musteriler").update(satir).eq("id", id);
    if (error) throw new Error("Müşteri kaydedilemedi.");
    return id;
  }

  const { data, error } = await supabase
    .from("musteriler")
    .insert(satir)
    .select("id")
    .single();
  if (error || !data) throw new Error("Müşteri kaydedilemedi.");

  // Devreden borç ayrı bir hareket olarak yazılıyor: ekstrede nereden geldiği
  // görünsün, bakiye yine tek kaynaktan hesaplansın.
  const acilis = alanlar.acilisBakiye ?? 0;
  if (acilis > 0) {
    await hareketEkle({
      musteriId: (data as any).id,
      tip: "acilis",
      borc: acilis,
      aciklama: "Devreden bakiye",
    });
  }

  return (data as any).id as number;
}

/**
 * Müşteri silinmiyor, pasifleştiriliyor — geçmiş adisyonlar ve hareketler ona
 * bağlı. Hiç hareketi olmayan kayıt gerçekten siliniyor: yanlış girilen
 * müşteri listede ölü satır olarak kalmasın.
 */
export async function musteriSil(id: number) {
  const { count } = await supabase
    .from("cari_hareketler")
    .select("id", { count: "exact", head: true })
    .eq("musteri_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("musteriler")
      .update({ aktif: false })
      .eq("id", id);
    if (error) throw new Error("Müşteri pasife alınamadı.");
    return "pasif" as const;
  }

  const { error } = await supabase.from("musteriler").delete().eq("id", id);
  if (error) throw new Error("Müşteri silinemedi.");
  return "silindi" as const;
}

export async function adresleriGetir(musteriId: number): Promise<Adres[]> {
  const { data } = await supabase
    .from("musteri_adresleri")
    .select("id, musteri_id, baslik, adres, tarif, varsayilan")
    .eq("musteri_id", musteriId)
    .order("varsayilan", { ascending: false })
    .order("id");

  return ((data as any[]) ?? []).map((a) => ({
    id: a.id,
    musteriId: a.musteri_id,
    baslik: a.baslik,
    adres: a.adres,
    tarif: a.tarif ?? "",
    varsayilan: a.varsayilan,
  }));
}

export async function adresKaydet(
  id: number | null,
  musteriId: number,
  alanlar: { baslik: string; adres: string; tarif: string; varsayilan: boolean }
) {
  const satir = {
    musteri_id: musteriId,
    baslik: alanlar.baslik.trim() || "Ev",
    adres: alanlar.adres.trim(),
    tarif: alanlar.tarif.trim() || null,
    varsayilan: alanlar.varsayilan,
  };

  const { error } = id
    ? await supabase.from("musteri_adresleri").update(satir).eq("id", id)
    : await supabase.from("musteri_adresleri").insert(satir);
  if (error) throw new Error("Adres kaydedilemedi.");

  // Varsayılan tek olmalı: yeni işaretlenen dışındakiler düşürülüyor.
  if (alanlar.varsayilan) {
    let sorgu = supabase
      .from("musteri_adresleri")
      .update({ varsayilan: false })
      .eq("musteri_id", musteriId);
    if (id) sorgu = sorgu.neq("id", id);
    await sorgu;
  }
}

export async function adresSil(id: number) {
  const { error } = await supabase.from("musteri_adresleri").delete().eq("id", id);
  if (error) throw new Error("Adres silinemedi.");
}

export async function hareketEkle(hareket: {
  musteriId: number;
  tip: HareketTipi;
  borc?: number;
  alacak?: number;
  odemeTipi?: string;
  adisyonId?: number;
  aciklama?: string;
}) {
  // Fiş numarası veritabanındaki tetikleyiciden geliyor; geri okunuyor ki
  // ödeme alındığı anda ekranda söylenebilsin.
  const { data, error } = await supabase
    .from("cari_hareketler")
    .insert({
      musteri_id: hareket.musteriId,
      tip: hareket.tip,
      borc: hareket.borc ?? 0,
      alacak: hareket.alacak ?? 0,
      odeme_tipi: hareket.odemeTipi ?? null,
      adisyon_id: hareket.adisyonId ?? null,
      aciklama: hareket.aciklama ?? null,
      personel_id: acikOturum()?.id ?? null,
    })
    .select("fis_no")
    .single();
  if (error) throw new Error("Hareket kaydedilemedi.");

  return ((data as any)?.fis_no ?? null) as number | null;
}

export type Hareket = {
  id: number;
  tip: HareketTipi;
  borc: number;
  alacak: number;
  odemeTipi: string;
  adisyonId: number | null;
  aciklama: string;
  kisi: string;
  zaman: string;
  /** Bu satırdan sonraki bakiye — ekstre okunurken en çok bakılan sütun. */
  bakiye: number;
  /** Yalnız tahsilat satırlarında dolu: müşteriye verilen fişin numarası. */
  fisNo: number | null;
};

/**
 * Müşterinin hesap ekstresi. Yürüyen bakiye burada hesaplanıyor: ekranın
 * kendi toplamını tutmasındansa satırlar hazır gelsin, üç sekme de aynı
 * sayıya baksın.
 */
export async function hareketleriGetir(musteriId: number): Promise<Hareket[]> {
  const { data } = await supabase
    .from("cari_hareketler")
    .select(
      "id, tip, borc, alacak, odeme_tipi, adisyon_id, aciklama, olusturma, fis_no, personel:personel_id (ad)"
    )
    .eq("musteri_id", musteriId)
    .order("olusturma")
    .order("id");

  let yuruyen = 0;
  return ((data as any[]) ?? []).map((h) => {
    yuruyen += Number(h.borc) - Number(h.alacak);
    return {
      id: h.id,
      tip: h.tip,
      borc: Number(h.borc),
      alacak: Number(h.alacak),
      odemeTipi: h.odeme_tipi ?? "",
      adisyonId: h.adisyon_id,
      aciklama: h.aciklama ?? "",
      kisi: h.personel?.ad ?? "",
      zaman: h.olusturma,
      bakiye: yuruyen,
      fisNo: h.fis_no ?? null,
    };
  });
}

/**
 * Müşteriden para alındı: borcu azaltan alacak hareketi. Geriye fiş numarası
 * dönüyor — müşteriye "fiş numaranız 9001" denebilsin diye.
 */
export async function tahsilatAl(
  musteriId: number,
  tutar: number,
  odemeTipi: string,
  aciklama = ""
) {
  return await hareketEkle({
    musteriId,
    tip: "tahsilat",
    alacak: tutar,
    odemeTipi,
    aciklama,
  });
}

/**
 * Bakiyeyi elle doğru değere çekme. Fark hareket olarak yazılıyor, bakiyenin
 * kendisi hiçbir yerde ezilmiyor — eski hâli ekstrede duruyor. Para elle
 * değiştiği için sebep zorunlu.
 */
export async function bakiyeDuzelt(
  musteriId: number,
  eskiBakiye: number,
  yeniBakiye: number,
  sebep: string
) {
  const fark = yeniBakiye - eskiBakiye;
  if (fark === 0) return;

  await hareketEkle({
    musteriId,
    tip: "duzeltme",
    borc: fark > 0 ? fark : 0,
    alacak: fark < 0 ? -fark : 0,
    aciklama: sebep,
  });
}

/**
 * Adisyon açık hesaba aktarıldı: müşterinin borcu büyüyor. Hareket tahsilat
 * satırına bağlanıyor — ödeme sonradan silinirse borç da onunla düşsün.
 */
export async function adisyonuCariyeYaz(
  musteriId: number,
  adisyonId: number,
  tutar: number,
  tahsilatId?: number,
  odemeTipi = ""
) {
  const { error } = await supabase.from("cari_hareketler").insert({
    musteri_id: musteriId,
    tip: "satis",
    borc: tutar,
    adisyon_id: adisyonId,
    tahsilat_id: tahsilatId ?? null,
    odeme_tipi: odemeTipi || null,
    personel_id: acikOturum()?.id ?? null,
  });
  if (error) throw new Error(`Açık hesap borcu yazılamadı: ${error.message}`);
}

/** Satışta müşteri seçilirken kullanılan kısa liste: yalnız açık hesaplılar. */
export async function acikHesapMusterileri(): Promise<Musteri[]> {
  const hepsi = await musterileriGetir();
  return hepsi.filter((m) => m.aktif && m.acikHesap);
}

/* ---------- Excel aktarımı ---------- */

// Müşteri listesi çoğu işletmeye eski programdan geliyor; elle girmek yerine
// tabloyu yapıştırıp yüklemek asıl kullanım şekli.
export const MUSTERI_BASLIKLARI = [
  "Müşteri No",
  "Ad",
  "Soyad",
  "Telefon",
  "Telefon 2",
  "Açık Hesap",
  "Notlar",
  "Aktif",
  "Bakiye",
] as const;

export const MUSTERI_SUTUNLARI = [11, 18, 16, 15, 15, 12, 30, 9, 11];

type Hucre = import("write-excel-file/browser").CellObject | null;

export function musteriTablosu(liste: Musteri[]) {
  const yazi = (v: string): Hucre => (v ? { value: v, type: String } : null);
  const evetHayir = (v: boolean): Hucre => ({ value: v ? "Evet" : "Hayır", type: String });

  const satirlar: Hucre[][] = [
    MUSTERI_BASLIKLARI.map((b): Hucre => ({ value: b, type: String, fontWeight: "bold" })),
  ];

  for (const m of liste) {
    satirlar.push([
      { value: m.no, type: Number },
      yazi(m.ad),
      yazi(m.soyad),
      yazi(m.telefon),
      yazi(m.telefon2),
      evetHayir(m.acikHesap),
      yazi(m.notlar),
      evetHayir(m.aktif),
      { value: m.bakiye, type: Number, format: "#,##0.00" },
    ]);
  }

  return satirlar;
}

export type MusteriPlani = {
  yeniler: (MusteriAlanlari & { bakiye: number })[];
  guncellenecekler: { id: number; ad: string; alanlar: MusteriAlanlari }[];
  degismeyen: number;
  /** Bakiyesi dosyada farklı yazılmış ama değiştirilmeyecek kayıtlar. */
  bakiyeUyarilari: string[];
  hatalar: { satir: number; mesaj: string }[];
};

const kucukCari = (s: string) => s.trim().toLocaleLowerCase("tr");
const hucreCari = (v: unknown) => (v == null ? "" : String(v).trim());

const evetMi = (s: string) => {
  const v = kucukCari(s);
  if (!v) return undefined;
  return !["hayır", "hayir", "yok", "pasif", "0", "false", "kapalı", "kapali"].includes(v);
};

// Telefonlar dosyada "0532 111 22 33", "+90 532…" gibi geliyor; karşılaştırma
// yalnız rakamlar üzerinden, son 10 hane.
const telefonAnahtari = (s: string) => {
  const rakamlar = s.replace(/\D/g, "");
  return rakamlar.length >= 10 ? rakamlar.slice(-10) : rakamlar;
};

// Para kuruşta kesiliyor; Excel'in ondalık artığı bakiyeye taşınmasın.
const kurusla = (n: number) => Math.round(n * 100) / 100;

const paraOku = (s: string) => {
  const temiz = s.replace(/[₺\s]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  if (temiz === "") return 0;
  const n = Number(temiz);
  return Number.isFinite(n) ? kurusla(n) : null;
};

export function musteriPlaniHazirla(tablo: unknown[][], mevcut: Musteri[]): MusteriPlani {
  const dolu = tablo.filter((s) => s.some((h) => hucreCari(h) !== ""));
  const plan: MusteriPlani = {
    yeniler: [],
    guncellenecekler: [],
    degismeyen: 0,
    bakiyeUyarilari: [],
    hatalar: [],
  };
  if (!dolu.length) return plan;

  const basliklar = dolu[0].map((b) => kucukCari(hucreCari(b)));
  const yeri = (ad: string) => basliklar.indexOf(kucukCari(ad));
  const sutun = Object.fromEntries(MUSTERI_BASLIKLARI.map((b) => [b, yeri(b)])) as Record<
    (typeof MUSTERI_BASLIKLARI)[number],
    number
  >;

  const gorulen = new Set<string>();

  dolu.slice(1).forEach((satir, i) => {
    const satirNo = i + 2;
    const oku = (baslik: (typeof MUSTERI_BASLIKLARI)[number]) => {
      const yer = sutun[baslik];
      return yer >= 0 ? hucreCari(satir[yer]) : "";
    };

    const ad = oku("Ad");
    if (!ad) {
      plan.hatalar.push({ satir: satirNo, mesaj: "Ad boş" });
      return;
    }

    const soyad = oku("Soyad");
    const telefon = oku("Telefon");
    const telefon2 = oku("Telefon 2");
    const notlar = oku("Notlar");

    const bakiyeMetni = oku("Bakiye");
    const bakiye = paraOku(bakiyeMetni);
    if (bakiye === null) {
      plan.hatalar.push({ satir: satirNo, mesaj: `"${ad}" — bakiye sayı değil` });
      return;
    }

    // Müşteri no varsa tek doğru eşleşme odur; yoksa telefon, o da yoksa ad+soyad.
    const noMetni = oku("Müşteri No");
    let kayit: Musteri | undefined;

    if (noMetni) {
      const no = Number(noMetni);
      if (!Number.isInteger(no)) {
        plan.hatalar.push({ satir: satirNo, mesaj: `"${ad}" — müşteri no sayı değil` });
        return;
      }
      kayit = mevcut.find((m) => m.no === no);
      if (!kayit) {
        plan.hatalar.push({
          satir: satirNo,
          mesaj: `"${ad}" — ${no} numaralı müşteri listede yok`,
        });
        return;
      }
    } else if (telefonAnahtari(telefon)) {
      kayit = mevcut.find((m) => telefonAnahtari(m.telefon) === telefonAnahtari(telefon));
    }

    if (!kayit && !noMetni) {
      const tam = kucukCari(`${ad} ${soyad}`);
      const uyanlar = mevcut.filter((m) => kucukCari(tamAd(m)) === tam);
      if (uyanlar.length > 1) {
        plan.hatalar.push({
          satir: satirNo,
          mesaj: `"${tamAd({ ad, soyad })}" adında ${uyanlar.length} müşteri var — Müşteri No sütununu doldur`,
        });
        return;
      }
      kayit = uyanlar[0];
    }

    const anahtar = kayit
      ? `id:${kayit.id}`
      : telefonAnahtari(telefon)
        ? `tel:${telefonAnahtari(telefon)}`
        : `ad:${kucukCari(`${ad} ${soyad}`)}`;
    if (gorulen.has(anahtar)) {
      plan.hatalar.push({ satir: satirNo, mesaj: `"${ad}" dosyada birden fazla kez geçiyor` });
      return;
    }
    gorulen.add(anahtar);

    const acikHesap = evetMi(oku("Açık Hesap")) ?? kayit?.acikHesap ?? false;
    const aktif = evetMi(oku("Aktif")) ?? kayit?.aktif ?? true;
    const alanlar: MusteriAlanlari = { ad, soyad, telefon, telefon2, acikHesap, notlar, aktif };

    // Yeni müşteride bakiye devreden borç olarak yazılıyor; var olanda ise
    // yok sayılıyor — bakiye hareketlerin toplamı, tabloya elle yazılan bir
    // rakam değil. Değiştirmek isteyen müşteri detayından "Bakiye düzeltme"
    // hareketi giriyor.
    if (!kayit) {
      plan.yeniler.push({ ...alanlar, bakiye, acilisBakiye: bakiye > 0 ? bakiye : undefined });
      return;
    }

    if (bakiyeMetni && kurusla(kayit.bakiye) !== bakiye) {
      plan.bakiyeUyarilari.push(tamAd(kayit));
    }

    const ayni =
      kayit.ad === ad &&
      kayit.soyad === soyad &&
      kayit.telefon === telefon &&
      kayit.telefon2 === telefon2 &&
      kayit.notlar === notlar &&
      kayit.acikHesap === acikHesap &&
      kayit.aktif === aktif;

    if (ayni) plan.degismeyen++;
    else plan.guncellenecekler.push({ id: kayit.id, ad: tamAd(kayit), alanlar });
  });

  return plan;
}

export async function musteriPlaniYaz(plan: MusteriPlani) {
  for (const y of plan.yeniler) await musteriKaydet(null, y);
  for (const g of plan.guncellenecekler) await musteriKaydet(g.id, g.alanlar);
}
