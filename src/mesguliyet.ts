import { durumluModul } from "./sicakGuncelleme";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { acikOturum, yetkiVar } from "./oturum";
import { kisaAd } from "./personel";
import { baglantiVar } from "./baglanti";
import { useCanli } from "./canli";

/**
 * Masa meşguliyeti — "bu masada şu an biri var" işareti.
 *
 * Kilit değil işaret: yetkili devralabiliyor. Sert kilit gerçek işletmede
 * aksatıyor — garson ekranı açık unutur, kasiyer müşteriyi kapıda bekletir.
 * Siparişin kaybolmasına karşı asıl koruma burada değil, adisyonlar.ts'teki
 * "yalnız gördüğünü sil" kuralında; bu katmanın işi insanları birbirinden
 * haberdar etmek.
 */

/** Ekran "buradayım" deme aralığı. */
const KALP_ATISI = 20_000;
/** Bu kadar süredir ses çıkmayan işaret ölü sayılıyor. */
export const OLU_SURE = 60_000;

export type Mesguliyet = {
  masaId: number;
  kisiId: number | null;
  ad: string;
  guncelleme: string;
};

/** Diri işaretler; ölüler burada eleniyor, ekranların süre bilmesi gerekmiyor. */
export async function mesguliyetleriGetir(): Promise<Record<number, Mesguliyet>> {
  const sinir = new Date(Date.now() - OLU_SURE).toISOString();
  const { data, error } = await supabase
    .from("masa_mesguliyet")
    .select("masa_id, kisi_id, kisi_ad, guncelleme")
    .gte("guncelleme", sinir);
  if (error) console.error("Masa meşguliyetleri okunamadı:", error.message);

  const liste: Record<number, Mesguliyet> = {};
  for (const s of (data as any[]) ?? []) {
    liste[s.masa_id] = {
      masaId: s.masa_id,
      kisiId: s.kisi_id,
      ad: s.kisi_ad,
      guncelleme: s.guncelleme,
    };
  }
  return liste;
}

async function isaretiKoy(masaId: number) {
  const kisi = acikOturum();
  const { error } = await supabase.from("masa_mesguliyet").upsert(
    {
      masa_id: masaId,
      kisi_id: kisi?.id ?? null,
      kisi_ad: kisaAd(kisi?.ad ?? "") || "Bilinmeyen",
      guncelleme: new Date().toISOString(),
    },
    { onConflict: "masa_id" }
  );
  // Sessiz düşerse masa hiç meşgul görünmüyor ve sebebi anlaşılmıyor.
  if (error) console.error("Masa meşguliyeti yazılamadı:", error.message);
}

/**
 * Kalp atışı yalnız kendi satırımızı tazeliyor. Körü körüne yazsaydı masayı
 * geri çalardı: biri devralır, yirmi saniye sonra öteki farkında olmadan geri
 * alır, ikisine birden "devraldı" uyarısı giderdi. Satıra dokunulamıyorsa masa
 * elimizden alınmış demektir — bu, devralmanın en hızlı haberi.
 */
async function kalpAtisi(masaId: number, kisiId: number) {
  const { data } = await supabase
    .from("masa_mesguliyet")
    .update({ guncelleme: new Date().toISOString() })
    .eq("masa_id", masaId)
    .eq("kisi_id", kisiId)
    .select("masa_id");
  return ((data as any[]) ?? []).length > 0;
}

/** Masa bizdeyse bırakılıyor; başkasına geçtiyse onun işaretine dokunulmuyor. */
async function isaretiKaldir(masaId: number, kisiId: number) {
  await supabase
    .from("masa_mesguliyet")
    .delete()
    .eq("masa_id", masaId)
    .eq("kisi_id", kisiId);
}

/**
 * Masa ekranı açık olduğu sürece işareti diri tutuyor, ekrandan çıkınca
 * kaldırıyor. Ekran arkaya alınınca (telefon cebe girince) kalp atışı duruyor:
 * masa bir dakika içinde kendiliğinden serbest kalıyor, garsonun geri
 * dönmesi beklenmiyor.
 *
 * Çevrimdışıyken hiç denenmiyor — işaret sunucuda yaşıyor, bağlantı yoksa
 * konulamıyor. Kalem kaybına karşı koruma zaten ayrı katmanda.
 */
