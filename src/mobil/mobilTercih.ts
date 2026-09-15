import { useEffect, useState } from "react";

/**
 * Mobil arayüz mü, masaüstü mü?
 *
 * Karar yalnız cihazın genişliğinden veriliyor: kasa bilgisayarı ve mutfak
 * tableti geniş, garsonun telefonu dar. Elle geçiş kaldırıldı; eskiden seçim
 * yapmış cihazda kalan kayıt siliniyor, yoksa o cihaz yanlış görünümde kalırdı.
 */
const SINIR = 820;

try {
  localStorage.removeItem("rayopos-gorunum");
} catch {
  /* depolama kapalıysa silinecek kayıt da yok */
}

export type Gorunum = "mobil" | "masaustu";

export function darEkran() {
  return window.innerWidth < SINIR;
}

export function gorunum(): Gorunum {
  return darEkran() ? "mobil" : "masaustu";
}

export function useGorunum() {
  const [g, setG] = useState(gorunum);

  useEffect(() => {
    // Tablet yan çevrilince sınırın öbür tarafına geçebiliyor.
    const tazele = () => setG(gorunum());
    window.addEventListener("resize", tazele);
    return () => window.removeEventListener("resize", tazele);
  }, []);

  return g;
}
