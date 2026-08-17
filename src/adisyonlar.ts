import { supabase } from "./supabase";
import { ayarlar } from "./isletmeAyarlari";
import { kdvDokumu } from "./kdv";
import type { IndirimKaynagi } from "./indirimler";
import { acikOturum } from "./oturum";
import { kisaAd } from "./personel";
import { denetimYaz } from "./denetim";
import { cekmeceyiAc, mutfakFisiYaz } from "./yazicilar";
import { kasayaGirerMi } from "./odemeTipleri";
import { adisyonuCariyeYaz } from "./cari";
import { servisTutarlari } from "./servis";
import type { ServisGirdisi } from "./servis";
import type { DenetimIslemi, DenetimKaydi } from "./denetim";
import type { SepetKalemi, Tahsilat } from "./types";

export type AdisyonVerisi = {
  id?: number;
  no?: number;
  sepet: SepetKalemi[];
  indirim: number;
  /** Hesap geneli indirim ön tanımlıysa kaynağı; serbest indirimde boş. */
  indirimTanim?: IndirimKaynagi;
  tahsilatlar: Tahsilat[];
  /**
   * Bu kayıtta silinen tahsilatlar — ekrandan çıkarıldıkları için listede
   * yoklar, sebepleri denetim defterine buradan geçiyor.
   */
  silinenTahsilatlar?: { id: number; sebep?: string }[];
  /**
   * Hesap parası eksik kalarak kapatılıyorsa borcun kime yazıldığı ve sebebi.
   * Cari hesap modülü gelene kadar borç bilgisi adisyonun kendi üstünde duruyor.
   */
  eksik?: { kisi: string; sebep: string; tutar: number };
  acilis?: string;
  garson?: string;
  tip?: AdisyonTipi;
  musteri?: MusteriBilgisi;
  /** Adisyona verilen serbest ad — "Doğum günü", "Ahmet Bey" gibi. */
  ad?: string;
  kisiSayisi?: number;
  not?: string;
  /**
   * Kuver ve garsoniye bu hesapta uygulanıyor mu: boş = ayarın dediği,
   * true = elle eklendi, false = elle kaldırıldı.
   */
  kuverUygula?: boolean | null;
  garsoniyeUygula?: boolean | null;
};

/**
 * Adisyonun para özeti. Hızlı Öde hem Salon'dan hem sipariş ekranından açılıyor;
 * kalan tutar iki yerde de aynı çıksın diye hesap tek yerde duruyor.
 */
/**
 * Bir satırın tahsil edilecek tutarı: fiyat × adet, varsa o satıra verilen
 * indirim düşülmüş hâli. Ürün bazlı indirim geldiğinden beri hiçbir yerde
 * "fiyat × adet" doğrudan kullanılmıyor, hep buradan geçiyor.
 */
export function kalemTutari(k: SepetKalemi) {
  return Math.max(0, Math.round((k.fiyat * k.adet - (k.indirim ?? 0)) * 100) / 100);
}

export function adisyonOzeti(veri: AdisyonVerisi, varsayilanKdv?: number) {
  const satilanlar = veri.sepet.filter((k) => (k.durum ?? "normal") === "normal");
  const araToplam = satilanlar.reduce((t, k) => t + kalemTutari(k), 0);
  // Fiyatlar KDV hariç yazılıyorsa vergi toplamın üstüne biniyor.
  const kdv = ayarlar().kdvDahil
    ? 0
    : kdvDokumu(satilanlar, veri.indirim, varsayilanKdv).reduce((t, s) => t + s.kdv, 0);
  const matrah = Math.max(0, araToplam - veri.indirim);
  // Kuver ve garsoniye ürünlerin dışında, hesabın kendi bedeli: indirimden
  // sonra ekleniyor ve üstlerine ayrıca KDV hesaplanmıyor.
  const servis = servisTutarlari(servisGirdisi(veri, matrah));
  const toplam = matrah + servis.toplam + kdv;
  const odenen = veri.tahsilatlar.reduce((t, o) => t + o.tutar, 0);
  return {
    araToplam,
    kdv,
    kuver: servis.kuver,
    garsoniye: servis.garsoniye,
    servis: servis.toplam,
    toplam,
    odenen,
    kalan: toplam - odenen,
  };
}

/** Servis hesabının adisyondan aldığı alanlar; üç yerde aynı şekilde kuruluyor. */
export function servisGirdisi(veri: AdisyonVerisi, matrah: number): ServisGirdisi {
  return {
    matrah,
    kisiSayisi: veri.kisiSayisi,
    tip: veri.tip,
    kuverUygula: veri.kuverUygula,
    garsoniyeUygula: veri.garsoniyeUygula,
  };
}

// Ekranda yeni açılan kalemin de bir kimliği olmalı ki tahsilat ona bağlanabilsin.
// Kaydedilene kadar negatif geçici kimlik taşır, kayıtta gerçeğiyle değişir.
let geciciSayac = 0;
export function yeniKalemId() {
  return --geciciSayac;
}

const KALEM_ALANLARI =
  "id, urun_id, porsiyon_id, ad, porsiyon, secimler, adet, fiyat, kdv_oran, durum, not_metni, indirim, indirim_tanim_id, indirim_ad, odenmez_id";

type KalemSatiri = {
  id: number;
  urun_id: number | null;
  porsiyon_id: number | null;
  ad: string;
  porsiyon: string | null;
  secimler: string[] | null;
  adet: number;
  fiyat: number;
  kdv_oran: number | null;
  durum: string;
  not_metni: string | null;
  indirim?: number | null;
  indirim_tanim_id?: number | null;
  indirim_ad?: string | null;
  odenmez_id?: number | null;
  tur_sira?: number;
  tur_saat?: string;
  tur_garson?: string;
};

function kalemeCevir(s: KalemSatiri): SepetKalemi {
  return {
    id: s.id,
    urunId: s.urun_id ?? undefined,
    porsiyonId: s.porsiyon_id ?? undefined,
    ad: s.ad,
    porsiyon: s.porsiyon ?? undefined,
    secimler: s.secimler ?? undefined,
    adet: Number(s.adet),
    fiyat: Number(s.fiyat),
    kdvOran: s.kdv_oran ?? undefined,
    durum: (s.durum as SepetKalemi["durum"]) ?? "normal",
    not: s.not_metni ?? undefined,
    indirim: Number(s.indirim ?? 0) || undefined,
    indirimTanimId: s.indirim_tanim_id ?? undefined,
    indirimAd: s.indirim_ad ?? undefined,
    odenmezId: s.odenmez_id ?? null,
    turSira: s.tur_sira,
    turSaat: s.tur_saat,
    turGarson: s.tur_garson,
  };
}

