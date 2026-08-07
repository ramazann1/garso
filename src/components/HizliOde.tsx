import { useEffect, useState } from "react";
import { CircleCheckBig, Percent, Wallet, X, Zap } from "lucide-react";
import { OdemeIkon } from "../odemeIkon";
import IndirimModal from "./IndirimModal";
import OnayModal from "./OnayModal";
import { odemeTipleriniGetir } from "../adisyonlar";
import type { OdemeTipi } from "../adisyonlar";

type Props = {
  baslik: string;
  araToplam: number;
  indirim: number;
  toplam: number;
  odenen: number;
  kalan: number;
  onIndirimDegis: (tutar: number) => void;
  onSec: (tip: string, tutar: number, kapat: boolean) => void;
  onKapat: () => void;
};

/**
 * Tek dokunuşla hesap kapatma: ödeme tipine basıldığı anda tahsilat işlenir.
 * Kalem seçimi ve numpad yok — masada duran garson için tam tahsilat paneli
 * ağır kalıyor. Tutar kutusu boş bırakılırsa kalanın tamamı tahsil edilir.
 */
export default function HizliOde({
  baslik,
  araToplam,
  indirim,
  toplam,
  odenen,
  kalan,
  onIndirimDegis,
  onSec,
  onKapat,
}: Props) {
  const [odemeTipleri, setOdemeTipleri] = useState<OdemeTipi[]>([]);
  const [girilen, setGirilen] = useState("");
  // Varsayılan "öde ve kapat"; hesabı kapatmadan tahsilat işlemek isteyen
  // (masa oturmaya devam ediyor) diğer seçeneğe geçiyor.
  const [kapat, setKapat] = useState(true);
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    odemeTipleriniGetir().then(setOdemeTipleri);
  }, []);

  useEffect(() => {
    const kacisTusu = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", kacisTusu);
    return () => document.removeEventListener("keydown", kacisTusu);
  }, [onKapat]);

  const tahsilEt = (tip: string) => {
    const tutar = girilen ? Number(girilen) : kalan;
    if (!(tutar > 0)) {
      setUyari("Tahsil edilecek tutarı girin.");
      return;
    }
    if (tutar > kalan) {
      setUyari(`Tutar kalandan büyük olamaz (kalan ₺${kalan}).`);
      return;
    }
    // Tahsilat kalanı kapatmıyorsa adisyon açık kalmalı; yarım ödemeyle masa
    // kapanırsa geri kalan tutar kaybolur.
    setGonderiliyor(true);
    onSec(tip, tutar, kapat && tutar >= kalan);
  };

  return (
    <div className="modal-fon" onClick={onKapat}>
      <div className="hizli-ode" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>
            <Zap size={18} />
            Hızlı Öde — {baslik}
          </h3>
          <button className="kapat" aria-label="Kapat" onClick={onKapat}>
            <X size={20} />
          </button>
        </header>

        <div className="hizli-tutar">
          <div className="hizli-satir">
            <span>Toplam</span>
            <span>₺{toplam}</span>
          </div>
          {indirim > 0 && (
            <div className="hizli-satir indirim">
              <span>İndirim</span>
              <span>−₺{indirim}</span>
            </div>
          )}
          {odenen > 0 && (
            <div className="hizli-satir odendi">
              <span>Ödenen</span>
              <span>₺{odenen}</span>
            </div>
          )}
          <div className="hizli-satir kalan">
            <span>Kalan</span>
            <strong>₺{kalan}</strong>
          </div>
        </div>

        <div className="hizli-aksiyon">
          <button
            className={kapat ? "aktif" : ""}
            onClick={() => setKapat(true)}
          >
            <CircleCheckBig size={16} />
            Öde ve kapat
          </button>
          <button
            className={kapat ? "" : "aktif"}
            onClick={() => setKapat(false)}
          >
            <Wallet size={16} />
            Öde, açık kalsın
          </button>
        </div>

        <div className="hizli-giris">
          <input
            type="number"
            placeholder={`Tahsil edilecek: ₺${kalan}`}
            value={girilen}
            onChange={(e) => setGirilen(e.target.value)}
          />
          <button className="hizli-indirim" onClick={() => setIndirimAcik(true)}>
            <Percent size={15} />
            İndirim
          </button>
        </div>

        <p className="hizli-aciklama">
          {kapat
            ? "Ödeme tipine basınca tutar tahsil edilir; kalan sıfırlanırsa adisyon kapanır."
            : "Ödeme tipine basınca tutar tahsil edilir, adisyon açık kalır."}
        </p>

        <div className="hizli-tipler">
          {odemeTipleri.map(({ id, ad, renk }) => (
            <button
              key={id}
              className="odeme-tip-btn"
              style={{ background: renk }}
              disabled={gonderiliyor}
              onClick={() => tahsilEt(ad)}
            >
              <OdemeIkon ad={ad} />
              {ad}
            </button>
          ))}
        </div>
      </div>

      {indirimAcik && (
        <IndirimModal
          araToplam={araToplam}
          mevcutIndirim={indirim}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar) => {
            onIndirimDegis(tutar);
            setGirilen("");
            setIndirimAcik(false);
          }}
        />
      )}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
    </div>
  );
}
