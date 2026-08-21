import { useState } from "react";
import { Check, Users } from "lucide-react";

/**
 * "Kaç misafir?" sorusu — misafir sayısı zorunlu tutulduğunda masaya girer girmez
 * çıkıyor. Kaydetme anında sormak geç: garson siparişi yazmış, gitmek üzere.
 *
 * Kalabalık masa nadir olduğu için hazır rakamlar tek dokunuşa yetiyor; daha
 * fazlası için altta kutu var. Vazgeçen salona dönüyor, çünkü sayı girilmeden
 * bu masada satış yapılamıyor.
 */
export default function MisafirSayisi({
  onSec,
  onVazgec,
}: {
  onSec: (kisi: number) => void;
  onVazgec: () => void;
}) {
  const [digeri, setDigeri] = useState("");
  const sayi = Number(digeri);

  return (
    <div className="modal-fon">
      <div className="misafir-modal">
        <h3 className="modal-baslik">
          <Users size={18} />
          Misafir Sayısı ?
        </h3>

        <div className="misafir-tuslar">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button key={n} onClick={() => onSec(n)}>
              {n}
            </button>
          ))}
        </div>

        <div className="misafir-diger">
          <input
            type="number"
            min={1}
            placeholder="Daha kalabalık"
            value={digeri}
            onChange={(e) => setDigeri(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sayi >= 1 && onSec(sayi)}
          />
          <button disabled={!(sayi >= 1)} onClick={() => onSec(sayi)}>
            <Check size={18} />
          </button>
        </div>

        <button className="misafir-vazgec" onClick={onVazgec}>
          Vazgeç, salona dön
        </button>
      </div>
    </div>
  );
}
