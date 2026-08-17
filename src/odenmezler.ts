import { supabase } from "./supabase";

/**
 * Ödenmezler: ikramın ve personel yemeğinin kime yazıldığı.
 *
 * Personel tablosuna bağlanmıyor — ödenmez yalnız çalışan olmuyor (ev sahibi,
 * tedarikçi, sürekli müşteri) ve işten ayrılanın geçmiş ikramları listede
 * kalmalı. Personelden toplu aktarım var, bağ yok.
 */

export type Odenmez = {
  id: number;
  ad: string;
  unvan: string;
  aktif: boolean;
  sira: number;
};

export async function odenmezleriGetir(hepsi = false): Promise<Odenmez[]> {
  let sorgu = supabase.from("odenmezler").select("id, ad, unvan, aktif, sira");
  if (!hepsi) sorgu = sorgu.eq("aktif", true);
  const { data } = await sorgu.order("sira").order("ad");

  return ((data as any[]) ?? []).map((o) => ({
    id: o.id,
    ad: o.ad,
    unvan: o.unvan ?? "",
    aktif: o.aktif,
    sira: o.sira,
  }));
}

export async function odenmezKaydet(
  id: number | null,
  alanlar: { ad: string; unvan: string; aktif: boolean },
  sira = 0
) {
  const satir = {
    ad: alanlar.ad.trim(),
    unvan: alanlar.unvan.trim() || null,
    aktif: alanlar.aktif,
    ...(id ? {} : { sira }),
  };

  const { error } = id
    ? await supabase.from("odenmezler").update(satir).eq("id", id)
    : await supabase.from("odenmezler").insert(satir);

  if (error) {
    throw new Error(
      error.code === "23505" ? "Bu ad zaten listede var." : "Ödenmez kaydedilemedi."
    );
  }
}

/**
 * Silmek yerine pasife almak doğru yol: geçmiş ikramlar bu satıra bağlı.
 * Hiç kullanılmamış kayıt gerçekten siliniyor — yanlış yazılan ad listede
 * ölü satır olarak kalmasın.
 */
export async function odenmezSil(id: number) {
  const [kalem, adisyon] = await Promise.all([
    supabase
      .from("adisyon_kalemleri")
      .select("id", { count: "exact", head: true })
      .eq("odenmez_id", id),
    supabase
      .from("adisyonlar")
      .select("id", { count: "exact", head: true })
      .eq("odenmez_id", id),
  ]);

  if ((kalem.count ?? 0) + (adisyon.count ?? 0) > 0) {
    const { error } = await supabase
      .from("odenmezler")
      .update({ aktif: false })
      .eq("id", id);
    if (error) throw new Error("Ödenmez pasife alınamadı.");
    return "pasif" as const;
  }

  const { error } = await supabase.from("odenmezler").delete().eq("id", id);
  if (error) throw new Error("Ödenmez silinemedi.");
  return "silindi" as const;
}

/**
 * Personel listesinden toplu aktarım. Aynı adı ikinci kez eklemiyor: liste
 * elle de büyüyor, aktarım her çalıştığında yalnız eksikleri tamamlıyor.
 */
export async function personeldenAktar(): Promise<number> {
  const [{ data: kisiler }, mevcut] = await Promise.all([
    supabase.from("personel").select("ad, roller (ad)").eq("aktif", true),
    odenmezleriGetir(true),
  ]);

  const adlar = new Set(mevcut.map((o) => o.ad.toLocaleLowerCase("tr")));
  const yeniler = ((kisiler as any[]) ?? [])
    .filter((k) => k.ad && !adlar.has(String(k.ad).toLocaleLowerCase("tr")))
    .map((k) => ({ ad: k.ad, unvan: k.roller?.ad ?? null }));

  if (yeniler.length === 0) return 0;

  const { error } = await supabase.from("odenmezler").insert(yeniler);
  if (error) throw new Error("Personel aktarılamadı.");
  return yeniler.length;
}

/* ---------- Excel aktarımı ---------- */

// Liste çoğu işletmeye dışarıdan geliyor (personel listesi, muhasebeci dosyası).
// Menüdeki aktarımın küçük kardeşi: aynı mantık, dört sütuna sığdığı için ayrı
// bir dosya açmaya gerek yok.
export const ODENMEZ_BASLIKLARI = ["No", "Ad Soyad", "Unvan", "Listede Görünsün"] as const;

export const ODENMEZ_SUTUNLARI = [7, 24, 18, 17];

type Hucre = import("write-excel-file/browser").CellObject | null;

