// Ödeme tiplerinin zemin rengini kullanıcı seçiyor. Yazı kural olarak siyah;
// yalnızca siyah, füme ve koyu gri gibi çok karanlık zeminlerde beyaza dönüyor.
export function yaziRengi(zemin?: string): string {
  const rgb = coz(zemin);
  if (!rgb) return "#1a1a1a";
  const [r, g, b] = rgb;
  const parlaklik = (r * 299 + g * 587 + b * 114) / 1000;
  return parlaklik < 90 ? "#fff" : "#1a1a1a";
}

function coz(zemin?: string): [number, number, number] | null {
  if (!zemin) return null;
  const h = zemin.trim().replace("#", "");
  if (h.length === 3) {
    return [0, 1, 2].map((i) => parseInt(h[i] + h[i], 16)) as [number, number, number];
  }
  if (h.length === 6) {
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const eslesme = zemin.match(/\d+/g);
  if (eslesme && eslesme.length >= 3) {
    return [Number(eslesme[0]), Number(eslesme[1]), Number(eslesme[2])];
  }
  return null;
}
