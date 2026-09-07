import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { eslesiyor } from "../arama";
import type { LucideIcon } from "lucide-react";

export type Sekme = {
  /** Bölümü ayırt eden değer — yol ya da görünüm adı, ekran ne kullanıyorsa. */
  kod: string;
  ad: string;
  ikon?: LucideIcon;
  /** Bölümün arkasında kaç kayıt var. Sıfır da yazılıyor: "boş" bilgidir. */
  sayi?: number;
};

/**
 * Sayfa başlığındaki bölüm seçici. Menü Stüdyosu'nda 7, Ayarlar'da 8, Analiz'de
 * 9 bölüm var; yatay sekme şeridi bu kadarını taşımıyordu. Burada başlıkta tek
 * düğme duruyor, bölümler tıklanınca ızgara hâlinde açılıyor.
 *
 * Alt bölümü olan ekranlarda (Personel, Yazıcılar) alt bölümler bu pencereye
 * girmiyor: başlığın altındaki şeritte açıkta duruyorlar — sık geçiş yapılan
 * yerler bir pencere arkasına saklanmamalı.
 */
export default function BolumSecici({
  baslik,
  sekmeler,
  secili,
  sec,
}: {
  baslik: string;
  sekmeler: Sekme[];
  secili: string;
  sec: (kod: string) => void;
}) {
  const [acik, setAcik] = useState(false);
  const [ara, setAra] = useState("");

  const simdiki = sekmeler.find((s) => s.kod === secili) ?? sekmeler[0];

  const Ikon = simdiki?.ikon;

  const gorunen = useMemo(
    () => sekmeler.filter((s) => eslesiyor(s.ad, ara)),
    [sekmeler, ara]
  );

  useEffect(() => {
    if (!acik) return;
    const kacis = (e: KeyboardEvent) => e.key === "Escape" && setAcik(false);
    document.addEventListener("keydown", kacis);
    return () => document.removeEventListener("keydown", kacis);
  }, [acik]);

  const git = (kod: string) => {
    setAcik(false);
    setAra("");
    if (kod !== secili) sec(kod);
  };

  const kart = (s: Sekme) => {
    const SIkon = s.ikon;
    return (
      <button
        key={s.kod}
        className={s.kod === secili ? "bs-kart secili" : "bs-kart"}
        onClick={() => git(s.kod)}
      >
        <span className="bs-kart-im">{SIkon && <SIkon size={19} />}</span>
        <span className="bs-kart-ad">{s.ad}</span>
        {s.sayi !== undefined && <em className="bs-kart-sayi">{s.sayi}</em>}
      </button>
    );
  };

  return (
    <>
      <button className="bs-dugme" onClick={() => setAcik(true)}>
        <span className="bs-ust">{baslik}</span>
        <span className="bs-simdiki">
          {Ikon && <Ikon size={19} />}
          {simdiki?.ad}
          <ChevronDown size={18} />
        </span>
      </button>

      {acik && (
        <div className="up-fon" onClick={() => setAcik(false)}>
          <div className="up-modal bs-modal" onClick={(e) => e.stopPropagation()}>
            <header className="up-ust">
              <h3>{baslik}</h3>
              <button className="up-kapat" aria-label="Kapat" onClick={() => setAcik(false)}>
                <X size={19} />
              </button>
            </header>

            <div className="bs-ara">
              <Search size={16} />
              <input
                value={ara}
                onChange={(e) => setAra(e.target.value)}
                placeholder="Bölüm ara"
                autoFocus
                // Yazıp Enter'a basmak fareye uzanmaktan hızlı.
                onKeyDown={(e) => e.key === "Enter" && gorunen[0] && git(gorunen[0].kod)}
              />
            </div>

            <div className="bs-izgara">{gorunen.map(kart)}</div>
          </div>
        </div>
      )}
    </>
  );
}
