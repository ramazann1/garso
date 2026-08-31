import type { AdisyonTipi } from "./adisyonlar";
import { ayarlar } from "./isletmeAyarlari";
import { kdvDokumu } from "./kdv";
import { masraflariGetir, odemeAdi, type Masraf } from "./masraflar";
import { denetimGetir, denetimYaz } from "./denetim";
export type { DenetimSatiri } from "./denetim";
import { kisaAd } from "./personel";
import { supabase } from "./supabase";
import { istasyonlariGetir, urunIstasyonlari } from "./yazicilar";
import type { SepetKalemi } from "./types";

/**
 * Analiz ekranının ortak veri katmanı. Bütün sekmeler aynı adisyon listesini okuyup
 * kendi açısından toparlıyor — özet, ürün dökümü ve personel dökümü ayrı ayrı
 * sorgu atsaydı üç farklı ciro çıkma ihtimali doğardı.
 */

export type DonemKodu =
  | "bugun"
  | "dun"
  | "buHafta"
  | "gecenHafta"
  | "buAy"
  | "son30"
  | "ozel";

export const DONEMLER: { kod: DonemKodu; ad: string }[] = [
  { kod: "bugun", ad: "Bugün" },
  { kod: "dun", ad: "Dün" },
  { kod: "buHafta", ad: "Bu hafta" },
  { kod: "gecenHafta", ad: "Geçen hafta" },
  { kod: "buAy", ad: "Bu ay" },
  { kod: "son30", ad: "Son 30 gün" },
  { kod: "ozel", ad: "Özel aralık" },
];

export type AnalizFiltre = {
  donem: DonemKodu;
  /** Özel aralıkta gün (yyyy-aa-gg); dönem özel değilse kullanılmıyor. */
  ozelBas: string;
  ozelBit: string;
  /**
   * Seçiliyse tarih aralığının yerine vardiyanın kendi aralığı geçer. Vardiya
   * bir güne oturmuyor — gece yarısını aşan bir vardiya iki takvim gününe
   * yayıldığı için aralık tarihten değil, açılış/kapanış anından çıkıyor.
   */
  vardiyaId: number | null;
  vardiyaBas: string;
  vardiyaBit: string;
  bolgeId: number | null;
  masaId: number | null;
  garsonId: number | null;
  tip: AdisyonTipi | null;
  odemeTipi: string | null;
  /** "ikram" veritabanındaki bir durum değil, hesabı sıfırlanmış kapanış. */
  durum: "hepsi" | "acik" | "kapali" | "iptal" | "ikram";
  indirimli: boolean;
  enAz: number | null;
  enCok: number | null;
};

export const BOS_FILTRE: AnalizFiltre = {
  donem: "bugun",
  ozelBas: "",
  ozelBit: "",
  vardiyaId: null,
  vardiyaBas: "",
  vardiyaBit: "",
  bolgeId: null,
  masaId: null,
  garsonId: null,
  tip: null,
  odemeTipi: null,
  durum: "hepsi",
  indirimli: false,
  enAz: null,
  enCok: null,
};

/** Tarih dışında bir şey seçilmiş mi — çip şeridi ve "temizle" bunu soruyor. */
export function filtreSayisi(f: AnalizFiltre) {
  return [
    f.vardiyaId,
    f.bolgeId,
    f.masaId,
    f.garsonId,
    f.tip,
    f.odemeTipi,
    f.durum !== "hepsi" ? f.durum : null,
    f.indirimli ? true : null,
    f.enAz,
    f.enCok,
  ].filter((d) => d !== null && d !== undefined).length;
}

const gunEkle = (t: Date, gun: number) => {
  const yeni = new Date(t);
  yeni.setDate(yeni.getDate() + gun);
  return yeni;
};

/**
 * Verilen anın ait olduğu kasa gününün başlangıcı. Gece 01:00'de alınan sipariş
 * takvimde yeni güne geçmiş olsa da işletme için hâlâ dünün cirosu.
 */
export function kasaGunuBasi(an: Date) {
  const [saat, dakika] = ayarlar().kasaGunuBaslangic.split(":").map(Number);
  const bas = new Date(an);
  bas.setHours(saat, dakika, 0, 0);
  return bas > an ? gunEkle(bas, -1) : bas;
}

/** Haftanın ilk günü pazartesi; JavaScript'te pazar 0 olduğu için kaydırılıyor. */
function haftaBasi(t: Date) {
  const gun = (t.getDay() + 6) % 7;
  return gunEkle(t, -gun);
}

export function donemAraligi(f: AnalizFiltre): { bas: Date; bit: Date } {
  if (f.vardiyaId && f.vardiyaBas) {
    return {
      bas: new Date(f.vardiyaBas),
      bit: f.vardiyaBit ? new Date(f.vardiyaBit) : new Date(),
    };
  }

  const bugun = kasaGunuBasi(new Date());
  const yarin = gunEkle(bugun, 1);

  switch (f.donem) {
    case "dun":
      return { bas: gunEkle(bugun, -1), bit: bugun };
    case "buHafta":
      return { bas: haftaBasi(bugun), bit: yarin };
    case "gecenHafta": {
      const bu = haftaBasi(bugun);
      return { bas: gunEkle(bu, -7), bit: bu };
    }
    case "buAy": {
      const bas = new Date(bugun);
      bas.setDate(1);
      return { bas, bit: yarin };
    }
    case "son30":
      return { bas: gunEkle(bugun, -29), bit: yarin };
    case "ozel": {
      // Özel aralıkta girilen günler de kasa gününe oturuyor: 12 Ağustos
      // seçildiyse 12 Ağustos sabahından 13 Ağustos sabahına kadar.
      const bas = f.ozelBas ? kasaGunuBasi(new Date(`${f.ozelBas}T12:00`)) : bugun;
      const bit = f.ozelBit ? kasaGunuBasi(new Date(`${f.ozelBit}T12:00`)) : bas;
      return { bas, bit: gunEkle(bit, 1) };
    }
    default:
      return { bas: bugun, bit: yarin };
  }
}

