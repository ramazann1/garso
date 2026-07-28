import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bolgeler } from "../ornekVeri";
import MasaKarti from "../components/MasaKarti";
import { tumAdisyonlar } from "../adisyonlar";
import type { SepetKalemi } from "../types";

export default function Salon() {
  const navigate = useNavigate();
  const [adisyonlar, setAdisyonlar] = useState<Record<string, SepetKalemi[]>>({});

  useEffect(() => {
    tumAdisyonlar().then(setAdisyonlar);
  }, []);

  return (
    <div className="sayfa">
      <header className="baslik">
        <h1>Garso</h1>
        <span>Salon Görünümü</span>
      </header>

      {bolgeler.map((bolge) => {
        const doluSayisi = bolge.masalar.filter((m) => (adisyonlar[m.ad] ?? []).length > 0).length;
        return (
          <section key={bolge.ad} className="bolge">
            <h2>
              {bolge.ad}{" "}
              <span>({doluSayisi}/{bolge.masalar.length} dolu)</span>
            </h2>
            <div className="masa-grid">
              {bolge.masalar.map((masa) => {
                const kalemler = adisyonlar[masa.ad] ?? [];
                const tutar = kalemler.reduce((t, k) => t + k.fiyat * k.adet, 0);
                const canli = kalemler.length > 0
                  ? { ...masa, dolu: true, tutar, sure: "şimdi", garson: "Ramazan" }
                  : { ...masa, dolu: false, tutar: undefined, sure: undefined, garson: undefined };
                return (
                  <MasaKarti
                    key={masa.ad}
                    masa={canli}
                    onClick={() => navigate(`/siparis/${encodeURIComponent(masa.ad)}`)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}