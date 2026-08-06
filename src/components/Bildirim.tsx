import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

// Kısa süre görünüp kendi kapanan bilgi kutusu — işlem bitti demek için onay
// modalı açmak akışı gereksiz kesiyor.
export default function Bildirim({
  mesaj,
  onKapat,
  sure = 2600,
}: {
  mesaj: string;
  onKapat: () => void;
  sure?: number;
}) {
  // Sayaç yalnızca mesaj değişince kurulur; araya giren her yeniden çizim
  // süreyi baştan başlatmasın diye kapatma işlevi ref'te tutuluyor.
  const kapat = useRef(onKapat);
  kapat.current = onKapat;

  useEffect(() => {
    const zaman = setTimeout(() => kapat.current(), sure);
    return () => clearTimeout(zaman);
  }, [mesaj, sure]);

  return (
    <div className="bildirim" onClick={onKapat}>
      <span className="bildirim-im"><Check size={15} /></span>
      {mesaj}
    </div>
  );
}
