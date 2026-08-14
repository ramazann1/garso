import { Socket } from "node:net";
import { cekmeceBaytlari, fisBaytlari } from "./escpos.js";
import { usbBas, usbDurumu } from "./usb.js";

/**
 * Ağ yazıcısına basma. Termal yazıcıların hemen hepsi 9100 portundan ham
 * ESC/POS kabul ediyor; sürücü ya da işletim sistemi kurulumu gerekmiyor —
 * Adisyo'nun çoklu yazıcı yolunun Windows'a mahkûm olmasının sebebi buydu.
 */
export function agaBas(ip, port, baytlar) {
  return new Promise((tamam, hata) => {
    const baglanti = new Socket();
    let bitti = false;

    const kapat = (sonuc) => {
      if (bitti) return;
      bitti = true;
      baglanti.destroy();
      sonuc instanceof Error ? hata(sonuc) : tamam();
    };

    // Kapalı yazıcıda bağlantı denemesi dakikalarca asılı kalabiliyor;
    // kuyruk beklemesin diye sınır konuyor.
    baglanti.setTimeout(8000);
    baglanti.once("timeout", () => kapat(new Error("Yazıcı yanıt vermedi.")));
    baglanti.once("error", (e) => kapat(new Error(yaziciHatasi(e))));

    baglanti.connect(port || 9100, ip, () => {
      baglanti.write(baytlar, () => kapat());
    });
  });
}

function yaziciHatasi(e) {
  if (e.code === "ECONNREFUSED") return "Yazıcı bağlantıyı reddetti (port kapalı).";
  if (e.code === "EHOSTUNREACH" || e.code === "ENETUNREACH") return "Yazıcıya ağ üzerinden ulaşılamıyor.";
  if (e.code === "ETIMEDOUT") return "Yazıcı yanıt vermedi.";
  return e.message;
}

/**
 * Hazır baytları yazıcıya ulaştırıyor. Fiş de çekmece darbesi de aynı yoldan
 * gidiyor; değişen tek şey gönderilen baytlar.
 */
async function gonder(yazici, baytlar) {
  if (!yazici) throw new Error("Fişin yazıcısı silinmiş.");
  if (!yazici.aktif) throw new Error(`"${yazici.ad}" kapalı görünüyor.`);

  if (yazici.baglanti === "ethernet") {
    if (!yazici.ip) throw new Error(`"${yazici.ad}" için IP adresi yazılmamış.`);
    return agaBas(yazici.ip, yazici.port, baytlar);
  }

  if (yazici.baglanti === "usb") {
    if (!yazici.sistemAd) throw new Error(`"${yazici.ad}" için sistemdeki yazıcı adı yazılmamış.`);
    return usbBas(yazici.sistemAd, baytlar);
  }

  // WebUSB tarayıcının kendi işi: yazıcı kasadaki sekmeye bağlanıyor, köprü
  // araya girerse aynı fiş iki kez çıkar.
  throw new Error(`"${yazici.ad}" tarayıcıdan basılan bir yazıcı, köprü buna dokunmuyor.`);
}

export async function yaziciyaBas(yazici, icerik) {
  return gonder(yazici, await fisBaytlari(icerik, yazici?.kagitGenislik, yazici?.zil));
}

/**
 * Ağ yazıcısına ulaşılıyor mu. Fiş göndermeden yalnız bağlantı açılıp
 * kapatılıyor; yazıcı kapalıysa ya da kablosu çıkmışsa burada belli oluyor.
 */
function agaUlas(ip, port) {
  return new Promise((tamam) => {
    const baglanti = new Socket();
    let bitti = false;

    const kapat = (hata) => {
      if (bitti) return;
      bitti = true;
      baglanti.destroy();
      tamam(hata ? { cevrimici: false, hata } : { cevrimici: true, hata: null });
    };

    baglanti.setTimeout(3000);
    baglanti.once("timeout", () => kapat("Yazıcı yanıt vermedi."));
    baglanti.once("error", (e) => kapat(yaziciHatasi(e)));
    baglanti.connect(port || 9100, ip, () => kapat());
  });
}

/**
 * Yazıcının o andaki durumu — Bağlantı Durumu ekranı bunu gösteriyor. Kapalı
 * tanımlı yazıcıya bakılmıyor: kapalı olması hata değil, işletmenin kararı.
 */
export async function yaziciDurumu(yazici) {
  if (!yazici.aktif) return { cevrimici: false, hata: "Kullanım dışı." };

  if (yazici.baglanti === "ethernet") {
    if (!yazici.ip) return { cevrimici: false, hata: "IP adresi yazılmamış." };
    return agaUlas(yazici.ip, yazici.port);
  }

  if (yazici.baglanti === "usb") {
    if (!yazici.sistemAd) return { cevrimici: false, hata: "Sistemdeki yazıcı adı yazılmamış." };
    return usbDurumu(yazici.sistemAd);
  }

  return { cevrimici: false, hata: "Tarayıcıdan basılıyor, köprü dokunmuyor." };
}

/**
 * Para çekmecesi kendi başına bir cihaz değil: yazıcının arkasındaki uca
 * takılıyor ve yazıcıya giden kısa bir darbeyle açılıyor.
 */
export function cekmeceyiAc(yazici) {
  if (yazici && !yazici.cekmece) {
    throw new Error(`"${yazici.ad}" yazıcısına çekmece bağlı görünmüyor.`);
  }
  return gonder(yazici, cekmeceBaytlari());
}
