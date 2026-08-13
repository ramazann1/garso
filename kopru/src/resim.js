import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Fişi çiziyor.
 *
 * Termal yazıcının kendi yazısı kullanılmıyor: her marka harf tablosunu başka
 * numarada tutuyor (Türkçe harfler bir yazıcıda doğru, diğerinde bozuk çıkıyor)
 * ve o yazıyla ne punto farkı ne kalın başlık yapılabiliyor. Onun yerine fiş
 * bir sayfa gibi çizilip yazıcıya nokta nokta gönderiliyor — Adisyo da aynısını
 * yapıyor, farkı çizimi Windows sürücüsüne bırakması.
 */

const kokDizin = join(dirname(fileURLToPath(import.meta.url)), "..");

// Garso'nun kendi yazı tipi. Paket harfleri parçalara ayırmış: normal alfabe
// bir dosyada, Türkçe harfler ve lira işareti diğerinde. İkisi ayrı adla
// yükleniyor; aynı ada yüklenirse ikincisi birincinin yerine geçiyor.
// İnce harfler termal kâğıtta silik çıkıyor: kafa noktayı ısıtıp yakıyor, tek
// piksellik çizgiye yetecek ısı birikmiyor. Bu yüzden gövde yazısı bile orta
// kalınlıkta (500), vurgulananlar yarı kalın (600).
const PARCALAR = { latin: "Fis", "latin-ext": "FisEk" };
for (const [parca, ad] of Object.entries(PARCALAR)) {
  for (const [kalinlik, ek] of [[500, ""], [600, "K"]]) {
    GlobalFonts.registerFromPath(
      join(kokDizin, `../node_modules/@fontsource/poppins/files/poppins-${parca}-${kalinlik}-normal.woff2`),
      `${ad}${ek}`
    );
  }
}
const NORMAL = "Fis, FisEk";
const KALIN = "FisK, FisEkK";

/** Kâğıt genişliğinin nokta karşılığı: yazıcılar 203 dpi basıyor. */
const NOKTA = { 58: 384, 80: 576 };

/**
 * Fiş Tasarımı'ndaki punto ekran ölçüsü; kâğıtta nokta karşılığı bu oranla
 * bulunuyor. 20 punto → 26 nokta ≈ 3 mm, elde tutulan fişte rahat okunan boy.
 */
const OLCEK = 1.3;
const VARSAYILAN = 20;
const KENAR = 10;

export function fisiCiz(icerik, kagitMm = 80) {
  const genislik = NOKTA[kagitMm] ?? NOKTA[80];
  const satirlar = icerik.satirlar ?? [];
  const puntolar = icerik.puntolar ?? {};

  const boy = (s) =>
    Math.round(((s.alan && puntolar[s.alan]) || VARSAYILAN) * OLCEK * (s.t === "ic" ? 0.8 : 1));

  // Yükseklik önceden bilinmiyor: her satırın kendi puntosu var. Önce ölçüp
  // sonra o boyda tuval açıyoruz, boş yer kalmasın.
  const yukseklikler = satirlar.map((s) =>
    s.t === "cizgi" ? 10 : s.t === "bosluk" ? 12 : Math.round(boy(s) * 1.45)
  );
  const toplam = KENAR * 2 + yukseklikler.reduce((t, y) => t + y, 0);

  const tuval = createCanvas(genislik, toplam);
  const kalem = tuval.getContext("2d");
  kalem.fillStyle = "#fff";
  kalem.fillRect(0, 0, genislik, toplam);
  kalem.fillStyle = "#000";
  kalem.textBaseline = "top";

  const ic = genislik - KENAR * 2;
  let y = KENAR;

  satirlar.forEach((s, i) => {
    const h = yukseklikler[i];

    if (s.t === "cizgi") {
      kalem.fillRect(KENAR, y + h / 2, ic, 2);
      y += h;
      return;
    }
    if (s.t === "bosluk") {
      y += h;
      return;
    }

    const punto = boy(s);
    kalem.font = `${punto}px ${s.kalin ? KALIN : NORMAL}`;

    if (s.t === "orta") {
      const g = kalem.measureText(s.m).width;
      kalem.fillText(s.m, KENAR + Math.max(0, (ic - g) / 2), y);
    } else if (s.t === "sol") {
      kalem.fillText(s.m, KENAR, y);
    } else if (s.t === "ic") {
      kalem.fillText(s.m, KENAR + punto, y);
    } else {
      // Sağdaki tutar sabit yerde: solu uzunsa kısaltılıyor ki üst üste binmesin.
      const sagGenislik = kalem.measureText(s.sag).width;
      kalem.fillText(s.sag, KENAR + ic - sagGenislik, y);
      kalem.fillText(kisalt(kalem, s.sol, ic - sagGenislik - punto * 0.4), KENAR, y);
    }

    y += h;
  });

  return ikiRenge(kalem.getImageData(0, 0, genislik, toplam).data, genislik, toplam);
}

function kisalt(kalem, metin, yer) {
  if (kalem.measureText(metin).width <= yer) return metin;
  let kisa = metin;
  while (kisa.length > 1 && kalem.measureText(`${kisa}…`).width > yer) kisa = kisa.slice(0, -1);
  return `${kisa}…`;
}

/**
 * Termal kafa gri bilmiyor: her nokta ya yanar ya yanmaz. Çizimi bite
 * indiriyoruz — bir bayt sekiz nokta, 1 = siyah.
 */
function ikiRenge(pikseller, genislik, yukseklik) {
  const baytGenislik = genislik / 8;
  const cikti = Buffer.alloc(baytGenislik * yukseklik);

  for (let y = 0; y < yukseklik; y++) {
    for (let x = 0; x < genislik; x++) {
      const p = (y * genislik + x) * 4;
      const parlaklik = (pikseller[p] + pikseller[p + 1] + pikseller[p + 2]) / 3;
      // Eşik yüksek tutuluyor: harflerin yumuşatılmış gri kenarları da siyaha
      // sayılıyor, böylece çizgiler kâğıtta dolgun çıkıyor.
      if (parlaklik < 190) cikti[y * baytGenislik + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }

  return { veri: cikti, genislik: baytGenislik, yukseklik };
}

/**
 * Kuyruktaki içerik alan alan yazılmış bir paket; köprünün eski sürümünden
 * kalan kayıtlar düz metin olabiliyor, onlar sade satırlar olarak çiziliyor.
 */
export function icerikCoz(ham) {
  try {
    const paket = JSON.parse(ham);
    if (Array.isArray(paket?.satirlar)) return paket;
  } catch {
    /* düz metin */
  }
  return {
    puntolar: {},
    satirlar: String(ham)
      .split("\n")
      .map((m) => (m.trim() ? { t: "sol", m } : { t: "bosluk" })),
  };
}
