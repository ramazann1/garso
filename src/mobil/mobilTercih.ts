import { useEffect, useState } from "react";

/**
 * Mobil arayüz mü, masaüstü mü?
 *
 * Karar cihazın genişliğinden veriliyor: kasa bilgisayarı ve mutfak tableti
 * geniş, garsonun telefonu dar. Kişi bunu elle de değiştirebiliyor — patron
 * telefonda ayar ekranına girmek isteyebilir, kasada mobil akışı denemek
 * isteyebilir. Elle seçim cihazda kalıyor, her açılışta sorulmuyor.
 */
const ANAHTAR = "garso.gorunum";
const SINIR = 820;

export type Gorunum = "mobil" | "masaustu";

export function darEkran() {
  return window.innerWidth < SINIR;
}

/** Elle seçilen görünüm; seçilmemişse ekran genişliği karar veriyor. */
export function gorunum(): Gorunum {
  const secim = localStorage.getItem(ANAHTAR);
  if (secim === "mobil" || secim === "masaustu") return secim;
  return darEkran() ? "mobil" : "masaustu";
}

const dinleyiciler = new Set<() => void>();

export function gorunumSec(g: Gorunum) {
  localStorage.setItem(ANAHTAR, g);
  dinleyiciler.forEach((f) => f());
}

export function useGorunum() {
  const [g, setG] = useState(gorunum);

  useEffect(() => {
    const tazele = () => setG(gorunum());
    dinleyiciler.add(tazele);
    // Tablet yan çevrilince sınırın öbür tarafına geçebiliyor; elle seçim
    // yapılmadıysa görünüm de onunla değişsin.
    window.addEventListener("resize", tazele);
    return () => {
      dinleyiciler.delete(tazele);
      window.removeEventListener("resize", tazele);
    };
  }, []);

  return g;
}
