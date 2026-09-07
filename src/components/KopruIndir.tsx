import { Clock, MonitorDown } from "lucide-react";
import { KOPRU_INDIRME } from "../kopruIndirme";

/**
 * Yazıcı programının indirme bağlantısı. Yazıcılar bölümünün üst şeridinde
 * duruyor — kurulumun ilk adımı orası, ama ekranın ortasında yer kaplamıyor.
 *
 * Adres burada yazmıyor, bkz. kopruIndirme.ts.
 */
export default function KopruIndir() {
  const { surum, adres, yayinda } = KOPRU_INDIRME;

  const icerik = (
    <>
      <span className="ki-im">
        {yayinda ? <MonitorDown size={18} /> : <Clock size={18} />}
      </span>
      <span className="ki-metin">
        Yazıcı programı
        <small>{yayinda ? `Windows · v${surum}` : "Yayına hazırlanıyor"}</small>
      </span>
    </>
  );

  // Dosya henüz yayınlanmadıysa kart tıklanmıyor: kırık sayfa açan bir
  // bağlantı, olmamasından kötü. Yazı yine de tam okunur — neden
  // tıklanmadığını ikinci satır söylüyor.
  if (!yayinda) {
    return <span className="kopru-indir bekliyor">{icerik}</span>;
  }

  return (
    <a className="kopru-indir" href={adres} download title={`Sürüm ${surum}`}>
      {icerik}
    </a>
  );
}
