import { useEffect, useState } from "react";
import { Ban, Plus, X } from "lucide-react";

export const renkler = [
  "#e8b4b4",
  "#d4b896",
  "#a8d5c2",
  "#9fc5d8",
  "#c9b8d8",
  "#e0c9a6",
  "#b8d4a8",
  "#d8b8c4",
];

type Hsl = { h: number; s: number; l: number };

function hslToHex({ h, s, l }: Hsl) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const kanal = (n: number) => {
    const k = (n + h / 30) % 12;
    const deger = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * deger)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${kanal(0)}${kanal(8)}${kanal(4)}`;
}

function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const enBuyuk = Math.max(r, g, b);
  const enKucuk = Math.min(r, g, b);
  const fark = enBuyuk - enKucuk;
  const l = (enBuyuk + enKucuk) / 2;

  let h = 0;
  let s = 0;
  if (fark) {
    s = fark / (1 - Math.abs(2 * l - 1));
    h = enBuyuk === r ? ((g - b) / fark) % 6 : enBuyuk === g ? (b - r) / fark + 2 : (r - g) / fark + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

const gecerliHex = (deger: string) => /^#[0-9a-fA-F]{6}$/.test(deger);

// Hazır palet + kendi rengini seçme. Tarayıcının sistem renk penceresi kullanılmıyor —
// siteye yabancı duruyor, kendi modallarımızdaki kuralın aynısı.
export default function RenkSecici({
  renk,
  degistir,
  renksizOlur = false,
}: {
  renk?: string;
  degistir: (r: string | undefined) => void;
  renksizOlur?: boolean;
}) {
  const ozel = renk && !renkler.includes(renk) ? renk : undefined;
  const [acik, setAcik] = useState(false);
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(ozel ?? "#a8d5c2"));

  const cemberdenSec = (e: React.PointerEvent<HTMLDivElement>) => {
    const kutu = e.currentTarget.getBoundingClientRect();
    const yaricap = kutu.width / 2;
    const dx = e.clientX - (kutu.left + yaricap);
    const dy = e.clientY - (kutu.top + yaricap);

    const yeni = {
      h: (Math.atan2(dy, dx) * (180 / Math.PI) + 450) % 360,
      s: Math.min(100, (Math.hypot(dx, dy) / yaricap) * 100),
      l: hsl.l,
    };
    setHsl(yeni);
    degistir(hslToHex(yeni));
  };

  const acikligiDegistir = (l: number) => {
    const yeni = { ...hsl, l };
    setHsl(yeni);
    degistir(hslToHex(yeni));
  };

  // Çember dar bir yerde (ürün penceresinin sol rafı gibi) açıldığında taşıyordu;
  // artık ekranın ortasında kendi penceresinde duruyor. Escape kapatıyor.
  useEffect(() => {
    if (!acik) return;
    const dinle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, [acik]);

  const secili = ozel ?? hslToHex(hsl);
  const aci = ((hsl.h - 90) * Math.PI) / 180;
  const uzaklik = hsl.s / 2; // yüzde cinsinden yarıçapın yarısı

  return (
    <div className="renk-secim">
      {renksizOlur && (
        <button
          className={!renk ? "renk-kutu bos secili" : "renk-kutu bos"}
          onClick={() => degistir(undefined)}
          title="Renksiz"
        >
          <Ban size={14} />
        </button>
      )}

      {renkler.map((r) => (
        <button
          key={r}
          className={r === renk ? "renk-kutu secili" : "renk-kutu"}
          style={{ background: r }}
          onClick={() => {
            degistir(r);
            setAcik(false);
          }}
        />
      ))}

      <button
        className={ozel ? "renk-kutu ozel secili" : "renk-kutu ozel"}
        style={ozel ? { background: ozel } : undefined}
        onClick={() => setAcik(!acik)}
        title="Kendi rengini seç"
      >
        {ozel ? null : <Plus size={14} />}
      </button>

      {acik && (
        <div className="cember-fon" onClick={() => setAcik(false)}>
          <div className="cember-pencere" onClick={(e) => e.stopPropagation()}>
            <header className="cember-ust">
              <h3>Kendi rengini seç</h3>
              <button className="cember-kapat" onClick={() => setAcik(false)} title="Kapat">
                <X size={18} />
              </button>
            </header>

            <div className="cember-alan">
              <div
                className="renk-cember"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  cemberdenSec(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons) cemberdenSec(e);
                }}
              >
                <span
                  className="cember-nokta"
                  style={{
                    left: `${50 + uzaklik * Math.cos(aci)}%`,
                    top: `${50 + uzaklik * Math.sin(aci)}%`,
                  }}
                />
              </div>

              <div className="cember-sag">
                <span className="cember-onizleme" style={{ background: secili }} />

                <label className="aciklik">
                  <span>Açıklık</span>
                  <input
                    type="range"
                    min={25}
                    max={92}
                    value={Math.round(hsl.l)}
                    onChange={(e) => acikligiDegistir(Number(e.target.value))}
                  />
                </label>

                <input
                  className="hex-giris"
                  value={secili}
                  onChange={(e) => {
                    const temiz = "#" + e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                    if (gecerliHex(temiz)) {
                      setHsl(hexToHsl(temiz));
                      degistir(temiz);
                    }
                  }}
                  spellCheck={false}
                />
              </div>
            </div>

            <footer className="cember-alt">
              <button className="up-tus kaydet" onClick={() => setAcik(false)}>Tamam</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
