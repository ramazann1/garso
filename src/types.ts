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
  id?: number; // kalem kimliği; negatifse henüz kaydedilmemiş
  urunId?: number;
  porsiyonId?: number;
  ad: string;
  fiyat: number;
  adet: number;
  porsiyon?: string;
  secimler?: string[];
  kdvOran?: number; // satış anındaki oran; eski adisyonlarda boş, varsayılana düşer
  durum?: "normal" | "ikram" | "iptal";
  not?: string;
  turSira?: number;
};
export type Tahsilat = {
  tip: string;
  tutar: number;
  kalemler?: Record<number, number>; // kalem kimliği → ödenen adet
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
  ustId?: number; // doluysa alt kategori; sıra kardeşler arasında geçerli
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
};

export type MenuBirim = {
  id: number;
  ad: string;
  sira: number;
  varsayilan: boolean;
};

export type MenuKdv = {
  id: number;
  ad: string;
  oran: number; // yüzde: 10, 20...
  varsayilan: boolean;
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

// Menü/kampanya ürünü: ürünün içinde gruplar, her grupta seçilebilir satırlar.
export type MenuIcerikSatiri = {
  id?: number;
  urunId: number;
  porsiyonId?: number;
  miktar: number;
  ekFiyat: number;
  varsayilan: boolean;
};

export type MenuIcerikGrubu = {
  id?: number;
  baslik: string;
  secilebilir: number; // müşteri bu gruptan kaç satır seçebilir
  satirlar: MenuIcerikSatiri[];
};

export type MenuUrun = {
  id?: number;
  ad: string;
  kod?: string;
  kdvId?: number; // boşsa varsayılan KDV grubu geçerli
  renk?: string;
  favori: boolean;
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
  porsiyonlar: MenuPorsiyon[];
  menuGruplari: MenuIcerikGrubu[]; // boşsa normal ürün
  kategoriIdler: number[];
  kategoriSira: Record<number, number>; // ürünün her kategorideki kendi sırası
};