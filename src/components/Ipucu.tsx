import { Info } from "lucide-react";

/**
 * Ayarın yanındaki küçük açıklama işareti. Açıklamayı satırın altına yazmak
 * ekranı metin yığınına çeviriyordu; bilgi duruyor ama yer kaplamıyor.
 *
 * Dokunmatik kasada imleç yok, o yüzden tıklamayla da açılıyor (odaklanınca
 * balon görünüyor).
 */
export default function Ipucu({ children }: { children: React.ReactNode }) {
  return (
    <span className="ipucu" tabIndex={0} role="note">
      <Info size={13} />
      <span className="ipucu-balon">{children}</span>
    </span>
  );
}