/** Başlıkta duran okunur aralık metni: "12 Ağustos" veya "1 – 12 Ağustos". */
export function donemMetni(f: AnalizFiltre) {
  if (f.vardiyaId && f.vardiyaBas) {
    const bas = new Date(f.vardiyaBas);
    return `${bas.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} vardiyası`;
  }

  const hazir = DONEMLER.find((d) => d.kod === f.donem);
  if (f.donem !== "ozel") return hazir?.ad ?? "";

  const { bas, bit } = donemAraligi(f);
  const son = gunEkle(bit, -1);
  const bicim = (t: Date) =>
    t.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  return bas.toDateString() === son.toDateString()
    ? bicim(bas)
    : `${bicim(bas)} – ${bicim(son)}`;
}

export type AnalizAdisyon = {
  id: number;
  no: number;
  tip: AdisyonTipi;
  durum: "acik" | "kapali" | "iptal";
  /** İptal edilmişse sebebi — listede rozetin ipucu, detayda satır. */
  iptalSebep: string;
  masaId: number | null;
  masaAd: string;
  bolgeId: number | null;
  bolgeAd: string;
  garsonId: number | null;
  garson: string;
  acilis: string;
  kapanis: string | null;
  kisiSayisi: number;
  ad: string;
  musteri: string;
  kalemler: SepetKalemi[];
  adet: number;
  araToplam: number;
  indirim: number;
  ikram: number;
  matrah: number;
  kdv: number;
  /** Kuver ve garsoniye adisyonun kendi sütunlarından okunuyor. */
  kuver: number;
  garsoniye: number;
  toplam: number;
  odenen: number;
  kalan: number;
  bahsis: number;
  odemeler: { tip: string; tutar: number }[];
};

const ALANLAR = `id, adisyon_no, tip, durum, iptal_sebep, acilis, kapanis, indirim, ad, kisi_sayisi,
       musteri_ad, masa_id, kuver_tutar, garsoniye_tutar,
       masa:masalar (ad, bolge_id, bolgeler (ad)),
       acan:personel!adisyonlar_acan_id_fkey (id, ad),
       turlar (garson:personel!turlar_garson_id_fkey (id, ad),
               adisyon_kalemleri (id, urun_id, ad, adet, fiyat, kdv_oran, durum, indirim,
                                   odenmez:odenmez_id (ad))),
       tahsilatlar (tip, tutar, bahsis)`;

async function varsayilanKdvOrani() {
  const { data } = await supabase
    .from("kdv_gruplari")
    .select("oran")
    .eq("varsayilan", true)
    .maybeSingle();
  return data ? Number((data as any).oran) : undefined;
}

function satiraCevir(s: any, varsayilanKdv?: number): AnalizAdisyon {
  const kalemler: SepetKalemi[] = [];
  for (const tur of s.turlar ?? []) {
    for (const k of tur.adisyon_kalemleri ?? []) {
      kalemler.push({
        id: k.id,
        urunId: k.urun_id ?? undefined,
        // Kalem, ürünü adisyona yazan garsonu taşıyor: ciro masayı açana değil
        // satışı yapana yazılıyor.
        turGarsonId: tur.garson?.id ?? undefined,
        turGarson: tur.garson?.ad ? kisaAd(tur.garson.ad) : undefined,
        ad: k.ad,
        adet: Number(k.adet),
        fiyat: Number(k.fiyat),
        kdvOran: k.kdv_oran ?? undefined,
        durum: k.durum ?? "normal",
        indirim: Number(k.indirim ?? 0) || undefined,
        odenmezAd: k.odenmez?.ad ?? undefined,
      });
    }
  }

  const satilanlar = kalemler.filter((k) => (k.durum ?? "normal") === "normal");
  const tutar = (k: SepetKalemi) =>
    Math.max(0, Math.round((k.fiyat * k.adet - (k.indirim ?? 0)) * 100) / 100);

  const araToplam = satilanlar.reduce((t, k) => t + tutar(k), 0);
  const indirim = Number(s.indirim ?? 0);
  const ikram = kalemler
    .filter((k) => k.durum === "ikram")
    .reduce((t, k) => t + tutar(k), 0);

  const dokum = kdvDokumu(satilanlar, indirim, varsayilanKdv);
  const kdv = dokum.reduce((t, d) => t + d.kdv, 0);
  const matrah = dokum.reduce((t, d) => t + d.matrah, 0);
  // Servis bedeli satış anında hesaplanıp adisyona yazılıyor; rapor onu yeniden
  // hesaplamıyor, kasada ne yazdıysa onu okuyor.
  const kuver = Number(s.kuver_tutar ?? 0);
  const garsoniye = Number(s.garsoniye_tutar ?? 0);
  // KDV dahil düzende vergi zaten fiyatın içinde; hariç düzende toplamın üstüne
  // biniyor. Adisyon ekranındaki hesapla aynı kural.
  const toplam =
    Math.max(0, araToplam - indirim) + kuver + garsoniye + (ayarlar().kdvDahil ? 0 : kdv);

  const tahsilatlar = (s.tahsilatlar ?? []) as any[];
  const odenen = tahsilatlar.reduce((t, o) => t + Number(o.tutar), 0);

  return {
    id: s.id,
    no: s.adisyon_no,
    tip: (s.tip ?? "masa") as AdisyonTipi,
    durum: s.durum,
    iptalSebep: s.iptal_sebep ?? "",
    masaId: s.masa_id ?? null,
    masaAd: s.masa?.ad ?? "",
    bolgeId: s.masa?.bolge_id ?? null,
    bolgeAd: s.masa?.bolgeler?.ad ?? "",
    garsonId: s.acan?.id ?? null,
    garson: s.acan?.ad ? kisaAd(s.acan.ad) : "",
    acilis: s.acilis,
    kapanis: s.kapanis ?? null,
    kisiSayisi: Number(s.kisi_sayisi ?? 0),
    ad: s.ad ?? "",
    musteri: s.musteri_ad ?? "",
    kalemler,
    adet: kalemler
      .filter((k) => k.durum !== "iptal")
      .reduce((t, k) => t + k.adet, 0),
    araToplam,
    indirim,
    ikram,
    matrah,
    kdv,
    kuver,
    garsoniye,
    toplam,
    odenen,
    kalan: Math.max(0, toplam - odenen),
    bahsis: tahsilatlar.reduce((t, o) => t + Number(o.bahsis ?? 0), 0),
    odemeler: tahsilatlar.map((o) => ({ tip: o.tip, tutar: Number(o.tutar) })),
  };
}

