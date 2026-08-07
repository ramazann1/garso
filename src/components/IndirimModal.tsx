import { useState } from "react";
import { Check, Delete, Percent } from "lucide-react";
import OnayModal from "./OnayModal";

type Props = {
  baslik?: string;
  araToplam: number;
  mevcutIndirim: number;
  onKapat: () => void;
  onUygula: (tutar: number) => void;
};

export default function IndirimModal({ baslik, araToplam, mevcutIndirim, onKapat, onUygula }: Props) {
  const [mod, setMod] = useState<"yuzde" | "tutar">("tutar");
  const [tutarGirdi, setTutarGirdi] = useState(mevcutIndirim > 0 ? String(mevcutIndirim) : "");
  const [yuzdeGirdi, setYuzdeGirdi] = useState("");
  const [uyari, setUyari] = useState<string | null>(null);
  const girdi = mod === "tutar" ? tutarGirdi : yuzdeGirdi;
  const setGirdi = (guncelle: (onceki: string) => string) =>
    mod === "tutar" ? setTutarGirdi(guncelle) : setYuzdeGirdi(guncelle);

  const hesapla = () => {
    const sayi = Number(girdi);
    if (!sayi || sayi <= 0) return 0;
    if (mod === "yuzde") return Math.round((araToplam * sayi) / 100);
    return sayi;
  };

  const uygula = () => {
    const tutar = hesapla();
    if (tutar > araToplam) { setUyari("İndirim toplam tutardan büyük olamaz"); return; }
    onUygula(tutar);
  };

  const numpadTus = (v: string) => {
    if (v === "←") { setGirdi((g) => g.slice(0, -1)); return; }
    setGirdi((g) => g + v);
  };

  const onizleme = hesapla();

  return (
    <div className="modal-fon" onClick={onKapat}>
      <div className="indirim-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-baslik">
          <Percent size={18} />
          {baslik ?? "İndirim Uygula"}
        </h3>
        <div className="mod-sec">
          <button className={mod === "tutar" ? "aktif" : ""} onClick={() => setMod("tutar")}>Tutar</button>
          <button className={mod === "yuzde" ? "aktif" : ""} onClick={() => setMod("yuzde")}>Yüzde</button>
        </div>
        <div className="onizleme">
          Uygulanacak İndirim: <strong>{mod === "yuzde" ? `%${girdi || "0"}` : `₺${girdi || "0"}`}</strong>
          {onizleme > 0 && <span> (₺{onizleme})</span>}
        </div>
        <div className="numpad">
          {["7","8","9","4","5","6","1","2","3",".","0","←"].map((t) => (
            <button key={t} onClick={() => numpadTus(t)}>
              {t === "←" ? <Delete size={19} /> : t}
            </button>
          ))}
        </div>
        <div className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Kapat</button>
          <button className="uygula" onClick={uygula}>
            <Check size={17} />
            Kaydet ve Kapat
          </button>
        </div>
      </div>

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
    </div>
  );
}