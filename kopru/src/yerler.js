import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

/**
 * Dosya yerleri.
 *
 * Köprü iki biçimde çalışıyor: geliştirirken `node src/index.js`, kasada tek
 * dosyalık `garso-kopru.exe`. Paketlenmiş hâlde kaynak dosyalar exe'nin içinde
 * kaldığı için yanındaki dosyalar `import.meta.url` ile bulunamıyor; yer
 * hesabı bu yüzden tek yerden yapılıyor.
 */

/** Program kendi exe'si olarak mı çalışıyor, Node ile mi. */
export const paketli = !/^node(\.exe)?$/i.test(basename(process.execPath));

// Geliştirirken çalıştırılan dosya `src/index.js`; köprünün kökü onun bir
// üstü. `import.meta.url` kullanılmıyor — paketlerken kaynak tek dosyaya
// toplanıyor ve orada karşılığı yok.
const gelistirmeKoku = () => {
  const betik = process.argv[1] ?? ".";
  return join(dirname(isAbsolute(betik) ? betik : resolve(betik)), "..");
};

/** Ayarların, varlıkların ve eklentilerin durduğu klasör. */
export const kokDizin = paketli ? dirname(process.execPath) : gelistirmeKoku();

/** Programla birlikte gelen dosya (yazı tipi, PowerShell betiği). */
export const varlik = (ad) => join(kokDizin, "varliklar", ad);

/**
 * Exe'nin yanındaki paketten yükleme. Çizim kütüphanesi Windows eklentisi
 * olduğu için exe'nin içine gömülemiyor, yanındaki `node_modules` klasöründen
 * okunuyor.
 */
const disariCagir = createRequire(paketli ? process.execPath : join(kokDizin, "src", "index.js"));
export const yerelPaket = (ad) => disariCagir(ad);