/**
 * Aralık kasa gününe göre çıkıyor ama adisyon "kapandığı" ana yazılıyor: açılışı
 * dün olup bugün kapanan hesap bugünün cirosunda görünsün. Açık adisyonlar
 * henüz kapanmadığı için açılışlarına bakılıyor.
 */
export async function analizAdisyonlari(f: AnalizFiltre): Promise<AnalizAdisyon[]> {
  const { bas, bit } = donemAraligi(f);

  const [{ data }, varsayilanKdv] = await Promise.all([
    supabase
      .from("adisyonlar")
      .select(ALANLAR)
      .or(
        `and(kapanis.gte.${bas.toISOString()},kapanis.lt.${bit.toISOString()}),` +
          `and(kapanis.is.null,acilis.gte.${bas.toISOString()},acilis.lt.${bit.toISOString()})`
      )
      .order("acilis", { ascending: false })
      .limit(2000),
    varsayilanKdvOrani(),
  ]);

  const satirlar = ((data as any[]) ?? []).map((s) => satiraCevir(s, varsayilanKdv));
  return satirlar.filter((a) => uyuyor(a, f));
}

/**
 * Hesabın tamamı ikrama gitmiş mi. Ayrı bir durum tutulmuyor — adisyon
 * gerçekten kapandı, yalnız ödenecek bir şey kalmadı. Kalem kalem ikram edilen
 * masa da buraya düşüyor; sonuç aynı, hesap ikram edilmiş.
 */
export function tamamiIkram(a: { toplam: number; ikram: number; durum: string }) {
  return a.durum === "kapali" && a.ikram > 0 && a.toplam <= 0;
}

// Tarih dışındaki süzgeçler veritabanında değil burada çalışıyor: aynı liste
// altı sekmeye birden besleniyor, her filtre değişiminde yeniden sorgu atmak
// yerine gelen liste yerinde daraltılıyor.
function uyuyor(a: AnalizAdisyon, f: AnalizFiltre) {
  if (f.bolgeId && a.bolgeId !== f.bolgeId) return false;
  if (f.masaId && a.masaId !== f.masaId) return false;
  if (f.garsonId && a.garsonId !== f.garsonId) return false;
  if (f.tip && a.tip !== f.tip) return false;
  // İkram ayrı bir seçenek: "Kapanmış" dendiğinde parası tahsil edilen hesaplar
  // kastediliyor, hesabı sıfırlanmış olan değil.
  if (f.durum === "ikram" && !tamamiIkram(a)) return false;
  if (f.durum === "kapali" && (a.durum !== "kapali" || tamamiIkram(a))) return false;
  if (f.durum === "acik" && a.durum !== "acik") return false;
  if (f.durum === "iptal" && a.durum !== "iptal") return false;
  if (f.indirimli && a.indirim <= 0) return false;
  if (f.odemeTipi && !a.odemeler.some((o) => o.tip === f.odemeTipi)) return false;
  if (f.enAz != null && a.toplam < f.enAz) return false;
  if (f.enCok != null && a.toplam > f.enCok) return false;

  return true;
}

export type DetayTur = {
  sira: number;
  saat: string;
  garson: string;
  kalemler: SepetKalemi[];
};

export type DetayTahsilat = {
  id: number;
  tip: string;
  tutar: number;
  bahsis: number;
  olusturma: string;
};

/** Detay penceresinin ihtiyacı liste satırından fazlası: turlar ve saatler. */
export type AdisyonDetay = AnalizAdisyon & {
  turlar: DetayTur[];
  tahsilatlar: DetayTahsilat[];
  indirimAd: string;
  /** Hesap eksik kapatıldıysa borcun kime yazıldığı ve sebebi. */
  eksikKisi: string;
  eksikSebep: string;
  not: string;
  telefon: string;
  adres: string;
};

const DETAY_ALANLARI = `id, adisyon_no, tip, durum, iptal_sebep, acilis, kapanis, indirim, indirim_ad,
       ad, kisi_sayisi, not_metni, musteri_ad, musteri_telefon, adres, masa_id,
       eksik_kisi, eksik_sebep,
       masa:masalar (ad, bolge_id, bolgeler (ad)),
       acan:personel!adisyonlar_acan_id_fkey (id, ad),
       turlar (sira, olusturma, garson:personel!turlar_garson_id_fkey (ad),
               adisyon_kalemleri (id, ad, porsiyon, secimler, adet, fiyat, kdv_oran,
                                  durum, not_metni, indirim, indirim_ad)),
       tahsilatlar (id, tip, tutar, bahsis, olusturma)`;

