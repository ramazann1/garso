import { ayarlariOku, cihazKimligi } from "./ayar.js";
import {
  cihazBildir,
  girisYap,
  isAl,
  kuyruguDinle,
  sonucBildir,
  yaziciDurumBildir,
  yazicilariGetir,
} from "./bulut.js";
import { createRequire } from "node:module";
import { cekmeceyiAc, yaziciDurumu, yaziciyaBas } from "./yazdir.js";
import { kuruluYazicilar } from "./usb.js";

/**
 * Garso Kasa Köprüsü.
 *
 * Tarayıcı yerel ağa ham TCP açamıyor; işletmenin iç ağındaki yazıcıya bulut
 * sunucusu da ulaşamıyor. Aradaki tek yol kasada çalışan bu program: kuyruğa
 * düşen fişi alıp yazıcıya basıyor. Ayarların hiçbiri burada durmuyor —
 * yazıcı tanımı da fiş şablonu da bulutta.
 */

// Windows konsolu varsayılan olarak eski bir karakter tablosu kullanıyor ve
// Türkçe harfler bozuk görünüyor; program açılırken tablo değiştiriliyor.
if (process.platform === "win32") {
  const { spawnSync } = await import("node:child_process");
  spawnSync("chcp", ["65001"], { shell: true, stdio: "ignore" });
}

// Sürüm Bağlantı Durumu ekranında görünüyor: bir kasada eski köprü kalmışsa
// oradan anlaşılsın.
const SURUM = createRequire(import.meta.url)("../package.json").version;

const bugun = () => new Date().toLocaleTimeString("tr-TR");
const yaz = (metin) => console.log(`${bugun()}  ${metin}`);

let sonHata = "";

async function turAt(cihaz) {
  const isler = await isAl(cihaz);
  if (!isler.length) return;

  const yazicilar = await yazicilariGetir();

  for (const is of isler) {
    const yazici = yazicilar.get(is.yazici_id);
    const cekmece = is.tip === "cekmece";
    try {
      cekmece ? await cekmeceyiAc(yazici) : await yaziciyaBas(yazici, is.icerik);
      await sonucBildir(is.id, true);
      yaz(`${cekmece ? "Çekmece açıldı" : "Basıldı"}: #${is.id} → ${yazici.ad}`);
    } catch (e) {
      await sonucBildir(is.id, false, e.message);
      yaz(`${cekmece ? "Çekmece açılamadı" : "Basılamadı"}: #${is.id} → ${e.message}`);
      // Yazıcı silinmiş ya da adresi değişmiş olabilir; liste tazelensin ki
      // sonraki fiş eski bilgiyle tekrar patlamasın.
      await yazicilariGetir(true).catch(() => {});
    }
  }
}

async function calis() {
  const ayar = ayarlariOku();
  const cihaz = cihazKimligi();

  yaz(`Garso Kasa Köprüsü açılıyor — cihaz: ${cihaz}`);
  const oturum = await girisYap(ayar);
  yaz(`Giriş yapıldı: ${oturum.kisi} · ${oturum.isletme} (${oturum.kod})`);
  yaz("Kuyruk dinleniyor. Kapatmak için Ctrl+C.");

  // Fiş düşer düşmez basılıyor; yoklama yalnız canlı bağlantı koparsa ya da
  // basılamamış bir fiş yeniden sıraya alındığında devreye giriyor.
  let calisiyor = false;
  const bas = async () => {
    if (calisiyor) return;
    calisiyor = true;
    try {
      await turAt(cihaz);
      sonHata = "";
    } catch (e) {
      if (e.message !== sonHata) {
        sonHata = e.message;
        yaz(`Buluta ulaşılamıyor: ${e.message}`);
      }
    } finally {
      calisiyor = false;
    }
  };

  kuyruguDinle(bas);

  // "Buradayım" haberi: Bağlantı Durumu ekranı köprünün açık olduğunu bundan
  // anlıyor. Yirmi saniyede bir yeniliyor; ekran son haberin üstünden bir
  // dakikadan fazla geçtiyse köprüyü kapalı sayıyor.
  const haberVer = () =>
    cihazBildir(cihaz, SURUM, oturum.kisi).catch(() => {
      /* haber verilemedi diye fiş basmak durmasın */
    });

  await haberVer();
  setInterval(haberVer, 20_000);

  // Yazıcı yoklaması: kâğıt göndermeden yalnız ulaşılabiliyor mu diye bakılıyor.
  // Fiş basmaktan ayrı bir tur, çünkü sipariş gelmediği sürece hiçbir yazıcıya
  // dokunulmuyor ve kapalı yazıcı ancak ilk fiş kaybolunca fark ediliyordu.
  const yazicilariYokla = async () => {
    const yazicilar = await yazicilariGetir().catch(() => null);
    if (!yazicilar) return;

    for (const y of yazicilar.values()) {
      if (y.baglanti === "webusb") continue;
      const durum = await yaziciDurumu(y);
      await yaziciDurumBildir(y.id, cihaz, durum.cevrimici, durum.hata).catch(() => {});
    }
  };

  yazicilariYokla();
  setInterval(yazicilariYokla, 30_000);

  // Yedek yoklama: canlı bağlantının kaçırdığı ya da yeniden sıraya alınan
  // fişler burada yakalanıyor.
  for (;;) {
    await bekle(ayar.yoklamaSaniye * 1000);
    await bas();
  }
}

const bekle = (ms) => new Promise((t) => setTimeout(t, ms));

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

const gorev = process.argv[2] === "yazicilar" ? yazicilariListele : calis;

gorev().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exit(1);
});
