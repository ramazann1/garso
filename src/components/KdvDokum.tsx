import { useState } from "react";
import type { KdvSatiri } from "../kdv";

const tutar = (v: number) =>
  "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Özette tek satır durur — KDV günlük işin merkezinde değil, muhasebe için lazım.
// Oran dökümü ancak üstüne basınca açılıyor.
export default function KdvDokum({ satirlar }: { satirlar: KdvSatiri[] }) {
  const [acik, setAcik] = useState(false);
  if (!satirlar.length) return null;

  const kdvToplam = satirlar.reduce((t, s) => t + s.kdv, 0);

  return (
    <div className="kdv-dokum">
      <button className="kdv-ozet" onClick={() => setAcik(!acik)}>
        <span>
          KDV <em>(dahil)</em>
          <i className={acik ? "kdv-ok acik" : "kdv-ok"} />
        </span>
        <span>{tutar(kdvToplam)}</span>
      </button>

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
