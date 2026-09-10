import { supabase } from "./supabase";
import { kisaAd } from "./personel";

/**
 * Denetim defteri: hassas işlemlerin "kim, ne zaman, ne yaptı" kaydı.
 * Kalem ve adisyon bazında iptal/ikram, tahsilat silme ve düzeltme, eksik
 * kapatma buradan geçiyor.
 */
export type DenetimIslemi =
  | "kalem_iptal"
  | "kalem_iptal_geri"
  | "kalem_ikram"
  | "kalem_ikram_geri"
  | "adisyon_iptal"
  | "adisyon_ikram"
  | "tahsilat_sil"
  | "tahsilat_tip_duzelt"
  | "hesap_eksik_kapat"
  | "adisyon_masa_degisti"
  | "adisyon_birlestirildi";

export type DenetimKaydi = {
  islem: DenetimIslemi;
  adisyonId?: number;
  /** Masa adı ya da "Gel Al" / "Paket"; adisyon silinse de okunabilsin diye metin. */
  yer?: string;
  /** İşlemin neye yapıldığı: ürün adı ya da ödeme tipi. */
  konu?: string;
  adet?: number;
  tutar?: number;
  sebep?: string;
  /** İkram kimin adına yazıldı; defter tek başına okununca da tam olsun. */
  odenmez?: string;
};

const ISLEM_ADLARI: Record<DenetimIslemi, string> = {
  kalem_iptal: "Ürün iptal edildi",
  kalem_iptal_geri: "Ürün iptali geri alındı",
  kalem_ikram: "Ürün ikram edildi",
  kalem_ikram_geri: "İkram geri alındı",
  adisyon_iptal: "Adisyon iptal edildi",
  adisyon_ikram: "Adisyon ikram edildi",
  tahsilat_sil: "Tahsilat silindi",
  tahsilat_tip_duzelt: "Ödeme tipi düzeltildi",
  hesap_eksik_kapat: "Hesap eksik kapatıldı",
  adisyon_masa_degisti: "Başka masaya taşındı",
  adisyon_birlestirildi: "Başka masayla birleştirildi",
};

export function islemAdi(islem: string) {
  return ISLEM_ADLARI[islem as DenetimIslemi] ?? islem;
}

/**
 * Kayıtları deftere yazar. Denetim satışın kendisini durdurmamalı: yazma
 * başarısız olursa işlem geri alınmıyor, sadece konsola düşüyor.
 */
export async function denetimYaz(kayitlar: DenetimKaydi[]) {
  if (!kayitlar.length) return;
  const { error } = await supabase.from("denetim_kayitlari").insert(
    kayitlar.map((k) => ({
      islem: k.islem,
      adisyon_id: k.adisyonId ?? null,
      yer: k.yer ?? null,
      konu: k.konu ?? null,
      adet: k.adet ?? null,
      tutar: k.tutar ?? 0,
      sebep: k.sebep?.trim() || null,
      odenmez: k.odenmez?.trim() || null,
    }))
  );

  if (error) console.error("Denetim kaydı yazılamadı:", error.message);
}

/** Analiz'in Denetim sekmesinin okuduğu satır. */
export type DenetimSatiri = {
  id: number;
  zaman: string;
  kisi: string;
  kisiId: number | null;
  islem: string;
  islemAd: string;
  adisyonId: number | null;
  yer: string;
  konu: string;
  adet: number | null;
  tutar: number;
  sebep: string;
  /** İkram satırlarında kimin adına yazıldığı. */
  odenmez: string;
};

/**
 * Tek adisyonun defter kayıtları, zaman çizelgesi için eskiden yeniye.
 * Dönem sorgusundan süzmek yerine ayrı okunuyor: çizelge aylar önce kapanmış
 * bir hesapta da açılabiliyor, o kayıt seçili dönemin dışında kalır.
 */
export async function adisyonDenetimi(adisyonId: number): Promise<DenetimSatiri[]> {
  const { data } = await supabase
    .from("denetim_kayitlari")
    .select("id, zaman, kisi_id, kisi_ad, islem, adisyon_id, yer, konu, adet, tutar, sebep, odenmez")
    .eq("adisyon_id", adisyonId)
    .order("zaman", { ascending: true });

  return satirlaraCevir(data as any[]);
}

export async function denetimGetir(bas: string, bit: string): Promise<DenetimSatiri[]> {
  const { data } = await supabase
    .from("denetim_kayitlari")
    .select("id, zaman, kisi_id, kisi_ad, islem, adisyon_id, yer, konu, adet, tutar, sebep, odenmez")
    .gte("zaman", bas)
    .lt("zaman", bit)
    .order("zaman", { ascending: false })
    .limit(2000);

  return satirlaraCevir(data as any[]);
}

function satirlaraCevir(data: any[] | null): DenetimSatiri[] {
  return (data ?? []).map((s) => ({
    id: s.id,
    zaman: s.zaman,
    // Defterdeki ad sunucuda tam yazılıyor ("Ramazan Aktaş"); ekranın her yerinde
    // kısa biçim kullanıldığı için burada da kısaltılıyor. Aynı kişi bir satırda
    // "Ramazan A.", diğerinde "Ramazan AKTAŞ" görünüyordu.
    kisi: s.kisi_ad ? kisaAd(s.kisi_ad) : "—",
    kisiId: s.kisi_id ?? null,
    islem: s.islem,
    islemAd: islemAdi(s.islem),
    adisyonId: s.adisyon_id ?? null,
    yer: s.yer ?? "",
    konu: s.konu ?? "",
    adet: s.adet ?? null,
    tutar: Number(s.tutar ?? 0),
    sebep: s.sebep ?? "",
    odenmez: s.odenmez ?? "",
  }));
}
