import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Kasaya verilecek kurulum dosyasını üretiyor: `npm.cmd run paketle`.
 *
 * Çıkan şey `dagitim/garso-kopru-kurulum-<sürüm>.exe` — işletme çift tıklıyor,
 * program kuruluyor ve kendiliğinden açılıyor. Kasada Node kurulumu, klasör
 * kopyalama ya da terminal komutu yok.
 *
 * Buradaki tek elle iş, sunucu bilgisinin koda gömülmesi: adres ve anon
 * anahtarı her işletmede aynı, sorulmaları anlamsız. Değerler ana projenin
 * `.env.local` dosyasından okunuyor ki iki yerde iki ayrı adres tutulmasın.
 */

const kok = dirname(fileURLToPath(import.meta.url));

function sunucuBilgisi() {
  const yol = join(kok, "..", ".env.local");
  let ham;
  try {
    ham = readFileSync(yol, "utf8");
  } catch {
    throw new Error(`Sunucu bilgisi okunamadı: ${yol} bulunamadı.`);
  }

  const oku = (ad) => ham.match(new RegExp(`^${ad}=(.*)$`, "m"))?.[1]?.trim();
  const sunucu = oku("VITE_SUPABASE_URL");
  const anahtar = oku("VITE_SUPABASE_KEY");
  if (!sunucu || !anahtar) {
    throw new Error(".env.local içinde VITE_SUPABASE_URL ya da VITE_SUPABASE_KEY yok.");
  }
  return { sunucu, anahtar };
}

console.log("1/2  Sunucu bilgisi koda gömülüyor...");
const bilgi = sunucuBilgisi();
writeFileSync(
  join(kok, "src", "sunucu-gomulu.js"),
  `// Paketlerken üretiliyor, elle düzenlenmiyor.\nexport const GOMULU = ${JSON.stringify(bilgi, null, 2)};\n`,
  "utf8"
);

console.log("2/2  Kurulum dosyası yazılıyor...");
execFileSync(process.execPath, [join(kok, "node_modules", "electron-builder", "cli.js"), "--win"], {
  stdio: "inherit",
  cwd: kok,
});

// Çıktı proje klasörünün dışına yazılıyor: Windows'un dosya dizinleyicisi
// Masaüstü'nü sürekli tarıyor ve paketleyicinin klasör adı değiştirme adımını
// engelliyor ("EPERM").
console.log(`\nHazır: ${join(process.env.LOCALAPPDATA, "Garso", "dagitim")}\n`);
