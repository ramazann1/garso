import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { ayarlariOku, ayarYolu } from "./ayar.js";
import { ayarlariSor } from "./kurulum.js";
import { motorBaslat } from "./motor.js";
import { kuruluYazicilar } from "./usb.js";
import { paketli } from "./yerler.js";

/**
 * Garso Kasa Köprüsü — terminal sürümü.
 *
 * Kasaya giden asıl program pencereli sürüm (`elektron/ana.js`); burası
 * geliştirirken ve tek komutluk işlerde (yazıcı listesi) kullanılıyor. İkisi de
 * aynı motoru çalıştırıyor, davranış farkı yok.
 */

// Windows konsolu varsayılan olarak eski bir karakter tablosu kullanıyor ve
// Türkçe harfler bozuk görünüyor; program açılırken tablo değiştiriliyor.
if (process.platform === "win32") {
  spawnSync("chcp.com", ["65001"], { stdio: "ignore" });
}

const yaz = (metin) => console.log(`${new Date().toLocaleTimeString("tr-TR")}  ${metin}`);

async function calis() {
  // İlk açılış: ayar dosyası yoksa program hata verip kapanmıyor, bilgileri
  // soruyor. Kasadaki kişinin dosya düzenlemesi gerekmiyor.
  if (!existsSync(ayarYolu())) await ayarlariSor();

  const ayar = ayarlariOku();
  let sonKayit = null;

  const motor = await motorBaslat(ayar, ({ durum }) => {
    const kayit = durum.kayitlar[0];
    if (!kayit || kayit === sonKayit) return;
    sonKayit = kayit;
    yaz(kayit.metin);
  });

  yaz("Kuyruk dinleniyor. Kapatmak için Ctrl+C.");

  // Ctrl+C ile kapatılırken de buluta haber gidiyor; ekran köprünün kapandığını
  // beklemeden görsün.
  process.on("SIGINT", async () => {
    await motor.kapat();
    process.exit(0);
  });

  await new Promise(() => {});
}

/**
 * Kurulu yazıcıları listeleme. Garso tarayıcıda çalıştığı için kasadaki yazıcı
 * listesini göremiyor; USB yazıcı tanıtılırken sistemdeki ad birebir yazılmak
 * zorunda ve o ad buradan okunuyor.
 */
async function yazicilariListele() {
  const adlar = await kuruluYazicilar();
  if (!adlar.length) {
    yaz("Bu bilgisayarda kurulu yazıcı bulunamadı.");
    return;
  }
  console.log("\nBu bilgisayarda kurulu yazıcılar:\n");
  for (const ad of adlar) console.log(`  ${ad}`);
  console.log("\nUSB yazıcıyı tanıtırken adı buradan birebir kopyalayın.\n");
}

const KOMUTLAR = {
  yazicilar: yazicilariListele,
};

const gorev = KOMUTLAR[process.argv[2]] ?? calis;

gorev().catch(async (e) => {
  console.error(`\n${e.message}\n`);
  // Exe'ye çift tıklayan kişi pencere kapanıp gittiği için hatayı göremiyordu.
  if (paketli && process.stdin.isTTY) {
    const soru = createInterface({ input: process.stdin, output: process.stdout });
    await soru.question("Kapatmak için Enter'a basın...");
    soru.close();
  }
  process.exit(1);
});
