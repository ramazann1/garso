import { readFileSync, writeFileSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";
import { join } from "node:path";
import { sunucuBilgisi } from "./sunucu.js";
import { kokDizin } from "./yerler.js";

/**
 * Ayar dosyasının tam yolu.
 *
 * Pencereli sürümde ana süreç `GARSO_AYAR_YOLU` ile Windows'un kullanıcı
 * klasörünü bildiriyor; program dosyalarının yanına yazmak yönetici yetkisi
 * istiyor ve güncellemede silinip gidiyor.
 */
export const ayarYolu = () => process.env.GARSO_AYAR_YOLU || join(kokDizin, "ayarlar.json");

/**
 * Ayarlar: yalnız giriş bilgisi. Sunucu adresi ve anahtarı programa gömülü
 * (bkz. sunucu.js), yazıcı tanımları bulutta duruyor — işletme kaç kasa
 * kullanırsa kullansın ayar tek yerde.
 */
export function ayarlariOku() {
  const yol = ayarYolu();
  let ham;
  try {
    ham = readFileSync(yol, "utf8");
  } catch {
    throw new Error(`Ayar dosyası bulunamadı: ${yol}`);
  }

  let ayar;
  try {
    ayar = JSON.parse(ham);
  } catch {
    throw new Error("ayarlar.json okunamadı — dosyada yazım hatası var.");
  }

  return ayarlariTamamla(ayar);
}

/**
 * Eksikleri gömülü bilgiyle dolduruyor ve zorunlu alanları denetliyor. Dosyada
 * sunucu/anahtar yazıyorsa o kazanıyor: olağandışı bir durumda (deneme sunucusu)
 * programı yeniden paketlemeden yön değiştirebilmek için bırakılan kapı.
 */
export function ayarlariTamamla(ayar) {
  const gomulu = sunucuBilgisi();
  const tam = {
    sunucu: ayar.sunucu || gomulu.sunucu,
    anahtar: ayar.anahtar || gomulu.anahtar,
    telefon: ayar.telefon,
    sifre: ayar.sifre,
    yoklamaSaniye: Math.max(Number(ayar.yoklamaSaniye) || 3, 1),
  };

  for (const alan of ["telefon", "sifre"]) {
    if (!tam[alan]) throw new Error(`Giriş bilgisi eksik: "${alan}" boş.`);
  }
  return tam;
}

/**
 * Cihaz kimliği: bilgisayar adı + ağ kartının fiziksel adresi. Aynı işletmede
 * iki kasa varsa hangi fişi hangisinin bastığı buradan ayırt ediliyor.
 *
 * İlk hesaplandığında ayar dosyasına yazılıp bir daha değişmiyor: bilgisayarda
 * birden çok ağ kartı olunca (Wi-Fi, Ethernet, sanal kart) her açılışta başka
 * adres bulunabiliyor ve tek kasa iki ayrı cihaz gibi görünüyordu.
 */
export function cihazKimligi() {
  const kayit = dosyaOku();
  if (kayit.cihaz) return kayit.cihaz;

  const kartlar = Object.values(networkInterfaces()).flat();
  const adresler = kartlar
    .filter((k) => k && !k.internal && k.mac && k.mac !== "00:00:00:00:00:00")
    .map((k) => k.mac)
    .sort();
  const kimlik = `${hostname()}:${(adresler[0] ?? "bilinmiyor").replaceAll(":", "").toUpperCase()}`;

  dosyaYaz({ ...kayit, cihaz: kimlik });
  return kimlik;
}

/** Ayar dosyasının ham hâli; yoksa ya da bozuksa boş kayıt. */
export function dosyaOku() {
  try {
    return JSON.parse(readFileSync(ayarYolu(), "utf8"));
  } catch {
    return {};
  }
}

/** Ayar dosyasına yazma; yazılamıyorsa program durmuyor. */
export function dosyaYaz(kayit) {
  try {
    writeFileSync(ayarYolu(), `${JSON.stringify(kayit, null, 2)}\n`, "utf8");
  } catch {
    /* salt okunur klasör; kimlik bu açılışta hesaplanmış hâliyle kullanılır */
  }
}

/** Telefondan hesap adresi — programın giriş ekranıyla aynı kural. */
export function hesapEpostasi(telefon) {
  return `${String(telefon).replace(/\D/g, "")}@garso.app`;
}
