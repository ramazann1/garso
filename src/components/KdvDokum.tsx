import { useState } from "react";
import type { KdvSatiri } from "../kdv";
import { ayarlar } from "../isletmeAyarlari";
import { paraGoster as tutar } from "../para";

/**
 * KDV günlük işin merkezinde değil, muhasebe için lazım — bu yüzden kapalı durur.
 * Sipariş ekranında ara toplamın kendisi kapak satırıdır: oka basınca altında
 * KDV toplamı ve oran dökümü açılır, adisyon boş yere yer kaplamaz.
 */
export default function KdvDokum({
  satirlar,
  araToplam,
}: {
  satirlar: KdvSatiri[];
  araToplam?: number;
}) {
  const [acik, setAcik] = useState(false);
  if (!satirlar.length) return null;

  const dahil = ayarlar().kdvDahil;
  const kdvToplam = satirlar.reduce((t, s) => t + s.kdv, 0);

  return (
    <div className="kdv-dokum">
      <button className="kdv-ozet" onClick={() => setAcik(!acik)}>
        <span>
          {araToplam == null ? (
            <>
              KDV <em>({dahil ? "dahil" : "hariç"})</em>
            </>
          ) : (
            "Ara Toplam"
          )}
          <i className={acik ? "kdv-ok acik" : "kdv-ok"} />
        </span>
        <span>{tutar(araToplam ?? kdvToplam)}</span>
      </button>

      {acik && araToplam != null && (
        <div className="kdv-satir kdv-toplam">
          <span>
            KDV <em>({dahil ? "dahil" : "hariç"})</em>
          </span>
          <span className="sag">{tutar(kdvToplam)}</span>
        </div>
      )}

      {acik &&
        satirlar.map((s) => (
          <div key={s.oran} className="kdv-satir">
            <span className="kdv-oran">%{s.oran}</span>
            <span className="sag">{tutar(s.matrah)}</span>
            <span className="sag">{tutar(s.kdv)}</span>
          </div>
        ))}
    </div>
  );
}
