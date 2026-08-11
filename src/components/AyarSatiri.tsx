import Ipucu from "./Ipucu";
import { eslesiyor } from "../arama";

/**
 * Ayar listesinin tek satırı: solda açıklama işareti, ortada ayarın adı,
 * sağda kontrolü.
 *
 * Arama kutusu satırın kendi metnini bilmeden süzemeyeceği için filtre burada:
 * yazılan kelime adında da açıklamasında da aranıyor — "kdv" yazan kişi
 * "Menü fiyatları" satırını bulabilsin.
 */
export default function AyarSatiri({
  ad,
  ipucu,
  ara,
  children,
}: {
  ad: string;
  ipucu?: string;
  ara?: string;
  children: React.ReactNode;
}) {
  if (ara && !eslesiyor(`${ad} ${ipucu ?? ""}`, ara)) return null;

  return (
    <div className="ayar-satir">
      {/* Açıklaması olmayan satırda da sütun duruyor; işaretler alt alta hizalı. */}
      <span className="ayar-im">{ipucu && <Ipucu>{ipucu}</Ipucu>}</span>
      <strong>{ad}</strong>
      {children}
    </div>
  );
}
