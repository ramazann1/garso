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

export async function adisyonGetir(masaId: number): Promise<AdisyonVerisi> {
  const { data } = await supabase
    .from("adisyonlar")
    .select(
      `id, adisyon_no, indirim, acilis, garson,
       turlar (sira, adisyon_kalemleri (${KALEM_ALANLARI})),
       tahsilatlar (id, tip, tutar, kalem_adetleri)`
    )
    .eq("masa_id", masaId)
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
  Record<number, { tutar: number; adet: number; acilis?: string; garson?: string }>
> {
  const { data } = await supabase
    .from("adisyonlar")
    .select("masa_id, acilis, garson, indirim, turlar (adisyon_kalemleri (adet, fiyat, durum))")
    .eq("durum", "acik");

  const sonuc: Record<number, { tutar: number; adet: number; acilis?: string; garson?: string }> = {};
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
    sonuc[satir.masa_id] = {
      tutar: Math.max(0, tutar - Number(satir.indirim ?? 0)),
      adet,
      acilis: satir.acilis,
      garson: satir.garson ?? undefined,
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
      .insert({ masa_id: masaId, indirim: veri.indirim, garson: veri.garson ?? null })
      .select("id, acilis, indirim")
      .single();
    adisyon = data as { id: number; acilis: string; indirim: number };
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

export type OdemeTipi = { id: number; ad: string; renk: string; sira: number };

export async function odemeTipleriniGetir(): Promise<OdemeTipi[]> {
  const { data } = await supabase
    .from("odeme_tipleri")
    .select("id, ad, renk, sira")
    .eq("aktif", true)
    .order("sira");
  return (data ?? []) as OdemeTipi[];
}
