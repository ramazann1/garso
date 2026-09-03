import { useState } from "react";
import { Pencil, X } from "lucide-react";
import OdemeTipDugmeleri from "./OdemeTipDugmeleri";
import { ODEME_TIPI_ANAHTAR, odemeTipleriniGetir } from "../odemeTipleri";
import { useTanim } from "../tanimAbonelik";
import type { OdemeTipi } from "../odemeTipleri";
import { paraGoster } from "../para";

// Ödeme tipi hesap kapandıktan sonra en çok "nakit sanıldı, kartla ödendi"
// diye düzeltiliyor; hazır sebepler bunun etrafında.
const SEBEPLER = [
  "Yanlış tuşa basıldı",
  "Müşteri başka türlü ödedi",
  "Kart ödemesi nakit girilmiş",
  "Gün sonu sayımında fark çıktı",
];

/**
 * Kapanmış adisyonun ödeme tipini düzeltir. Tutar değişmiyor — para kasada
 * doğru, yalnız hangi kalemden geldiği yanlış yazılmış. Sebep zorunlu, işlem
 * denetim defterine geçiyor.
 */
export default function OdemeTipDuzelt({
  tip,
  tutar,
  onKaydet,
  onKapat,
}: {
  tip: string;
  tutar: number;
  onKaydet: (yeniTip: string, sebep: string) => void;
  onKapat: () => void;
}) {
  const tipler = useTanim<OdemeTipi[]>(ODEME_TIPI_ANAHTAR, odemeTipleriniGetir, []);
  const [yeniTip, setYeniTip] = useState("");
  const [secili, setSecili] = useState("");
  const [serbest, setSerbest] = useState("");

  const sebep = secili === "diger" ? serbest.trim() : secili;
  const kaydedilebilir = !!yeniTip && yeniTip !== tip && !!sebep;

  return (
    <div className="onay-fon" onClick={onKapat}>
      <div className="onay-modal baslikli genis" onClick={(e) => e.stopPropagation()}>
        <div className="onay-ust">
          <span className="onay-im"><Pencil size={20} /></span>
          <h3>Ödeme tipini düzelt</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </div>

        <p>
          <strong>{tip}</strong> olarak yazılan {paraGoster(tutar)} tutarındaki tahsilat başka bir
          ödeme tipine geçecek. Tutar değişmiyor, hesabın toplamı aynı kalıyor.
        </p>

        <div className="duzelt-tipler">
          <OdemeTipDugmeleri tipler={tipler.filter((t) => t.ad !== tip)} onSec={setYeniTip} />
        </div>

        {yeniTip && (
          <p className="duzelt-secim">
            Yeni ödeme tipi: <strong>{yeniTip}</strong>
          </p>
        )}

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
              autoFocus
              value={serbest}
              onChange={(e) => setSerbest(e.target.value)}
              placeholder="Sebebi yazın"
            />
          )}
        </div>

        <div className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={!kaydedilebilir}
            onClick={() => onKaydet(yeniTip, sebep)}
          >
            Düzelt
          </button>
        </div>
      </div>
    </div>
  );
}
