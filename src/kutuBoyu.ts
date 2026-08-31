import { useEffect, useRef, useState } from "react";

/** Üstte özet şeridi gibi bölümler olduğunda kutu daralmasın diye taban değer. */
const ASGARI = 520;

/**
 * Uzun tablolar sayfayı uzatmasın: kutu ekranda kendisine kalan yeri alıyor,
 * liste onun içinde kayıyor. Alt kenar — yatay kaydırma çubuğuyla birlikte —
 * hep görünür kalıyor, ona ulaşmak için sayfayı aşağı kaydırmak gerekmiyor.
 *
 * `tetik` liste uzunluğu gibi kutunun yerini değiştirebilecek bir değer;
 * değişince yeniden ölçülüyor.
 */
export function useKutuBoyu(tetik: unknown = null) {
  const kutu = useRef<HTMLDivElement>(null);
  const [boy, setBoy] = useState(0);

  useEffect(() => {
    const olc = () => {
      const k = kutu.current;
      if (!k) return;
      const ustten = k.getBoundingClientRect().top + window.scrollY;
      setBoy(Math.max(ASGARI, window.innerHeight - ustten - 20));
    };
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, [tetik]);

  return { kutu, boy };
}
