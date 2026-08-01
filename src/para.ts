// Para alanları düzenlenirken metin olarak tutulur: her tuşta sayıya çevirip geri
// yazsaydık "12." yazarken nokta silinir, kuruşlu fiyat girilemezdi. Virgül de
// kabul ediliyor — klavyede virgül daha yakın.

export const paraMetin = (v?: number) => (v == null ? "" : String(v));

export const paraSayi = (s: string) => {
  const temiz = s.replace(",", ".").trim();
  return temiz === "" ? undefined : Number(temiz) || 0;
};

export const paraYaz = (s: string) => s.replace(/[^0-9.,]/g, "");
