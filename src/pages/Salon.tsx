import { useNavigate } from "react-router-dom";
import { bolgeler } from "../ornekVeri";
import MasaKarti from "../components/MasaKarti";
import { adisyonGetir } from "../adisyonlar";

export default function Salon() {
  const navigate = useNavigate();

  return (
    <div className="sayfa">
      <header className="baslik">
        <h1>Garso</h1>
        <span>Salon Görünümü</span>
      </header>

      {bolgeler.map((bolge) => (
        <section key={bolge.ad} className="bolge">
          <h2>
            {bolge.ad}{" "}
            <span>({bolge.masalar.filter((m) => m.dolu).length}/{bolge.masalar.length} dolu)</span>
          </h2>
          <div className="masa-grid">
            {bolge.masalar.map((masa) => {
              const kalemler = adisyonGetir(masa.ad);
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
      ))}
    </div>
  );
}