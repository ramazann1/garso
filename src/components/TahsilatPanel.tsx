import { useEffect, useState } from "react";
import IndirimModal from "./IndirimModal";
import OnayModal from "./OnayModal";
import { odemeTipleriniGetir } from "../adisyonlar";
import type { OdemeTipi } from "../adisyonlar";
import type { SepetKalemi, Tahsilat } from "../types";

type Props = {
  kalemler: SepetKalemi[];
  toplam: number;
  araToplam: number;
  indirim: number;
  kayitliTahsilatlar: Tahsilat[];
  onKaydet: (tahsilatlar: Tahsilat[]) => void;
  onIndirimDegis: (tutar: number) => void;
  onKapat: () => void;
  onOdendi: () => void;
};

export default function TahsilatPanel({ kalemler, toplam, araToplam, indirim, kayitliTahsilatlar, onKaydet, onIndirimDegis, onKapat, onOdendi }: Props) {
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>(kayitliTahsilatlar ?? []);
  const [girilen, setGirilen] = useState("");
  const [secilen, setSecilen] = useState<Record<number, number>>({});
  const [odemeTipleri, setOdemeTipleri] = useState<OdemeTipi[]>([]);
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);

  useEffect(() => {
    odemeTipleriniGetir().then(setOdemeTipleri);
  }, []);

  const odenen = (tahsilatlar ?? []).reduce((t, o) => t + o.tutar, 0);
  const kalan = toplam - odenen;

  const odenmisMap = (() => {
    const map: Record<number, number> = {};
    for (const o of tahsilatlar ?? []) {
      for (const [i, adet] of Object.entries(o.kalemler ?? {})) {
        map[Number(i)] = (map[Number(i)] ?? 0) + adet;
      }
    }
    return map;
  })();

  const numpadTus = (v: string) => {
    if (v === "⌫") { setGirilen((g) => g.slice(0, -1)); return; }
    if (v === "Tümü") { setGirilen(String(kalan)); return; }
    setGirilen((g) => g + v);
  };

  const kalemSec = (i: number) => {
    const odenmisAdet = odenmisMap[i] ?? 0;
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
    if (tutar > kalan) { setUyari(`Tutar kalandan büyük olamaz (kalan ₺${kalan})`); return; }
    const secilenKalemler = Object.keys(secilen).length > 0 ? { ...secilen } : undefined;
    const yeni = [...(tahsilatlar ?? []), { tip, tutar, kalemler: secilenKalemler }];
    setTahsilatlar(yeni);
    setSecilen({});
    setGirilen("");
    onKaydet(yeni);
    if (yeni.reduce((t, o) => t + o.tutar, 0) >= toplam) onOdendi();
  };

  return (
    <div className="tahsilat-fon" onClick={onKapat}>
      <aside className="tahsilat-panel genis" onClick={(e) => e.stopPropagation()}>
        <header className="tahsilat-ust">
          <h2>Tahsilat — Toplam ₺{toplam} / Kalan ₺{kalan}</h2>
          <button className="kapat" onClick={onKapat}>×</button>
        </header>

        <div className="tahsilat-iki-sutun">
          <div className="tahsilat-sol">
            <p className="sutun-baslik">Ürünler</p>
            <div className="kalem-sec-liste">
              {kalemler.map((k, i) => {
                const odenmisAdet = odenmisMap[i] ?? 0;
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
                      {odenmisAdet > 0 && !bitti && (
                        <em className="odendi-rozet">{odenmisAdet} ödendi</em>
                      )}
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

            {(tahsilatlar ?? []).length > 0 && (
              <div className="tahsilat-gecmis">
                <p className="gecmis-baslik">Alınan Ödemeler</p>
                {tahsilatlar.map((o, i) => (
                  <div key={i} className="gecmis-satir">
                    <span className="gecmis-tip">{o.tip}</span>
                    <span className="gecmis-tutar">₺{o.tutar}</span>
                    <button
                      className="gecmis-sil"
                      onClick={(e) => {
                        e.stopPropagation();
                        const yeni = tahsilatlar.filter((_, j) => j !== i);
                        setTahsilatlar(yeni);
                        onKaydet(yeni);
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tahsilat-sag">
            <div className="tahsilat-tutarlar">
              {indirim > 0 && (
                <div className="tutar-satir indirim">
                  <span>İndirim</span><span>−₺{indirim}</span>
                </div>
              )}
              {odenen > 0 && (
                <div className="tutar-satir odendi">
                  <span>Ödenen</span><span>₺{odenen}</span>
                </div>
              )}
              <div className="tutar-satir kalan-satir">
                <span>Kalan</span><strong>₺{kalan}</strong>
              </div>
            </div>

            <div className="odeme-numpad">
              <input
                className="numpad-ekran"
                type="number"
                placeholder={`₺${kalan}`}
                value={girilen}
                onChange={(e) => { setSecilen({}); setGirilen(e.target.value); }}
              />
              <div className="numpad-grid">
                {["7","8","9","4","5","6","1","2","3","Tümü","0","⌫"].map((t) => (
                  <button key={t} className={t === "Tümü" ? "numpad-tus tum" : "numpad-tus"} onClick={() => numpadTus(t)}>{t}</button>
                ))}
              </div>
              <div className="bolme-kisayol">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => { setSecilen({}); setGirilen(String(Math.ceil(kalan / n))); }}>
                    1/{n}
                  </button>
                ))}
                <button onClick={() => setIndirimAcik(true)}>İndirim</button>
              </div>
            </div>

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

            <div className="tahsilat-alt-butonlar">
              <button className="tahsilat-kaydet" onClick={() => { onKaydet(tahsilatlar); onKapat(); }}>Kaydet</button>
            </div>
          </div>
        </div>
      </aside>

      {indirimAcik && (
        <IndirimModal
          araToplam={araToplam}
          mevcutIndirim={indirim}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar) => { onIndirimDegis(tutar); setIndirimAcik(false); }}
        />
      )}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
    </div>
  );
}