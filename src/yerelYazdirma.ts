/**
 * Kasadaki köprüye doğrudan yazdırma.
 *
 * Bulut yolu (`yazdirma_kuyrugu`) internet istiyor; kasanın interneti gidince
 * yazıcı aynı odada olduğu hâlde kâğıt çıkmıyordu. Köprü kendi bilgisayarında
 * `127.0.0.1` üzerinde dinliyor: istek makineden dışarı çıkmadığı için
 * tarayıcı bu adresi güvenli sayıyor, sertifika gerekmiyor.
 *
 * Yalnız kasanın kendi ekranı için: tablet ya da telefon başka bir cihaz,
 * oradan `127.0.0.1` kasayı değil kendini gösterir. Cevap gelmezse yoklama
 * kapanıyor ve fiş eski yoldan gidiyor.
 */

const PORT = 7423;
const ADRES = `http://127.0.0.1:${PORT}`;

/** Köprü aynı makinede; cevap gelmiyorsa yok demektir, uzun beklenmiyor. */
const ZAMAN_ASIMI = 1500;
/** Yoklamanın tazeliği: her fişte sormak sipariş kaydını yavaşlatır. */
const YOKLAMA_OMRU = 30_000;

async function istek(yol: string, ayar?: RequestInit) {
  const durdurucu = new AbortController();
  const zaman = setTimeout(() => durdurucu.abort(), ZAMAN_ASIMI);
  try {
    const cevap = await fetch(ADRES + yol, { ...ayar, signal: durdurucu.signal });
    return (await cevap.json()) as { tamam?: boolean; hata?: string; cihaz?: string };
  } finally {
    clearTimeout(zaman);
  }
}

let sonYoklama = 0;
let varMi = false;

/**
 * Bu ekranın altında çalışan bir köprü var mı. Cevap kısa süre akılda
 * tutuluyor: köprü açılıp kapandığında en geç yarım dakikada fark ediliyor,
 * o arada her fiş için ayrıca yoklanmıyor.
 */
export async function yerelKopruVarMi() {
  if (Date.now() - sonYoklama < YOKLAMA_OMRU) return varMi;
  sonYoklama = Date.now();
  try {
    varMi = (await istek("/durum")).tamam === true;
  } catch {
    varMi = false;
  }
  return varMi;
}

export type YerelSonuc = { basildi: boolean; hata?: string };

/**
 * Fişi köprüye verir. Dönen `basildi` yalnız kâğıt çıktığında doğru; yazıcı
 * kapalıysa ya da köprü yoksa çağıran eski yola (bulut kuyruğu) düşüyor.
 */
export async function yerelBas(is: {
  kimlik: string;
  yaziciId: number;
  tip: string;
  icerik: string;
}): Promise<YerelSonuc> {
  if (!(await yerelKopruVarMi())) return { basildi: false };

  try {
    const cevap = await istek("/yazdir", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(is),
    });
    return { basildi: cevap.tamam === true, hata: cevap.hata };
  } catch {
    // Köprü az önce kapanmış olabilir; bir sonraki fişte yeniden yoklansın.
    sonYoklama = 0;
    return { basildi: false };
  }
}
