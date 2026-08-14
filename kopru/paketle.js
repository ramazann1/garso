import { execFileSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Köprüyü kasaya verilecek klasöre paketliyor: `npm.cmd run paketle`.
 *
 * Sıra: bütün kaynak tek dosyaya toplanıyor (esbuild), Node'un kendi tek
 * dosyalık program özelliğiyle (SEA) node.exe'nin kopyasına gömülüyor ve
 * garso-kopru.exe çıkıyor. Kasada Node kurulumu gerekmiyor.
 *
 * Çizim kütüphanesi exe'nin içine giremiyor — o bir Windows eklentisi, ancak
 * diskteki dosyadan yüklenebiliyor. Bu yüzden dağıtım tek dosya değil, tek
 * klasör: exe + varliklar + node_modules.
 */

const kok = dirname(fileURLToPath(import.meta.url));
const dagitim = join(kok, "dagitim");
const gecici = join(kok, "gecici-paket");

const calistir = (komut, argumanlar) => execFileSync(komut, argumanlar, { stdio: "inherit", cwd: kok });

await rm(dagitim, { recursive: true, force: true });
await rm(gecici, { recursive: true, force: true });
await mkdir(dagitim, { recursive: true });
await mkdir(gecici, { recursive: true });

console.log("1/4  Kaynak tek dosyaya toplanıyor...");
await build({
  entryPoints: [join(kok, "src", "index.js")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  outfile: join(gecici, "kopru.cjs"),
  // Çizim kütüphanesi exe'nin yanındaki klasörden yükleniyor (bkz. yerler.js),
  // paketin içine alınmıyor.
  external: ["@napi-rs/canvas"],
});

console.log("2/4  Tek dosyalık program hazırlanıyor...");
await writeFile(
  join(gecici, "sea.json"),
  JSON.stringify(
    {
      main: join(gecici, "kopru.cjs"),
      output: join(gecici, "kopru.blob"),
      disableExperimentalSEAWarning: true,
    },
    null,
    2
  )
);
calistir(process.execPath, ["--experimental-sea-config", join(gecici, "sea.json")]);

console.log("3/4  garso-kopru.exe yazılıyor...");
const exe = join(dagitim, "garso-kopru.exe");
await cp(process.execPath, exe);
calistir(process.execPath, [
  join(kok, "node_modules", "postject", "dist", "cli.js"),
  exe,
  "NODE_SEA_BLOB",
  join(gecici, "kopru.blob"),
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
]);

console.log("4/4  Yanındaki dosyalar kopyalanıyor...");
await cp(join(kok, "varliklar"), join(dagitim, "varliklar"), { recursive: true });
for (const paket of ["@napi-rs/canvas", "@napi-rs/canvas-win32-x64-msvc"]) {
  await cp(join(kok, "node_modules", paket), join(dagitim, "node_modules", paket), { recursive: true });
}
await rm(gecici, { recursive: true, force: true });

console.log(`\nHazır: ${dagitim}\nKlasörü kasaya kopyalayıp garso-kopru.exe çalıştırın.\n`);