export async function adisyonDetayi(adisyonId: number): Promise<AdisyonDetay | null> {
  const [{ data }, varsayilanKdv] = await Promise.all([
    supabase.from("adisyonlar").select(DETAY_ALANLARI).eq("id", adisyonId).maybeSingle(),
    varsayilanKdvOrani(),
  ]);
  if (!data) return null;

  const s = data as any;
  const turlar: DetayTur[] = ((s.turlar ?? []) as any[])
    .map((t) => ({
      sira: t.sira,
      saat: t.olusturma,
      garson: t.garson?.ad ? kisaAd(t.garson.ad) : "",
      kalemler: ((t.adisyon_kalemleri ?? []) as any[]).map((k) => ({
        id: k.id,
        ad: k.ad,
        porsiyon: k.porsiyon ?? undefined,
        secimler: k.secimler ?? undefined,
        adet: Number(k.adet),
        fiyat: Number(k.fiyat),
        kdvOran: k.kdv_oran ?? undefined,
        durum: (k.durum ?? "normal") as SepetKalemi["durum"],
        not: k.not_metni ?? undefined,
        indirim: Number(k.indirim ?? 0) || undefined,
        indirimAd: k.indirim_ad ?? undefined,
      })),
    }))
    .sort((a, b) => a.sira - b.sira);

  return {
    ...satiraCevir(s, varsayilanKdv),
    indirimAd: s.indirim_ad ?? "",
    eksikKisi: s.eksik_kisi ?? "",
    eksikSebep: s.eksik_sebep ?? "",
    not: s.not_metni ?? "",
    telefon: s.musteri_telefon ?? "",
    adres: s.adres ?? "",
    turlar,
    tahsilatlar: ((s.tahsilatlar ?? []) as any[])
      .map((t) => ({
        id: t.id,
        tip: t.tip,
        tutar: Number(t.tutar),
        bahsis: Number(t.bahsis ?? 0),
        olusturma: t.olusturma,
      }))
      .sort((a, b) => a.olusturma.localeCompare(b.olusturma)),
  };
}

/**
 * Kapanmış adisyonu yeniden açar. Masası hâlâ boşsa hesap kaldığı yerden devam
 * eder; masada başka bir adisyon açıldıysa eskisi geri alınamaz, yoksa iki
 * açık adisyon aynı masaya düşerdi.
 */
export async function adisyonAktifEt(adisyon: AnalizAdisyon) {
  if (adisyon.masaId) {
    const { data } = await supabase
      .from("adisyonlar")
      .select("id")
      .eq("masa_id", adisyon.masaId)
      .eq("durum", "acik")
      .maybeSingle();
    if (data) throw new Error("Bu masada açık bir adisyon var. Önce onu kapatın.");
  }

  const { error } = await supabase
    .from("adisyonlar")
    .update({ durum: "acik", kapanis: null, guncelleme: new Date().toISOString() })
    .eq("id", adisyon.id);
  if (error) throw new Error("Adisyon yeniden açılamadı.");
}

/**
 * Kapanmış hesabın ödeme tipini düzeltir: para kasada doğru, yalnız hangi
 * kalemden geldiği yanlış yazılmış. Tutara dokunulmuyor, işlem deftere geçiyor.
 */
export async function tahsilatTipiDuzelt(
  detay: AdisyonDetay,
  tahsilatId: number,
  yeniTip: string,
  sebep: string
) {
  const tahsilat = detay.tahsilatlar.find((t) => t.id === tahsilatId);
  if (!tahsilat) return;

  const { error } = await supabase
    .from("tahsilatlar")
    .update({ tip: yeniTip })
    .eq("id", tahsilatId);
  if (error) throw new Error("Ödeme tipi düzeltilemedi.");

  await denetimYaz([
    {
      islem: "tahsilat_tip_duzelt",
      adisyonId: detay.id,
      yer: detay.masaAd || TIP_ADLARI[detay.tip],
      konu: `${tahsilat.tip} → ${yeniTip}`,
      tutar: tahsilat.tutar,
      sebep,
    },
  ]);
}

export type OzetDilimi = { ad: string; tutar: number; adet: number };

export type AnalizOzeti = {
  ciro: number;
  adisyon: number;
  misafir: number;
  ortalama: number;
  kisiBasi: number;
  araToplam: number;
  indirim: number;
  ikram: number;
  matrah: number;
  kdv: number;
  /** Kuver ve garsoniyenin dönem toplamı; cironun içinde duruyor. */
  servis: number;
  bahsis: number;
  /** Kapanmamış adisyonlar ciroya girmiyor; ayrı gösteriliyor. */
  acik: number;
  acikTutar: number;
  /** Kapanan ciro + açık masalar: günün şu ana kadarki toplam işi. */
  toplamIs: number;
  /** Kapanan hesaplardan kasaya gerçekten giren para. */
  tahsilEdilen: number;
  /** Hesap kapandı ama tahsil edilmedi — ciroya yazılı, kasada yok. */
  eksikTahsilat: number;
  odemeler: OzetDilimi[];
  tipler: OzetDilimi[];
  saatler: { saat: number; tutar: number; adet: number }[];
  gider: number;
  net: number;
};

const TIP_ADLARI: Record<AdisyonTipi, string> = {
  masa: "Masa",
  gelal: "Gel Al",
  paket: "Paket",
};

