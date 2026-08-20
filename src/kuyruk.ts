import { useEffect, useState } from "react";
import { adisyonKaydet, adisyonOzeti, gecKalanSiparis, masasizKaydet } from "./adisyonlar";
import type { AdisyonVerisi, MasaOzeti } from "./adisyonlar";
import { baglantiDinle, baglantiHatasi, baglantiVar } from "./baglanti";

/**
 * Bağlantı yokken alınan siparişlerin cihazdaki kuyruğu.
 *
 * Kuyruk "ne yapılacağını" saklıyor, kaydın kendisini değil: numaraları
 * (adisyon no, sipariş no, kalem kimlikleri) yine sunucu veriyor, kuyruk
 * sırası gelince aynı kaydetme çağrısını yapıyor. Cihazın kendi numarasını
 * üretmesi iki kasada aynı numara riski demekti.
 *
 * **Bir hedefin yalnız son kaydı duruyor.** Ekrandaki sepet her kaydetmede
 * bütün hâliyle geliyor; aynı masanın iki kaydı arka arkaya gönderilseydi ilk
 * kaydın ürünleri ikinci kayıtta yeniden eklenir, masaya iki katı yazılırdı.
 *
 * Kapsam dışı: tahsilat ve hesap kapatma kuyruğa girmiyor. Para işlemi
 * bekletilemez — kapatma çevrimdışıyken yine engelleniyor, sipariş almak
 * devam ediyor.
 */

const ANAHTAR = "garso-kuyruk";

export type KuyrukIsi =
  | { tip: "masa"; masaId: number; masaAdi?: string; veri: AdisyonVerisi }
  | { tip: "masasiz"; adisyonId: number; veri: AdisyonVerisi };

export type KuyrukKaydi = KuyrukIsi & { zaman: number };

/** Aynı masanın/adisyonun kayıtları tek satırda toplansın diye. */
function hedef(is: KuyrukIsi) {
  return is.tip === "masa" ? `masa-${is.masaId}` : `adisyon-${is.adisyonId}`;
}

let kuyruk: KuyrukKaydi[] = oku();
const dinleyiciler = new Set<() => void>();

function oku(): KuyrukKaydi[] {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    return ham ? (JSON.parse(ham) as KuyrukKaydi[]) : [];
  } catch {
    return [];
  }
}

function yaz() {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(kuyruk));
  } catch {
    // Yer dolduysa kuyruk yalnız bellekte kalır; sipariş yine gönderilecek.
  }
  for (const f of dinleyiciler) f();
}

export function kuyrugaEkle(is: KuyrukIsi) {
  kuyruk = [...kuyruk.filter((k) => hedef(k) !== hedef(is)), { ...is, zaman: Date.now() }];
  yaz();
}

export function bekleyenSayisi() {
  return kuyruk.length;
}

/** Bu masanın/adisyonun gönderilmemiş kaydı — ekran açılınca sepet buradan geliyor. */
export function bekleyenKayit(is: { tip: "masa"; masaId: number } | { tip: "masasiz"; adisyonId: number }) {
  return kuyruk.find((k) => hedef(k) === hedef(is as KuyrukIsi))?.veri;
}

/**
 * Salon için: kuyrukta bekleyen masaların özeti. Sunucu bu adisyonları henüz
 * bilmiyor; masa boş görünürse garson aynı masaya ikinci hesap açar.
 */
export function bekleyenMasalar(): Record<number, MasaOzeti> {
  const sonuc: Record<number, MasaOzeti> = {};
  for (const k of kuyruk) {
    if (k.tip !== "masa") continue;
    const ozet = adisyonOzeti(k.veri);
    sonuc[k.masaId] = {
      // Sunucudaki kimliği yok; kart yalnız tutar ve adet gösteriyor.
      id: 0,
      tutar: ozet.toplam,
      odenen: ozet.odenen,
      kalan: ozet.kalan,
      adet: k.veri.sepet
        .filter((s) => (s.durum ?? "normal") !== "iptal")
        .reduce((t, s) => t + s.adet, 0),
      acilis: new Date(k.zaman).toISOString(),
      ad: k.veri.ad || undefined,
      kisiSayisi: k.veri.kisiSayisi || undefined,
      bekliyor: true,
    };
  }
  return sonuc;
}

