import { durumluModul } from "./sicakGuncelleme";
import { useEffect, useState } from "react";
import { adisyonKaydet, adisyonOzeti, gecKalanSiparis, masasizKaydet } from "./adisyonlar";
import type { AdisyonVerisi, MasaOzeti } from "./adisyonlar";
import { baglantiDinle, baglantiHatasi, baglantiVar, kopukBildir } from "./baglanti";
import { hesapKopyalari, hesapKopyasiOku, hesapKopyasiSil, salonKopyasiOku } from "./hesapKopyasi";
import type { HesapHedefi } from "./hesapKopyasi";

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
 * **Tahsilat ve hesap kapatma da kuyruğa giriyor** (7 Eyl 2026). Önceki kural
 * "para işlemi bekletilemez" diyordu; işletmede internet gidince müşteri
 * bekletilemediği için kural değişti. Çift ödemeyi tahsilatın istemci kimliği
 * durduruyor: aynı kayıt iki kez gönderilse de sunucu ikincisini yazmıyor.
 * Yetki çevrimdışıyken cihazdaki listeye bakıyor, kayıt sunucuya varınca
 * tetikleyici yeniden denetliyor — reddedilirse sebep şeritte yazıyor.
 */

const ANAHTAR = "garso-kuyruk";

export type KuyrukIsi =
  | { tip: "masa"; masaId: number; masaAdi?: string; veri: AdisyonVerisi; kapat?: boolean }
  | { tip: "masasiz"; adisyonId: number; veri: AdisyonVerisi; kapat?: boolean };

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
  // Kapatma kaydı yerinde kalıyor: üstüne yazılırsa hesabın kapandığı bilgisi
  // kaybolur ve masa sunucuda açık kalırdı. Aynı masaya sonra girilen sipariş
  // kuyruğun arkasına ekleniyor — sırayla gidince yeni hesap olarak açılıyor.
  kuyruk = [
    ...kuyruk.filter((k) => k.kapat || hedef(k) !== hedef(is)),
    { ...is, zaman: Date.now() },
  ];
  yaz();
}

export function bekleyenSayisi() {
  return kuyruk.length;
}

/** Bu masanın/adisyonun gönderilmemiş kaydı — ekran açılınca sepet buradan geliyor. */
export function bekleyenKayit(is: { tip: "masa"; masaId: number } | { tip: "masasiz"; adisyonId: number }) {
  // Kapanmış hesabın kaydı sepet değildir: sipariş ekranı onu açsa ödenmiş
  // ürünler yeni siparişin içine karışırdı.
  return kuyruk.find((k) => hedef(k) === hedef(is as KuyrukIsi) && !k.kapat)?.veri;
}

/**
 * Bağlantı yokken hesabın cihazdaki son bilinen hâli: önce kuyrukta bekleyen
 * kayıt, o yoksa hesap kopyası.
 *
 * Kopya yalnız hesap çevrimiçiyken okunduğunda yazılıyor; çevrimdışı açılan
 * masanın kopyası hiç olmuyor. Yalnız kopyaya bakan ekranlar bu masada
 * "cihazda kopyası yok" deyip ödemeyi reddediyordu, oysa hesap kuyrukta
 * duruyor. Kuyruktaki kayıt kopyadan da yeni — sıra bu yüzden böyle.
 */
export function cevrimdisiHesap(is: HesapHedefi) {
  const kayit = kuyruk.find((k) => hedef(k) === hedef(is as KuyrukIsi) && !k.kapat);
  if (kayit) return { veri: kayit.veri, zaman: kayit.zaman };
  const kopya = hesapKopyasiOku(is);
  return kopya ? { veri: kopya.veri, zaman: kopya.zaman } : null;
}

/**
 * Salon için: kuyrukta bekleyen masaların özeti. Sunucu bu adisyonları henüz
 * bilmiyor; masa boş görünürse garson aynı masaya ikinci hesap açar.
 */
