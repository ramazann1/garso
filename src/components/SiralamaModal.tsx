import { useEffect, useRef, useState } from "react";
import { ArrowDownAZ, ArrowUpDown, GripVertical, X } from "lucide-react";
import Bilgi from "./Bilgi";

type Satir = { id: number; ad: string };

function tasi<T>(liste: T[], nereden: number, nereye: number) {
  const kopya = liste.slice();
  const [alinan] = kopya.splice(nereden, 1);
  kopya.splice(nereye, 0, alinan);
  return kopya;
}

// Sıralama ayrı pencerede yapılıyor — listedeki tıklama davranışlarıyla (kategori
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
  const [yazilan, setYazilan] = useState<{ i: number; deger: string } | null>(null);
  const bilgi = useRef({ y: 0, index: 0, adim: 0 });

  // Uzun listede sürüklemek yorucu: numaraya dokunup yeni sırayı yazmak da
  // aynı işi görüyor. Liste dışı bir sayı yazılırsa en yakın uca çekiliyor.
  const numarayiUygula = (i: number, deger: string) => {
    setYazilan(null);
    const sayi = parseInt(deger, 10);
    if (!Number.isFinite(sayi)) return;
    const hedef = Math.min(liste.length - 1, Math.max(0, sayi - 1));
    if (hedef !== i) setListe((l) => tasi(l, i, hedef));
  };

  useEffect(() => {
    const kacis = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", kacis);
    return () => document.removeEventListener("keydown", kacis);
  }, [onKapat]);

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
    <div className="up-fon">
      <div className="up-modal sr-modal">
        <header className="up-ust">
          <span className="sr-im">
            <ArrowUpDown size={18} />
          </span>
          <h3>{baslik}</h3>
          <button className="sr-az" onClick={alfabetik}>
            <ArrowDownAZ size={16} />
            Alfabetik
          </button>
          <button className="up-kapat" aria-label="Kapat" onClick={onKapat}>
            <X size={19} />
          </button>
        </header>

        <div className="sr-govde">
          <Bilgi>
            Satırı tutup sürükleyin ya da sıra numarasına dokunup yeni sırayı yazın.
          </Bilgi>

          <div className="sr-liste">
            {liste.map((s, i) => (
              <div
                key={s.id}
                className={i === tasinan ? "sr-satir tasiniyor" : "sr-satir"}
                style={i === tasinan ? { transform: `translateY(${gorselKayma}px)` } : undefined}
                onPointerDown={(e) => basla(e, i)}
                onPointerMove={hareket}
                onPointerUp={bitir}
                onPointerCancel={bitir}
              >
                {yazilan?.i === i ? (
                  <input
                    className="sr-no yazilir"
                    value={yazilan.deger}
                    autoFocus
                    inputMode="numeric"
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setYazilan({ i, deger: e.target.value.replace(/\D/g, "").slice(0, 3) })
                    }
                    onBlur={() => numarayiUygula(i, yazilan.deger)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") numarayiUygula(i, yazilan.deger);
                      if (e.key === "Escape") setYazilan(null);
                    }}
                  />
                ) : (
                  <button
                    className="sr-no"
                    title="Sıra numarasını yaz"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setYazilan({ i, deger: String(i + 1) })}
                  >
                    {i + 1}
                  </button>
                )}
                <span className="sr-ad">{s.ad}</span>
                <GripVertical className="sr-tutamac" size={18} />
              </div>
            ))}
          </div>
        </div>

        <footer className="sr-alt">
          <button className="sr-vazgec" onClick={onKapat}>Vazgeç</button>
          <button className="sr-kaydet" onClick={() => onKaydet(liste.map((s) => s.id))}>
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}
