export type Masa = {
  id: number;
  bolgeId: number;
  ad: string;
  sira: number;
  kapasite?: number;
  aktif: boolean;
  // Salon planı alanları; editör gelene kadar boş kalıyor, masa ızgarada dizilir.
  konumX?: number;
  konumY?: number;
  genislik?: number;
  yukseklik?: number;
  sekil: "kare" | "daire";
};

export type Bolge = {
  id: number;
  ad: string;
  sira: number;
  // Salon ekranı bu bölgeyi çizilen plan olarak mı göstersin, ızgara olarak mı.
  planModu: boolean;
  masalar: Masa[];
};

// Salon kartında masanın o anki hali — masanın kendisi değil, üstündeki adisyon.
export type MasaDurumu = {
  tutar: number;
  odenen?: number;
  kalan?: number;
  sure?: string;
  garson?: string;
  gecikti?: boolean;
  ad?: string; // adisyona verilen serbest ad
  kisiSayisi?: number;
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
  indirim?: number; // yalnız bu satıra verilen indirim tutarı
  indirimTanimId?: number; // ön tanımlı indirimden geldiyse hangisi
  indirimAd?: string; // tanım sonradan silinse de raporda adı kalsın
  not?: string;
  /** İptal sebebi; sütuna değil, denetim defterine yazılıyor. */
  sebep?: string;
  turSira?: number;
  turSaat?: string; // turun kaydedildiği an; sepette tur başlığında görünüyor
  turGarson?: string; // turu yazan kişi; tur başlığında saatin yanında
  turGarsonId?: number; // personel raporunda ciro bu kişiye yazılıyor
};
export type Tahsilat = {
  /** Kayıtlı tahsilatın kimliği; yeni alınan ödemede boş. */
  id?: number;
  tip: string;
  tutar: number;
  bahsis?: number; // hesabın üstünde kalan, müşterinin bıraktığı tutar
  kalemler?: Record<number, number>; // kalem kimliği → ödenen adet
  /** Ödeme tipi düzeltildiyse sebebi; sütuna değil, denetim defterine yazılıyor. */
  sebep?: string;
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
  varsayilan?: boolean; // ürün penceresi açılınca işaretli gelsin
};

export type MenuSecenekGrubu = {
  id: number;
  ad: string;
  tekli: boolean;
  zorunlu: boolean;
  enAz: number; // çoklu grupta en az kaç seçenek işaretlenmeli
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