const ADISYON_ALANLARI = `id, adisyon_no, indirim, indirim_tanim_id, indirim_ad, acilis, garson, tip,
       ad, kisi_sayisi, not_metni, musteri_ad, musteri_telefon, adres,
       kuver_uygula, garsoniye_uygula,
       acan:personel!adisyonlar_acan_id_fkey (ad),
       turlar (sira, olusturma, garson:personel!turlar_garson_id_fkey (ad),
               adisyon_kalemleri (${KALEM_ALANLARI})),
       tahsilatlar (id, tip, tutar, bahsis, kalem_adetleri)`;

export async function adisyonGetir(masaId: number): Promise<AdisyonVerisi> {
  const { data } = await supabase
    .from("adisyonlar")
    .select(ADISYON_ALANLARI)
    .eq("masa_id", masaId)
    .eq("durum", "acik")
    .maybeSingle();

  return adisyonaCevir(data);
}

/** Masasız adisyon kimliğiyle okunuyor; masalıda anahtar masa, burada adisyon. */
export async function masasizGetir(adisyonId: number): Promise<AdisyonVerisi> {
  const { data } = await supabase
    .from("adisyonlar")
    .select(ADISYON_ALANLARI)
    .eq("id", adisyonId)
    .eq("durum", "acik")
    .maybeSingle();

  return adisyonaCevir(data);
}

/**
 * Son adisyonlar — fiş tasarımının önizlemesi uydurma veriyle değil işletmenin
 * kendi siparişiyle çiziliyor, kâğıda ne sığdığı ancak öyle görülüyor.
 */
export async function sonAdisyonlar(adet = 5): Promise<AdisyonVerisi[]> {
  const { data } = await supabase
    .from("adisyonlar")
    .select(ADISYON_ALANLARI + ", masa:masalar (ad)")
    .order("id", { ascending: false })
    .limit(adet);

  return ((data as any[]) ?? []).map((a) => ({
    ...adisyonaCevir(a),
    ad: a.ad ?? a.masa?.ad ?? undefined,
  }));
}

function adisyonaCevir(data: any): AdisyonVerisi {
  if (!data) return { sepet: [], indirim: 0, tahsilatlar: [] };

  const sepet: SepetKalemi[] = [];
  for (const tur of (data as any).turlar ?? []) {
    for (const k of tur.adisyon_kalemleri ?? []) {
      sepet.push(
        kalemeCevir({
          ...k,
          tur_sira: tur.sira,
          tur_saat: tur.olusturma,
          tur_garson: tur.garson?.ad ? kisaAd(tur.garson.ad) : undefined,
        })
      );
    }
  }
  sepet.sort((a, b) => (a.turSira ?? 0) - (b.turSira ?? 0) || (a.id ?? 0) - (b.id ?? 0));

  const tahsilatlar: Tahsilat[] = ((data as any).tahsilatlar ?? []).map((t: any) => ({
    id: t.id,
    tip: t.tip,
    tutar: Number(t.tutar),
    bahsis: Number(t.bahsis ?? 0) || undefined,
    kalemler: t.kalem_adetleri ?? undefined,
  }));

  return {
    id: (data as any).id,
    no: (data as any).adisyon_no,
    sepet,
    indirim: Number((data as any).indirim ?? 0),
    indirimTanim: {
      id: (data as any).indirim_tanim_id ?? undefined,
      ad: (data as any).indirim_ad ?? undefined,
    },
    tahsilatlar,
    acilis: (data as any).acilis,
    // Kişi bilgisi acan_id'de duruyor; "garson" sütunu personel sisteminden
    // önceki serbest metin, artık yalnız eski kayıtlarda dolu.
    garson: (data as any).acan?.ad
      ? kisaAd((data as any).acan.ad)
      : ((data as any).garson ?? undefined),
    tip: ((data as any).tip ?? "masa") as AdisyonTipi,
    ad: (data as any).ad ?? undefined,
    kisiSayisi: (data as any).kisi_sayisi ?? undefined,
    not: (data as any).not_metni ?? undefined,
    // Tutarlar değil kararlar okunuyor: ekrandaki hesap sepetle birlikte
    // yeniden çıkıyor, diskteki tutar kapanmış adisyonun kaydı.
    kuverUygula: (data as any).kuver_uygula ?? null,
    garsoniyeUygula: (data as any).garsoniye_uygula ?? null,
    musteri: {
      ad: (data as any).musteri_ad ?? undefined,
      telefon: (data as any).musteri_telefon ?? undefined,
      adres: (data as any).adres ?? undefined,
    },
  };
}

export type AdisyonTipi = "masa" | "gelal" | "paket";

export type MusteriBilgisi = {
  ad?: string;
  telefon?: string;
  adres?: string;
  /** Kayıtlı müşteriden seçildiyse onun kimliği; serbest yazılan misafirde boş. */
  musteriId?: number | null;
};

export type MasasizAdisyon = MusteriBilgisi & {
  id: number;
  no: number;
  tip: Exclude<AdisyonTipi, "masa">;
  tutar: number;
  odenen: number;
  kalan: number;
  adet: number;
  acilis: string;
};

