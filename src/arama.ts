// Ekranlardaki arama kutuları aynı kuralla süzüyor: büyük/küçük harf ayırmıyor
// ve Türkçe harfleri doğru karşılaştırıyor ("İş" yazınca "iş" de bulunsun).
// Ayrıca şapkasız yazana şapkalıyı buluyor — kimse "kâr" derken şapka koymuyor.
const SESLILER: Record<string, string> = { â: "a", î: "i", û: "u" };

function sadelestir(metin: string) {
  return metin
    .toLocaleLowerCase("tr")
    .replace(/[âîû]/g, (h) => SESLILER[h]);
}

/** Aranan kelimelerin hepsi metinde geçiyor mu — sıra önemli değil. */
export function eslesiyor(metin: string, aranan: string) {
  const kelimeler = sadelestir(aranan).split(/\s+/).filter(Boolean);
  if (kelimeler.length === 0) return true;
  const hedef = sadelestir(metin);
  return kelimeler.every((k) => hedef.includes(k));
}
