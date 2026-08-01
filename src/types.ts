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
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
};

export type MenuBirim = {
  id: number;
  ad: string;
  sira: number;
};

export type SiparisTuru = "masa" | "gelal" | "paket";

export type MenuPorsiyon = {
  id?: number;
  birimId?: number;
  ad: string;
  fiyat: number;
  maliyet?: number;
  barkod?: string;
  masaFiyat?: number;
  gelalFiyat?: number;
  paketFiyat?: number;
  varsayilan: boolean;
  grupIdler: number[]; // seçenek grupları porsiyona bağlıdır
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
  zorunlu: boolean;
  liste: MenuSecenek[];
};

export type MenuUrun = {
  id?: number;
  ad: string;
  kod?: string;
  renk?: string;
  favori: boolean;
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
  porsiyonlar: MenuPorsiyon[];
  kategoriIdler: number[];
  kategoriSira: Record<number, number>; // ürünün her kategorideki kendi sırası
};