import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { onbellegiTazele } from "./onbellek";

/**
 * Tanım verilerinin canlı emniyet kemeri.
 *
 * Önbellek artık "önce kopya, arkada tazele" çalışıyor (bkz. onbellek.ts):
 * ekran cihazdaki kopyayı beklemeden alıyor. Kopyanın bayatlamaması için
 * sunucudaki değişikliğin cihaza haber olarak gelmesi gerekiyor — menü bir
 * cihazda düzenlenince kasadaki de öğrensin diye.
 *
 * Haber kendi yazdığımız değişiklik için de geliyor; menüyü düzenleyen cihaz
 * kendi kopyasını böyle tazeliyor, kaydeden her ekranın ayrıca tazeleme
 * çağırmasına gerek kalmıyor.
 *
 * `useCanli`den ayrı duruyor: o ekran ömrü boyunca yaşıyor ve ekranın kendi
 * okumasını tetikliyor, bu ise program açık olduğu sürece yaşıyor ve yalnız
 * cihazdaki kopyayı tazeliyor.
 */

/** Hangi tablo değişince hangi kopya tazelenecek. */
const HARITA: Record<string, string[]> = {
  kategoriler: ["menu"],
  urunler: ["menu"],
  urun_kategorileri: ["menu"],
  porsiyonlar: ["menu"],
  secenek_gruplari: ["menu"],
  secenekler: ["menu"],
  porsiyon_secenek_gruplari: ["menu"],
  birimler: ["menu"],
  kdv_gruplari: ["menu"],
  bolgeler: ["bolgeler"],
  masalar: ["bolgeler"],
  odeme_tipleri: ["odeme-tipleri", "odeme-tipleri-hepsi"],
  isletme_ayarlari: ["ayarlar"],
  istasyonlar: ["istasyonlar"],
  odenmezler: ["odenmezler", "odenmezler-hepsi"],
};

/** Kopyayı hangi okuma tazeleyecek. Modüller açılışta kendini buraya yazıyor. */
const taziciler = new Map<string, () => Promise<unknown>>();

export function tazeleyiciTanit(anahtar: string, getirici: () => Promise<unknown>) {
  taziciler.set(anahtar, getirici);
}

/**
 * Tazelemeyi bekleyen ekranlar. Kopyanın yenilenmesi tek başına yetmiyor:
 * ekran veriyi açılışta bir kez okuyup kendi durumuna koyuyor, kopya arkada
 * değişse de bunu bilmiyordu. Ödenmezler listesine eklenen ad sayfa
 * yenilenmeden düşmüyordu.
 */
const izleyiciler = new Map<string, Set<() => void>>();

function duyur(anahtar: string) {
  izleyiciler.get(anahtar)?.forEach((f) => f());
}

/**
 * Kopya tazelendikçe verilen işi yeniden çalıştırır. Menü gibi tek okumadan
 * birkaç ayrı duruma dağılan ekranlar için: `useTanim` veriyi döndürüyor,
 * bu ise ekranın kendi okuma işini tekrarlıyor.
 *
 * İşe `gecerliMi` veriliyor — okuma sürerken ekran kapanmış olabilir.
 */
export function useTanimEtkisi(anahtar: string, calistir: (gecerliMi: () => boolean) => void) {
  const is = useRef(calistir);
  is.current = calistir;

  useEffect(() => {
    let gecerli = true;
    const oku = () => is.current(() => gecerli);

    let kume = izleyiciler.get(anahtar);
    if (!kume) {
      kume = new Set();
      izleyiciler.set(anahtar, kume);
    }
    kume.add(oku);
    oku();

    return () => {
      gecerli = false;
      kume.delete(oku);
      if (kume.size === 0) izleyiciler.delete(anahtar);
    };
  }, [anahtar]);
}

/**
 * Tanım verisini okur ve kopya tazelendikçe kendini yeniler. Okuma fonksiyonu
 * her çizimde yeniden üretilebildiği için bağımlılık olarak anahtar kullanılıyor.
 */
export function useTanim<T>(anahtar: string, getir: () => Promise<T>, baslangic: T): T {
  const [veri, setVeri] = useState<T>(baslangic);

  useTanimEtkisi(anahtar, (gecerliMi) => {
    getir().then((y) => {
      if (gecerliMi()) setVeri(y);
    });
  });

  return veri;
}

/**
 * Bu cihazda yapılan değişikliğin kendi ekranlarına anında yansıması.
 * Haberi beklemek yeterli değildi: ayar ekranı kaydettikten sonra listeyi
 * yeniden okuyor ve kopyadan gelen eski hâli görüyordu.
 */
export async function tanimTazele(anahtar: string) {
  const getirici = taziciler.get(anahtar);
  if (!getirici) return;
  await onbellegiTazele(anahtar, getirici);
  duyur(anahtar);
}

let kanal: RealtimeChannel | null = null;

// Haberler sağanak gelebiliyor (toplu aktarımda yüzlerce satır yazılıyor):
// aynı kopya için art arda gelenler tek tazelemede birleşiyor.
const GECIKME = 1_500;
const bekleyen = new Map<string, ReturnType<typeof setTimeout>>();

function tazelemeyiSirala(anahtar: string) {
  const varolan = bekleyen.get(anahtar);
  if (varolan) clearTimeout(varolan);
  bekleyen.set(
    anahtar,
    setTimeout(() => {
      bekleyen.delete(anahtar);
      const getirici = taziciler.get(anahtar);
      if (!getirici) return;
      onbellegiTazele(anahtar, getirici).then(() => duyur(anahtar));
    }, GECIKME)
  );
}

/** Program açılışında bir kez kuruluyor. */
export function tanimlariIzle() {
  if (kanal) return;
  let k = supabase.channel("tanimlar");
  for (const tablo of Object.keys(HARITA)) {
    k = k.on("postgres_changes", { event: "*", schema: "public", table: tablo }, () => {
      for (const anahtar of HARITA[tablo]) tazelemeyiSirala(anahtar);
    });
  }
  kanal = k.subscribe();
}
