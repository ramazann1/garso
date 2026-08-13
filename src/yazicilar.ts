import { supabase } from "./supabase";

/** Yazıcının nasıl bağlandığı — ekranlarda bu sırayla listeleniyor. */
export const BAGLANTILAR = [
  {
    kod: "ethernet",
    ad: "Ağ (Ethernet)",
    aciklama: "Yazıcının kendi IP adresi var, kasa köprüsü doğrudan basar.",
  },
  {
    kod: "usb",
    ad: "USB (kasaya bağlı)",
    aciklama: "Bilgisayara kurulu yazıcı; adı listeden seçilir.",
  },
  {
    kod: "webusb",
    ad: "USB (kurulumsuz)",
    aciklama: "Tek yazıcılı işletme için: program kurmadan tarayıcıdan basar.",
  },
] as const;

export type Baglanti = (typeof BAGLANTILAR)[number]["kod"];

export const TURLER = [
  { kod: "adisyon", ad: "Adisyon" },
  { kod: "mutfak", ad: "Mutfak" },
  { kod: "kurye", ad: "Kurye" },
] as const;

export type YaziciTuru = (typeof TURLER)[number]["kod"];

export const baglantiAdi = (kod: string) =>
  BAGLANTILAR.find((b) => b.kod === kod)?.ad ?? kod;

export const turAdi = (kod: string) => TURLER.find((t) => t.kod === kod)?.ad ?? kod;

/** İstasyon = siparişin hazırlandığı tezgâh: mutfak, bar, nargile, pasta… */
export type Istasyon = {
  id: number;
  ad: string;
  sira: number;
  pisirme: boolean;
  paketleme: boolean;
};

export type Yazici = {
  id: number;
  ad: string;
  baglanti: Baglanti;
  ip: string;
  port: number;
  sistemAd: string;
  turler: YaziciTuru[];
  aktif: boolean;
  sira: number;
  /** Yalnız mutfak türünde anlamlı: hangi istasyonların fişini basıyor. */
  istasyonlar: number[];
};

export type YaziciAlanlari = Omit<Yazici, "id" | "sira">;

/**
 * Fiş şablonunun ayarları. Liste veritabanında değil burada duruyor: bunlar
 * işletmenin tanımladığı satırlar değil, programın bildiği alanlar. Şablona yeni
 * bir alan eklemek bu listeye bir satır yazmak demek — tablo değişmiyor.
 */
export type FisAyari = { kod: string; ad: string; ipucu?: string };

export const ADISYON_PARAMETRELERI: FisAyari[] = [
  { kod: "baslik", ad: "Ürün listesi başlıkları", ipucu: "Ürün · Adet · Tutar satırı" },
  { kod: "siparis_no", ad: "Sipariş numarası" },
  { kod: "urun_birimleri", ad: "Ürün birimleri", ipucu: "Tam, Yarım, Kg" },
  { kod: "kdv_bilgisi", ad: "KDV tutarı" },
  { kod: "kdv_grubu", ad: "KDV grubu dökümü", ipucu: "Orana göre ayrı satırlar" },
  { kod: "hesabi_paylas", ad: "Hesabı paylaş alanı", ipucu: "Kişi başı tutar" },
  { kod: "bahsis", ad: "Bahşiş alanı" },
  { kod: "karekod", ad: "Karekod", ipucu: "İşletme adı, tarih ve tutar" },
  { kod: "logo", ad: "Logo" },
];

export const MUTFAK_PARAMETRELERI: FisAyari[] = [
  { kod: "siparis_no", ad: "Sipariş numarası" },
  { kod: "musteri_sayisi", ad: "Kişi sayısı" },
  { kod: "musteri_bilgileri", ad: "Müşteri bilgileri", ipucu: "Paket siparişlerde ad ve adres" },
  { kod: "urun_fiyatlari", ad: "Ürün fiyatları" },
  { kod: "siparis_toplami", ad: "Sipariş toplamı" },
];

