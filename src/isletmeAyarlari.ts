import { acikOturum } from "./oturum";
import { hataysaFirlat, onbellekliGetir } from "./onbellek";
import { supabase } from "./supabase";

export type ServisTipi = "tutar" | "yuzde";

/**
 * Kuver ya da garsoniyenin tanımı. Tutar tipinde kuver kişi sayısıyla çarpılır,
 * yüzde tipinde ikisi de indirim düşülmüş hesabın yüzdesini alır.
 */
export type ServisTanimi = {
  /** Hesaba kendiliğinden girsin mi; kapalıysa yalnız elle ekleniyor. */
  otomatik: boolean;
  ad: string;
  tip: ServisTipi;
  deger: number;
};

export type IsletmeAyarlari = {
  /** Menü fiyatları KDV dahil mi yazılıyor? Türkiye'de olağan olan dahil. */
  kdvDahil: boolean;
  /** Kasa günü gece yarısında değil işletmenin açılış saatinde başlıyor. */
  kasaGunuBaslangic: string;
  kasaGunuBitis: string;
  /** Adisyon kaydedilirken misafir sayısı boş bırakılamasın. */
  kisiSayisiZorunlu: boolean;
  /** Kasa bu kadar saniye kullanılmazsa kilit ekranı gelir; 0 = kapalı. */
  kilitSuresi: number;
  /** Hızlı Öde'de verilen tutardan para üstü hesaplansın. */
  paraUstu: boolean;
  /** İstasyon ekranında kart bu kadar dakika beklerse geciken sayılır; 0 = kapalı. */
  mutfakGecikmeDk: number;
  /** Masa bu kadar dakika yeni sipariş vermezse kartı renk değiştirir; 0 = kapalı. */
  masaDurgunlukDk: number;
  /** Kullanılmayan sipariş türü arayüzde hiç durmasın. */
  gelalAcik: boolean;
  paketAcik: boolean;
  /** Kasa takibi yapılmıyorsa kasa ekranları arayüzde hiç durmaz. */
  kasaTakibi: boolean;
  kasaKapanisZorunlu: boolean;
  /** Bu saatten sonra kasa açıksa kapatma hatırlatılır; boşsa uyarı yok. */
  kasaKapanisUyari: string;
  /** Kasadan para alma/koyma işlemi kullanılıyor mu. */
  paraHareketiAcik: boolean;
  /** Kasaya para giren bir tahsilat alınınca para çekmecesi kendiliğinden açılsın mı. */
  cekmeceNakitteAcilsin: boolean;
  /** Kuver ve garsoniyenin ana anahtarı; kapalıyken hiçbir hesaba servis girmez. */
  servisAcik: boolean;
  kuver: ServisTanimi;
  garsoniye: ServisTanimi;
};

const VARSAYILAN: IsletmeAyarlari = {
  kdvDahil: true,
  kasaGunuBaslangic: "08:00",
  kasaGunuBitis: "07:55",
  kisiSayisiZorunlu: false,
  kilitSuresi: 0,
  paraUstu: true,
  mutfakGecikmeDk: 15,
  masaDurgunlukDk: 45,
  gelalAcik: true,
  paketAcik: true,
  kasaTakibi: false,
  kasaKapanisZorunlu: false,
  kasaKapanisUyari: "",
  paraHareketiAcik: true,
  cekmeceNakitteAcilsin: true,
  servisAcik: false,
  kuver: { otomatik: true, ad: "Kuver", tip: "tutar", deger: 0 },
  garsoniye: { otomatik: true, ad: "Garsoniye", tip: "yuzde", deger: 0 },
};

// Ayar her hesapta lazım ama satış sırasında değişmiyor; bir kez okunup burada
// tutuluyor ki toplam hesabı beklemeden, senkron çalışsın.
let onbellek: IsletmeAyarlari = VARSAYILAN;

export function ayarlar(): IsletmeAyarlari {
  return onbellek;
}

// Saat alanı veritabanından "08:00:00" gibi geliyor, ekranda ve <input type=time>
// içinde saniyesiz duruyor.
const saat = (deger: unknown, varsayilan: string) =>
  typeof deger === "string" ? deger.slice(0, 5) : varsayilan;

// Kuver ve garsoniye aynı dört alandan oluşuyor; okuma tek yerde.
const servisTanimi = (s: any, on: string, varsayilan: ServisTanimi): ServisTanimi => ({
  otomatik: s?.[`${on}_otomatik`] ?? varsayilan.otomatik,
  ad: s?.[`${on}_ad`] || varsayilan.ad,
  tip: (s?.[`${on}_tip`] as ServisTipi) ?? varsayilan.tip,
  deger: Number(s?.[`${on}_deger`] ?? varsayilan.deger),
});

// Tablo artık işletme başına tek satır tutuyor; hangi satırın okunacağını
// satır güvenliği belirliyor, sorguda ayrıca süzmeye gerek yok.
export async function ayarlariGetir(): Promise<IsletmeAyarlari> {
  onbellek = await onbellekliGetir("ayarlar", ayarlariOku);
  return onbellek;
}

