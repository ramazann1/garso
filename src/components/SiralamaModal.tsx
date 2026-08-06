import { useRef, useState } from "react";
import Bilgi from "./Bilgi";

type Satir = { id: number; ad: string };

function tasi<T>(liste: T[], nereden: number, nereye: number) {
  const kopya = liste.slice();
  const [alinan] = kopya.splice(nereden, 1);
  kopya.splice(nereye, 0, alinan);
  return kopya;
}

// Sıralama ayrı modalda yapılıyor — listedeki tıklama davranışlarıyla (kategori
// seçme, ürün paneli açma) çakışmasın diye. Sürükleme pointer olaylarıyla:
// tarayıcının hazır draggable'ı dokunmatik ekranda çalışmıyor.
export default function SiralamaModal({
  baslik,
  satirlar,
  onKapat,
  onKaydet,
}: {
  baslik: string;
  satirlar: Satir[];
  onKapat: () => void;
  onKaydet: (idler: number[]) => void;
}) {
  const [liste, setListe] = useState(satirlar);
  const [tasinan, setTasinan] = useState<number | null>(null);
  const [kayma, setKayma] = useState(0);
  const bilgi = useRef({ y: 0, index: 0, adim: 0 });

  const basla = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    const el = e.currentTarget;
    bilgi.current = {
      y: e.clientY,
      index: i,
      adim: el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom),
    };
    setTasinan(i);
    setKayma(0);
    el.setPointerCapture(e.pointerId);
  };

  const hareket = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tasinan === null) return;
    const fark = e.clientY - bilgi.current.y;
    setKayma(fark);

    const hedef = Math.min(
      liste.length - 1,
      Math.max(0, bilgi.current.index + Math.round(fark / bilgi.current.adim))
    );
    if (hedef !== tasinan) {
      setListe((l) => tasi(l, tasinan, hedef));
      setTasinan(hedef);
    }
  };

  const bitir = () => {
    setTasinan(null);
    setKayma(0);
  };

  // Sürüklenen satır listede yer değiştirdikçe kendi yeni yerinden ne kadar
  // sapması gerektiği: parmağın toplam kayması eksi atladığı satır sayısı.
  const gorselKayma =
    tasinan === null ? 0 : kayma - (tasinan - bilgi.current.index) * bilgi.current.adim;

  const alfabetik = () => {
    setListe((l) => l.slice().sort((a, b) => a.ad.localeCompare(b.ad, "tr")));
  };

  return (
    <div className="modal-fon" onClick={onKapat}>
      <div className="sirala-modal" onClick={(e) => e.stopPropagation()}>
        <header className="sirala-ust">
          <h3>{baslik}</h3>
          <button className="sirala-az" onClick={alfabetik}>A-Z</button>
        </header>

        <Bilgi>Satırları tutup sürükleyerek sırayı değiştir.</Bilgi>

        <div className="sirala-liste">
          {liste.map((s, i) => (
            <div
              key={s.id}
              className={i === tasinan ? "sirala-satir tasiniyor" : "sirala-satir"}
              style={i === tasinan ? { transform: `translateY(${gorselKayma}px)` } : undefined}
              onPointerDown={(e) => basla(e, i)}
              onPointerMove={hareket}
              onPointerUp={bitir}
              onPointerCancel={bitir}
            >
              <span className="sirala-tutamac">≡</span>
              <span className="sirala-no">{i + 1}</span>
              <span className="sirala-ad">{s.ad}</span>
            </div>
          ))}
        </div>

        <div className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" onClick={() => onKaydet(liste.map((s) => s.id))}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
