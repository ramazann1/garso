import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const disariCagir = createRequire(import.meta.url);

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

/**
 * Kurulum penceresinin iki görseli. NSIS bunları yalnız BMP kabul ediyor, o
 * yüzden çizim burada yapılıp elle BMP olarak yazılıyor — hazır resim dosyası
 * tutulsaydı simge her değiştiğinde bir grafik programında yeniden üretilmesi
 * gerekirdi.
 */
async function kurulumGorselleri() {
  const { createCanvas, loadImage } = disariCagir("@napi-rs/canvas");
  const simge = await loadImage(join(kok, "varliklar", "simge-256.png"));

  const yaz = (tuval, ad) => {
    const { width: en, height: boy } = tuval;
    const nokta = tuval.getContext("2d").getImageData(0, 0, en, boy).data;
    // 24 bitlik BMP: satırlar alttan üste, her satır 4'ün katına tamamlanıyor.
    const dolgu = (4 - ((en * 3) % 4)) % 4;
    const govde = Buffer.alloc((en * 3 + dolgu) * boy);
    for (let y = 0; y < boy; y++) {
      for (let x = 0; x < en; x++) {
        const kaynak = (y * en + x) * 4;
        const hedef = (boy - 1 - y) * (en * 3 + dolgu) + x * 3;
        govde[hedef] = nokta[kaynak + 2];
        govde[hedef + 1] = nokta[kaynak + 1];
        govde[hedef + 2] = nokta[kaynak];
      }
    }

    const baslik = Buffer.alloc(54);
    baslik.write("BM", 0);
    baslik.writeUInt32LE(54 + govde.length, 2);
    baslik.writeUInt32LE(54, 10);
    baslik.writeUInt32LE(40, 14);
    baslik.writeInt32LE(en, 18);
    baslik.writeInt32LE(boy, 22);
    baslik.writeUInt16LE(1, 26);
    baslik.writeUInt16LE(24, 28);
    baslik.writeUInt32LE(govde.length, 34);
    writeFileSync(join(kok, "kurulum", ad), Buffer.concat([baslik, govde]));
  };

  // Kenar görseli: mercan zemin, ortada simge, altında ürün adı.
  const kenar = createCanvas(164, 314);
  const kc = kenar.getContext("2d");
  const gecis = kc.createLinearGradient(0, 0, 164, 314);
  gecis.addColorStop(0, "#ff8a6b");
  gecis.addColorStop(1, "#e85f3c");
  kc.fillStyle = gecis;
  kc.fillRect(0, 0, 164, 314);
  // Simge de mercan; doğrudan zemine konunca kayboluyor, beyaz kartın üstünde
  // duruyor.
  kc.fillStyle = "#ffffff";
  kc.beginPath();
  kc.roundRect(38, 80, 88, 88, 22);
  kc.fill();
  kc.drawImage(simge, 50, 92, 64, 64);
  kc.fillStyle = "#ffffff";
  kc.textAlign = "center";
  kc.font = "600 22px Segoe UI";
  kc.fillText("Garso", 82, 200);
  kc.font = "400 13px Segoe UI";
  kc.fillText("Kasa Köprüsü", 82, 220);
  kc.font = "400 11px Segoe UI";
  kc.fillStyle = "rgba(255,255,255,0.75)";
  kc.fillText("Fişler kâğıda burada basılır", 82, 292);
  yaz(kenar, "kenar.bmp");

  // Üst şerit: beyaz zemin, solda simge ve ürün adı.
  const serit = createCanvas(150, 57);
  const sc = serit.getContext("2d");
  sc.fillStyle = "#ffffff";
  sc.fillRect(0, 0, 150, 57);
  sc.drawImage(simge, 104, 11, 34, 34);
  yaz(serit, "serit.bmp");
}

console.log("1/3  Kurulum görselleri çiziliyor...");
await kurulumGorselleri();

console.log("2/3  Sunucu bilgisi koda gömülüyor...");
const bilgi = sunucuBilgisi();
writeFileSync(
  join(kok, "src", "sunucu-gomulu.js"),
  `// Paketlerken üretiliyor, elle düzenlenmiyor.\nexport const GOMULU = ${JSON.stringify(bilgi, null, 2)};\n`,
  "utf8"
);

console.log("3/3  Kurulum dosyası yazılıyor...");
execFileSync(process.execPath, [join(kok, "node_modules", "electron-builder", "cli.js"), "--win"], {
  stdio: "inherit",
  cwd: kok,
});

// Çıktı proje klasörünün dışına yazılıyor: Windows'un dosya dizinleyicisi
// Masaüstü'nü sürekli tarıyor ve paketleyicinin klasör adı değiştirme adımını
// engelliyor ("EPERM").
console.log(`\nHazır: ${join(process.env.LOCALAPPDATA, "Garso", "dagitim")}\n`);