export function analizOzeti(adisyonlar: AnalizAdisyon[], giderler: Masraf[]): AnalizOzeti {
  const kapanan = adisyonlar.filter((a) => a.durum === "kapali");
  const acikOlanlar = adisyonlar.filter((a) => a.durum === "acik");

  const topla = (liste: AnalizAdisyon[], alan: (a: AnalizAdisyon) => number) =>
    liste.reduce((t, a) => t + alan(a), 0);

  const ciro = topla(kapanan, (a) => a.toplam);
  const misafir = topla(kapanan, (a) => a.kisiSayisi);

  const odemeler = new Map<string, OzetDilimi>();
  for (const a of kapanan) {
    for (const o of a.odemeler) {
      const dilim = odemeler.get(o.tip) ?? { ad: o.tip, tutar: 0, adet: 0 };
      dilim.tutar += o.tutar;
      dilim.adet += 1;
      odemeler.set(o.tip, dilim);
    }
  }

  const tipler = new Map<AdisyonTipi, OzetDilimi>();
  for (const a of kapanan) {
    const dilim = tipler.get(a.tip) ?? { ad: TIP_ADLARI[a.tip], tutar: 0, adet: 0 };
    dilim.tutar += a.toplam;
    dilim.adet += 1;
    tipler.set(a.tip, dilim);
  }

  // Saat dökümü adisyonun kapandığı saate göre; yoğunluk grafiği hesabın
  // kapandığı anı değil masanın dolduğu saati sorsa açık masalar hiç sayılmazdı.
  const saatler = Array.from({ length: 24 }, (_, saat) => ({ saat, tutar: 0, adet: 0 }));
  for (const a of kapanan) {
    const saat = new Date(a.kapanis ?? a.acilis).getHours();
    saatler[saat].tutar += a.toplam;
    saatler[saat].adet += 1;
  }

  const gider = giderler.reduce((t, g) => t + g.tutar, 0);

  // Kapanışta eksik bırakılan tutar. Hesap kapandığı için ciroya yazılı ama
  // kasaya girmedi; ikisini ayırmazsak gün sonu kasa sayımı hep açık veriyor.
  const eksikTahsilat = topla(kapanan, (a) => Math.max(0, a.kalan));
  const acikTutar = topla(acikOlanlar, (a) => a.toplam);

  return {
    ciro,
    adisyon: kapanan.length,
    misafir,
    ortalama: kapanan.length ? ciro / kapanan.length : 0,
    kisiBasi: misafir ? ciro / misafir : 0,
    araToplam: topla(kapanan, (a) => a.araToplam),
    indirim: topla(kapanan, (a) => a.indirim),
    ikram: topla(kapanan, (a) => a.ikram),
    matrah: topla(kapanan, (a) => a.matrah),
    kdv: topla(kapanan, (a) => a.kdv),
    servis: topla(kapanan, (a) => a.kuver + a.garsoniye),
    bahsis: topla(kapanan, (a) => a.bahsis),
    acik: acikOlanlar.length,
    acikTutar,
    toplamIs: ciro + acikTutar,
    tahsilEdilen: ciro - eksikTahsilat,
    eksikTahsilat,
    odemeler: [...odemeler.values()].sort((a, b) => b.tutar - a.tutar),
    tipler: [...tipler.values()].sort((a, b) => b.tutar - a.tutar),
    saatler,
    gider,
    net: ciro - gider,
  };
}

export type UrunSatiri = {
  /** Ürün silinmişse kimlik yok; o zaman satış anındaki ad kimlik oluyor. */
  anahtar: string;
  ad: string;
  kategoriAd: string;
  kategoriRenk?: string;
  miktar: number;
  ciro: number;
  ikram: number;
  iptal: number;
};

export type UrunOzeti = {
  satirlar: UrunSatiri[];
  kategoriler: (OzetDilimi & { renk?: string })[];
  miktar: number;
  cesit: number;
  ciro: number;
  ikram: number;
};

export type UrunKategorisi = { ad: string; renk?: string };

/**
 * Ürün → kategori eşlemesi. Bir ürün birden çok kategoride olabiliyor; rapor tek
 * satır gösterdiği için ilki alınıyor (menüdeki kendi sırasına göre ilki).
 */
export async function urunKategorileri() {
  const [urn, kat] = await Promise.all([
    supabase.from("urun_kategorileri").select("urun_id, kategori_id, sira").order("sira"),
    supabase.from("kategoriler").select("id, ad, renk"),
  ]);

  const kategoriler = new Map<number, UrunKategorisi>();
  for (const k of kat.data ?? []) kategoriler.set(k.id, { ad: k.ad, renk: k.renk ?? undefined });

  const harita = new Map<number, UrunKategorisi>();
  for (const u of urn.data ?? []) {
    if (harita.has(u.urun_id)) continue;
    const k = kategoriler.get(u.kategori_id);
    if (k) harita.set(u.urun_id, k);
  }
  return harita;
}

const KATEGORISIZ = "Kategorisiz";

/**
 * Ürün dökümü. İptal ve ikram satılan sayılmıyor ama gözden de kaybolmuyor —
 * ciroyu bozmadan kendi sütunlarında duruyorlar; "neden az sattık" sorusunun
 * cevabı çoğu zaman orada.
 */
