import { createServer } from "node:http";

/**
 * Kasanın kendi köprüsüne doğrudan gönderdiği fişler.
 *
 * Buluttan geçen yol (`yazdirma_kuyrugu`) internet gerektiriyor; kasanın
 * interneti yokken yazıcı aynı odada olduğu hâlde kâğıt çıkmıyordu. Bu
 * dinleyici yalnız `127.0.0.1`'e bağlanıyor: tarayıcı ile köprü aynı
 * bilgisayarda olduğu için istek makineden dışarı çıkmıyor, sertifika da
 * gerekmiyor — tarayıcılar yerel adresi güvenli sayıyor.
 *
 * Ağa açılmıyor: dışarıdaki bir cihaz bu porta ulaşamaz, dolayısıyla fiş
 * bastıramaz.
 */

export const VARSAYILAN_PORT = 7423;

/**
 * Basılan fişlerin kimlikleri. İstek gidip cevap dönerken bağlantı koparsa
 * Garso aynı fişi bulut yoluyla yeniden gönderiyor; kimliği daha önce görülen
 * iş ikinci kez basılmıyor, "zaten basıldı" cevabı dönüyor.
 *
 * Vardiya boyu yetecek kadar tutuluyor, sonra unutuluyor: liste sonsuza kadar
 * büyümesin.
 */
const HATIRLAMA_SURESI = 12 * 60 * 60 * 1000;

export function basilanlarDefteri() {
  const kayitlar = new Map();

  const temizle = () => {
    const sinir = Date.now() - HATIRLAMA_SURESI;
    for (const [kimlik, zaman] of kayitlar) {
      if (zaman < sinir) kayitlar.delete(kimlik);
    }
  };

  return {
    gorulduMu: (kimlik) => {
      temizle();
      return kimlik ? kayitlar.has(kimlik) : false;
    },
    isaretle: (kimlik) => {
      if (kimlik) kayitlar.set(kimlik, Date.now());
    },
  };
}

/** Tarayıcıdan gelen istek için gereken başlıklar; cevap her zaman JSON. */
function cevapla(cevap, kod, govde) {
  const metin = JSON.stringify(govde);
  cevap.writeHead(kod, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    // Tarayıcı her fiş öncesi izin sorusu sormasın.
    "access-control-max-age": "86400",
  });
  cevap.end(metin);
}

function govdeyiOku(istek) {
  return new Promise((tamam, hata) => {
    let ham = "";
    istek.on("data", (parca) => {
      ham += parca;
      // Fiş birkaç kilobayt; bundan büyüğü hatalı istektir.
      if (ham.length > 512_000) {
        hata(new Error("İstek fazla büyük."));
        istek.destroy();
      }
    });
    istek.on("end", () => {
      try {
        tamam(ham ? JSON.parse(ham) : {});
      } catch {
        hata(new Error("İstek okunamadı."));
      }
    });
    istek.on("error", () => hata(new Error("İstek yarıda kesildi.")));
  });
}

/**
 * Dinleyiciyi başlatır.
 *
 * `bilgi()` köprünün kimliğini veriyor — Garso "yerel yol açık mı" diye buna
 * bakıyor. `bas(is)` asıl yazdırmayı yapıyor; motorun kendi yazdırma yolu, iki
 * ayrı kod olmasın diye dışarıdan geçiliyor.
 *
 * Port doluysa program durmuyor: yerel yol kapalı kalıyor, fişler eskisi gibi
 * buluttan gidiyor. `hataysa` ile durum penceresine bir satır düşüyor.
 */
export function yerelSunucuBaslat({
  port = VARSAYILAN_PORT,
  bilgi,
  bas,
  defter = basilanlarDefteri(),
  acilinca = () => {},
  hataysa = () => {},
}) {

  const sunucu = createServer(async (istek, cevap) => {
    if (istek.method === "OPTIONS") return cevapla(cevap, 204, {});

    const yol = (istek.url ?? "").split("?")[0];

    if (istek.method === "GET" && yol === "/durum") {
      return cevapla(cevap, 200, { tamam: true, ...bilgi() });
    }

    if (istek.method === "POST" && yol === "/yazdir") {
      let is;
      try {
        is = await govdeyiOku(istek);
      } catch (e) {
        return cevapla(cevap, 400, { tamam: false, hata: e.message });
      }

      if (defter.gorulduMu(is.kimlik)) {
        // Basıldı diyoruz: Garso bunu başarı sayıp kaydını tamamlasın, aynı
        // fiş bir de bulut yolundan gitmesin.
        return cevapla(cevap, 200, { tamam: true, tekrar: true });
      }

      try {
        const sonuc = await bas(is);
        defter.isaretle(is.kimlik);
        return cevapla(cevap, 200, { tamam: true, yazici: sonuc?.yazici ?? "" });
      } catch (e) {
        // Yazıcı kapalıysa Garso eski yola düşsün diye hata açıkça dönüyor.
        return cevapla(cevap, 200, { tamam: false, hata: e.message });
      }
    }

    cevapla(cevap, 404, { tamam: false, hata: "Bilinmeyen adres." });
  });

  sunucu.on("error", (e) => {
    hataysa(
      e.code === "EADDRINUSE"
        ? `Yerel yazdırma portu (${port}) başka bir program tarafından kullanılıyor.`
        : `Yerel yazdırma dinleyicisi açılamadı: ${e.message}`
    );
  });

  sunucu.on("listening", () => acilinca(port));
  sunucu.listen(port, "127.0.0.1");

  return {
    port,
    kapat: () => new Promise((tamam) => sunucu.close(() => tamam())),
  };
}