async function ayarlariOku(): Promise<IsletmeAyarlari> {
  const sonuc = await supabase.from("isletme_ayarlari").select("*").maybeSingle();
  hataysaFirlat(sonuc);
  const s = sonuc.data as any;
  return {
    kdvDahil: s?.kdv_dahil ?? VARSAYILAN.kdvDahil,
    kasaGunuBaslangic: saat(s?.kasa_gunu_baslangic, VARSAYILAN.kasaGunuBaslangic),
    kasaGunuBitis: saat(s?.kasa_gunu_bitis, VARSAYILAN.kasaGunuBitis),
    kisiSayisiZorunlu: s?.kisi_sayisi_zorunlu ?? VARSAYILAN.kisiSayisiZorunlu,
    kilitSuresi: s?.kilit_suresi ?? VARSAYILAN.kilitSuresi,
    paraUstu: s?.para_ustu ?? VARSAYILAN.paraUstu,
    mutfakGecikmeDk: s?.mutfak_gecikme_dk ?? VARSAYILAN.mutfakGecikmeDk,
    masaDurgunlukDk: s?.masa_durgunluk_dk ?? VARSAYILAN.masaDurgunlukDk,
    gelalAcik: s?.gelal_acik ?? VARSAYILAN.gelalAcik,
    paketAcik: s?.paket_acik ?? VARSAYILAN.paketAcik,
    kasaTakibi: s?.kasa_takibi ?? VARSAYILAN.kasaTakibi,
    kasaKapanisZorunlu: s?.kasa_kapanis_zorunlu ?? VARSAYILAN.kasaKapanisZorunlu,
    kasaKapanisUyari: saat(s?.kasa_kapanis_uyari, VARSAYILAN.kasaKapanisUyari),
    paraHareketiAcik: s?.para_hareketi_acik ?? VARSAYILAN.paraHareketiAcik,
    cekmeceNakitteAcilsin: s?.cekmece_nakitte_acilsin ?? VARSAYILAN.cekmeceNakitteAcilsin,
    servisAcik: s?.servis_acik ?? VARSAYILAN.servisAcik,
    kuver: servisTanimi(s, "kuver", VARSAYILAN.kuver),
    garsoniye: servisTanimi(s, "garsoniye", VARSAYILAN.garsoniye),
  };
}

// Çağıran yalnızca değiştirdiği alanı veriyor; gerisi önbellekten tamamlanıyor.
// Ayarlar ekranı büyüdükçe her düğmenin bütün ayarları taşıması gerekmesin.
export async function ayarlariKaydet(degisen: Partial<IsletmeAyarlari>) {
  const isletmeId = acikOturum()?.isletmeId;
  if (!isletmeId) throw new Error("Ayar kaydedilemedi.");

  const yeni = { ...onbellek, ...degisen };
  const { error } = await supabase.from("isletme_ayarlari").upsert(
    {
      isletme_id: isletmeId,
      kdv_dahil: yeni.kdvDahil,
      kasa_gunu_baslangic: yeni.kasaGunuBaslangic,
      kasa_gunu_bitis: yeni.kasaGunuBitis,
      kisi_sayisi_zorunlu: yeni.kisiSayisiZorunlu,
      kilit_suresi: yeni.kilitSuresi,
      para_ustu: yeni.paraUstu,
      mutfak_gecikme_dk: yeni.mutfakGecikmeDk,
      masa_durgunluk_dk: yeni.masaDurgunlukDk,
      gelal_acik: yeni.gelalAcik,
      paket_acik: yeni.paketAcik,
      kasa_takibi: yeni.kasaTakibi,
      kasa_kapanis_zorunlu: yeni.kasaKapanisZorunlu,
      // Saat alanı boşsa uyarı kapalı demektir; boş metin time'a yazılamıyor.
      kasa_kapanis_uyari: yeni.kasaKapanisUyari || null,
      para_hareketi_acik: yeni.paraHareketiAcik,
      cekmece_nakitte_acilsin: yeni.cekmeceNakitteAcilsin,
      servis_acik: yeni.servisAcik,
      kuver_otomatik: yeni.kuver.otomatik,
      kuver_ad: yeni.kuver.ad,
      kuver_tip: yeni.kuver.tip,
      kuver_deger: yeni.kuver.deger,
      garsoniye_otomatik: yeni.garsoniye.otomatik,
      garsoniye_ad: yeni.garsoniye.ad,
      garsoniye_tip: yeni.garsoniye.tip,
      garsoniye_deger: yeni.garsoniye.deger,
    },
    { onConflict: "isletme_id" }
  );
  if (error) throw new Error("Ayar kaydedilemedi.");
  onbellek = yeni;
}

// İşletmenin kimliği ayrı tabloda (`isletmeler`) duruyor ama ayarlarla aynı
// anda lazım oluyor: yan menü her ekranda adı gösteriyor. Ayarlarla birlikte
// bir kez okunup burada tutuluyor.
//
// İkisi de kayıt anında belirlenip bir daha değişmiyor; kaydetme fonksiyonu
// yok, satır güvenliği de güncellemeye kapalı.
let kimlik = { ad: "", kod: 0 };

export function isletmeAdi() {
  return kimlik.ad;
}

export function isletmeKodu() {
  return kimlik.kod;
}

export async function isletmeKimliginiGetir() {
  kimlik = await onbellekliGetir("isletme", async () => {
    const sonuc = await supabase.from("isletmeler").select("ad, kod").maybeSingle();
    hataysaFirlat(sonuc);
    const s = sonuc.data as any;
    return { ad: (s?.ad ?? "") as string, kod: (s?.kod ?? 0) as number };
  });
  return kimlik;
}
