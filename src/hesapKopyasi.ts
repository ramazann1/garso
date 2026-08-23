import type { AdisyonVerisi } from "./adisyonlar";

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
}

/** Kopyanın yaşı — şeritte "14:32'deki hâli" diye yazılıyor. */
export function kopyaSaati(zaman: number) {
  return new Date(zaman).toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });
}
