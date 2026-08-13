import { ayarlariOku, cihazKimligi } from "./ayar.js";
import { girisYap, isAl, kuyruguDinle, sonucBildir, yazicilariGetir } from "./bulut.js";
import { yaziciyaBas } from "./yazdir.js";

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

const bugun = () => new Date().toLocaleTimeString("tr-TR");
const yaz = (metin) => console.log(`${bugun()}  ${metin}`);

let sonHata = "";

async function turAt(cihaz) {
  const isler = await isAl(cihaz);
  if (!isler.length) return;

  const yazicilar = await yazicilariGetir();

  for (const is of isler) {
    const yazici = yazicilar.get(is.yazici_id);
    try {
      await yaziciyaBas(yazici, is.icerik);
      await sonucBildir(is.id, true);
      yaz(`Basıldı: #${is.id} → ${yazici.ad}`);
    } catch (e) {
      await sonucBildir(is.id, false, e.message);
      yaz(`Basılamadı: #${is.id} → ${e.message}`);
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

  // Yedek yoklama: canlı bağlantının kaçırdığı ya da yeniden sıraya alınan
  // fişler burada yakalanıyor.
  for (;;) {
    await bekle(ayar.yoklamaSaniye * 1000);
    await bas();
  }
}

const bekle = (ms) => new Promise((t) => setTimeout(t, ms));

calis().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exit(1);
});
