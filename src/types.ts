export type Masa = {
  ad: string;
  dolu: boolean;
  tutar?: number;
  sure?: string;
  garson?: string;
};

export type Bolge = {
  ad: string;
  masalar: Masa[];
};
export type Urun = {
  ad: string;
  fiyat: number;
  porsiyonlar?: { ad: string; fiyat: number }[];
  secenekler?: { ad: string; tekli: boolean; liste: string[] }[];
};

export type Kategori = {
  ad: string;
  renk: string;
  urunler: Urun[];
};
export type SepetKalemi = {
  ad: string;
  fiyat: number;
  adet: number;
  porsiyon?: string;
  secimler?: string[];
};
export type Tahsilat = {
  tip: "Nakit" | "Kredi Kartı" | "İndirim";
  tutar: number;
};
export type Adisyon = {
  sepet: SepetKalemi[];
  indirim: number;
};