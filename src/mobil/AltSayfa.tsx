import { useEffect, useRef, useState } from "react";

/**
 * Alttan açılan pencerelerin ortak kabuğu.
 *
 * Açılış animasyonunu CSS tek başına yapabiliyor ama kapanışı yapamıyor: React
 * pencereyi ekrandan anında kaldırdığı için animasyona sıra gelmiyor, pencere
 * bir anda yok oluyordu. Burada kapatma isteği bekletiliyor — önce ters
 * animasyon oynuyor, bitince pencere gerçekten kalkıyor.
 */
const SURE = 200;

export default function AltSayfa({
  kisa,
  ek,
  onKapat,
  children,
}: {
  /** İçeriği kadar yer kaplayan pencere: işlem menüleri böyle. */
  kisa?: boolean;
  /** Pencereye özel sınıf — başlık rengi gibi kendi süsü olanlar için. */
  ek?: string;
  onKapat: () => void;
  /**
   * İçerik. Fonksiyon verilirse kapatma işi de veriliyor — penceredeki kendi
   * kapat düğmesi de animasyonu çalıştırsın, perdeye basmakla aynı olsun.
   */
  children: React.ReactNode | ((kapat: () => void) => React.ReactNode);
}) {
  const [kapaniyor, setKapaniyor] = useState(false);
  const zaman = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(zaman.current), []);

  const kapat = () => {
    // İki kez basılırsa ikinci sayaç kurulmuyor; pencere zaten kapanıyor.
    if (kapaniyor) return;
    setKapaniyor(true);
    zaman.current = setTimeout(onKapat, SURE);
  };

  return (
    <div className={kapaniyor ? "m-perde kapaniyor" : "m-perde"} onClick={kapat}>
      <div
        className={["m-sayfa", kisa && "kisa", ek].filter(Boolean).join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {typeof children === "function" ? children(kapat) : children}
      </div>
    </div>
  );
}
