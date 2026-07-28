import { useState } from "react";
import type { Urun } from "../types";

type Props = {
  urun: Urun;
  onEkle: (porsiyon: string | undefined, fiyat: number, secimler: string[]) => void;
  onKapat: () => void;
};

export default function UrunSecim({ urun, onEkle, onKapat }: Props) {
  const [porsiyon, setPorsiyon] = useState(urun.porsiyonlar?.[0]);
  const [secimler, setSecimler] = useState<string[]>([]);

  const sec = (grup: { tekli: boolean; liste: string[] }, deger: string) => {
    setSecimler((s) => {
      if (grup.tekli) {
        const digerleri = s.filter((x) => !grup.liste.includes(x));
        return [...digerleri, deger];
      }
      return s.includes(deger) ? s.filter((x) => x !== deger) : [...s, deger];
    });
  };

  return (
    <div className="perde" onClick={onKapat}>
      <div className="pencere" onClick={(e) => e.stopPropagation()}>
        <h3>{urun.ad}</h3>

        {urun.porsiyonlar && (
          <div className="grup">
            <span className="grup-ad">Porsiyon</span>
            <div className="secim-liste">
              {urun.porsiyonlar.map((p) => (
                <button
                  key={p.ad}
                  className={porsiyon?.ad === p.ad ? "secim aktif" : "secim"}
                  onClick={() => setPorsiyon(p)}
                >
                  {p.ad} · ₺{p.fiyat}
                </button>
              ))}
            </div>
          </div>
        )}

        {urun.secenekler?.map((grup) => (
          <div className="grup" key={grup.ad}>
            <span className="grup-ad">{grup.ad}</span>
            <div className="secim-liste">
              {grup.liste.map((deger) => (
                <button
                  key={deger}
                  className={secimler.includes(deger) ? "secim aktif" : "secim"}
                  onClick={() => sec(grup, deger)}
                >
                  {deger}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          className="kaydet"
          onClick={() => onEkle(porsiyon?.ad, porsiyon?.fiyat ?? urun.fiyat, secimler)}
        >
          Ekle
        </button>
      </div>
    </div>
  );
}