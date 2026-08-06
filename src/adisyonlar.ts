import { supabase } from "./supabase";
import type { SepetKalemi, Tahsilat } from "./types";

export type AdisyonVerisi = {
  id?: number;
  no?: number;
  sepet: SepetKalemi[];
  indirim: number;
  tahsilatlar: Tahsilat[];
  acilis?: string;
  garson?: string;
};

// Ekranda yeni açılan kalemin de bir kimliği olmalı ki tahsilat ona bağlanabilsin.
// Kaydedilene kadar negatif geçici kimlik taşır, kayıtta gerçeğiyle değişir.
let geciciSayac = 0;
export function yeniKalemId() {
  return --geciciSayac;
}

const KALEM_ALANLARI =
  "id, urun_id, porsiyon_id, ad, porsiyon, secimler, adet, fiyat, kdv_oran, durum, not_metni";

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
  tur_sira?: number;
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
    turSira: s.tur_sira,
  };
}

export async function adisyonGetir(masaAd: string): Promise<AdisyonVerisi> {
  const { data } = await supabase
    .from("adisyonlar")
    .select(
      `id, adisyon_no, indirim, acilis, garson,
       turlar (sira, adisyon_kalemleri (${KALEM_ALANLARI})),
       tahsilatlar (id, tip, tutar, kalem_adetleri)`
    )
    .eq("masa_ad", masaAd)
    .eq("durum", "acik")
    .maybeSingle();

  if (!data) return { sepet: [], indirim: 0, tahsilatlar: [] };

  const sepet: SepetKalemi[] = [];
  for (const tur of (data as any).turlar ?? []) {
    for (const k of tur.adisyon_kalemleri ?? []) {
      sepet.push(kalemeCevir({ ...k, tur_sira: tur.sira }));
    }
  }
  sepet.sort((a, b) => (a.turSira ?? 0) - (b.turSira ?? 0) || (a.id ?? 0) - (b.id ?? 0));

  const tahsilatlar: Tahsilat[] = ((data as any).tahsilatlar ?? []).map((t: any) => ({
    tip: t.tip,
    tutar: Number(t.tutar),
    kalemler: t.kalem_adetleri ?? undefined,
  }));

  return {
    id: (data as any).id,
    no: (data as any).adisyon_no,
    sepet,
    indirim: Number((data as any).indirim ?? 0),
    tahsilatlar,
    acilis: (data as any).acilis,
    garson: (data as any).garson ?? undefined,
  };
}

// Salon ekranı için: açık adisyonların masa bazlı özeti.
export async function tumAdisyonlar(): Promise<
  Record<string, { tutar: number; adet: number; acilis?: string; garson?: string }>
> {
  const { data } = await supabase
    .from("adisyonlar")
    .select("masa_ad, acilis, garson, indirim, turlar (adisyon_kalemleri (adet, fiyat, durum))")
    .eq("durum", "acik");

  const sonuc: Record<string, { tutar: number; adet: number; acilis?: string; garson?: string }> = {};
  for (const satir of (data as any[]) ?? []) {
    let tutar = 0;
    let adet = 0;
    for (const tur of satir.turlar ?? []) {
      for (const k of tur.adisyon_kalemleri ?? []) {
        if (k.durum === "iptal") continue;
        adet += Number(k.adet);
        if (k.durum !== "ikram") tutar += Number(k.fiyat) * Number(k.adet);
      }
    }
    sonuc[satir.masa_ad] = {
      tutar: Math.max(0, tutar - Number(satir.indirim ?? 0)),
      adet,
      acilis: satir.acilis,
      garson: satir.garson ?? undefined,
    };
  }
  return sonuc;
}

async function acikAdisyonBul(masaAd: string) {
  const { data } = await supabase
    .from("adisyonlar")
    .select("id, acilis")
    .eq("masa_ad", masaAd)
    .eq("durum", "acik")
    .maybeSingle();
  return data as { id: number; acilis: string } | null;
}

/**
 * Adisyonu diske yazar. Var olan kalemler yerinde güncellenir, yeni gelenler
 * kendi turuna eklenir — böylece kalem kimlikleri (ve onlara bağlı ödemeler)
 * kaymaz. `kapat` verilirse adisyon silinmez, kapalıya çekilir.
 */
export async function adisyonKaydet(
  masaAd: string,
  veri: AdisyonVerisi,
  kapat = false
): Promise<AdisyonVerisi> {
  let adisyon = await acikAdisyonBul(masaAd);

  // Boş adisyon: hiç kalem yoksa masayı işgal etmesin.
  if (veri.sepet.length === 0 && !kapat) {
    if (adisyon) await supabase.from("adisyonlar").delete().eq("id", adisyon.id);
    return { sepet: [], indirim: 0, tahsilatlar: [] };
  }

  if (!adisyon) {
    const { data } = await supabase
      .from("adisyonlar")
      .insert({ masa_ad: masaAd, indirim: veri.indirim, garson: veri.garson ?? null })
      .select("id, acilis")
      .single();
    adisyon = data as { id: number; acilis: string };
  } else {
    await supabase
      .from("adisyonlar")
      .update({ indirim: veri.indirim, guncelleme: new Date().toISOString() })
      .eq("id", adisyon.id);
  }
  const adisyonId = adisyon.id;

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

export type OdemeTipi = { id: number; ad: string; renk: string; sira: number };

export async function odemeTipleriniGetir(): Promise<OdemeTipi[]> {
  const { data } = await supabase
    .from("odeme_tipleri")
    .select("id, ad, renk, sira")
    .eq("aktif", true)
    .order("sira");
  return (data ?? []) as OdemeTipi[];
}
