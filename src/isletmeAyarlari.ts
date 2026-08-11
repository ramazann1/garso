import { acikOturum } from "./oturum";
import { supabase } from "./supabase";

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
};

const VARSAYILAN: IsletmeAyarlari = {
  kdvDahil: true,
  kasaGunuBaslangic: "08:00",
  kasaGunuBitis: "07:55",
  kisiSayisiZorunlu: false,
  kilitSuresi: 0,
  paraUstu: true,
  gelalAcik: true,
  paketAcik: true,
  kasaTakibi: false,
  kasaKapanisZorunlu: false,
  kasaKapanisUyari: "",
  paraHareketiAcik: true,
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

// Tablo artık işletme başına tek satır tutuyor; hangi satırın okunacağını
// satır güvenliği belirliyor, sorguda ayrıca süzmeye gerek yok.
export async function ayarlariGetir(): Promise<IsletmeAyarlari> {
  const { data } = await supabase.from("isletme_ayarlari").select("*").maybeSingle();
  const s = data as any;
  onbellek = {
    kdvDahil: s?.kdv_dahil ?? VARSAYILAN.kdvDahil,
    kasaGunuBaslangic: saat(s?.kasa_gunu_baslangic, VARSAYILAN.kasaGunuBaslangic),
    kasaGunuBitis: saat(s?.kasa_gunu_bitis, VARSAYILAN.kasaGunuBitis),
    kisiSayisiZorunlu: s?.kisi_sayisi_zorunlu ?? VARSAYILAN.kisiSayisiZorunlu,
    kilitSuresi: s?.kilit_suresi ?? VARSAYILAN.kilitSuresi,
    paraUstu: s?.para_ustu ?? VARSAYILAN.paraUstu,
    gelalAcik: s?.gelal_acik ?? VARSAYILAN.gelalAcik,
    paketAcik: s?.paket_acik ?? VARSAYILAN.paketAcik,
    kasaTakibi: s?.kasa_takibi ?? VARSAYILAN.kasaTakibi,
    kasaKapanisZorunlu: s?.kasa_kapanis_zorunlu ?? VARSAYILAN.kasaKapanisZorunlu,
    kasaKapanisUyari: saat(s?.kasa_kapanis_uyari, VARSAYILAN.kasaKapanisUyari),
    paraHareketiAcik: s?.para_hareketi_acik ?? VARSAYILAN.paraHareketiAcik,
  };
  return onbellek;
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
      gelal_acik: yeni.gelalAcik,
      paket_acik: yeni.paketAcik,
      kasa_takibi: yeni.kasaTakibi,
      kasa_kapanis_zorunlu: yeni.kasaKapanisZorunlu,
      // Saat alanı boşsa uyarı kapalı demektir; boş metin time'a yazılamıyor.
      kasa_kapanis_uyari: yeni.kasaKapanisUyari || null,
      para_hareketi_acik: yeni.paraHareketiAcik,
    },
    { onConflict: "isletme_id" }
  );
  if (error) throw new Error("Ayar kaydedilemedi.");
  onbellek = yeni;
}
