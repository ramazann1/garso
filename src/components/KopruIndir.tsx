import { MonitorDown } from "lucide-react";
import { KOPRU_INDIRME } from "../kopruIndirme";

/**
 * Yazıcı programının indirme bağlantısı. Yazıcılar bölümünün alt sekme
 * şeridinin sağ ucunda duruyor — hangi sekmede olursan ol elinin altında, ama
 * ekranın ortasında yer kaplamıyor.
 *
 * Adres burada yazmıyor, bkz. kopruIndirme.ts.
 */
export default function KopruIndir() {
  const { surum, adres, yayinda } = KOPRU_INDIRME;

  // Dosya henüz yayınlanmadıysa düğme sönük duruyor ve hiçbir yere gitmiyor:
  // tıklayınca kırık sayfa açan bir bağlantı, olmamasından kötü.
  if (!yayinda) {
    return (
      <span className="kopru-indir sonuk" title="Dosya yayına hazırlanıyor">
        <MonitorDown size={15} />
        Yazıcı programını indir
        <em>{surum}</em>
      </span>
    );
  }

  return (
    <a className="kopru-indir" href={adres} download title={`Sürüm ${surum}`}>
      <MonitorDown size={15} />
      Yazıcı programını indir
      <em>{surum}</em>
    </a>
  );
}