/** Yeni gel al / paket adisyonu açar; sepeti boş, ilk ürün eklenince dolar. */
export async function masasizAc(
  tip: Exclude<AdisyonTipi, "masa">,
  musteri: MusteriBilgisi = {}
): Promise<number> {
  const { data, error } = await supabase
    .from("adisyonlar")
    .insert({
      tip,
      acan_id: acikOturum()?.id ?? null,
      musteri_ad: musteri.ad?.trim() || null,
      musteri_telefon: musteri.telefon?.trim() || null,
      adres: musteri.adres?.trim() || null,
      musteri_id: musteri.musteriId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as any).id as number;
}

export async function masasizGuncelle(adisyonId: number, musteri: MusteriBilgisi) {
  const { error } = await supabase
    .from("adisyonlar")
    .update({
      musteri_ad: musteri.ad?.trim() || null,
      musteri_telefon: musteri.telefon?.trim() || null,
      adres: musteri.adres?.trim() || null,
      musteri_id: musteri.musteriId ?? null,
      guncelleme: new Date().toISOString(),
    })
    .eq("id", adisyonId);
  if (error) throw new Error(error.message);
}

export async function masasizSil(adisyonId: number) {
  await supabase.from("adisyonlar").delete().eq("id", adisyonId);
}

/** Salon ekranındaki "Paket & Gel Al" sekmesinin listesi. */
export async function masasizAdisyonlar(): Promise<MasasizAdisyon[]> {
  const { data } = await supabase
    .from("adisyonlar")
    .select(
      `id, adisyon_no, tip, indirim, acilis, musteri_ad, musteri_telefon, adres, musteri_id,
       kuver_tutar, garsoniye_tutar,
       turlar (adisyon_kalemleri (adet, fiyat, durum, indirim)),
       tahsilatlar (tutar)`
    )
    .eq("durum", "acik")
    .neq("tip", "masa")
    .order("acilis");

  return ((data as any[]) ?? []).map((satir) => {
    let tutar = 0;
    let adet = 0;
    for (const tur of satir.turlar ?? []) {
      for (const k of tur.adisyon_kalemleri ?? []) {
        if (k.durum === "iptal") continue;
        adet += Number(k.adet);
        if (k.durum !== "ikram") {
          tutar += Math.max(0, Number(k.fiyat) * Number(k.adet) - Number(k.indirim ?? 0));
        }
      }
    }
    const net = Math.max(0, tutar - Number(satir.indirim ?? 0)) + servisToplami(satir);
    const odenen = (satir.tahsilatlar ?? []).reduce((t: number, o: any) => t + Number(o.tutar), 0);
    return {
      id: satir.id,
      no: satir.adisyon_no,
      tip: satir.tip,
      tutar: net,
      odenen,
      kalan: Math.max(0, net - odenen),
      adet,
      acilis: satir.acilis,
      ad: satir.musteri_ad ?? undefined,
      telefon: satir.musteri_telefon ?? undefined,
      adres: satir.adres ?? undefined,
      musteriId: satir.musteri_id ?? null,
    };
  });
}

/**
 * Kayıtlı servis bedeli. Liste ekranları hesabı yeniden kurmuyor, adisyonun
 * kendi sütunundaki tutarı okuyor — masa kartındaki rakam kasada yazan tutar.
 */
const servisToplami = (satir: any) =>
  Number(satir.kuver_tutar ?? 0) + Number(satir.garsoniye_tutar ?? 0);

export type MasaOzeti = {
  id: number;
  tutar: number;
  odenen: number;
  kalan: number;
  adet: number;
  acilis?: string;
  garson?: string;
  ad?: string;
  kisiSayisi?: number;
};

// Salon ekranı için: açık adisyonların masa bazlı özeti. Tahsilatlar da geliyor —
// masa kartı ödemesi alınmış hesabı ödenmemişten ayırt edebilsin.
// Toplam hesabını etkileyen ayarlar açık adisyon varken değiştirilemiyor.
export async function acikAdisyonSayisi(): Promise<number> {
  const { count } = await supabase
    .from("adisyonlar")
    .select("id", { count: "exact", head: true })
    .eq("durum", "acik");
  return count ?? 0;
}

export async function tumAdisyonlar(): Promise<Record<number, MasaOzeti>> {
  const { data } = await supabase
    .from("adisyonlar")
    .select(
      `id, masa_id, acilis, indirim, ad, kisi_sayisi, kuver_tutar, garsoniye_tutar,
       acan:personel!adisyonlar_acan_id_fkey (ad),
       turlar (adisyon_kalemleri (adet, fiyat, durum, indirim)),
       tahsilatlar (tutar)`
    )
    .eq("durum", "acik");

  const sonuc: Record<number, MasaOzeti> = {};
  for (const satir of (data as any[]) ?? []) {
    let tutar = 0;
    let adet = 0;
    for (const tur of satir.turlar ?? []) {
      for (const k of tur.adisyon_kalemleri ?? []) {
        if (k.durum === "iptal") continue;
        adet += Number(k.adet);
        if (k.durum !== "ikram") {
          tutar += Math.max(0, Number(k.fiyat) * Number(k.adet) - Number(k.indirim ?? 0));
        }
      }
    }
    const net = Math.max(0, tutar - Number(satir.indirim ?? 0)) + servisToplami(satir);
    const odenen = (satir.tahsilatlar ?? []).reduce(
      (t: number, o: any) => t + Number(o.tutar),
      0
    );
    sonuc[satir.masa_id] = {
      id: satir.id,
      tutar: net,
      odenen,
      kalan: Math.max(0, net - odenen),
      adet,
      acilis: satir.acilis,
      garson: satir.acan?.ad ? kisaAd(satir.acan.ad) : undefined,
      ad: satir.ad ?? undefined,
      kisiSayisi: satir.kisi_sayisi ?? undefined,
    };
  }
  return sonuc;
}

async function acikAdisyonBul(masaId: number) {
  const { data } = await supabase
    .from("adisyonlar")
    .select("id, acilis, indirim")
    .eq("masa_id", masaId)
    .eq("durum", "acik")
    .maybeSingle();
  return data as { id: number; acilis: string; indirim: number } | null;
}

/**
 * Adisyonun tahsil edilecek tutarı: normal kalemlerin toplamından hesap
 * indirimi düşülmüş hâli. İptal ve ikram tarafında tek ihtiyaç bu olduğu için
 * KDV'ye girilmiyor, deftere yazılan rakam da bu.
 */
async function adisyonTutari(adisyonId: number) {
  const { data } = await supabase
    .from("adisyonlar")
    .select(
      "indirim, kuver_tutar, garsoniye_tutar, turlar (adisyon_kalemleri (adet, fiyat, indirim, durum))"
    )
    .eq("id", adisyonId)
    .maybeSingle();
  if (!data) return 0;

  const satir = data as any;
  let toplam = 0;
  for (const tur of satir.turlar ?? []) {
    for (const k of tur.adisyon_kalemleri ?? []) {
      if ((k.durum ?? "normal") !== "normal") continue;
      toplam += Math.max(0, Number(k.fiyat) * Number(k.adet) - Number(k.indirim ?? 0));
    }
  }
  const net = Math.max(0, toplam - Number(satir.indirim ?? 0)) + servisToplami(satir);
  return Math.round(net * 100) / 100;
}

/**
 * Adisyonun servis tutarlarını diskteki hâline göre yeniden yazar. Masa
 * birleştirme ve kalem taşıma sepeti ekrandan geçirmeden değiştiriyor; yüzdeli
 * garsoniye eski tutarında kalırsa masa kartı yanlış rakam gösterirdi.
 */
async function servisiTazele(adisyonId: number) {
  const { data } = await supabase
    .from("adisyonlar")
    .select(
      `indirim, tip, kisi_sayisi, kuver_uygula, garsoniye_uygula,
       turlar (adisyon_kalemleri (adet, fiyat, indirim, durum))`
    )
    .eq("id", adisyonId)
    .maybeSingle();
  if (!data) return;

  const satir = data as any;
  let toplam = 0;
  for (const tur of satir.turlar ?? []) {
    for (const k of tur.adisyon_kalemleri ?? []) {
      if ((k.durum ?? "normal") !== "normal") continue;
      toplam += Math.max(0, Number(k.fiyat) * Number(k.adet) - Number(k.indirim ?? 0));
    }
  }

  const { kuver, garsoniye } = servisTutarlari({
    matrah: Math.max(0, Math.round((toplam - Number(satir.indirim ?? 0)) * 100) / 100),
    kisiSayisi: satir.kisi_sayisi ?? undefined,
    tip: satir.tip,
    kuverUygula: satir.kuver_uygula,
    garsoniyeUygula: satir.garsoniye_uygula,
  });

  await supabase
    .from("adisyonlar")
    .update({ kuver_tutar: kuver, garsoniye_tutar: garsoniye })
    .eq("id", adisyonId);
}

/**
 * Adisyonun tamamını iptal eder. Silinmiyor, durumu `iptal` oluyor: silinen
 * adisyonun izi kalmaz, oysa Analiz'de iptalin sayısı ve tutarı görünmeli.
 * Tahsilatı olan adisyon iptal edilemez — kasaya girmiş para ortada kalır.
 */
export async function adisyonIptal(adisyonId: number, sebep: string) {
  const { data: tahsilat } = await supabase
    .from("tahsilatlar")
    .select("id")
    .eq("adisyon_id", adisyonId)
    .limit(1);

  if ((tahsilat ?? []).length) {
    throw new Error(
      "Bu adisyondan tahsilat alınmış. Önce ödemeyi geri verip tahsilatı silin, sonra iptal edin."
    );
  }

  const tutar = await adisyonTutari(adisyonId);
  const yer = await adisyonYeri(adisyonId);

  const { error } = await supabase
    .from("adisyonlar")
    .update({
      durum: "iptal",
      iptal_sebep: sebep,
      kapanis: new Date().toISOString(),
      guncelleme: new Date().toISOString(),
    })
    .eq("id", adisyonId);
  if (error) throw new Error("Adisyon iptal edilemedi.");

  await denetimYaz([{ islem: "adisyon_iptal", adisyonId, yer, tutar, sebep }]);
}

/**
 * Adisyonun tamamını ikram eder: bütün kalemler ikrama çevrilir, hesap
 * indirimi kalkar ve adisyon kapanır. Kalemler ikram durumunda kaldığı için
 * ne satıldığı görünmeye devam ediyor, yalnız ciroya girmiyor.
 */
export async function adisyonIkram(
  adisyonId: number,
  sebep?: string,
  odenmezId?: number
) {
  const tutar = await adisyonTutari(adisyonId);
  const yer = await adisyonYeri(adisyonId);

  const { data: turlar } = await supabase
    .from("turlar")
    .select("id")
    .eq("adisyon_id", adisyonId);

  const turIdler = ((turlar as any[]) ?? []).map((t) => t.id);
  if (turIdler.length) {
    // İptal edilmiş kalemler olduğu gibi kalıyor: iptal ikramdan başka bir şey.
    await supabase
      .from("adisyon_kalemleri")
      .update({
        durum: "ikram",
        indirim: 0,
        indirim_tanim_id: null,
        indirim_ad: null,
        // Kalemler de aynı kişiye yazılıyor: ödenmez dökümü kalem kalem
        // toplandığı için hepsinin üstünde bilgi durmalı.
        odenmez_id: odenmezId ?? null,
      })
      .in("tur_id", turIdler)
      .eq("durum", "normal");
  }

  const { error } = await supabase
    .from("adisyonlar")
    .update({
      durum: "kapali",
      indirim: 0,
      indirim_tanim_id: null,
      indirim_ad: null,
      // Tamamı ikram edilen hesaptan servis bedeli de alınmıyor; kaldırıldığı
      // yazılıyor ki adisyon yeniden açılırsa kuver kendiliğinden geri gelmesin.
      kuver_tutar: 0,
      garsoniye_tutar: 0,
      kuver_uygula: false,
      garsoniye_uygula: false,
      odenmez_id: odenmezId ?? null,
      kapanis: new Date().toISOString(),
      guncelleme: new Date().toISOString(),
    })
    .eq("id", adisyonId);
  if (error) throw new Error("Adisyon ikram edilemedi.");

  const adlar = await odenmezAdlariniGetir(odenmezId ? [odenmezId] : []);

  await denetimYaz([
    {
      islem: "adisyon_ikram",
      adisyonId,
      yer,
      tutar,
      sebep,
      odenmez: odenmezId ? adlar.get(odenmezId) : undefined,
    },
  ]);
}

/**
 * Adisyonu diske yazar. Var olan kalemler yerinde güncellenir, yeni gelenler
 * kendi turuna eklenir — böylece kalem kimlikleri (ve onlara bağlı ödemeler)
 * kaymaz. `kapat` verilirse adisyon silinmez, kapalıya çekilir.
 */
export async function adisyonKaydet(
  masaId: number,
  veri: AdisyonVerisi,
  kapat = false
): Promise<AdisyonVerisi> {
  let adisyon = await acikAdisyonBul(masaId);

  // Boş adisyon: hiç kalem yoksa masayı işgal etmesin.
  if (veri.sepet.length === 0 && !kapat) {
    if (adisyon) await supabase.from("adisyonlar").delete().eq("id", adisyon.id);
    return { sepet: [], indirim: 0, tahsilatlar: [] };
  }

  if (!adisyon) {
    const { data } = await supabase
      .from("adisyonlar")
      .insert({
        masa_id: masaId,
        ...indirimAlanlari(veri),
        ...bilgiAlanlari(veri),
        ...servisAlanlari(veri),
        acan_id: acikOturum()?.id ?? null,
      })
      .select("id, acilis, indirim")
      .single();
    adisyon = data as { id: number; acilis: string; indirim: number };
  } else {
    await supabase
      .from("adisyonlar")
      .update({
        ...indirimAlanlari(veri),
        ...bilgiAlanlari(veri),
        ...servisAlanlari(veri),
        guncelleme: new Date().toISOString(),
      })
      .eq("id", adisyon.id);
  }

  return kalemleriYaz(adisyon.id, veri, kapat);
}

/**
 * Masasız adisyonun (gel al / paket) kaydı. Masalı akıştan tek farkı adisyon
 * satırının hazır olması; sepet, tur ve tahsilat işleyişi aynı.
 */
export async function masasizKaydet(
  adisyonId: number,
  veri: AdisyonVerisi,
  kapat = false
): Promise<AdisyonVerisi> {
  await supabase
    .from("adisyonlar")
    .update({
      ...indirimAlanlari(veri),
      ...bilgiAlanlari(veri),
      ...servisAlanlari(veri),
      guncelleme: new Date().toISOString(),
    })
    .eq("id", adisyonId);

  return kalemleriYaz(adisyonId, veri, kapat);
}

/**
 * Adisyon başlığındaki serbest alanlar. Kaydetme çağrısı bu alanları taşımıyorsa
 * (sipariş ekranı çoğu zaman yalnız sepeti yazıyor) sütunlara dokunulmuyor —
 * yoksa daha önce girilmiş isim ve not her kayıtta silinirdi.
 */
function bilgiAlanlari(veri: AdisyonVerisi) {
  const alanlar: Record<string, unknown> = {};
  if (veri.ad !== undefined) alanlar.ad = veri.ad.trim() || null;
  if (veri.kisiSayisi !== undefined) alanlar.kisi_sayisi = veri.kisiSayisi || null;
  if (veri.not !== undefined) alanlar.not_metni = veri.not.trim() || null;
  if (veri.musteri) {
    const m = veri.musteri;
    if (m.ad !== undefined) alanlar.musteri_ad = m.ad.trim() || null;
    if (m.telefon !== undefined) alanlar.musteri_telefon = m.telefon.trim() || null;
    if (m.adres !== undefined) alanlar.adres = m.adres.trim() || null;
  }
  return alanlar;
}

/**
 * Servis bedelinin sütunları. Tutar her kayıtta yeniden hesaplanıp yazılıyor:
 * masaya bir ürün daha girince yüzdeli garsoniye de büyümeli. Kapanmış adisyonda
 * kayıt donuyor, çünkü kapandıktan sonra yeni bir kayıt geçmiyor.
 */
function servisAlanlari(veri: AdisyonVerisi) {
  const ozet = adisyonOzeti(veri);
  return {
    kuver_tutar: ozet.kuver,
    garsoniye_tutar: ozet.garsoniye,
    kuver_uygula: veri.kuverUygula ?? null,
    garsoniye_uygula: veri.garsoniyeUygula ?? null,
  };
}

// Hesap geneli indirim tutarıyla birlikte hangi tanımdan geldiğini de yazıyor.
function indirimAlanlari(veri: AdisyonVerisi) {
  return {
    indirim: veri.indirim,
    indirim_tanim_id: veri.indirim > 0 ? veri.indirimTanim?.id ?? null : null,
    indirim_ad: veri.indirim > 0 ? veri.indirimTanim?.ad ?? null : null,
  };
}

/**
 * Fişin künyesi: masa adı ve adisyon numarası. Ekrandaki sepet bunları
 * taşımıyor — masa adı Salon'un elinde, numarayı veritabanı sipariş
 * kaydedilirken veriyor. Fiş basılmadan önce ikisi buradan okunuyor, yoksa
 * kâğıtta masa yerine "Masa", numara yerine "—" çıkıyor.
 */
async function fisKunyesi(adisyonId: number) {
  const { data } = await supabase
    .from("adisyonlar")
    .select("adisyon_no, ad, masalar (ad)")
    .eq("id", adisyonId)
    .single();

  const satir = data as any;
  return {
    no: satir?.adisyon_no ?? undefined,
    ad: satir?.ad || satir?.masalar?.ad || undefined,
  };
}

/**
 * Kalemin kayıttaki hâli ile yazılacak hâli aynı mı. Para ve adet alanları
 * veritabanından metin olarak da gelebildiği için sayıya çevrilerek
 * karşılaştırılıyor.
 */
function ayniKalem(onceki: any, yeni: Record<string, unknown>) {
  if (!onceki) return false;
  return Object.entries(yeni).every(([alan, deger]) => {
    const eski = onceki[alan];
    if (typeof deger === "number") return Number(eski ?? 0) === deger;
    return (eski ?? null) === (deger ?? null);
  });
}

async function kalemleriYaz(
  adisyonId: number,
  veri: AdisyonVerisi,
  kapat: boolean
): Promise<AdisyonVerisi> {
  // İki okuma birbirini beklemiyor: turlar ve tahsilatlar aynı anda isteniyor.
  const [{ data: turSatirlari }, { data: eskiTahsilatlar }] = await Promise.all([
    supabase
      .from("turlar")
      .select(
        "id, sira, adisyon_kalemleri (id, durum, adet, fiyat, not_metni, indirim, indirim_tanim_id, indirim_ad)"
      )
      .eq("adisyon_id", adisyonId)
      .order("sira"),
    supabase.from("tahsilatlar").select("id, tip, tutar").eq("adisyon_id", adisyonId),
  ]);
  const turlar = ((turSatirlari as any[]) ?? []);

  const mevcutIdler = new Set<number>();
  // Kalemin kayıttaki hâli: durumu değişenler denetim defterine yazılacak,
  // hiç değişmeyenler için sunucuya gitmeye gerek kalmıyor.
  const oncekiDurumlar = new Map<number, string>();
  const oncekiKalemler = new Map<number, any>();
  for (const t of turlar)
    for (const k of t.adisyon_kalemleri ?? []) {
      mevcutIdler.add(k.id);
      oncekiDurumlar.set(k.id, k.durum ?? "normal");
      oncekiKalemler.set(k.id, k);
    }

  const denetimler: DenetimKaydi[] = [];

  const kalanIdler = new Set(veri.sepet.map((k) => k.id).filter((id): id is number => !!id && id > 0));
  const silinecek = [...mevcutIdler].filter((id) => !kalanIdler.has(id));
  if (silinecek.length) await supabase.from("adisyon_kalemleri").delete().in("id", silinecek);

  // Duran kalemler her kaydetmede tek tek güncelleniyordu: on kalemlik masada
  // on ayrı istek, her biri sunucuya gidiş dönüş. Artık yalnız gerçekten
  // değişenler yazılıyor ve onlar da aynı anda gidiyor.
  // İkram deftere kimin adına yazıldığıyla düşüyor; ad tek sorguda çekiliyor.
  const odenmezAdlari = await odenmezAdlariniGetir(
    veri.sepet.map((k) => k.odenmezId).filter((id): id is number => !!id)
  );

  const guncellemeler: Promise<unknown>[] = [];
  for (const k of veri.sepet) {
    if (!k.id || k.id < 0) continue;
    const denetim = durumDegisimi(
      oncekiDurumlar.get(k.id) ?? "normal",
      k,
      k.odenmezId ? odenmezAdlari.get(k.odenmezId) : undefined
    );
    if (denetim) denetimler.push(denetim);

    const satir = {
      adet: k.adet,
      fiyat: k.fiyat,
      durum: k.durum ?? "normal",
      not_metni: k.not ?? null,
      indirim: k.indirim ?? 0,
      indirim_tanim_id: k.indirimTanimId ?? null,
      indirim_ad: k.indirimAd ?? null,
      odenmez_id: k.odenmezId ?? null,
    };
    if (ayniKalem(oncekiKalemler.get(k.id), satir)) continue;

    guncellemeler.push(
      Promise.resolve(supabase.from("adisyon_kalemleri").update(satir).eq("id", k.id))
    );
  }
  if (guncellemeler.length) await Promise.all(guncellemeler);

  // Yeni kalemler bu kaydın turuna girer; geçici kimlikleri gerçeğiyle eşleşir.
  const yeniler = veri.sepet.filter((k) => !k.id || k.id < 0);
  // "2 salebin biri ikram" satırı ikiye böldüğü için işlem yeni bir kalem
  // olarak geliyor; defterde görünmesi gereken hâli bu satır.
  for (const k of yeniler) {
    const denetim = durumDegisimi("normal", k);
    if (denetim) denetimler.push(denetim);
  }
  const kimlikEsi = new Map<number, number>();
  if (yeniler.length) {
    const sira = turlar.reduce((e, t) => Math.max(e, t.sira), 0) + 1;
    const { data: tur } = await supabase
      .from("turlar")
      .insert({ adisyon_id: adisyonId, sira, garson_id: acikOturum()?.id ?? null })
      .select("id, siparis_no")
      .single();
    const turId = (tur as any).id;

    const { data: eklenen } = await supabase
      .from("adisyon_kalemleri")
      .insert(
        yeniler.map((k) => ({
          tur_id: turId,
          urun_id: k.urunId ?? null,
          porsiyon_id: k.porsiyonId ?? null,
          ad: k.ad,
          porsiyon: k.porsiyon ?? null,
          secimler: k.secimler ?? [],
          adet: k.adet,
          fiyat: k.fiyat,
          kdv_oran: k.kdvOran ?? null,
          durum: k.durum ?? "normal",
          not_metni: k.not ?? null,
          indirim: k.indirim ?? 0,
          indirim_tanim_id: k.indirimTanimId ?? null,
          indirim_ad: k.indirimAd ?? null,
          odenmez_id: k.odenmezId ?? null,
        }))
      )
      .select("id");

    ((eklenen as any[]) ?? []).forEach((satir, i) => {
      const gecici = yeniler[i].id;
      if (gecici) kimlikEsi.set(gecici, satir.id);
      yeniler[i].id = satir.id;
    });

    // Mutfak fişi yalnız bu turun kalemlerini basıyor; eski kalemler ikinci
    // kez gitseydi aynı yemek iki defa hazırlanırdı.
    //
    // Fiş yazımı BEKLENMİYOR: sipariş veritabanına düştüğü anda iş bitmiştir,
    // garsonun ekranı fişin kuyruğa yazılmasını beklerse yoğun saatte her
    // siparişte bir saniye kaybediliyor. Yazıcı tarafındaki hata da siparişin
    // kaydını düşürmüyor, yalnız günlüğe yazılıyor.
    //
    // Mutfak fişinde masayı açan değil, bu turu giren kişi yazıyor: kalabalık
    // masada siparişi kimin aldığı ayrı bilgi ve tur zaten onun adına
    // açılıyor (turlar.garson_id). Adisyon fişinde masayı açan yazmaya devam.
    const kisi = kisaAd(acikOturum()?.ad ?? "") || veri.garson;
    fisKunyesi(adisyonId)
      // Mutfak fişindeki büyük numara adisyonun değil, bu turun numarası:
      // aynı masadan üç sipariş gelirse üçü de ayrı numarayla düşüyor.
      .then((kunye) =>
        mutfakFisiYaz(
          { ...veri, ...kunye, id: adisyonId, garson: kisi || undefined },
          yeniler,
          (tur as any).siparis_no ?? undefined
        )
      )
      .catch((e) => console.error("Mutfak fişi kuyruğa yazılamadı:", e));
  }

  // Tahsilatlar eskiden her kayıtta silinip yeniden yazılıyordu; kimlik
  // korunmadığı için "şu tahsilat silindi" diye bir olay da yoktu. Artık
  // kalanlar güncelleniyor, gidenler tek tek siliniyor ve deftere düşüyor.
  const kalanTahsilatIdler = new Set(
    veri.tahsilatlar.map((t) => t.id).filter((id): id is number => !!id)
  );
  const gidenler = ((eskiTahsilatlar as any[]) ?? []).filter((t) => !kalanTahsilatIdler.has(t.id));

  if (gidenler.length) {
    await supabase
      .from("tahsilatlar")
      .delete()
      .in("id", gidenler.map((t) => t.id));

    for (const t of gidenler) {
      denetimler.push({
        islem: "tahsilat_sil",
        konu: t.tip,
        tutar: Number(t.tutar),
        sebep: veri.silinenTahsilatlar?.find((s) => s.id === t.id)?.sebep,
      });
    }
  }

  const yazilanTahsilatlar: Tahsilat[] = [];
  const yeniTahsilatTipleri: string[] = [];
  for (const t of veri.tahsilatlar) {
    const satir = {
      tip: t.tip,
      tutar: t.tutar,
      bahsis: t.bahsis ?? 0,
      kalem_adetleri: t.kalemler ? gercekKimlikler(t.kalemler, kimlikEsi) : null,
    };

    if (t.id) {
      const eski = ((eskiTahsilatlar as any[]) ?? []).find((e) => e.id === t.id);
      if (eski && eski.tip !== t.tip) {
        denetimler.push({
          islem: "tahsilat_tip_duzelt",
          konu: `${eski.tip} → ${t.tip}`,
          tutar: Number(t.tutar),
          sebep: t.sebep,
        });
      }
      await supabase.from("tahsilatlar").update(satir).eq("id", t.id);
      yazilanTahsilatlar.push(t);
    } else {
      const { data: eklenen } = await supabase
        .from("tahsilatlar")
        .insert({ adisyon_id: adisyonId, ...satir })
        .select("id")
        .single();
      // Kimlik geri dönüyor ki aynı ekranda yapılan ikinci kayıt bu tahsilatı
      // yeni sanıp bir daha eklemesin.
      const yeniId = eklenen ? ((eklenen as any).id as number) : undefined;
      yazilanTahsilatlar.push({ ...t, id: yeniId });
      yeniTahsilatTipleri.push(t.tip);

      // Açık hesaba yazılan ödeme kasaya para getirmiyor, müşterinin borcunu
      // büyütüyor. Cari hareketi tahsilata bağlı: ödeme silinirse borç da gider.
      if (t.musteriId) {
        await adisyonuCariyeYaz(t.musteriId, adisyonId, t.tutar, yeniId, t.tip);
      }
    }
  }

  cekmeceyiGerekirseAc(yeniTahsilatTipleri);

  if (kapat) {
    await supabase
      .from("adisyonlar")
      .update({
        durum: "kapali",
        kapanis: new Date().toISOString(),
        // Eksik kapatma bilgisi yalnız o kapanışta yazılıyor; hesap tam
        // ödenerek kapandıysa eski borç notu da temizleniyor.
        eksik_kisi: veri.eksik?.kisi ?? null,
        eksik_sebep: veri.eksik?.sebep ?? null,
      })
      .eq("id", adisyonId);

    if (veri.eksik) {
      denetimler.push({
        islem: "hesap_eksik_kapat",
        konu: veri.eksik.kisi,
        tutar: veri.eksik.tutar,
        sebep: veri.eksik.sebep,
      });
    }
  }

  if (denetimler.length) {
    const yer = await adisyonYeri(adisyonId);
    await denetimYaz(denetimler.map((d) => ({ ...d, adisyonId, yer })));
  }

  return { ...veri, id: adisyonId, tahsilatlar: yazilanTahsilatlar, silinenTahsilatlar: undefined };
}

/**
 * Nakit alındıysa para çekmecesini açıyor. Kasiyer parayı koyacağı çekmeceyi
 * ayrıca açmak zorunda kalmasın diye; kartlı ödemede çekmece açılmıyor.
 *
 * Kayıt bunu beklemiyor ve hatası satışı düşürmüyor: çekmece tanımlı değilse ya
 * da köprü kapalıysa hesap yine de kapanmalı.
 */
function cekmeceyiGerekirseAc(tipler: string[]) {
  if (!tipler.length || !ayarlar().cekmeceNakitteAcilsin) return;

  (async () => {
    for (const tip of tipler) {
      if (await kasayaGirerMi(tip)) return cekmeceyiAc();
    }
  })().catch(() => {});
}

/**
 * Kalemin durumu kayıttakinden farklıysa deftere düşecek satırı üretir.
 * İptalin sebebi kalemin üstünde geliyor (`sebep`) — sütuna yazılmıyor,
 * yalnız denetim kaydına geçiyor.
 */
function durumDegisimi(
  onceki: string,
  k: SepetKalemi,
  odenmezAdi?: string
): DenetimKaydi | null {
  const yeni = k.durum ?? "normal";
  if (onceki === yeni) return null;

  const islem: DenetimIslemi | null =
    yeni === "iptal"
      ? "kalem_iptal"
      : yeni === "ikram"
        ? "kalem_ikram"
        : onceki === "iptal"
          ? "kalem_iptal_geri"
          : "kalem_ikram_geri";
  if (!islem) return null;

  return {
    islem,
    konu: k.porsiyon ? `${k.ad} (${k.porsiyon})` : k.ad,
    adet: k.adet,
    tutar: kalemTutari(k),
    sebep: k.sebep,
    odenmez: yeni === "ikram" ? odenmezAdi : undefined,
  };
}

/** Kimlikten ada: denetim defterine ödenmezin adı yazılıyor, numarası değil. */
async function odenmezAdlariniGetir(idler: number[]) {
  const adlar = new Map<number, string>();
  const tekil = [...new Set(idler)];
  if (tekil.length === 0) return adlar;

  const { data } = await supabase.from("odenmezler").select("id, ad").in("id", tekil);
  for (const o of (data as any[]) ?? []) adlar.set(o.id, o.ad);
  return adlar;
}

/** Defterde adisyonun hangi masa olduğu yazılı dursun; masasızlarda tipi. */
async function adisyonYeri(adisyonId: number) {
  const { data } = await supabase
    .from("adisyonlar")
    .select("tip, masa:masalar (ad)")
    .eq("id", adisyonId)
    .maybeSingle();
  if (!data) return undefined;
  const satir = data as any;
  if (satir.masa?.ad) return satir.masa.ad as string;
  return satir.tip === "paket" ? "Paket" : satir.tip === "gelal" ? "Gel Al" : undefined;
}

function gercekKimlikler(kalemler: Record<number, number>, es: Map<number, number>) {
  const sonuc: Record<number, number> = {};
  for (const [id, adet] of Object.entries(kalemler)) {
    sonuc[es.get(Number(id)) ?? Number(id)] = adet;
  }
  return sonuc;
}

/**
 * Açık adisyonu olduğu gibi başka masaya götürür. Kalemler, turlar ve
 * tahsilatlar adisyona bağlı olduğu için tek satır değişiyor — kimlikler
 * kaymadığından ödeme eşleşmeleri de bozulmuyor.
 */
export async function masaTasi(kaynakMasaId: number, hedefMasaId: number) {
  const kaynak = await acikAdisyonBul(kaynakMasaId);
  if (!kaynak) throw new Error("Bu masada açık adisyon yok.");

  const hedef = await acikAdisyonBul(hedefMasaId);
  if (hedef) throw new Error("Hedef masada açık adisyon var. Taşımak yerine birleştirin.");

  await supabase
    .from("adisyonlar")
    .update({ masa_id: hedefMasaId, guncelleme: new Date().toISOString() })
    .eq("id", kaynak.id);
}

/**
 * İki açık adisyonu tek adisyonda toplar. Kaynağın turları hedefin son turundan
 * devam ederek aktarılır — böylece "1. tur / 2. tur" sırası zaman akışını
 * korur. İndirimler toplanır, tahsilatlar taşınır, boşalan adisyon silinir.
 */
export async function masaBirlestir(kaynakMasaId: number, hedefMasaId: number) {
  if (kaynakMasaId === hedefMasaId) throw new Error("Masa kendisiyle birleştirilemez.");

  const [kaynak, hedef] = await Promise.all([
    acikAdisyonBul(kaynakMasaId),
    acikAdisyonBul(hedefMasaId),
  ]);
  if (!kaynak) throw new Error("Bu masada açık adisyon yok.");
  if (!hedef) throw new Error("Hedef masada açık adisyon yok. Bu masayı oraya taşıyabilirsiniz.");

  const [{ data: kaynakTurlar }, { data: hedefTurlar }] = await Promise.all([
    supabase.from("turlar").select("id, sira").eq("adisyon_id", kaynak.id).order("sira"),
    supabase.from("turlar").select("sira").eq("adisyon_id", hedef.id),
  ]);

  let sira = ((hedefTurlar as any[]) ?? []).reduce((e, t) => Math.max(e, t.sira), 0);
  for (const tur of ((kaynakTurlar as any[]) ?? [])) {
    sira += 1;
    await supabase.from("turlar").update({ adisyon_id: hedef.id, sira }).eq("id", tur.id);
  }

  await supabase.from("tahsilatlar").update({ adisyon_id: hedef.id }).eq("adisyon_id", kaynak.id);

  const toplamIndirim = Number(kaynak.indirim ?? 0) + Number(hedef.indirim ?? 0);
  await supabase
    .from("adisyonlar")
    .update({ indirim: toplamIndirim, guncelleme: new Date().toISOString() })
    .eq("id", hedef.id);

  await supabase.from("adisyonlar").delete().eq("id", kaynak.id);
  await servisiTazele(hedef.id);
}

/**
 * Tek bir kalemi başka masanın adisyonuna gönderir. Kalem hedefte yeni bir tura
 * girer — mutfağa ne zaman düştüğü kaybolmasın. `adet` satırın tamamından azsa
 * kaynakta kalan kısım durur, yalnız taşınan kadarı gider.
 *
 * Ödemesi işlenmiş kalem taşınmaz: ödeme kalem kimliğine bağlı, kalem gidince
 * ödenen adet yanlış adisyonda kalırdı.
 */
export async function kalemTasi(
  kaynakMasaId: number,
  hedefMasaId: number,
  kalemId: number,
  adet: number
) {
  if (kaynakMasaId === hedefMasaId) throw new Error("Kalem zaten bu masada.");

  const kaynak = await acikAdisyonBul(kaynakMasaId);
  if (!kaynak) throw new Error("Bu masada açık adisyon yok.");

  const { data: kalem } = await supabase
    .from("adisyon_kalemleri")
    .select(KALEM_ALANLARI + ", tur_id")
    .eq("id", kalemId)
    .maybeSingle();
  if (!kalem) throw new Error("Kalem bulunamadı. Adisyonu kaydedip tekrar deneyin.");

  const mevcutAdet = Number((kalem as any).adet);
  const tasinan = Math.min(adet, mevcutAdet);

  let hedef = await acikAdisyonBul(hedefMasaId);
  if (!hedef) {
    const { data } = await supabase
      .from("adisyonlar")
      .insert({ masa_id: hedefMasaId, indirim: 0 })
      .select("id, acilis, indirim")
      .single();
    hedef = data as { id: number; acilis: string; indirim: number };
  }

  const { data: hedefTurlar } = await supabase
    .from("turlar")
    .select("sira")
    .eq("adisyon_id", hedef.id);
  const sira = ((hedefTurlar as any[]) ?? []).reduce((e, t) => Math.max(e, t.sira), 0) + 1;

  const { data: tur } = await supabase
    .from("turlar")
    .insert({ adisyon_id: hedef.id, sira })
    .select("id")
    .single();

  const k = kalem as any;
  await supabase.from("adisyon_kalemleri").insert({
    tur_id: (tur as any).id,
    urun_id: k.urun_id,
    porsiyon_id: k.porsiyon_id,
    ad: k.ad,
    porsiyon: k.porsiyon,
    secimler: k.secimler ?? [],
    adet: tasinan,
    fiyat: k.fiyat,
    kdv_oran: k.kdv_oran,
    durum: k.durum,
    not_metni: k.not_metni,
  });

  if (tasinan < mevcutAdet) {
    await supabase
      .from("adisyon_kalemleri")
      .update({ adet: mevcutAdet - tasinan })
      .eq("id", kalemId);
  } else {
    await supabase.from("adisyon_kalemleri").delete().eq("id", kalemId);
  }

  await bosAdisyonuTemizle(kaynak.id);
  await Promise.all([servisiTazele(kaynak.id), servisiTazele(hedef.id)]);
}

/** Son kalemi de gidince adisyon masayı işgal etmesin — boşsa siliniyor. */
async function bosAdisyonuTemizle(adisyonId: number) {
  const { data } = await supabase
    .from("turlar")
    .select("id, adisyon_kalemleri (id)")
    .eq("adisyon_id", adisyonId);

  const turlar = ((data as any[]) ?? []);
  const kalemVar = turlar.some((t) => (t.adisyon_kalemleri ?? []).length > 0);
  if (!kalemVar) await supabase.from("adisyonlar").delete().eq("id", adisyonId);
}

