import { supabase } from "./supabase";
import { acikOturum } from "./oturum";

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
  | "hesap_eksik_kapat";

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
  const kisi = acikOturum();

  const { error } = await supabase.from("denetim_kayitlari").insert(
    kayitlar.map((k) => ({
      kisi_id: kisi?.id ?? null,
      kisi_ad: kisi?.ad ?? "",
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

export async function denetimGetir(bas: string, bit: string): Promise<DenetimSatiri[]> {
  const { data } = await supabase
    .from("denetim_kayitlari")
    .select("id, zaman, kisi_id, kisi_ad, islem, adisyon_id, yer, konu, adet, tutar, sebep, odenmez")
    .gte("zaman", bas)
    .lt("zaman", bit)
    .order("zaman", { ascending: false })
    .limit(2000);

  return ((data as any[]) ?? []).map((s) => ({
    id: s.id,
    zaman: s.zaman,
    kisi: s.kisi_ad || "—",
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
