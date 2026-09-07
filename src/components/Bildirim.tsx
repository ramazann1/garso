import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, TriangleAlert, X } from "lucide-react";

type Tur = "basari" | "uyari" | "hata";

const IKONLAR = {
  basari: Check,
  uyari: TriangleAlert,
  hata: CircleAlert,
} as const;

// Kısa süre görünüp kendi kapanan bilgi kutusu — işlem bitti demek için onay
// modalı açmak akışı gereksiz kesiyor. Türü ikonun rengini belirliyor: aynı
// yeşil tikle hata yazmak kullanıcıya yanlış işaret veriyordu.
export default function Bildirim({
  mesaj,
  onKapat,
  tur = "basari",
  sure = 2600,
}: {
  mesaj: string;
  onKapat: () => void;
  tur?: Tur;
  sure?: number;
}) {
  const [kapaniyor, setKapaniyor] = useState(false);
  const Ikon = IKONLAR[tur];

  // Sayaç yalnızca mesaj değişince kurulur; araya giren her yeniden çizim
  // süreyi baştan başlatmasın diye kapatma işlevi ref'te tutuluyor.
  const kapat = useRef(onKapat);
  kapat.current = onKapat;

  useEffect(() => {
    setKapaniyor(false);
    // Kutu bir anda yok olmuyor: süre dolunca önce aşağı kayıyor, sonra
    // siliniyor. Gözün kaybolduğu yeri fark etmesi için kısa bir an yetiyor.
    const solma = setTimeout(() => setKapaniyor(true), sure);
    const zaman = setTimeout(() => kapat.current(), sure + 200);
    return () => {
      clearTimeout(solma);
      clearTimeout(zaman);
    };
  }, [mesaj, sure]);

  return (
    <div
      className={kapaniyor ? `bildirim ${tur} kapaniyor` : `bildirim ${tur}`}
      onClick={onKapat}
    >
      <span className="bildirim-im">
        <Ikon size={15} />
      </span>
      <p>{mesaj}</p>
      <button className="bildirim-kapat" aria-label="Kapat" onClick={onKapat}>
        <X size={15} />
      </button>
      {/* Süre çubuğu: kutunun neden kaybolacağını gösteriyor. */}
      <i className="bildirim-sure" style={{ animationDuration: `${sure}ms` }} />
    </div>
  );
}
