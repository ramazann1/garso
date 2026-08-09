import { supabase } from "./supabase";
import { ayarlar } from "./isletmeAyarlari";
import { kdvDokumu } from "./kdv";
import type { IndirimKaynagi } from "./indirimler";
import type { SepetKalemi, Tahsilat } from "./types";

export type AdisyonVerisi = {
  id?: number;
  no?: number;
  sepet: SepetKalemi[];
  indirim: number;
  /** Hesap geneli indirim ön tanımlıysa kaynağı; serbest indirimde boş. */
  indirimTanim?: IndirimKaynagi;
  tahsilatlar: Tahsilat[];
  acilis?: string;
  garson?: string;
  tip?: AdisyonTipi;
  musteri?: MusteriBilgisi;
  /** Adisyona verilen serbest ad — "Doğum günü", "Ahmet Bey" gibi. */
  ad?: string;
  kisiSayisi?: number;
  not?: string;
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
  const toplam = Math.max(0, araToplam - veri.indirim) + kdv;
  const odenen = veri.tahsilatlar.reduce((t, o) => t + o.tutar, 0);
  return { araToplam, kdv, toplam, odenen, kalan: toplam - odenen };
}

// Ekranda yeni açılan kalemin de bir kimliği olmalı ki tahsilat ona bağlanabilsin.
// Kaydedilene kadar negatif geçici kimlik taşır, kayıtta gerçeğiyle değişir.
let geciciSayac = 0;
export function yeniKalemId() {
  return --geciciSayac;
}

const KALEM_ALANLARI =
  "id, urun_id, porsiyon_id, ad, porsiyon, secimler, adet, fiyat, kdv_oran, durum, not_metni, indirim, indirim_tanim_id, indirim_ad";

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
  tur_sira?: number;
  tur_saat?: string;
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
    turSira: s.tur_sira,
    turSaat: s.tur_saat,
  };
}

const ADISYON_ALANLARI = `id, adisyon_no, indirim, indirim_tanim_id, indirim_ad, acilis, garson, tip,
       ad, kisi_sayisi, not_metni, musteri_ad, musteri_telefon, adres,
       turlar (sira, olusturma, adisyon_kalemleri (${KALEM_ALANLARI})),
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

function adisyonaCevir(data: any): AdisyonVerisi {
  if (!data) return { sepet: [], indirim: 0, tahsilatlar: [] };

  const sepet: SepetKalemi[] = [];
  for (const tur of (data as any).turlar ?? []) {
    for (const k of tur.adisyon_kalemleri ?? []) {
      sepet.push(kalemeCevir({ ...k, tur_sira: tur.sira, tur_saat: tur.olusturma }));
    }
  }
  sepet.sort((a, b) => (a.turSira ?? 0) - (b.turSira ?? 0) || (a.id ?? 0) - (b.id ?? 0));

  const tahsilatlar: Tahsilat[] = ((data as any).tahsilatlar ?? []).map((t: any) => ({
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
    garson: (data as any).garson ?? undefined,
    tip: ((data as any).tip ?? "masa") as AdisyonTipi,
    ad: (data as any).ad ?? undefined,
    kisiSayisi: (data as any).kisi_sayisi ?? undefined,
    not: (data as any).not_metni ?? undefined,
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
      musteri_ad: musteri.ad?.trim() || null,
      musteri_telefon: musteri.telefon?.trim() || null,
      adres: musteri.adres?.trim() || null,
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
      `id, adisyon_no, tip, indirim, acilis, musteri_ad, musteri_telefon, adres,
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
    const net = Math.max(0, tutar - Number(satir.indirim ?? 0));
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
    };
  });
}

export type MasaOzeti = {
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
      `masa_id, acilis, garson, indirim, ad, kisi_sayisi,
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
    const net = Math.max(0, tutar - Number(satir.indirim ?? 0));
    const odenen = (satir.tahsilatlar ?? []).reduce(
      (t: number, o: any) => t + Number(o.tutar),
      0
    );
    sonuc[satir.masa_id] = {
      tutar: net,
      odenen,
      kalan: Math.max(0, net - odenen),
      adet,
      acilis: satir.acilis,
      garson: satir.garson ?? undefined,
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
        garson: veri.garson ?? null,
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

// Hesap geneli indirim tutarıyla birlikte hangi tanımdan geldiğini de yazıyor.
function indirimAlanlari(veri: AdisyonVerisi) {
  return {
    indirim: veri.indirim,
    indirim_tanim_id: veri.indirim > 0 ? veri.indirimTanim?.id ?? null : null,
    indirim_ad: veri.indirim > 0 ? veri.indirimTanim?.ad ?? null : null,
  };
}

async function kalemleriYaz(
  adisyonId: number,
  veri: AdisyonVerisi,
  kapat: boolean
): Promise<AdisyonVerisi> {
  const { data: turSatirlari } = await supabase
    .from("turlar")
    .select("id, sira, adisyon_kalemleri (id)")
    .eq("adisyon_id", adisyonId)
    .order("sira");
  const turlar = ((turSatirlari as any[]) ?? []);

  const mevcutIdler = new Set<number>();
  for (const t of turlar) for (const k of t.adisyon_kalemleri ?? []) mevcutIdler.add(k.id);

  const kalanIdler = new Set(veri.sepet.map((k) => k.id).filter((id): id is number => !!id && id > 0));
  const silinecek = [...mevcutIdler].filter((id) => !kalanIdler.has(id));
  if (silinecek.length) await supabase.from("adisyon_kalemleri").delete().in("id", silinecek);

  for (const k of veri.sepet) {
    if (!k.id || k.id < 0) continue;
    await supabase
      .from("adisyon_kalemleri")
      .update({
        adet: k.adet,
        fiyat: k.fiyat,
        durum: k.durum ?? "normal",
        not_metni: k.not ?? null,
        indirim: k.indirim ?? 0,
        indirim_tanim_id: k.indirimTanimId ?? null,
        indirim_ad: k.indirimAd ?? null,
      })
      .eq("id", k.id);
  }

  // Yeni kalemler bu kaydın turuna girer; geçici kimlikleri gerçeğiyle eşleşir.
  const yeniler = veri.sepet.filter((k) => !k.id || k.id < 0);
  const kimlikEsi = new Map<number, number>();
  if (yeniler.length) {
    const sira = turlar.reduce((e, t) => Math.max(e, t.sira), 0) + 1;
    const { data: tur } = await supabase
      .from("turlar")
      .insert({ adisyon_id: adisyonId, sira })
      .select("id")
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
        }))
      )
      .select("id");

    ((eklenen as any[]) ?? []).forEach((satir, i) => {
      const gecici = yeniler[i].id;
      if (gecici) kimlikEsi.set(gecici, satir.id);
      yeniler[i].id = satir.id;
    });
  }

  // Tahsilatlar kalem kimliklerini taşıdığı için baştan yazılır.
  await supabase.from("tahsilatlar").delete().eq("adisyon_id", adisyonId);
  if (veri.tahsilatlar.length) {
    await supabase.from("tahsilatlar").insert(
      veri.tahsilatlar.map((t) => ({
        adisyon_id: adisyonId,
        tip: t.tip,
        tutar: t.tutar,
        bahsis: t.bahsis ?? 0,
        kalem_adetleri: t.kalemler ? gercekKimlikler(t.kalemler, kimlikEsi) : null,
      }))
    );
  }

  if (kapat) {
    await supabase
      .from("adisyonlar")
      .update({ durum: "kapali", kapanis: new Date().toISOString() })
      .eq("id", adisyonId);
  }

  return { ...veri, id: adisyonId };
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

