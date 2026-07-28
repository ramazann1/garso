import type { Bolge, Kategori } from "./types";

export const bolgeler: Bolge[] = [
  {
    ad: "Bahçe",
    masalar: [
      { ad: "B 1", dolu: true, tutar: 290, sure: "1s 12dk", garson: "Mert" },
      { ad: "B 2", dolu: false },
      { ad: "B 3", dolu: false },
      { ad: "B 4", dolu: true, tutar: 850, sure: "34dk", garson: "Pelin" },
      { ad: "B 5", dolu: false },
      { ad: "B 6", dolu: false },
    ],
  },
  {
    ad: "Salon",
    masalar: [
      { ad: "S 1", dolu: false },
      { ad: "S 2", dolu: true, tutar: 1240, sure: "2s 05dk", garson: "Veysel" },
      { ad: "S 3", dolu: false },
      { ad: "S 4", dolu: false },
    ],
  },
];
export const kategoriler: Kategori[] = [
  {
    ad: "Sıcak İçecekler",
    renk: "#e8b4b4",
    urunler: [
      { ad: "Çay", fiyat: 85, secenekler: [{ ad: "Servis", tekli: true, liste: ["Sıcak", "Soğuk"] }] },
      { ad: "Fincan Çay", fiyat: 100 },
      { ad: "Ihlamur", fiyat: 150 },
      { ad: "Salep", fiyat: 180 },
    ],
  },
  {
    ad: "Sıcak Kahveler",
    renk: "#d4b896",
    urunler: [
      { ad: "Türk Kahvesi", fiyat: 160, secenekler: [{ ad: "Şeker", tekli: true, liste: ["Sade", "Az Şekerli", "Şekerli"] }] },
      { ad: "Espresso", fiyat: 150 },
      { ad: "Latte", fiyat: 210 },
      { ad: "Cappuccino", fiyat: 210 },
    ],
  },
  {
    ad: "Soğuk İçecekler",
    renk: "#a8d5c2",
    urunler: [
      { ad: "Su", fiyat: 85 },
      { ad: "Soda", fiyat: 100 },
      { ad: "Ice Tea", fiyat: 160 },
      { ad: "Limonata", fiyat: 190 },
    ],
  },
  {
    ad: "Nargile",
    renk: "#9fc5d8",
    urunler: [
      { ad: "Natural Shisha", fiyat: 970, porsiyonlar: [{ ad: "Tek", fiyat: 970 }, { ad: "Double", fiyat: 1400 }], secenekler: [{ ad: "Aroma", tekli: false, liste: ["Nane", "Elma", "Üzüm", "Limon"] }] },
      { ad: "Aromalı Nargile", fiyat: 1050 },
    ],
  },
];