export function useMasayiTut(masaId: number | null) {
  // Masa elimizden alındıysa devralanın adı; ekran bunu görünce uyarıyor.
  const [devralan, setDevralan] = useState<string | null>(null);

  // Masanın kimde olduğunu sorup sonucu ekrana bildiriyor. İki yerden
  // çağrılıyor: canlı yayın haber verdiğinde (anında) ve kalp atışı satıra
  // dokunamadığında (en geç yirmi saniye). İkinci yol yedek — canlı yayın
  // kurulmamışsa ya da düşmüşse devralma sessiz kalmasın.
  const sahibiSor = async () => {
    if (masaId === null) return;
    const { data } = await supabase
      .from("masa_mesguliyet")
      .select("kisi_id, kisi_ad")
      .eq("masa_id", masaId)
      .maybeSingle();
    const sahip = data as { kisi_id: number | null; kisi_ad: string } | null;
    const benimId = acikOturum()?.id;
    setDevralan(sahip && sahip.kisi_id !== benimId ? sahip.kisi_ad : null);
  };

  useEffect(() => {
    if (masaId === null) return;
    const kisiId = acikOturum()?.id;
    if (!kisiId) return;

    let birakildi = false;
    let bizde = false;

    const vur = async () => {
      if (birakildi || document.hidden || !baglantiVar()) return;
      // İlk giriş masayı üstümüze alıyor; sonraki atışlar yalnız tazeliyor.
      if (!bizde) {
        await isaretiKoy(masaId).catch(() => {});
        bizde = true;
        return;
      }
      // Masa alınmışsa atış duruyor. Yeniden konulsaydı geri çalmış olurduk;
      // devralanı masadan atmak devralmanın kendisini anlamsız kılardı.
      const duruyor = await kalpAtisi(masaId, kisiId).catch(() => true);
      if (duruyor) return;
      birakildi = true;
      sahibiSor().catch(() => {});
    };

    vur();
    const zaman = setInterval(vur, KALP_ATISI);
    // Sekmeye geri dönüldüğünde bir sonraki atışı beklemeden işaret tazeleniyor.
    document.addEventListener("visibilitychange", vur);

    return () => {
      birakildi = true;
      clearInterval(zaman);
      document.removeEventListener("visibilitychange", vur);
      if (baglantiVar()) isaretiKaldir(masaId, kisiId).catch(() => {});
    };
  }, [masaId]);

  // Devralma sessiz olmamalı: kişi hâlâ ekranda sipariş giriyor olabilir.
  useCanli(["masa_mesguliyet"], () => {
    sahibiSor().catch(() => {});
  });

  return devralan;
}

/**
 * Devralma: masa çağırana geçiyor, öteki kişinin ekranı masadan çıkıyor.
 * Başkasının işini bölen bir karar olduğu için yetkiye bağlı — uyarıyı herkes
 * görüyor, devralmayı yalnız yetkisi olan yapabiliyor.
 */
export const devralabilir = () => yetkiVar("masa.devral");

export async function masayiDevral(masaId: number) {
  await isaretiKoy(masaId);
}

/**
 * Masa ızgarasının okuduğu liste. Kendi işaretimiz elenmiş geliyor: kişi kendi
 * açtığı masayı "meşgul" görmemeli.
 */
export function useMesguliyetler() {
  const [liste, setListe] = useState<Record<number, Mesguliyet>>({});

  const oku = () => {
    if (!baglantiVar()) return;
    mesguliyetleriGetir()
      .then((m) => {
        const benimId = acikOturum()?.id;
        const suzulmus: Record<number, Mesguliyet> = {};
        for (const [masaId, kayit] of Object.entries(m)) {
          if (kayit.kisiId && kayit.kisiId === benimId) continue;
          suzulmus[Number(masaId)] = kayit;
        }
        setListe(suzulmus);
      })
      .catch(() => {});
  };

  // Başkası masaya girip çıktığında ızgara anında değişiyor.
  useCanli(["masa_mesguliyet"], oku);

  // Ölme olay üretmiyor, sadece zaman geçiyor: telefonun pili bittiyse kimse
  // "bıraktım" demiyor. Onun için liste ayrıca aralıklı tazeleniyor.
  useEffect(() => {
    oku();
    const zaman = setInterval(oku, KALP_ATISI);
    return () => clearInterval(zaman);
  }, []);

  return liste;
}

// Modül kendi durumunu bellekte tutuyor: sıcak güncelleme yerine tam yenileme.
durumluModul(import.meta.hot);