export function analizUrunleri(
  adisyonlar: AnalizAdisyon[],
  kategoriler: Map<number, UrunKategorisi>
): UrunOzeti {
  const tutar = (k: SepetKalemi) =>
    Math.max(0, Math.round((k.fiyat * k.adet - (k.indirim ?? 0)) * 100) / 100);

  const satirlar = new Map<string, UrunSatiri>();
  for (const a of adisyonlar) {
    if (a.durum !== "kapali") continue;
    for (const k of a.kalemler) {
      const anahtar = k.urunId ? `u${k.urunId}` : `a${k.ad}`;
      const kategori = k.urunId ? kategoriler.get(k.urunId) : undefined;
      const satir =
        satirlar.get(anahtar) ??
        ({
          anahtar,
          ad: k.ad,
          kategoriAd: kategori?.ad ?? KATEGORISIZ,
          kategoriRenk: kategori?.renk,
          miktar: 0,
          ciro: 0,
          ikram: 0,
          iptal: 0,
        } as UrunSatiri);

      if (k.durum === "ikram") satir.ikram += tutar(k);
      else if (k.durum === "iptal") satir.iptal += tutar(k);
      else {
        satir.miktar += k.adet;
        satir.ciro += tutar(k);
      }
      satirlar.set(anahtar, satir);
    }
  }

  const liste = [...satirlar.values()].sort((a, b) => b.ciro - a.ciro);

  const gruplar = new Map<string, OzetDilimi & { renk?: string }>();
  for (const s of liste) {
    const g = gruplar.get(s.kategoriAd) ?? {
      ad: s.kategoriAd,
      tutar: 0,
      adet: 0,
      renk: s.kategoriRenk,
    };
    g.tutar += s.ciro;
    g.adet += s.miktar;
    gruplar.set(s.kategoriAd, g);
  }

  return {
    satirlar: liste,
    kategoriler: [...gruplar.values()].sort((a, b) => b.tutar - a.tutar),
    miktar: liste.reduce((t, s) => t + s.miktar, 0),
    // Hiç satılmamış, yalnız ikram veya iptal edilmiş ürün "çeşit" sayılmıyor.
    cesit: liste.filter((s) => s.miktar > 0).length,
    ciro: liste.reduce((t, s) => t + s.ciro, 0),
    ikram: liste.reduce((t, s) => t + s.ikram, 0),
  };
}

export type PersonelSatiri = {
  anahtar: string;
  ad: string;
  /** Kendi açtığı adisyon sayısı — masayı açmak ayrı bir iş, ciro değil. */
  acilan: number;
  /** Ürün yazdığı adisyon sayısı; ciro buradan çıkıyor. */
  adisyon: number;
  adet: number;
  ciro: number;
  ikram: number;
  iptal: number;
};

export type PersonelOzeti = {
  satirlar: PersonelSatiri[];
  kisi: number;
  adet: number;
  ciro: number;
};

const BILINMEYEN = "Bilinmiyor";

/**
 * Personel dökümü. Ciro masayı açana değil ürünü yazana yazılıyor; bir masaya üç
 * garson sipariş girdiyse ciro üçe bölünüyor. Adisyonun tamamına verilen indirim
 * (ürüne değil hesaba verilen) kalemlere tutarları oranında dağıtılıyor —
 * yoksa personel ciroları toplamı özet ekranındaki ciroyu tutmuyor.
 */
export function analizPersoneli(adisyonlar: AnalizAdisyon[]): PersonelOzeti {
  const kalemTutari = (k: SepetKalemi) =>
    Math.max(0, Math.round((k.fiyat * k.adet - (k.indirim ?? 0)) * 100) / 100);

  const satirlar = new Map<string, PersonelSatiri>();
  const satir = (id: number | undefined, ad: string) => {
    const anahtar = id ? `p${id}` : `a${ad}`;
    const mevcut = satirlar.get(anahtar);
    if (mevcut) return mevcut;
    const yeni: PersonelSatiri = {
      anahtar,
      ad,
      acilan: 0,
      adisyon: 0,
      adet: 0,
      ciro: 0,
      ikram: 0,
      iptal: 0,
    };
    satirlar.set(anahtar, yeni);
    return yeni;
  };

  for (const a of adisyonlar) {
    if (a.durum !== "kapali") continue;

    satir(a.garsonId ?? undefined, a.garson || BILINMEYEN).acilan += 1;

    const satilanlar = a.kalemler.filter((k) => (k.durum ?? "normal") === "normal");
    const kalemToplami = satilanlar.reduce((t, k) => t + kalemTutari(k), 0);

    // İndirim paylaştırılırken kuruş artığı kaybolmasın diye kalan son kaleme
    // yazılıyor; dağıtımın toplamı her zaman indirimin kendisine eşit.
    let kalanIndirim = Math.min(a.indirim, kalemToplami);

    const dokunan = new Set<string>();

    // Kuver ve garsoniye belli bir ürünün değil masanın bedeli: masayı açanın
    // cirosuna yazılıyor ki personel toplamı özetteki ciroyu tutsun.
    const servis = a.kuver + a.garsoniye;
    if (servis > 0) {
      const acan = satir(a.garsonId ?? undefined, a.garson || BILINMEYEN);
      acan.ciro = Math.round((acan.ciro + servis) * 100) / 100;
      dokunan.add(acan.anahtar);
    }

    satilanlar.forEach((k, i) => {
      const s = satir(k.turGarsonId, k.turGarson || BILINMEYEN);
      const ham = kalemTutari(k);
      const pay =
        i === satilanlar.length - 1 || kalemToplami === 0
          ? kalanIndirim
          : Math.round(((ham / kalemToplami) * Math.min(a.indirim, kalemToplami)) * 100) / 100;
      kalanIndirim = Math.round((kalanIndirim - pay) * 100) / 100;

      s.ciro = Math.round((s.ciro + ham - pay) * 100) / 100;
      s.adet += k.adet;
      dokunan.add(s.anahtar);
    });

    for (const k of a.kalemler) {
      if (k.durum === "ikram" || k.durum === "iptal") {
        const s = satir(k.turGarsonId, k.turGarson || BILINMEYEN);
        if (k.durum === "ikram") s.ikram += kalemTutari(k);
        else s.iptal += kalemTutari(k);
        dokunan.add(s.anahtar);
      }
    }

    for (const anahtar of dokunan) {
      const s = satirlar.get(anahtar);
      if (s) s.adisyon += 1;
    }
  }

  const liste = [...satirlar.values()].sort((a, b) => b.ciro - a.ciro);
  return {
    satirlar: liste,
    kisi: liste.filter((s) => s.ciro > 0).length,
    adet: liste.reduce((t, s) => t + s.adet, 0),
    ciro: liste.reduce((t, s) => t + s.ciro, 0),
  };
}

