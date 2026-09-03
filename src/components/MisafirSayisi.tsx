import { useEffect, useState } from "react";
import { Check, Users, X } from "lucide-react";

/**
 * "Kaç misafir?" sorusu — misafir sayısı zorunlu tutulduğunda masaya girer girmez
 * çıkıyor. Kaydetme anında sormak geç: garson siparişi yazmış, gitmek üzere.
 *
 * Kalabalık masa nadir olduğu için hazır rakamlar tek dokunuşa yetiyor; daha
 * fazlası için altta kutu var. Sayaç denenmedi bile — altı kişilik masada altı
 * kez bastırıyor. Vazgeçen salona dönüyor, çünkü sayı girilmeden bu masada
 * satış yapılamıyor; pencerenin tek çıkışı o.
 *
 * Telefon da bu pencereyi açıyor, kendi kopyası yok — fark yalnız CSS'te.
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

  useEffect(() => {
    const kacis = (e: KeyboardEvent) => e.key === "Escape" && onVazgec();
    document.addEventListener("keydown", kacis);
    return () => document.removeEventListener("keydown", kacis);
  }, [onVazgec]);

  return (
    <div className="up-fon">
      <div className="up-modal mis-modal">
        <header className="up-ust">
          <span className="mis-im">
            <Users size={18} />
          </span>
          <h3>Misafir sayısı</h3>
          <button className="up-kapat" aria-label="Salona dön" onClick={onVazgec}>
            <X size={19} />
          </button>
        </header>

        <div className="mis-govde">
          <div className="mis-tuslar">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button key={n} onClick={() => onSec(n)}>
                {n}
              </button>
            ))}
          </div>

          <div className="mis-diger">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Daha kalabalık"
              value={digeri}
              onChange={(e) => setDigeri(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sayi >= 1 && onSec(sayi)}
            />
            <button disabled={!(sayi >= 1)} aria-label="Onayla" onClick={() => onSec(sayi)}>
              <Check size={19} />
            </button>
          </div>
        </div>

        <footer className="mis-alt">
          <button onClick={onVazgec}>Vazgeç, salona dön</button>
        </footer>
      </div>
    </div>
  );
}
