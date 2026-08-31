// Simgeyi tek kaynaktan üretir: public/favicon.svg değişince
// `npm.cmd run ikon` ile PNG'ler yeniden yazılır.
//
// Üç ayrı biçim gerekiyor:
//  - normal: yuvarlak köşeli, tarayıcı sekmesi ve masaüstü kısayolu
//  - maskable: Android kısayolu simgeyi kendi kalıbına göre kırpıyor,
//    o yüzden kare zemin + ortada küçültülmüş çizim
//  - apple-touch: iOS köşeleri kendisi yuvarlıyor, saydamlık kabul etmiyor

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KLASOR = path.join(__dirname, "public");
const MERCAN = "#ff7a59";

const kaynak = fs.readFileSync(path.join(KLASOR, "favicon.svg"), "utf8");

/** Köşe yuvarlamasını kaldırıp çizimi ortada küçülterek kare zemin yapar. */
function kare(oran) {
  const ic = kaynak.replace(/^[\s\S]*?<rect[^>]*\/>/, "").replace("</svg>", "");
  const kayma = (512 * (1 - oran)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${MERCAN}"/>
  <g transform="translate(${kayma} ${kayma}) scale(${oran})">${ic}</g>
</svg>`;
}

const isler = [
  ["pwa-192.png", kaynak, 192],
  ["pwa-512.png", kaynak, 512],
  ["pwa-maskable-512.png", kare(0.7), 512],
  // iOS aradığı boyutu kendi seçiyor; birkaçını birden veriyoruz.
  ["apple-icon-120.png", kare(0.86), 120],
  ["apple-icon-152.png", kare(0.86), 152],
  ["apple-icon-167.png", kare(0.86), 167],
  ["apple-icon-180.png", kare(0.86), 180],
];

(async () => {
  for (const [ad, svg, boy] of isler) {
    let is = sharp(Buffer.from(svg)).resize(boy, boy);
    // iOS ana ekran simgesinde saydam alanı siyaha çeviriyor; apple'ınkilerde
    // saydamlık atılıyor. PWA simgelerinde köşe yuvarlaması saydamlıkla
    // yapıldığı için onlara dokunulmuyor.
    if (ad.startsWith("apple")) is = is.flatten({ background: MERCAN });
    await is.png().toFile(path.join(KLASOR, ad));
    console.log(`${ad} yazıldı (${boy}px)`);
  }
})();
