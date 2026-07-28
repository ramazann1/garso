import { useState } from "react";
import IndirimModal from "./IndirimModal";
import type { SepetKalemi, Tahsilat } from "../types";

type Props = {
  kalemler: SepetKalemi[];
  toplam: number;
  araToplam: number;
  onKapat: () => void;
  onOdendi: () => void;
};

export default function TahsilatPanel({ kalemler, toplam, onKapat, onOdendi }: Props) {
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([]);
  const [girilen, setGirilen] = useState("");
  const [secilen, setSecilen] = useState<Record<number, number>>({});
  const [odenmis, setOdenmis] = useState<Record<number, number>>({});

  const odenen = tahsilatlar.filter((t) => t.tip !== "İndirim").reduce((t, o) => t + o.tutar, 0);
  const kalan = toplam - panelIndirimi - odenen;

  const kalemSec = (i: number) => {
    const odenmisAdet = odenmis[i] ?? 0;
    const kalanAdet = kalemler[i].adet - odenmisAdet;
    if (kalanAdet <= 0) return;
    setSecilen((s) => {
      const su = s[i] ?? 0;
      const yeniAdet = su >= kalanAdet ? 0 : su + 1;
      const yeni = { ...s, [i]: yeniAdet };
      if (yeniAdet === 0) delete yeni[i];
      const tutar = Object.entries(yeni).reduce((t, [x, adet]) => t + kalemler[Number(x)].fiyat * adet, 0);
      setGirilen(tutar > 0 ? String(tutar) : "");
      return yeni;
    });
  };

  const odemeAl = (tip: "Nakit" | "Kredi Kartı") => {
    const tutar = girilen ? Number(girilen) : kalan;
    if (tutar <= 0) return;
    if (tutar > kalan) { alert(`Tutar kalandan büyük olamaz (kalan ₺${kalan})`); return; }
    const yeni = [...tahsilatlar, { tip, tutar }];
    setTahsilatlar(yeni);
    setOdenmis((o) => {
      const g = { ...o };
      for (const [i, adet] of Object.entries(secilen)) g[Number(i)] = (g[Number(i)] ?? 0) + adet;
      return g;
    });
    setSecilen({});
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

          <div className="kalem-sec-liste">
            {kalemler.map((k, i) => {
              const odenmisAdet = odenmis[i] ?? 0;
              const seciliAdet = secilen[i] ?? 0;
              const bitti = odenmisAdet >= k.adet;
              return (
                <button
                  key={i}
                  className={bitti ? "kalem-sec odendi" : seciliAdet > 0 ? "kalem-sec aktif" : "kalem-sec"}
                  disabled={bitti}
                  onClick={() => kalemSec(i)}
                >
                  <span>
                    {k.adet}× {k.ad}
                    {odenmisAdet > 0 && !bitti && <em className="odendi-rozet">{odenmisAdet} ödendi</em>}
                  </span>
                  <span>
                    {bitti ? "Ödendi" : seciliAdet > 0 ? `${seciliAdet} seçili · ₺${k.fiyat * seciliAdet}` : `₺${k.fiyat * k.adet}`}
                  </span>
                </button>
              );
            })}
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

          <div className="bolme-kisayol">
            {[2, 3, 4].map((n) => (
              <button key={n} onClick={() => { setSecilen({}); setGirilen(String(Math.ceil(kalan / n))); }}>
                1/{n}
              </button>
            ))}
          </div>

          <input
            className="tutar-giris"
            type="number"
            placeholder={`Tutar (boş = kalan ₺${kalan})`}
            value={girilen}
            onChange={(e) => { setSecilen({}); setGirilen(e.target.value); }}
          />
        </div>
        <div className="tahsilat-alt" style={{paddingBottom: 0, borderTop: 'none'}}>
          <button className="indirim-btn" onClick={() => setIndirimAcik(true)}>İndirim</button>
        </div>
        <footer className="tahsilat-alt">
          <button className="odeme-tip nakit" onClick={() => odemeAl("Nakit")}>Nakit</button>
          <button className="odeme-tip kart" onClick={() => odemeAl("Kredi Kartı")}>Kredi Kartı</button>
        </footer>
      {indirimAcik && (
        <IndirimModal
          araToplam={araToplam}
          mevcutIndirim={panelIndirimi}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar) => { setPanelIndirimi(tutar); setIndirimAcik(false); }}
        />
      )}
      </aside>
    </div>
  );
}