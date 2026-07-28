import { useEffect, useState } from "react";
import IndirimModal from "./IndirimModal";
import { odemeTipleriniGetir } from "../adisyonlar";
import type { OdemeTipi } from "../adisyonlar";
import type { SepetKalemi, Tahsilat } from "../types";

type Props = {
  kalemler: SepetKalemi[];
  toplam: number;
  araToplam: number;
  kayitliTahsilatlar: Tahsilat[];
  onKaydet: (tahsilatlar: Tahsilat[]) => void;
  onKapat: () => void;
  onOdendi: () => void;
};

export default function TahsilatPanel({ kalemler, toplam, araToplam, kayitliTahsilatlar, onKaydet, onKapat, onOdendi }: Props) {
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>(kayitliTahsilatlar ?? []);
  const [girilen, setGirilen] = useState("");
  const [secilen, setSecilen] = useState<Record<number, number>>({});
  const [odenmis, setOdenmis] = useState<Record<number, number>>({});
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [panelIndirimi, setPanelIndirimi] = useState(0);
  const [odemeTipleri, setOdemeTipleri] = useState<OdemeTipi[]>([]);

  useEffect(() => {
    odemeTipleriniGetir().then(setOdemeTipleri);
  }, []);

  const odenen = (tahsilatlar ?? []).reduce((t, o) => t + o.tutar, 0);
  const efektifToplam = toplam - panelIndirimi;
  const kalan = efektifToplam - odenen;

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

  const odemeAl = (tip: string) => {
    const tutar = girilen ? Number(girilen) : kalan;
    if (tutar <= 0) return;
    if (tutar > kalan) { alert(`Tutar kalandan büyük olamaz (kalan ₺${kalan})`); return; }
    const yeni = [...(tahsilatlar ?? []), { tip, tutar }];
    setTahsilatlar(yeni);
    setOdenmis((o) => {
      const g = { ...o };
      for (const [i, adet] of Object.entries(secilen)) g[Number(i)] = (g[Number(i)] ?? 0) + adet;
      return g;
    });
    setSecilen({});
    setGirilen("");
    onKaydet(yeni);
    if (yeni.reduce((t, o) => t + o.tutar, 0) >= efektifToplam) onOdendi();
  };

  return (
    <div className="tahsilat-fon" onClick={onKapat}>
      <aside className="tahsilat-panel" onClick={(e) => e.stopPropagation()}>
        <header className="tahsilat-ust">
          <h2>Tahsilat</h2>
          <button className="kapat" onClick={onKapat}>×</button>
        </header>

        <div className="tahsilat-govde">
          <div className="tahsilat-tutarlar">
            <div className="tutar-satir">
              <span>Toplam</span>
              <strong>₺{toplam}</strong>
            </div>
            {panelIndirimi > 0 && (
              <div className="tutar-satir indirim">
                <span>İndirim</span>
                <span>−₺{panelIndirimi}</span>
              </div>
            )}
            {odenen > 0 && (
              <div className="tutar-satir odendi">
                <span>Ödenen</span>
                <span>₺{odenen}</span>
              </div>
            )}
            <div className="tutar-satir kalan-satir">
              <span>Kalan</span>
              <strong>₺{kalan}</strong>
            </div>
          </div>

          {(tahsilatlar ?? []).length > 0 && (
            <div className="tahsilat-gecmis">
              <p className="gecmis-baslik">Alınan Ödemeler</p>
              {tahsilatlar.map((o, i) => (
                <div key={i} className="gecmis-satir">
                  <span className="gecmis-tip">{o.tip}</span>
                  <span className="gecmis-tutar">₺{o.tutar}</span>
                </div>
              ))}
            </div>
          )}

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
                    {bitti ? "✓" : seciliAdet > 0
                      ? `${seciliAdet} seçili · ₺${k.fiyat * seciliAdet}`
                      : `₺${k.fiyat * k.adet}`}
                  </span>
                </button>
              );
            })}
          </div>

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
            placeholder={`Tutar gir (boş = kalan ₺${kalan})`}
            value={girilen}
            onChange={(e) => { setSecilen({}); setGirilen(e.target.value); }}
          />

          <div className="odeme-tipler">
            {odemeTipleri.map(({ id, ad, renk }) => (
              <button
                key={id}
                className="odeme-tip-btn"
                style={{ background: renk }}
                onClick={() => odemeAl(ad)}
              >
                {ad}
              </button>
            ))}
          </div>
        </div>

        <div className="tahsilat-indirim-bar">
          <button className="indirim-btn" onClick={() => setIndirimAcik(true)}>İndirim</button>
        </div>

        <div className="tahsilat-kaydet-bar">
          <button className="tahsilat-kaydet" onClick={() => { onKaydet(tahsilatlar); onKapat(); }}>Kaydet</button>
        </div>

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