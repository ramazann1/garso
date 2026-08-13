import { Socket } from "node:net";
import { fisBaytlari } from "./escpos.js";

/**
 * Ağ yazıcısına basma. Termal yazıcıların hemen hepsi 9100 portundan ham
 * ESC/POS kabul ediyor; sürücü ya da işletim sistemi kurulumu gerekmiyor —
 * Adisyo'nun çoklu yazıcı yolunun Windows'a mahkûm olmasının sebebi buydu.
 */
export function agaBas(ip, port, icerik, kagitMm, zil) {
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
      baglanti.write(fisBaytlari(icerik, kagitMm, zil), () => kapat());
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
 * Fişi doğru yola yönlendiriyor. USB ve WebUSB henüz köprüde yok: WebUSB zaten
 * tarayıcının işi, USB yolu sonraki adımda gelecek.
 */
export async function yaziciyaBas(yazici, icerik) {
  if (!yazici) throw new Error("Fişin yazıcısı silinmiş.");
  if (!yazici.aktif) throw new Error(`"${yazici.ad}" kapalı görünüyor.`);

  if (yazici.baglanti === "ethernet") {
    if (!yazici.ip) throw new Error(`"${yazici.ad}" için IP adresi yazılmamış.`);
    return agaBas(yazici.ip, yazici.port, icerik, yazici.kagitGenislik, yazici.zil);
  }

  throw new Error(
    yazici.baglanti === "webusb"
      ? `"${yazici.ad}" tarayıcıdan basılan bir yazıcı, köprü buna dokunmuyor.`
      : `"${yazici.ad}" USB yazıcı — köprünün bu sürümü henüz USB basmıyor.`
  );
}
