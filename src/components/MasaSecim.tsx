import { useEffect } from "react";
import { ArrowRightLeft, LockKeyhole, X } from "lucide-react";
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
 * Hedef masa seçici. Salonda bu iş pencereyle değil, masa planının kendisiyle
 * yapılıyor; burada arkada plan olmadığı için pencere kalıyor (kalem taşıma
 * sipariş ekranından açılıyor). Seçim dili salondakiyle aynı: seçilebilen
 * masa mercan çerçeve alıyor, seçilemeyen silikleşmiyor — kilit işaretiyle
 * duruyor ki adı okunur kalsın.
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
  useEffect(() => {
    const kacis = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", kacis);
    return () => document.removeEventListener("keydown", kacis);
  }, [onKapat]);

  const uygun = (m: Masa) =>
    m.id !== haricId &&
    (secilebilirlik === "hepsi" || doluIdler.has(m.id) === (secilebilirlik === "dolu"));
  const uygunSayisi = bolgeler.reduce((t, b) => t + b.masalar.filter(uygun).length, 0);

  return (
    <div className="up-fon ust" onClick={onKapat}>
      <div className="up-modal ms-modal" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          <h3>{baslik}</h3>
          <span className="ms-sayac">
            {uygunSayisi > 0 ? `${uygunSayisi} masa uygun` : "Uygun masa yok"}
          </span>
          <button className="up-kapat" aria-label="Kapat" onClick={onKapat}>
            <X size={19} />
          </button>
        </header>

        <div className="ms-govde">
          <Bilgi>{aciklama}</Bilgi>

          {uygunSayisi === 0 ? (
            <p className="ms-bos">
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
                <section key={bolge.id} className="ms-bolge">
                  <h4>
                    {bolge.ad}
                    <em>{bolge.masalar.filter(uygun).length} uygun</em>
                  </h4>
                  <div className="ms-grid">
                    {bolge.masalar.map((m) => {
                      const secilebilir = uygun(m);
                      const dolu = doluIdler.has(m.id);
                      return (
                        <button
                          key={m.id}
                          className={secilebilir ? "ms-kart uygun" : "ms-kart kilitli"}
                          disabled={!secilebilir}
                          onClick={() => onSec(m)}
                        >
                          <span className="ms-ad">{m.ad}</span>
                          <span className="ms-durum">
                            {secilebilir ? (
                              <>
                                <ArrowRightLeft size={13} />
                                {dolu ? "adisyona ekle" : "buraya taşı"}
                              </>
                            ) : (
                              <>
                                <LockKeyhole size={13} />
                                {m.id === haricId ? "bu masa" : dolu ? "dolu" : "boş"}
                              </>
                            )}
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
    </div>
  );
}
