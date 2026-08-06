import { Lock, X } from "lucide-react";
import Bilgi from "./Bilgi";
import type { Bolge, Masa } from "../types";

type Props = {
  baslik: string;
  aciklama: string;
  bolgeler: Bolge[];
  /** Dolu masaların kimlikleri — rozet ve seçilebilirlik buradan hesaplanıyor. */
  doluIdler: Set<number>;
  /** Hangi masalar tıklanabilir: boş olanlar, dolu olanlar ya da hepsi. */
  secilebilirlik: "bos" | "dolu" | "hepsi";
  haricId: number;
  onSec: (masa: Masa) => void;
  onKapat: () => void;
};

/**
 * Hedef masa seçici. Seçilemeyen masa silikleştirilmiyor — kilit işaretiyle
 * gösteriliyor ki neden tıklanamadığı okunur kalsın.
 */
export default function MasaSecim({
  baslik,
  aciklama,
  bolgeler,
  doluIdler,
  secilebilirlik,
  haricId,
  onSec,
  onKapat,
}: Props) {
  const uygun = (m: Masa) =>
    m.id !== haricId &&
    (secilebilirlik === "hepsi" || doluIdler.has(m.id) === (secilebilirlik === "dolu"));
  const uygunSayisi = bolgeler.reduce((t, b) => t + b.masalar.filter(uygun).length, 0);

  return (
    <div className="onay-fon" onClick={onKapat}>
      <div className="masa-secim" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>{baslik}</h3>
          <button className="masa-secim-kapat" aria-label="Kapat" onClick={onKapat}>
            <X size={18} />
          </button>
        </header>

        <Bilgi>{aciklama}</Bilgi>

        {uygunSayisi === 0 ? (
          <p className="masa-secim-bos">
            {secilebilirlik === "dolu"
              ? "Birleştirilebilecek başka açık masa yok."
              : secilebilirlik === "bos"
                ? "Boş masa yok. Adisyonu taşımak için önce bir masa boşalmalı."
                : "Seçilebilecek başka masa yok."}
          </p>
        ) : (
          bolgeler
            .filter((b) => b.masalar.length > 0)
            .map((bolge) => (
              <section key={bolge.id} className="masa-secim-bolge">
                <h4>{bolge.ad}</h4>
                <div className="masa-secim-grid">
                  {bolge.masalar.map((m) => {
                    const secilebilir = uygun(m);
                    const dolu = doluIdler.has(m.id);
                    return (
                      <button
                        key={m.id}
                        className={secilebilir ? "masa-secim-kart" : "masa-secim-kart kilitli"}
                        disabled={!secilebilir}
                        onClick={() => onSec(m)}
                      >
                        <span className="masa-secim-ad">{m.ad}</span>
                        <span className="masa-secim-durum">
                          {!secilebilir && <Lock size={12} />}
                          {m.id === haricId ? "bu masa" : dolu ? "dolu" : "boş"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
        )}
      </div>
    </div>
  );
}
