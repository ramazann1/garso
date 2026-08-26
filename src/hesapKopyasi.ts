import { durumluModul } from "./sicakGuncelleme";
import type { AdisyonVerisi, MasaOzeti } from "./adisyonlar";

/**
 * Açık hesabın cihazdaki son bilinen kopyası.
 *
 * Kural normalde şu: canlı veri önbelleğe girmez, bir dakika öncesinin masa
 * durumu yanlış bilgidir (`onbellek.ts`). Burada bilerek ayrılıyoruz —
 * çevrimdışı tahsilat alınabilmesi için cihazın hesabı bilmesi şart. Kopya
 * hesabı **göstermek ve parasını almak** için var; sipariş ekranı buna
 * bakmıyor, orada boş sepetle açılma kuralı duruyor.
 *
 * Bayatlık gizlenmiyor: kopyanın kaç zaman önce alındığı ekranda yazıyor,
 * ödeme alan kişi elindeki hesabın son hâli olmayabileceğini görüyor.
 */

const ANAHTAR = "garso-hesap-kopyasi";
// Bir vardiyadan eski kopya bilgi değil, tahmindir; gösterilmiyor.
const OMUR = 12 * 60 * 60 * 1000;
// Cihazın deposu dolmasın: en son bakılan hesaplar tutuluyor.
const SINIR = 60;

export type HesapHedefi =
  | { tip: "masa"; masaId: number }
  | { tip: "masasiz"; adisyonId: number };

type Kopya = { anahtar: string; zaman: number; veri: AdisyonVerisi };

function anahtar(hedef: HesapHedefi) {
  return hedef.tip === "masa" ? `masa-${hedef.masaId}` : `adisyon-${hedef.adisyonId}`;
}

function tumu(): Kopya[] {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    const liste = ham ? (JSON.parse(ham) as Kopya[]) : [];
    const sinir = Date.now() - OMUR;
    return liste.filter((k) => k.zaman > sinir);
  } catch {
    return [];
  }
}

function yaz(liste: Kopya[]) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(liste.slice(-SINIR)));
  } catch {
    // Yer dolduysa kopya tutulamıyor; çevrimdışı ödeme o cihazda çalışmaz,
    // programın geri kalanı etkilenmez.
  }
}

/** Sunucudan okunan açık hesabı kopyalar. Boş hesap kopyalanmıyor. */
export function hesapKopyasiYaz(hedef: HesapHedefi, veri: AdisyonVerisi) {
  if (!veri.id || veri.sepet.length === 0) {
    hesapKopyasiSil(hedef);
    return;
  }
  const ad = anahtar(hedef);
  yaz([...tumu().filter((k) => k.anahtar !== ad), { anahtar: ad, zaman: Date.now(), veri }]);
}

/** Cihazdaki bütün kopyalar — çevrimdışı salon dolu masaları buradan çiziyor. */
export function hesapKopyalari() {
  return tumu();
}

/** Çevrimdışı ekranın okuduğu kopya; ne zaman alındığı da dönüyor. */
export function hesapKopyasiOku(hedef: HesapHedefi) {
  const kopya = tumu().find((k) => k.anahtar === anahtar(hedef));
  return kopya ? { veri: kopya.veri, zaman: kopya.zaman } : null;
}

/** Hesap kapandığında ya da sunucuda boş çıktığında kopya kalkıyor. */
export function hesapKopyasiSil(hedef: HesapHedefi) {
  const ad = anahtar(hedef);
  const kalan = tumu().filter((k) => k.anahtar !== ad);
  yaz(kalan);
  // Masa salon kopyasında da dolu duruyor; kapanan hesap orada da kalkmalı,
  // yoksa çevrimdışı salon ödenmiş masayı dolu göstermeye devam eder.
  if (hedef.tip === "masa") salonKopyasindanSil(hedef.masaId);
}

/**
 * Salonun son bilinen hâli: hangi masa dolu, ne kadar, kaç kişi.
 *
 * Hesap kopyası yalnız açılan masalar için yazılıyordu; bağlantı kesilince
 * salon, garsonun en son elle açtığı bir iki masa dışında bomboş görünüyordu.
 * Boş görünen dolu masaya ikinci hesap açılır. Bu kopya salon her okunduğunda
 * tazeleniyor, ödeme için gereken sepet yine hesap kopyasında duruyor.
 */
const SALON_ANAHTAR = "garso-salon-kopyasi";

export function salonKopyasiYaz(masalar: Record<number, MasaOzeti>) {
  try {
    localStorage.setItem(
      SALON_ANAHTAR,
      JSON.stringify({ zaman: Date.now(), masalar })
    );
  } catch {
    // Yer yoksa salon çevrimdışıyken boş görünür; başka bir şey etkilenmiyor.
  }
}

/** Çevrimdışı salonun çizdiği masalar; kopyanın alındığı an kartlara giriyor. */
export function salonKopyasiOku(): Record<number, MasaOzeti> {
  try {
    const ham = localStorage.getItem(SALON_ANAHTAR);
    if (!ham) return {};
    const kayit = JSON.parse(ham) as { zaman: number; masalar: Record<number, MasaOzeti> };
    // Bir vardiyadan eski salon bilgi değil, tahmindir.
    if (Date.now() - kayit.zaman > OMUR) return {};

    const sonuc: Record<number, MasaOzeti> = {};
    for (const [id, ozet] of Object.entries(kayit.masalar ?? {})) {
      sonuc[Number(id)] = { ...ozet, kopyaZamani: kayit.zaman };
    }
    return sonuc;
  } catch {
    return {};
  }
}

function salonKopyasindanSil(masaId: number) {
  try {
    const ham = localStorage.getItem(SALON_ANAHTAR);
    if (!ham) return;
    const kayit = JSON.parse(ham) as { zaman: number; masalar: Record<number, MasaOzeti> };
    delete kayit.masalar[masaId];
    localStorage.setItem(SALON_ANAHTAR, JSON.stringify(kayit));
  } catch {
    // Kopya okunamıyorsa yapacak bir şey yok; bağlantı gelince tazelenecek.
  }
}

/** Kopyanın yaşı — şeritte "14:32'deki hâli" diye yazılıyor. */
export function kopyaSaati(zaman: number) {
  return new Date(zaman).toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });
}

// Modül kendi durumunu bellekte tutuyor: sıcak güncelleme yerine tam yenileme.
durumluModul(import.meta.hot);
