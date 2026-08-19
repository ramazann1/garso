import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { OdemeIkon } from "../odemeIkon";
import { odemeTipleriniGetir, type OdemeTipi } from "../odemeTipleri";
import { yetkiVar } from "../oturum";
import { paraGoster } from "../para";

/**
 * Ödeme tipi seçimi — mobilin her yerinde aynı sayfa.
 *
 * Düzenin üç kuralı var:
 *  1. Tahsil edilecek tutar en üstte ve en büyük yazı. Dokunuş parayı o anda
 *     kaydediyor; garson neyi onayladığını görmeden basmamalı.
 *  2. Tipler tek sütun liste: her satır tam genişlikte, aralarında nişan
 *     alınacak boşluk yok. Renk yalnız ikonun üstünde duruyor.
 *  3. Her düğmede ikon ve yazı birlikte. Yalnız ikon bırakmak yanlış tipe
 *     basılmasının en sık sebebi.
 *
 * Açık hesap tipleri yetkisi olmayana hiç çıkmıyor (odeme.acik_hesap).
 */
export default function OdemeTipleri({
  baslik,
  tutar,
  ustBolum,
  pasif,
  onSec,
  onKapat,
}: {
  baslik: string;
  tutar: number;
  /** Tutarın altına giren ek seçim (ödemeden sonra ne olsun gibi). */
  ustBolum?: React.ReactNode;
  pasif?: boolean;
  onSec: (tip: string) => void;
  onKapat: () => void;
}) {
  const [tipler, setTipler] = useState<OdemeTipi[]>([]);

  useEffect(() => {
    odemeTipleriniGetir().then(setTipler);
  }, []);

  const gorunen = yetkiVar("odeme.acik_hesap") ? tipler : tipler.filter((t) => !t.acikHesap);

  return (
    <div className="m-perde" onClick={onKapat}>
      <div className="m-sayfa" onClick={(e) => e.stopPropagation()}>
        <header className="m-odeme-ust">
          <div>
            <p>{baslik}</p>
            <strong>{paraGoster(tutar)}</strong>
          </div>
          <button className="m-ikon-dugme" onClick={onKapat} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>

        {ustBolum}

        <div className="m-odeme-govde">
          {gorunen.length === 0 ? (
            <div className="m-bos"><p>Tanımlı ödeme tipi yok.</p></div>
          ) : (
            <>
              {gorunen.map((t) => (
                <button key={t.id} className="m-tip" disabled={pasif} onClick={() => onSec(t.ad)}>
                  {/* Renk düğmenin tamamını kaplamıyor, yalnız ikonun arkasında
                      duruyor: tipler ayırt ediliyor ama sayfa sakin kalıyor. */}
                  <span className="m-tip-ikon" style={{ color: t.renk }}>
                    <OdemeIkon ad={t.ad} size={21} />
                  </span>
                  {t.ad}
                  <ChevronRight size={18} className="m-tip-ok" />
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