export const ADISYON_PUNTOLARI: FisAyari[] = [
  { kod: "isletme_adi", ad: "İşletme adı" },
  { kod: "urun_listesi", ad: "Ürün listesi" },
  { kod: "toplam", ad: "Toplam tutar" },
  { kod: "not", ad: "Sipariş notu" },
];

export const MUTFAK_PUNTOLARI: FisAyari[] = [
  { kod: "siparis_no", ad: "Sipariş numarası" },
  { kod: "urun_listesi", ad: "Ürün listesi" },
  { kod: "not", ad: "Sipariş notu" },
];

/** Punto sınırları: 8'in altı termal kâğıtta okunmuyor, 40 üstü satırı taşırıyor. */
export const EN_KUCUK_PUNTO = 8;
export const EN_BUYUK_PUNTO = 40;

export type FisSablonu = {
  tip: "adisyon" | "mutfak";
  parametreler: Record<string, boolean>;
  puntolar: Record<string, number>;
  ustMetin: string;
  altMetin: string;
};

export async function istasyonlariGetir(): Promise<Istasyon[]> {
  const { data } = await supabase
    .from("istasyonlar")
    .select("id, ad, sira, pisirme, paketleme")
    .order("sira")
    .order("id");
  return ((data as any[]) ?? []).map((i) => ({
    id: i.id,
    ad: i.ad,
    sira: i.sira,
    pisirme: i.pisirme,
    paketleme: i.paketleme,
  }));
}

export async function istasyonKaydet(
  id: number | null,
  alanlar: { ad: string; sira: number; pisirme: boolean; paketleme: boolean }
) {
  const satir = {
    ad: alanlar.ad.trim(),
    sira: alanlar.sira,
    pisirme: alanlar.pisirme,
    paketleme: alanlar.paketleme,
  };
  const { error } = id
    ? await supabase.from("istasyonlar").update(satir).eq("id", id)
    : await supabase.from("istasyonlar").insert(satir);
  if (error) {
    throw new Error(
      error.code === "23505" ? "Bu istasyon zaten var." : "İstasyon kaydedilemedi."
    );
  }
}

export async function istasyonSil(id: number) {
  const { error } = await supabase.from("istasyonlar").delete().eq("id", id);
  if (error) throw new Error("İstasyon silinemedi.");
}

export async function yazicilariGetir(): Promise<Yazici[]> {
  const { data } = await supabase
    .from("yazicilar")
    .select(
      "id, ad, baglanti, ip, port, sistem_ad, turler, aktif, sira, istasyonlar:yazici_istasyonlari (istasyon_id)"
    )
    .order("sira")
    .order("id");

  return ((data as any[]) ?? []).map((y) => ({
    id: y.id,
    ad: y.ad,
    baglanti: y.baglanti,
    ip: y.ip ?? "",
    port: y.port,
    sistemAd: y.sistem_ad ?? "",
    turler: y.turler ?? [],
    aktif: y.aktif,
    sira: y.sira,
    istasyonlar: (y.istasyonlar ?? []).map((i: any) => i.istasyon_id),
  }));
}

/** Bağlantı türüne göre kullanılmayan alanlar boşaltılır; yarım kalan eski
 *  IP'nin sonradan yanlış yazıcıya bağlanması engelleniyor. */
function yaziciSatiri(alanlar: YaziciAlanlari) {
  const ag = alanlar.baglanti === "ethernet";
  return {
    ad: alanlar.ad.trim(),
    baglanti: alanlar.baglanti,
    ip: ag ? alanlar.ip.trim() || null : null,
    port: ag ? alanlar.port : 9100,
    sistem_ad: alanlar.baglanti === "usb" ? alanlar.sistemAd.trim() || null : null,
    turler: alanlar.turler,
    aktif: alanlar.aktif,
  };
}

