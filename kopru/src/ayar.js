import { readFileSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";
import { join } from "node:path";
import { kokDizin } from "./yerler.js";

/** Ayar dosyasının tam yolu — ilk açılıştaki kurulum sihirbazı da buraya yazıyor. */
export const ayarYolu = () => join(kokDizin, "ayarlar.json");

/**
 * Ayarlar programın yanındaki ayarlar.json'dan okunuyor. Kasadaki kişi bu
 * dosyayı bir kez düzenliyor; sunucu adresi ve teknik kullanıcının bilgisi
 * dışında bir şey sorulmuyor. Yazıcı tanımları buraya yazılmıyor — onlar
 * bulutta duruyor, işletme kaç kasa kullanırsa kullansın ayar tek yerde.
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

  for (const alan of ["sunucu", "anahtar", "telefon", "sifre"]) {
    if (!ayar[alan]) throw new Error(`ayarlar.json içinde "${alan}" boş.`);
  }
  ayar.yoklamaSaniye = Math.max(Number(ayar.yoklamaSaniye) || 3, 1);
  return ayar;
}

/**
 * Cihaz kimliği: bilgisayar adı + ağ kartının fiziksel adresi. Aynı işletmede
 * iki kasa varsa hangi fişi hangisinin bastığı buradan ayırt ediliyor.
 */
export function cihazKimligi() {
  const kartlar = Object.values(networkInterfaces()).flat();
  const mac = kartlar.find((k) => k && !k.internal && k.mac && k.mac !== "00:00:00:00:00:00");
  return `${hostname()}:${(mac?.mac ?? "bilinmiyor").replaceAll(":", "").toUpperCase()}`;
}

/** Telefondan hesap adresi — programın giriş ekranıyla aynı kural. */
export function hesapEpostasi(telefon) {
  return `${String(telefon).replace(/\D/g, "")}@garso.app`;
}
