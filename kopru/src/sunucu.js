import { readFileSync } from "node:fs";
import { join } from "node:path";
import { kokDizin } from "./yerler.js";

/**
 * Garso'nun kendi sunucusu.
 *
 * Adres ve anon anahtarı her işletmede aynı — işletmecinin bunları bilmesi
 * imkânsız, sorulursa kurulum satılabilir olmaktan çıkar. Bu yüzden programın
 * içine gömülüyor: paketlerken `sunucu-gomulu.js` üretiliyor ve buradan
 * okunuyor. Anahtar gizli bir bilgi değil; tarayıcıda çalışan Garso'nun içinde
 * de duruyor, veriyi koruyan şey satır güvenliği.
 *
 * Geliştirirken o dosya olmuyor; ana projenin `.env.local`'ı okunuyor.
 */

let gomulu = null;
try {
  gomulu = (await import("./sunucu-gomulu.js")).GOMULU;
} catch {
  gomulu = null;
}

function gelistirmeAyari() {
  // kopru/ klasörünün bir üstü ana proje.
  const yol = join(kokDizin, "..", ".env.local");
  let ham;
  try {
    ham = readFileSync(yol, "utf8");
  } catch {
    return null;
  }

  const oku = (ad) => ham.match(new RegExp(`^${ad}=(.*)$`, "m"))?.[1]?.trim();
  const sunucu = oku("VITE_SUPABASE_URL");
  const anahtar = oku("VITE_SUPABASE_KEY");
  return sunucu && anahtar ? { sunucu, anahtar } : null;
}

export function sunucuBilgisi() {
  const bilgi = gomulu ?? gelistirmeAyari();
  if (!bilgi) {
    throw new Error("Sunucu bilgisi bulunamadı — program eksik paketlenmiş olabilir.");
  }
  return bilgi;
}