export function bekleyenMasalar(): Record<number, MasaOzeti> {
  const sonuc: Record<number, MasaOzeti> = {};
  for (const k of kuyruk) {
    // Çevrimdışı kapatılan hesap masayı boşaltıyor; dolu göstermek garsonu
    // ödenmiş masaya geri yollardı.
    if (k.tip !== "masa" || k.kapat) continue;
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

/**
 * Kuyrukta bekleyen, sunucuya henüz yazılmamış tahsilatlar.
 *
 * Kimliği olan tahsilat sunucuda zaten duruyor; kayıt yalnız başka bir alanı
 * değiştirmek için kuyruğa girmiş olabilir. Onu da saysaydık para kasada iki
 * kez görünürdü.
 */
export function bekleyenTahsilatlar(): { tip: string; tutar: number }[] {
  const sonuc: { tip: string; tutar: number }[] = [];
  for (const k of kuyruk) {
    for (const t of k.veri.tahsilatlar) {
      if (!t.id) sonuc.push({ tip: t.tip, tutar: t.tutar });
    }
  }
  return sonuc;
}

/**
 * Bağlantı yokken salonun doldurduğu masalar: cihazın bildiği son hesaplar.
 *
 * Sunucudan adisyon okunamadığı için salon çevrimdışıyken bomboş görünüyordu;
 * dolu masaya girilemeyince ödemesi de alınamıyordu. Kopya "bu masada şu
 * hesap vardı" diyor, kart kopyanın saatiyle çiziliyor — "gönderilmedi" değil,
 * "doğrulanamadı".
 */
export function kopyaMasalari(): Record<number, MasaOzeti> {
  // Salonun son bilinen hâli temel; masaya girilmişse o hesabın kendi kopyası
  // daha yenidir, üstüne biniyor. İkisi de "sunucudan değil cihazdan" —
  // kartta gönderilmemiş sipariş değil, doğrulanamayan masa olarak çiziliyor.
  const sonuc: Record<number, MasaOzeti> = salonKopyasiOku();
  for (const kopya of hesapKopyalari()) {
    const masaId = Number(kopya.anahtar.replace("masa-", ""));
    if (!kopya.anahtar.startsWith("masa-") || !masaId) continue;
    const ozet = adisyonOzeti(kopya.veri);
    const oncekiZaman = sonuc[masaId]?.kopyaZamani ?? 0;
    // Salon kopyası daha yeniyse o geçerli: masaya girildikten sonra başka bir
    // cihazdan ürün eklenmiş olabilir.
    if (oncekiZaman > kopya.zaman) continue;
    sonuc[masaId] = {
      id: kopya.veri.id ?? 0,
      tutar: ozet.toplam,
      odenen: ozet.odenen,
      kalan: ozet.kalan,
      adet: kopya.veri.sepet
        .filter((s) => (s.durum ?? "normal") !== "iptal")
        .reduce((t, s) => t + s.adet, 0),
      acilis: kopya.veri.acilis ?? new Date(kopya.zaman).toISOString(),
      ad: kopya.veri.ad || undefined,
      kisiSayisi: kopya.veri.kisiSayisi || undefined,
      kopyaZamani: kopya.zaman,
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
 * Gönderim bağlantı yüzünden düştüğünde kurulan emniyet zamanlayıcısı.
 *
 * Gönderimi başlatan iki tetik vardı: program açılışı ve bağlantının gelmesi.
 * Modem yeni kalkarken ilk deneme düşüyor, durum çevrimiçi kalıyor ve ikinci
 * tetik bir daha gelmiyordu — kuyruk sayfa yenilenene kadar bekliyordu.
 *
 * Bekleme artıyor: ilk deneme hızlı olsun ki normal bir kesintide kimse
 * beklemesin, sunucu uzun süre kapalıysa boş istek yağmuru olmasın.
 */
const ILK_BEKLEME = 3_000;
const EN_UZUN_BEKLEME = 30_000;
let bekleme = ILK_BEKLEME;
let denemeZamanlayici: ReturnType<typeof setTimeout> | null = null;

function yenidenDene() {
  if (denemeZamanlayici) clearTimeout(denemeZamanlayici);
  denemeZamanlayici = setTimeout(() => {
    denemeZamanlayici = null;
    void kuyruguGonder();
  }, bekleme);
  bekleme = Math.min(bekleme * 2, EN_UZUN_BEKLEME);
}

/**
 * Kuyruğu sırayla sunucuya gönderir. Sıra korunuyor: kayıtlar aynı anda
 * gitseydi iki masanın turları birbirine karışabilirdi. Bir kayıt bağlantı
 * yüzünden düşerse kuyruk olduğu yerde duruyor, sonraki denemeyi bekliyor.
 */
export async function kuyruguGonder() {
  if (gonderiliyor || !kuyruk.length) return;
  // Bağlantı yokken tetik yoklamadan gelecek; yine de kuyruk kendi kendini
  // yoklamayı sürdürüyor ki hiçbir durumda tek tetiğe bağlı kalmasın.
  if (!baglantiVar()) return yenidenDene();
  // Bekleyen deneme varsa iptal: aynı kuyruk iki kez gönderilmesin.
  if (denemeZamanlayici) {
    clearTimeout(denemeZamanlayici);
    denemeZamanlayici = null;
  }
  gonderiliyor = true;
  sonHata = null;

  try {
    while (kuyruk.length) {
      const kayit = kuyruk[0];
      const paraVar = kayit.veri.tahsilatlar.some((t) => !t.id);
      try {
        if (kayit.tip === "masa") {
          await adisyonKaydet(kayit.masaId, kayit.veri, kayit.kapat ?? false);
          // Sipariş cihazda beklerken hesap kapandıysa ürün yeni bir hesaba
          // düştü ve parası alınmadı; işletmeci görsün.
          const no = await gecKalanSiparis(kayit.masaId, kayit.zaman).catch(() => null);
          if (no) {
            const masa = kayit.masaAdi ?? "Masa";
            sonUyari = paraVar
              ? `${masa} için çevrimdışı alınan ödeme, hesap (#${no}) kapandıktan sonra yazıldı. Aynı hesap iki kez tahsil edilmiş olabilir — kasa hareketlerinden kontrol edin.`
              : `${masa} için bekleyen sipariş, hesap (#${no}) kapandıktan sonra yazıldı. Ürünler yeni bir hesapta duruyor, parası alınmadı.`;
          }
        } else await masasizKaydet(kayit.adisyonId, kayit.veri, kayit.kapat ?? false);
        // Hesap kapandı: cihazdaki kopya artık yanlış bilgi.
        if (kayit.kapat) {
          hesapKopyasiSil(
            kayit.tip === "masa"
              ? { tip: "masa", masaId: kayit.masaId }
              : { tip: "masasiz", adisyonId: kayit.adisyonId }
          );
        }
      } catch (hata) {
        // Bağlantı yine gitmişse kayıt kuyrukta kalıyor ve sessizce bekliyor.
        // Durum da kopuğa çevriliyor: çevrimiçi sanılırsa "bağlantı geldi"
        // tetiği bir daha gelmez, kuyruk tek fırsatını kaybederdi.
        if (baglantiHatasi(hata) || !baglantiVar()) {
          kopukBildir();
          yenidenDene();
          return;
        }
        // Başka bir hata (silinmiş masa, yetki) tekrar denemekle düzelmiyor:
        // kayıt kuyruktan çıkarılıyor ve sebebi ekranda söyleniyor, yoksa
        // kuyruk sonsuza kadar aynı kaydı deneyip tıkanırdı.
        // Para taşıyan kayıt düşerse sessiz kalmamalı: tahsilat cihazda alındı
        // ama kasaya girmedi, biri elle girmek zorunda.
        const varsayilan = paraVar
          ? "Çevrimdışı alınan ödeme sunucuya yazılamadı. Tahsilat kasaya girmedi."
          : "Bekleyen sipariş sunucuya yazılamadı.";
        sonHata = hata instanceof Error && hata.message ? hata.message : varsayilan;
        kuyruk = kuyruk.slice(1);
        yaz();
        continue;
      }
      // Kayıt geçti: bir sonraki kesintide yeniden baştan, hızlı denensin.
      bekleme = ILK_BEKLEME;
      kuyruk = kuyruk.slice(1);
      yaz();
    }
  } finally {
    gonderiliyor = false;
    for (const f of dinleyiciler) f();
  }
}

/** Ekranların kuyruğu izlemesi: bekleyen kayıt/ödeme sayısı ve hata mesajı. */
export function useKuyruk() {
  const [, yenile] = useState(0);
  useEffect(() => {
    const f = () => yenile((n) => n + 1);
    dinleyiciler.add(f);
    return () => {
      dinleyiciler.delete(f);
    };
  }, []);
  return {
    bekleyen: kuyruk.length,
    bekleyenOdeme: bekleyenTahsilatlar().length,
    hata: sonHata,
    uyari: sonUyari,
  };
}

/** Kuyruğun kendi kendine boşalması: bağlantı gelir gelmez gönderiliyor. */
export function kuyruguIzle() {
  baglantiDinle((cevrimici) => {
    if (cevrimici) void kuyruguGonder();
  });
  void kuyruguGonder();
}

// Modül kendi durumunu bellekte tutuyor: sıcak güncelleme yerine tam yenileme.
durumluModul(import.meta.hot);
