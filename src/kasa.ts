import { acikOturum } from "./oturum";
import { supabase } from "./supabase";

export type Vardiya = {
  id: number;
  acan: string;
  acilis: string;
  acilisTutar: number;
  acilisNot: string;
  kapatan: string;
  kapanis: string | null;
  sayilanTutar: number | null;
  kapanisNot: string;
};

export type Hareket = {
  id: number;
  tip: "giris" | "cikis";
  tutar: number;
  aciklama: string;
  kisi: string;
  olusturma: string;
};

/** Açık vardiyanın o anki tablosu — kasa penceresi bunu gösteriyor. */
export type KasaDurumu = {
  vardiya: Vardiya | null;
  hareketler: Hareket[];
  /** Vardiya açıldıktan sonra alınan, kasaya giren (nakit) tahsilatlar. */
  nakitSatis: number;
  giris: number;
  cikis: number;
  /** Kasada olması gereken: açılış + nakit satış + giriş − çıkış. */
  beklenen: number;
};

const ALANLAR = `id, acilis, acilis_tutar, acilis_not, kapanis, sayilan_tutar, kapanis_not,
                 acan:acan_id (ad), kapatan:kapatan_id (ad)`;

function vardiyayaCevir(s: any): Vardiya {
  return {
    id: s.id,
    acan: s.acan?.ad ?? "",
    acilis: s.acilis,
    acilisTutar: Number(s.acilis_tutar ?? 0),
    acilisNot: s.acilis_not ?? "",
    kapatan: s.kapatan?.ad ?? "",
    kapanis: s.kapanis,
    sayilanTutar: s.sayilan_tutar == null ? null : Number(s.sayilan_tutar),
    kapanisNot: s.kapanis_not ?? "",
  };
}

export async function acikVardiya(): Promise<Vardiya | null> {
  const { data } = await supabase
    .from("kasa_vardiyalari")
    .select(ALANLAR)
    .is("kapanis", null)
    .maybeSingle();
  return data ? vardiyayaCevir(data) : null;
}

// Kasaya hangi ödeme tipinin para koyduğu ayarda işaretli; nakit satış toplamı
// o tiplerin adlarına bakıyor. Tahsilat satırı ödeme tipinin kimliğini değil
// satış anındaki adını taşıyor — tip sonradan silinse bile geçmiş bozulmasın.
async function kasayaGirenTipler(): Promise<string[]> {
  const { data } = await supabase
    .from("odeme_tipleri")
    .select("ad")
    .eq("kasaya_girer", true);
  return ((data as any[]) ?? []).map((t) => t.ad);
}

export async function kasaDurumu(): Promise<KasaDurumu> {
  const vardiya = await acikVardiya();
  if (!vardiya) {
    return { vardiya: null, hareketler: [], nakitSatis: 0, giris: 0, cikis: 0, beklenen: 0 };
  }

  const tipler = await kasayaGirenTipler();
  const [{ data: hareketVeri }, { data: tahsilatVeri }] = await Promise.all([
    supabase
      .from("kasa_hareketleri")
      .select("id, tip, tutar, aciklama, olusturma, kisi:kisi_id (ad)")
      .eq("vardiya_id", vardiya.id)
      .order("olusturma"),
    tipler.length
      ? supabase
          .from("tahsilatlar")
          .select("tutar")
          .in("tip", tipler)
          .gte("olusturma", vardiya.acilis)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const hareketler: Hareket[] = ((hareketVeri as any[]) ?? []).map((h) => ({
    id: h.id,
    tip: h.tip,
    tutar: Number(h.tutar),
    aciklama: h.aciklama ?? "",
    kisi: h.kisi?.ad ?? "",
    olusturma: h.olusturma,
  }));

  const topla = (tip: "giris" | "cikis") =>
    hareketler.filter((h) => h.tip === tip).reduce((t, h) => t + h.tutar, 0);

  const nakitSatis = ((tahsilatVeri as any[]) ?? []).reduce((t, o) => t + Number(o.tutar), 0);
  const giris = topla("giris");
  const cikis = topla("cikis");

  return {
    vardiya,
    hareketler,
    nakitSatis,
    giris,
    cikis,
    beklenen: vardiya.acilisTutar + nakitSatis + giris - cikis,
  };
}

export async function kasaAc(acilisTutar: number, not: string) {
  const kisi = acikOturum();
  const { error } = await supabase.from("kasa_vardiyalari").insert({
    acan_id: kisi?.id ?? null,
    acilis_tutar: acilisTutar,
    acilis_not: not.trim() || null,
  });
  // Tek açık vardiya kuralı veritabanında; başka bir terminalde kasa açılmışsa
  // ekran onu bilmeden ikincisini açmaya çalışabiliyor.
  if (error) {
    throw new Error(
      error.code === "23505" ? "Kasa zaten açık." : "Kasa açılamadı."
    );
  }
}

export async function kasaKapat(vardiyaId: number, sayilanTutar: number, not: string) {
  const kisi = acikOturum();
  const { error } = await supabase
    .from("kasa_vardiyalari")
    .update({
      kapatan_id: kisi?.id ?? null,
      kapanis: new Date().toISOString(),
      sayilan_tutar: sayilanTutar,
      kapanis_not: not.trim() || null,
    })
    .eq("id", vardiyaId)
    .is("kapanis", null);
  if (error) throw new Error("Kasa kapatılamadı.");
}

export async function hareketEkle(
  vardiyaId: number,
  tip: "giris" | "cikis",
  tutar: number,
  aciklama: string
) {
  const kisi = acikOturum();
  const { error } = await supabase.from("kasa_hareketleri").insert({
    vardiya_id: vardiyaId,
    tip,
    tutar,
    aciklama: aciklama.trim() || null,
    kisi_id: kisi?.id ?? null,
  });
  if (error) throw new Error("İşlem kaydedilemedi.");
}

/** Kasa kapatılmadan önce sorulur: açık adisyon varken gün kapanmaz. */
export async function acikAdisyonSayisi() {
  const { count } = await supabase
    .from("adisyonlar")
    .select("id", { count: "exact", head: true })
    .eq("durum", "acik");
  return count ?? 0;
}
