import { supabase } from "./supabase";
import type { Bolge, Masa } from "./types";

const MASA_ALANLARI =
  "id, bolge_id, ad, sira, kapasite, aktif, konum_x, konum_y, genislik, yukseklik, sekil";

function masayaCevir(m: any): Masa {
  return {
    id: m.id,
    bolgeId: m.bolge_id,
    ad: m.ad,
    sira: m.sira,
    kapasite: m.kapasite ?? undefined,
    aktif: m.aktif,
    konumX: m.konum_x ?? undefined,
    konumY: m.konum_y ?? undefined,
    genislik: m.genislik ?? undefined,
    yukseklik: m.yukseklik ?? undefined,
    sekil: m.sekil ?? "kare",
  };
}

export async function bolgeleriGetir(): Promise<Bolge[]> {
  const [blg, msa] = await Promise.all([
    supabase.from("bolgeler").select("id, ad, sira").order("sira"),
    supabase.from("masalar").select(MASA_ALANLARI).order("sira"),
  ]);

  const masalar = ((msa.data ?? []) as any[]).map(masayaCevir);
  return ((blg.data ?? []) as any[]).map((b) => ({
    id: b.id,
    ad: b.ad,
    sira: b.sira,
    masalar: masalar.filter((m) => m.bolgeId === b.id),
  }));
}

export async function masaGetir(id: number): Promise<Masa | null> {
  const { data } = await supabase.from("masalar").select(MASA_ALANLARI).eq("id", id).maybeSingle();
  return data ? masayaCevir(data) : null;
}

export async function bolgeEkle(ad: string, sira: number): Promise<number> {
  const { data } = await supabase.from("bolgeler").insert({ ad, sira }).select("id").single();
  return (data as any).id;
}

export async function bolgeGuncelle(id: number, alanlar: Partial<{ ad: string; sira: number }>) {
  await supabase.from("bolgeler").update(alanlar).eq("id", id);
}

// Bölge silinince masaları da gider (veritabanında cascade); üstünde açık
// adisyon olan masa varsa ekran zaten silmeye izin vermez.
export async function bolgeSil(id: number) {
  await supabase.from("bolgeler").delete().eq("id", id);
}

type MasaAlanlari = {
  ad: string;
  sira: number;
  kapasite: number | null;
  sekil: string;
  bolge_id: number;
};

export async function masaEkle(bolgeId: number, alanlar: Partial<MasaAlanlari> & { ad: string }) {
  const { data } = await supabase
    .from("masalar")
    .insert({ bolge_id: bolgeId, ...alanlar })
    .select("id")
    .single();
  return (data as any).id as number;
}

// Toplu ekleme: "Masa 1, Masa 2, ..." — 20 masalı bir bölgeyi tek tek girmek
// yerine ön ek ve adet veriliyor.
export async function topluMasaEkle(
  bolgeId: number,
  onEk: string,
  adet: number,
  baslangicSira: number,
  sekil: string
) {
  const satirlar = Array.from({ length: adet }, (_, i) => ({
    bolge_id: bolgeId,
    ad: `${onEk} ${i + 1}`.trim(),
    sira: baslangicSira + i,
    sekil,
  }));
  await supabase.from("masalar").insert(satirlar);
}

export async function masaGuncelle(id: number, alanlar: Partial<MasaAlanlari>) {
  await supabase.from("masalar").update(alanlar).eq("id", id);
}

export async function masaSil(id: number) {
  await supabase.from("masalar").delete().eq("id", id);
}

// Silmeden önce sorulur: üstünde açık adisyon olan masa silinemez.
export async function acikAdisyonluMasalar(masaIdler: number[]): Promise<Set<number>> {
  if (!masaIdler.length) return new Set();
  const { data } = await supabase
    .from("adisyonlar")
    .select("masa_id")
    .eq("durum", "acik")
    .in("masa_id", masaIdler);
  return new Set(((data as any[]) ?? []).map((a) => a.masa_id));
}
