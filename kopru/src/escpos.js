import { fisiCiz, icerikCoz } from "./resim.js";

/**
 * Fişi yazıcının anladığı ESC/POS baytlarına çeviriyor.
 *
 * Metin doğrudan gönderilmiyor, görüntüye çevrilip nokta nokta basılıyor
 * (bkz. resim.js). Fişin yazısı bulutta üretilip kuyrukta donuyor; buranın işi
 * yazıcıyı hazırlamak, görüntüyü göndermek, kâğıdı ilerletip kesmek.
 */

const ESC = 0x1b;
const GS = 0x1d;

/**
 * Yazıcılar tek seferde sınırsız yükseklikte görüntü kabul etmiyor; fiş
 * şeritlere bölünüp arka arkaya gönderiliyor. Şerit yüksekliği kâğıdı
 * ilerletme adımıyla uyumlu olsun diye 24'ün katı seçildi.
 */
const SERIT = 240;

export async function fisBaytlari(ham, kagitMm, zil = false) {
  const resim = await fisiCiz(icerikCoz(ham), kagitMm);
  const parcalar = [Buffer.from([ESC, 0x40])];

  for (let ust = 0; ust < resim.yukseklik; ust += SERIT) {
    const yukseklik = Math.min(SERIT, resim.yukseklik - ust);
    const baslangic = ust * resim.genislik;

    parcalar.push(
      // GS v 0: bundan sonrası görüntü — genişlik ve yükseklik iki bayt olarak
      // veriliyor (önce küçük hane).
      Buffer.from([
        GS, 0x76, 0x30, 0x00,
        resim.genislik & 0xff, resim.genislik >> 8,
        yukseklik & 0xff, yukseklik >> 8,
      ]),
      resim.veri.subarray(baslangic, baslangic + yukseklik * resim.genislik)
    );
  }

  parcalar.push(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, GS, 0x56, 66, 0]));
  if (zil) parcalar.push(zilBaytlari());
  return Buffer.concat(parcalar);
}

/**
 * Yazıcının kendi zili. Fiş kesildikten sonra çalıyor ki mutfaktaki kişi sesi
 * duyup baktığında kâğıt hazır olsun. İki komut birden gönderiliyor: markalar
 * aynı işi farklı komutla yapıyor, tanımadığını görmezden geliyor.
 */
function zilBaytlari() {
  return Buffer.from([
    ESC, 0x42, 3, 3, // ESC B: 3 kez öt, her biri 3 birim
    ESC, 0x28, 0x41, 4, 0, 48, 3, 3, 2, // aynı işin yeni komut karşılığı
  ]);
}

/** Para çekmecesi yazıcının arkasına bağlıysa bu darbeyle açılıyor. */
export function cekmeceBaytlari() {
  return Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa]);
}