export async function yaziciKaydet(id: number | null, alanlar: YaziciAlanlari) {
  if (alanlar.turler.length === 0) {
    throw new Error("En az bir yazıcı türü seçilmeli.");
  }

  const satir = yaziciSatiri(alanlar);
  let yaziciId = id;

  if (id) {
    const { error } = await supabase.from("yazicilar").update(satir).eq("id", id);
    if (error) throw kaydetmeHatasi(error);
  } else {
    const { data, error } = await supabase
      .from("yazicilar")
      .insert(satir)
      .select("id")
      .single();
    if (error) throw kaydetmeHatasi(error);
    yaziciId = data.id as number;
  }

  await istasyonlariYaz(
    yaziciId!,
    alanlar.turler.includes("mutfak") ? alanlar.istasyonlar : []
  );
  return yaziciId!;
}

function kaydetmeHatasi(error: { code?: string }) {
  return new Error(
    error.code === "23505" ? "Bu adda bir yazıcı zaten var." : "Yazıcı kaydedilemedi."
  );
}

/** Eşlemeler duruyorsa dokunulmuyor, yalnız fark yazılıyor. */
async function istasyonlariYaz(yaziciId: number, istasyonlar: number[]) {
  const { data } = await supabase
    .from("yazici_istasyonlari")
    .select("istasyon_id")
    .eq("yazici_id", yaziciId);

  const mevcut = ((data as any[]) ?? []).map((i) => i.istasyon_id as number);
  const eklenecek = istasyonlar.filter((i) => !mevcut.includes(i));
  const silinecek = mevcut.filter((i) => !istasyonlar.includes(i));

  if (eklenecek.length > 0) {
    const { error } = await supabase
      .from("yazici_istasyonlari")
      .insert(eklenecek.map((istasyon_id) => ({ yazici_id: yaziciId, istasyon_id })));
    if (error) throw new Error("İstasyon eşlemesi kaydedilemedi.");
  }

  if (silinecek.length > 0) {
    const { error } = await supabase
      .from("yazici_istasyonlari")
      .delete()
      .eq("yazici_id", yaziciId)
      .in("istasyon_id", silinecek);
    if (error) throw new Error("İstasyon eşlemesi kaydedilemedi.");
  }
}

export async function yaziciSil(id: number) {
  const { error } = await supabase.from("yazicilar").delete().eq("id", id);
  if (error) throw new Error("Yazıcı silinemedi.");
}

export async function yaziciSirasiniKaydet(sirali: number[]) {
  for (let i = 0; i < sirali.length; i++) {
    await supabase.from("yazicilar").update({ sira: i + 1 }).eq("id", sirali[i]);
  }
}

export async function fisSablonuGetir(tip: FisSablonu["tip"]): Promise<FisSablonu> {
  const { data } = await supabase
    .from("fis_sablonlari")
    .select("tip, parametreler, puntolar, ust_metin, alt_metin")
    .eq("tip", tip)
    .maybeSingle();

  return {
    tip,
    parametreler: (data as any)?.parametreler ?? {},
    puntolar: (data as any)?.puntolar ?? {},
    ustMetin: (data as any)?.ust_metin ?? "",
    altMetin: (data as any)?.alt_metin ?? "",
  };
}

export async function fisSablonuKaydet(sablon: FisSablonu) {
  const { error } = await supabase.from("fis_sablonlari").upsert(
    {
      tip: sablon.tip,
      parametreler: sablon.parametreler,
      puntolar: sablon.puntolar,
      ust_metin: sablon.ustMetin.trim() || null,
      alt_metin: sablon.altMetin.trim() || null,
    },
    { onConflict: "isletme_id,tip" }
  );
  if (error) throw new Error("Fiş şablonu kaydedilemedi.");
}

/** Ürünün gideceği istasyon: kendi istasyonu varsa o, yoksa kategorisininki. */
export function urununIstasyonu(
  urunIstasyon: number | null,
  kategoriIstasyon: number | null
): number | null {
  return urunIstasyon ?? kategoriIstasyon ?? null;
}
