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
  id?: number;
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
  tip: string;
  tutar: number;
  kalemler?: Record<number, number>;
};
export type Adisyon = {
  sepet: SepetKalemi[];
  indirim: number;
  tahsilatlar: Tahsilat[];
};
export type MenuKategori = {
  id: number;
  ad: string;
  renk: string;
  sira: number;
};

export type MenuPorsiyon = {
  ad: string;
  fiyat: number;
  varsayilan: boolean;
};

export type MenuSecenek = {
  id?: number;
  ad: string;
  ekFiyat: number;
};

export type MenuSecenekGrubu = {
  id: number;
  ad: string;
  tekli: boolean;
  liste: MenuSecenek[];
};

export type MenuUrun = {
  id?: number;
  ad: string;
  renk?: string;
  favori: boolean;
  porsiyonlar: MenuPorsiyon[];
  kategoriIdler: number[];
  grupIdler: number[];
};