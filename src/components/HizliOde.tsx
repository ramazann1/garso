import { useEffect, useState } from "react";
import { CircleCheckBig, Percent, Wallet, X, Zap } from "lucide-react";
import IndirimModal from "./IndirimModal";
import OnayModal from "./OnayModal";
import OdemeTipDugmeleri from "./OdemeTipDugmeleri";
import { odemeTipleriniGetir } from "../odemeTipleri";
import type { OdemeTipi } from "../odemeTipleri";

type Props = {
  baslik: string;
  araToplam: number;
  indirim: number;
  toplam: number;
  odenen: number;
  kalan: number;
  onIndirimDegis: (tutar: number) => void;
  onSec: (tip: string, tutar: number, kapat: boolean, bahsis?: number) => void;
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
  // Kalandan fazla girilen tutar onaya düşer: üstü bahşiş mi, yanlış giriş mi?
  const [bahsisSorusu, setBahsisSorusu] = useState<{ tip: string; bahsis: number } | null>(null);

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
      setBahsisSorusu({ tip, bahsis: tutar - kalan });
      return;
    }
    gonder(tip, tutar);
  };

  // Tahsilat kalanı kapatmıyorsa adisyon açık kalmalı; yarım ödemeyle masa
  // kapanırsa geri kalan tutar kaybolur. Bahşiş kalanı azaltmadığı için
  // tahsilata kalanın kendisi yazılır, üstü ayrı gider.
  const gonder = (tip: string, tutar: number, bahsis?: number) => {
    setGonderiliyor(true);
    onSec(tip, tutar, kapat && tutar >= kalan, bahsis);
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
          <OdemeTipDugmeleri tipler={odemeTipleri} pasif={gonderiliyor} onSec={tahsilEt} />
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

      {bahsisSorusu && (
        <OnayModal
          mesaj={`Girilen tutar kalandan ₺${bahsisSorusu.bahsis} fazla. Üstü bahşiş olarak yazılsın mı?`}
          onayMetni="Bahşiş yaz"
          onOnay={() => {
            gonder(bahsisSorusu.tip, kalan, bahsisSorusu.bahsis);
            setBahsisSorusu(null);
          }}
          onKapat={() => setBahsisSorusu(null)}
        />
      )}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
    </div>
  );
}
