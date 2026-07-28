import { useState } from "react";
import type { SepetKalemi, Tahsilat } from "../types";

type Props = {
  kalemler: SepetKalemi[];
  onKapat: () => void;
  onOdendi: () => void;
};

export default function TahsilatPanel({ kalemler, onKapat, onOdendi }: Props) {
  const toplam = kalemler.reduce((t, k) => t + k.fiyat * k.adet, 0);
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([]);
  const [girilen, setGirilen] = useState("");

  const odenen = tahsilatlar.reduce((t, o) => t + o.tutar, 0);
  const kalan = toplam - odenen;

  const odemeAl = (tip: Tahsilat["tip"]) => {
    const tutar = girilen ? Number(girilen) : kalan;
    if (tutar <= 0 || tutar > kalan) return;
    const yeni = [...tahsilatlar, { tip, tutar }];
    setTahsilatlar(yeni);
    setGirilen("");
    if (yeni.reduce((t, o) => t + o.tutar, 0) >= toplam) onOdendi();
  };

  return (
    <div className="tahsilat-fon" onClick={onKapat}>
      <aside className="tahsilat-panel" onClick={(e) => e.stopPropagation()}>
        <header className="tahsilat-ust">
          <h2>Tahsilat</h2>
          <button className="kapat" onClick={onKapat}>×</button>
        </header>

        <div className="tahsilat-govde">
          <div className="tahsilat-toplam">
            <span>Toplam</span>
            <strong>₺{toplam}</strong>
          </div>
          <div className="tahsilat-kalan">
            <span>Kalan</span>
            <strong>₺{kalan}</strong>
          </div>

          {tahsilatlar.length > 0 && (
            <div className="tahsilat-gecmis">
              {tahsilatlar.map((o, i) => (
                <div key={i} className="tahsilat-satir">
                  <span>{o.tip}</span>
                  <span>₺{o.tutar}</span>
                </div>
              ))}
            </div>
          )}

          <input
            className="tutar-giris"
            type="number"
            placeholder={`Tutar (boş = kalan ₺${kalan})`}
            value={girilen}
            onChange={(e) => setGirilen(e.target.value)}
          />
        </div>

        <footer className="tahsilat-alt">
          <button className="odeme-tip nakit" onClick={() => odemeAl("Nakit")}>Nakit</button>
          <button className="odeme-tip kart" onClick={() => odemeAl("Kredi Kartı")}>Kredi Kartı</button>
        </footer>
      </aside>
    </div>
  );
}