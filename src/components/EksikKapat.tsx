import { useState } from "react";
import { HandCoins, X } from "lucide-react";
import { paraGoster } from "../para";

// Hesabın eksik kapanma sebepleri; hepsi "para nerede kaldı" sorusunun cevabı.
const SEBEPLER = [
  "Müşteri sonra ödeyecek",
  "Personel hesabına yazıldı",
  "Tahsil edilemedi",
  "İşletme ikramı",
];

/**
 * Parası eksik kalan hesabı kapatır. Borcun kime yazıldığı zorunlu: kapanmış
 * ama ödenmemiş hesabın sahibi belli olmazsa para kimseden istenemiyor.
 * Cari hesap modülünün ilk adımı bu alan.
 */
export default function EksikKapat({
  kalan,
  musteri,
  onKapat,
  onOnay,
}: {
  kalan: number;
  /** Adisyonda müşteri adı varsa alan onunla açılıyor. */
  musteri?: string;
  onKapat: () => void;
  onOnay: (kisi: string, sebep: string) => void;
}) {
  const [kisi, setKisi] = useState(musteri ?? "");
  const [secili, setSecili] = useState("");
  const [serbest, setSerbest] = useState("");

  const sebep = secili === "diger" ? serbest.trim() : secili;
  const kapatilabilir = !!kisi.trim() && !!sebep;

  return (
    <div className="onay-fon" onClick={onKapat}>
      <div className="onay-modal baslikli" onClick={(e) => e.stopPropagation()}>
        <div className="onay-ust">
          <span className="onay-im"><HandCoins size={20} /></span>
          <h3>Eksik kapat</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </div>

        <div className="eksik-tutar">
          <span>Tahsil edilmeyen tutar</span>
          <strong>{paraGoster(kalan)}</strong>
        </div>

        <p>
          Hesap kapanacak ama bu para kasaya girmeyecek. Ciroda görünmeye devam eder,
          Analiz'de eksik tahsilat olarak işaretlenir.
        </p>

        <div className="eksik-alan">
          <label htmlFor="eksik-kisi">Kime yazıldı</label>
          <input
            id="eksik-kisi"
            autoFocus
            value={kisi}
            onChange={(e) => setKisi(e.target.value)}
            placeholder="Müşteri ya da personel adı"
          />
        </div>

        <div className="onay-sebepler">
          {SEBEPLER.map((s) => (
            <button
              key={s}
              className={secili === s ? "onay-sebep secili" : "onay-sebep"}
              onClick={() => setSecili(s)}
            >
              {s}
            </button>
          ))}
          <button
            className={secili === "diger" ? "onay-sebep secili" : "onay-sebep"}
            onClick={() => setSecili("diger")}
          >
            Diğer
          </button>
          {secili === "diger" && (
            <input
              className="onay-sebep-metin"
              value={serbest}
              onChange={(e) => setSerbest(e.target.value)}
              placeholder="Sebebi yazın"
            />
          )}
        </div>

        <div className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula tehlikeli"
            disabled={!kapatilabilir}
            onClick={() => onOnay(kisi.trim(), sebep)}
          >
            Eksik kapat
          </button>
        </div>
      </div>
    </div>
  );
}