export type GiderOzeti = {
  toplam: number;
  kayit: number;
  turler: OzetDilimi[];
  odemeler: OzetDilimi[];
};

export type OdenmezSatiri = {
  ad: string;
  adet: number;
  tutar: number;
  urunler: { ad: string; adet: number; tutar: number }[];
};

/**
 * İkramların kime gittiği. Kalem kalem toplanıyor: adisyonun tamamı ikram
 * edildiğinde de kalemlerin üstünde aynı ad duruyor, iki yol tek sayıda
 * birleşiyor. Kimse seçilmemişse "Belirtilmemiş" satırında toplanıyor —
 * gizlenmiyor, çünkü asıl bakılması gereken satır o.
 */
export function analizOdenmezleri(adisyonlar: AnalizAdisyon[]): OdenmezSatiri[] {
  const tutar = (k: SepetKalemi) =>
    Math.max(0, Math.round((k.fiyat * k.adet - (k.indirim ?? 0)) * 100) / 100);

  const satirlar = new Map<string, OdenmezSatiri>();

  for (const a of adisyonlar) {
    if (a.durum === "iptal") continue;

    for (const k of a.kalemler) {
      if (k.durum !== "ikram") continue;

      const ad = k.odenmezAd || "Belirtilmemiş";
      let satir = satirlar.get(ad);
      if (!satir) {
        satir = { ad, adet: 0, tutar: 0, urunler: [] };
        satirlar.set(ad, satir);
      }

      satir.adet += k.adet;
      satir.tutar = Math.round((satir.tutar + tutar(k)) * 100) / 100;

      const urun = satir.urunler.find((u) => u.ad === k.ad);
      if (urun) {
        urun.adet += k.adet;
        urun.tutar = Math.round((urun.tutar + tutar(k)) * 100) / 100;
      } else {
        satir.urunler.push({ ad: k.ad, adet: k.adet, tutar: tutar(k) });
      }
    }
  }

  for (const s of satirlar.values()) s.urunler.sort((a, b) => b.tutar - a.tutar);
  return [...satirlar.values()].sort((a, b) => b.tutar - a.tutar);
}

/** Giderin türe ve ödeme tipine göre dökümü; liste ekranda ayrıca duruyor. */
export function analizGiderOzeti(giderler: Masraf[]): GiderOzeti {
  const grupla = (alan: (g: Masraf) => string) => {
    const gruplar = new Map<string, OzetDilimi>();
    for (const g of giderler) {
      const ad = alan(g) || "Belirtilmemiş";
      const dilim = gruplar.get(ad) ?? { ad, tutar: 0, adet: 0 };
      dilim.tutar += g.tutar;
      dilim.adet += 1;
      gruplar.set(ad, dilim);
    }
    return [...gruplar.values()].sort((a, b) => b.tutar - a.tutar);
  };

  return {
    toplam: giderler.reduce((t, g) => t + g.tutar, 0),
    kayit: giderler.length,
    turler: grupla((g) => g.tipAd),
    odemeler: grupla((g) => odemeAdi(g.odemeTipi)),
  };
}

/** Dönemin denetim kayıtları — Denetim sekmesi buradan besleniyor. */
export function analizDenetimi(f: AnalizFiltre) {
  const { bas, bit } = donemAraligi(f);
  return denetimGetir(bas.toISOString(), bit.toISOString());
}

/**
 * Dönemin cari hareketleri. Adisyo'nun "Açık Hesap Hareketleri" raporu iki
 * tabloya ayrılıyor: borca yazılanlar ve müşteriden tahsil edilenler.
 */
export type CariHareketSatiri = {
  id: number;
  zaman: string;
  musteri: string;
  musteriNo: number;
  tip: string;
  borc: number;
  alacak: number;
  odemeTipi: string;
  adisyonId: number | null;
  aciklama: string;
  kisi: string;
};

export async function analizCariHareketleri(f: AnalizFiltre): Promise<CariHareketSatiri[]> {
  const { bas, bit } = donemAraligi(f);

  const { data } = await supabase
    .from("cari_hareketler")
    .select(
      `id, olusturma, tip, borc, alacak, odeme_tipi, adisyon_id, aciklama,
       musteri:musteri_id (ad, soyad, no),
       personel:personel_id (ad)`
    )
    .gte("olusturma", bas.toISOString())
    .lt("olusturma", bit.toISOString())
    .order("olusturma", { ascending: false })
    .limit(2000);

  return ((data as any[]) ?? []).map((s) => ({
    id: s.id,
    zaman: s.olusturma,
    musteri: `${s.musteri?.ad ?? ""} ${s.musteri?.soyad ?? ""}`.trim() || "—",
    musteriNo: s.musteri?.no ?? 0,
    tip: s.tip,
    borc: Number(s.borc ?? 0),
    alacak: Number(s.alacak ?? 0),
    odemeTipi: s.odeme_tipi ?? "",
    adisyonId: s.adisyon_id ?? null,
    aciklama: s.aciklama ?? "",
    kisi: s.personel?.ad ?? "",
  }));
}

