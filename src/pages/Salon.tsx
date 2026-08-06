import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bolgeler } from "../ornekVeri";
import MasaKarti from "../components/MasaKarti";
import { tumAdisyonlar } from "../adisyonlar";
import Duzen from "../components/Duzen";

function sureFarki(acilis: string): string {
  const dk = Math.floor((Date.now() - new Date(acilis).getTime()) / 60000);
  if (dk < 1) return "şimdi";
  if (dk < 60) return `${dk}dk`;
  return `${Math.floor(dk / 60)}s ${dk % 60}dk`;
}

export default function Salon() {
  const navigate = useNavigate();
  const [adisyonlar, setAdisyonlar] = useState<
    Record<string, { tutar: number; adet: number; acilis?: string; garson?: string }>
  >({});
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    tumAdisyonlar().then((veri) => {
      setAdisyonlar(veri);
      setYukleniyor(false);
    });
  }, []);

  return (
    <Duzen>
    <div className="sayfa">
      <header className="baslik">
        <h1>Garso</h1>
        <span>Salon Görünümü</span>
      </header>

      {yukleniyor && (
        <div className="yukleniyor"><div className="cember" /></div>
      )}

      {!yukleniyor && bolgeler.map((bolge) => {
        const doluSayisi = bolge.masalar.filter((m) => adisyonlar[m.ad]).length;
        return (
          <section key={bolge.ad} className="bolge">
            <h2>
              {bolge.ad}{" "}
              <span>({doluSayisi}/{bolge.masalar.length} dolu)</span>
            </h2>
            <div className="masa-grid">
              {bolge.masalar.map((masa) => {
                const adisyon = adisyonlar[masa.ad];
                const sure = adisyon?.acilis ? sureFarki(adisyon.acilis) : "şimdi";
                const canli = adisyon
                  ? { ...masa, dolu: true, tutar: adisyon.tutar, sure, garson: adisyon.garson }
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
    </Duzen>
  );
}