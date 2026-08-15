import { readFileSync, writeFileSync } from "node:fs";

/**
 * Sürüm artırma: `npm.cmd run surum`
 *
 * Garso ile yazıcı programı tek numarayı paylaşıyor. Ayrı numaralar tutmak,
 * "kasadaki program hangi Garso ile uyumlu" sorusunu her seferinde yeniden
 * doğurur; tek numarada bu soru yok.
 *
 * Numara üç parçalı: büyük.orta.küçük. Her seansta küçük parça bir artıyor;
 * ortayı ve büyüğü elle veriyoruz (yeni modül → orta, büyük dönüşüm → büyük):
 *   npm.cmd run surum          → 1.0.3 olur (küçük artar)
 *   npm.cmd run surum orta     → 1.1.0 olur
 *   npm.cmd run surum buyuk    → 2.0.0 olur
 *
 * Sürüm dört dosyada yazıyor; hepsini burası güncelliyor ki biri unutulmasın.
 */

const artir = (surum, tur) => {
  const [buyuk, orta, kucuk] = surum.split(".").map(Number);
  if (tur === "buyuk") return `${buyuk + 1}.0.0`;
  if (tur === "orta") return `${buyuk}.${orta + 1}.0`;
  return `${buyuk}.${orta}.${kucuk + 1}`;
};

const degistir = (yol, ara, yeni) => {
  const eski = readFileSync(yol, "utf8");
  const sonuc = eski.replace(ara, yeni);
  if (sonuc === eski) throw new Error(`${yol} içinde sürüm satırı bulunamadı.`);
  writeFileSync(yol, sonuc, "utf8");
};

const koprununPaketi = JSON.parse(readFileSync("kopru/package.json", "utf8"));
const yeni = artir(koprununPaketi.version, process.argv[2]);

degistir("package.json", /"version": "[\d.]+"/, `"version": "${yeni}"`);
degistir("kopru/package.json", /"version": "[\d.]+"/, `"version": "${yeni}"`);
degistir("kopru/src/surum.js", /export const SURUM = "[\d.]+";/, `export const SURUM = "${yeni}";`);
degistir("src/surum.ts", /export const GARSO_SURUM = "[\d.]+";/, `export const GARSO_SURUM = "${yeni}";`);
degistir("src/kopruIndirme.ts", /surum: "[\d.]+"/, `surum: "${yeni}"`);
degistir("src/kopruIndirme.ts", /garso-kopru-kurulum-[\d.]+\.exe/, `garso-kopru-kurulum-${yeni}.exe`);

console.log(`Sürüm ${koprununPaketi.version} → ${yeni}`);