/** Dönemin giderleri — özet ekranındaki net kâr satırı buna dayanıyor. */
export function analizGiderleri(f: AnalizFiltre) {
  const { bas, bit } = donemAraligi(f);
  return masraflariGetir(bas.toISOString(), bit.toISOString());
}

export type MutfakSuresiSatiri = {
  anahtar: string;
  ad: string;
  istasyonAd: string;
  adet: number;
  /** Saniye cinsinden; ekranda dakikaya çevriliyor. */
  ortalama: number;
  enUzun: number;
  /** Aşama açıksa toplam sürenin iki parçası — kapalıysa sıfır kalıyor. */
  ortalamaBekleme: number;
  ortalamaHazirlik: number;
  geciken: number;
};

export type MutfakSuresiOzeti = {
  satirlar: MutfakSuresiSatiri[];
  adet: number;
  ortalama: number;
  enUzun: number;
  geciken: number;
  /** Sıra/hazırlık ayrımı yalnız aşama açık olan istasyonlarda oluşuyor. */
  asamaliVar: boolean;
};

/**
 * Hazırlık süresi dökümü.
 *
 * Süre, turun mutfağa düştüğü an ile kalemin hazır işaretlendiği an arası.
 * Ölçtüğü şey "yemek kaç dakikada pişti" değil, "tezgâh kaç dakika sonra
 * hazır dedi" — mutfak tuşa basmayı unutursa ya da hepsini sonradan toplu
 * işaretlerse rakam gerçeğin üstünde çıkar. Ekranda bu uyarı yazıyor.
 *
 * Aşama açık istasyonda süre ikiye ayrılıyor: sırada bekleme (tur düştü,
 * hazırlığa alındı) ve hazırlanma (hazırlığa alındı, hazır oldu). Darboğazın
 * mutfakta mı yoksa sıranın kendisinde mi olduğunu ancak bu ayrım söylüyor.
 */
export async function mutfakSureleri(f: AnalizFiltre): Promise<MutfakSuresiOzeti> {
  const { bas, bit } = donemAraligi(f);
  const gecikmeSn = (ayarlar().mutfakGecikmeDk || 0) * 60;

  const [{ data }, istasyonlar, harita] = await Promise.all([
    supabase
      .from("turlar")
      .select(
        `olusturma,
         adisyon_kalemleri (urun_id, ad, durum, hazirlik_at, hazir_at)`
      )
      .gte("olusturma", bas.toISOString())
      .lt("olusturma", bit.toISOString())
      .limit(2000),
    istasyonlariGetir(),
    urunIstasyonlari(),
  ]);

  const istasyonAdi = new Map(istasyonlar.map((i) => [i.id, i.ad]));
  const satirlar = new Map<string, MutfakSuresiSatiri & { toplam: number; bekleme: number; beklemeAdet: number }>();
  let asamaliVar = false;

  for (const t of ((data as any[]) ?? [])) {
    const dusme = new Date(t.olusturma).getTime();
    for (const k of ((t.adisyon_kalemleri as any[]) ?? [])) {
      // Hazır işaretlenmemiş ve iptal edilmiş kalemin süresi yok.
      if (!k.hazir_at || (k.durum ?? "normal") === "iptal") continue;
      const sure = Math.max(0, Math.round((new Date(k.hazir_at).getTime() - dusme) / 1000));

      const anahtar = k.urun_id ? `u${k.urun_id}` : `a${k.ad}`;
      const satir =
        satirlar.get(anahtar) ??
        {
          anahtar,
          ad: k.ad,
          istasyonAd: istasyonAdi.get(harita.get(k.urun_id) as number) ?? "—",
          adet: 0,
          ortalama: 0,
          enUzun: 0,
          ortalamaBekleme: 0,
          ortalamaHazirlik: 0,
          geciken: 0,
          toplam: 0,
          bekleme: 0,
          beklemeAdet: 0,
        };

      satir.adet += 1;
      satir.toplam += sure;
      satir.enUzun = Math.max(satir.enUzun, sure);
      if (gecikmeSn > 0 && sure >= gecikmeSn) satir.geciken += 1;

      if (k.hazirlik_at) {
        asamaliVar = true;
        satir.bekleme += Math.max(0, Math.round((new Date(k.hazirlik_at).getTime() - dusme) / 1000));
        satir.beklemeAdet += 1;
      }

      satirlar.set(anahtar, satir);
    }
  }

  let adet = 0;
  let toplam = 0;
  let enUzun = 0;
  let geciken = 0;
  const liste: MutfakSuresiSatiri[] = [];

  for (const s of satirlar.values()) {
    s.ortalama = Math.round(s.toplam / s.adet);
    if (s.beklemeAdet) {
      s.ortalamaBekleme = Math.round(s.bekleme / s.beklemeAdet);
      s.ortalamaHazirlik = Math.max(0, s.ortalama - s.ortalamaBekleme);
    }
    adet += s.adet;
    toplam += s.toplam;
    enUzun = Math.max(enUzun, s.enUzun);
    geciken += s.geciken;
    const { toplam: _t, bekleme: _b, beklemeAdet: _ba, ...temiz } = s;
    liste.push(temiz);
  }

  // En uzun süren üstte: raporun sorusu "nerede tıkanıyoruz".
  liste.sort((a, b) => b.ortalama - a.ortalama);

  return {
    satirlar: liste,
    adet,
    ortalama: adet ? Math.round(toplam / adet) : 0,
    enUzun,
    geciken,
    asamaliVar,
  };
}
