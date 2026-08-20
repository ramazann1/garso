import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Canlı tazeleme. Bir masaya kalem eklendiğinde başka bir cihazdaki ekranın
 * bunu kendiliğinden görmesi için: Supabase "şu tablo değişti" diye küçük bir
 * haber yolluyor, ekran da kendi okumasını tekrarlıyor. Haber verinin kendisini
 * taşımıyor; yük, haberi alınca yaptığımız sorgudan geliyor. Onun için asıl iş
 * burada değil, aşağıdaki dizginlerde: art arda gelen haberler tek tazelemede
 * birleşiyor ve arkada kalan ekran hiç sorgu yapmıyor.
 */

/** Ekranların dinlediği tablolar. Yeni tablo eklemek serbest, yazımı tutsun. */
export type CanliTablo =
  | "adisyonlar"
  | "adisyon_kalemleri"
  | "tahsilatlar"
  | "turlar"
  | "masalar"
  | "kasa_hareketleri"
  | "kasa_vardiyalari"
  | "masraflar"
  | "yazdirma_kuyrugu"
  | "masa_mesguliyet";

type Dinleyici = () => void;

// Aynı tabloyu üç ekran birden dinleyebiliyor; her biri için ayrı bağlantı
// açmak yerine tabloya tek kanal açılıp haber içeride dağıtılıyor. Son ekran
// da kapanınca kanal kapanıyor.
const dinleyiciler = new Map<CanliTablo, Set<Dinleyici>>();
const kanallar = new Map<CanliTablo, RealtimeChannel>();

function aboneOl(tablo: CanliTablo, dinleyici: Dinleyici) {
  let kume = dinleyiciler.get(tablo);
  if (!kume) {
    kume = new Set();
    dinleyiciler.set(tablo, kume);
    kanallar.set(
      tablo,
      supabase
        .channel(`canli-${tablo}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: tablo },
          () => dinleyiciler.get(tablo)?.forEach((d) => d())
        )
        .subscribe()
    );
  }
  kume.add(dinleyici);

  return () => {
    const k = dinleyiciler.get(tablo);
    if (!k) return;
    k.delete(dinleyici);
    if (k.size > 0) return;
    const kanal = kanallar.get(tablo);
    if (kanal) supabase.removeChannel(kanal);
    kanallar.delete(tablo);
    dinleyiciler.delete(tablo);
  };
}

/** İş ekranı: masa, sipariş, istasyon. Değişikliği hemen görmesi gerekiyor. */
export const HIZLI = 400;
/** Bakma ekranı: satış, analiz, kasa. Sayılar altından kaymasın diye sakin. */
export const SAKIN = 4000;

/**
 * @param tablolar dinlenecek tablolar
 * @param yenile ekranın kendi okuma fonksiyonu
 * @param gecikme haber ile tazeleme arasındaki bekleme; aynı zamanda iki
 *   tazeleme arasındaki en kısa süre (HIZLI ya da SAKIN)
 */
export function useCanli(
  tablolar: CanliTablo[],
  yenile: () => void,
  gecikme: number = HIZLI
) {
  // Ekran her çizildiğinde yeni bir fonksiyon geliyor; aboneliğin bundan
  // etkilenmemesi için güncel hâli kutuda tutuluyor.
  const yenileRef = useRef(yenile);
  yenileRef.current = yenile;

  const anahtar = tablolar.join(",");

  useEffect(() => {
    let zaman: ReturnType<typeof setTimeout> | null = null;
    let sonCalisma = 0;
    // Ekran arkadayken tazeleme yapılmıyor; gelen haber burada bekliyor ve
    // kişi geri döndüğünde tek okumaya dönüşüyor.
    let bekleyen = false;

    const calistir = () => {
      zaman = null;
      if (document.hidden) {
        bekleyen = true;
        return;
      }
      bekleyen = false;
      sonCalisma = Date.now();
      yenileRef.current();
    };

    const haber = () => {
      if (zaman) return;
      // Yoğun saatte haberler sağanak gibi geliyor. Son tazelemenin üstünden
      // yeterince geçmediyse fark kadar daha bekleniyor: ekran zıplamıyor,
      // sunucu da her kalem için baştan sorgulanmıyor.
      const gecen = Date.now() - sonCalisma;
      zaman = setTimeout(calistir, Math.max(gecikme, gecikme - gecen));
    };

    const gorunurluk = () => {
      if (!document.hidden && bekleyen) haber();
    };

    document.addEventListener("visibilitychange", gorunurluk);
    const biraklar = tablolar.map((t) => aboneOl(t, haber));

    return () => {
      document.removeEventListener("visibilitychange", gorunurluk);
      biraklar.forEach((b) => b());
      if (zaman) clearTimeout(zaman);
    };
    // Liste her çizimde yeni bir dizi olarak geliyor; bağımlılık dizinin
    // kendisi değil, içeriğinden çıkan anahtar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar, gecikme]);
}