export function odenmezTablosu(liste: Odenmez[]) {
  const satirlar: Hucre[][] = [
    ODENMEZ_BASLIKLARI.map((b): Hucre => ({ value: b, type: String, fontWeight: "bold" })),
  ];

  for (const o of liste) {
    satirlar.push([
      { value: o.id, type: Number },
      { value: o.ad, type: String },
      o.unvan ? { value: o.unvan, type: String } : null,
      { value: o.aktif ? "Evet" : "Hayır", type: String },
    ]);
  }

  return satirlar;
}

export type OdenmezPlani = {
  yeniler: { ad: string; unvan: string; aktif: boolean }[];
  guncellenecekler: { id: number; ad: string; unvan: string; aktif: boolean }[];
  degismeyen: number;
  hatalar: { satir: number; mesaj: string }[];
};

const kucuk = (s: string) => s.trim().toLocaleLowerCase("tr");
const hucre = (v: unknown) => (v == null ? "" : String(v).trim());

// "Hayır", "yok", "0", "false" — hepsi pasif demek. Boş bırakılırsa aktif kabul
// ediliyor; dosyayı elle yazan kişi bu sütunu çoğu zaman hiç doldurmuyor.
const aktifMi = (s: string) => {
  const v = kucuk(s);
  if (!v) return true;
  return !["hayır", "hayir", "yok", "pasif", "0", "false", "kapalı", "kapali"].includes(v);
};

export function odenmezPlaniHazirla(tablo: unknown[][], mevcut: Odenmez[]): OdenmezPlani {
  const dolu = tablo.filter((s) => s.some((h) => hucre(h) !== ""));
  const plan: OdenmezPlani = { yeniler: [], guncellenecekler: [], degismeyen: 0, hatalar: [] };
  if (!dolu.length) return plan;

  const basliklar = dolu[0].map((b) => kucuk(hucre(b)));
  const yeri = (ad: string) => basliklar.indexOf(kucuk(ad));
  const sutun = {
    no: yeri("No"),
    ad: yeri("Ad Soyad"),
    unvan: yeri("Unvan"),
    aktif: yeri("Listede Görünsün"),
  };

  // Aynı ad dosyada iki kez geçerse ikincisi atlanır — hangisinin doğru olduğu
  // belli değil, sessizce birini seçmek yerine gösteriyoruz.
  const gorulen = new Set<string>();

  dolu.slice(1).forEach((satir, i) => {
    const satirNo = i + 2;
    const oku = (yer: number) => (yer >= 0 ? hucre(satir[yer]) : "");

    const ad = oku(sutun.ad);
    if (!ad) {
      plan.hatalar.push({ satir: satirNo, mesaj: "Ad boş" });
      return;
    }

    const unvan = oku(sutun.unvan);
    const aktif = aktifMi(oku(sutun.aktif));

    const noMetni = oku(sutun.no);
    let kayit: Odenmez | undefined;

    if (noMetni) {
      const no = Number(noMetni);
      if (!Number.isInteger(no)) {
        plan.hatalar.push({ satir: satirNo, mesaj: `"${ad}" — no sayı değil` });
        return;
      }
      kayit = mevcut.find((o) => o.id === no);
      if (!kayit) {
        plan.hatalar.push({ satir: satirNo, mesaj: `"${ad}" — ${no} numaralı kayıt listede yok` });
        return;
      }
    } else {
      kayit = mevcut.find((o) => kucuk(o.ad) === kucuk(ad));
    }

    const anahtar = kayit ? `no:${kayit.id}` : `ad:${kucuk(ad)}`;
    if (gorulen.has(anahtar)) {
      plan.hatalar.push({ satir: satirNo, mesaj: `"${ad}" dosyada birden fazla kez geçiyor` });
      return;
    }
    gorulen.add(anahtar);

    if (!kayit) {
      plan.yeniler.push({ ad, unvan, aktif });
      return;
    }

    if (kayit.ad === ad && kayit.unvan === unvan && kayit.aktif === aktif) {
      plan.degismeyen++;
      return;
    }

    plan.guncellenecekler.push({ id: kayit.id, ad, unvan, aktif });
  });

  return plan;
}

export async function odenmezPlaniYaz(plan: OdenmezPlani, sonSira: number) {
  if (plan.yeniler.length) {
    const { error } = await supabase.from("odenmezler").insert(
      plan.yeniler.map((y, i) => ({
        ad: y.ad,
        unvan: y.unvan || null,
        aktif: y.aktif,
        sira: sonSira + i + 1,
      }))
    );
    if (error) {
      throw new Error(
        error.code === "23505"
          ? "Dosyadaki bir ad listede zaten var, yazılamadı."
          : "Yeni kayıtlar yazılamadı."
      );
    }
  }

  for (const g of plan.guncellenecekler) {
    const { error } = await supabase
      .from("odenmezler")
      .update({ ad: g.ad, unvan: g.unvan || null, aktif: g.aktif })
      .eq("id", g.id);
    if (error) throw new Error(`"${g.ad}" güncellenemedi.`);
  }
}