/** Kuyruk boşaltılırken çıkan hata; şerit bunu gösteriyor. */
let sonHata: string | null = null;
// Hata değil ama sessiz kalmaması gereken durum: sipariş cihazda beklerken
// masanın hesabı kapanmış. Şerit bunu ayrı bir uyarı olarak gösteriyor.
let sonUyari: string | null = null;
let gonderiliyor = false;

export function kuyrukHatasi() {
  return sonHata;
}

export function kuyrukUyarisiniKapat() {
  sonUyari = null;
  for (const f of dinleyiciler) f();
}

/**
 * Kuyruğu sırayla sunucuya gönderir. Sıra korunuyor: kayıtlar aynı anda
 * gitseydi iki masanın turları birbirine karışabilirdi. Bir kayıt bağlantı
 * yüzünden düşerse kuyruk olduğu yerde duruyor, sonraki denemeyi bekliyor.
 */
export async function kuyruguGonder() {
  if (gonderiliyor || !kuyruk.length || !baglantiVar()) return;
  gonderiliyor = true;
  sonHata = null;

  try {
    while (kuyruk.length) {
      const kayit = kuyruk[0];
      try {
        if (kayit.tip === "masa") {
          await adisyonKaydet(kayit.masaId, kayit.veri);
          // Sipariş cihazda beklerken hesap kapandıysa ürün yeni bir hesaba
          // düştü ve parası alınmadı; işletmeci görsün.
          const no = await gecKalanSiparis(kayit.masaId, kayit.zaman).catch(() => null);
          if (no) {
            sonUyari = `${kayit.masaAdi ?? "Masa"} için bekleyen sipariş, hesap (#${no}) kapandıktan sonra yazıldı. Ürünler yeni bir hesapta duruyor, parası alınmadı.`;
          }
        } else await masasizKaydet(kayit.adisyonId, kayit.veri);
      } catch (hata) {
        // Bağlantı yine gitmişse kayıt kuyrukta kalıyor ve sessizce bekliyor.
        if (baglantiHatasi(hata) || !baglantiVar()) return;
        // Başka bir hata (silinmiş masa, yetki) tekrar denemekle düzelmiyor:
        // kayıt kuyruktan çıkarılıyor ve sebebi ekranda söyleniyor, yoksa
        // kuyruk sonsuza kadar aynı kaydı deneyip tıkanırdı.
        sonHata =
          hata instanceof Error && hata.message
            ? hata.message
            : "Bekleyen sipariş sunucuya yazılamadı.";
        kuyruk = kuyruk.slice(1);
        yaz();
        continue;
      }
      kuyruk = kuyruk.slice(1);
      yaz();
    }
  } finally {
    gonderiliyor = false;
    for (const f of dinleyiciler) f();
  }
}

/** Ekranların kuyruğu izlemesi: bekleyen sayısı ve hata mesajı. */
export function useKuyruk() {
  const [, yenile] = useState(0);
  useEffect(() => {
    const f = () => yenile((n) => n + 1);
    dinleyiciler.add(f);
    return () => {
      dinleyiciler.delete(f);
    };
  }, []);
  return { bekleyen: kuyruk.length, hata: sonHata, uyari: sonUyari };
}

/** Kuyruğun kendi kendine boşalması: bağlantı gelir gelmez gönderiliyor. */
export function kuyruguIzle() {
  baglantiDinle((cevrimici) => {
    if (cevrimici) void kuyruguGonder();
  });
  void kuyruguGonder();
}
