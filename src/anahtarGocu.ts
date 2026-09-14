// Ürün adı Garso'dan RayoPOS'a döndü; tarayıcıda eski adla kalan kayıtlar
// (bekleyen siparişler, oturum, tercihler) kaybolmasın diye yeni ada taşınır.
const ESKI_ON_EKLER = ["garso-", "garso."];
const YENI_ON_EK = "rayopos-";

function tasi(depo: Storage) {
  const anahtarlar: string[] = [];
  for (let i = 0; i < depo.length; i++) {
    const anahtar = depo.key(i);
    if (anahtar && ESKI_ON_EKLER.some((onEk) => anahtar.startsWith(onEk))) {
      anahtarlar.push(anahtar);
    }
  }

  for (const eski of anahtarlar) {
    const yeni = YENI_ON_EK + eski.slice("garso-".length);
    const deger = depo.getItem(eski);
    if (deger !== null && depo.getItem(yeni) === null) depo.setItem(yeni, deger);
    depo.removeItem(eski);
  }
}

try {
  tasi(localStorage);
  tasi(sessionStorage);
} catch {
  // Depo kapalıysa (gizli pencere vb.) taşınacak bir şey de yoktur.
}
