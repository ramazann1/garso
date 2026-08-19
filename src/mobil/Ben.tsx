import { useState } from "react";
import { Lock, LogOut, Monitor } from "lucide-react";
import OnayModal from "../components/OnayModal";
import { kilitle, oturumuKapat, useOturum } from "../oturum";
import { isletmeAdi } from "../isletmeAyarlari";
import { kilitliMi } from "../cikisKilidi";
import { GARSO_SURUM } from "../surum";
import { gorunumSec } from "./mobilTercih";

/**
 * Kişinin kendi sekmesi: kim olarak girdiği, cihazı bırakırken kilitlemesi ve
 * çıkışı. Masaüstü görünüme geçiş de burada — patron aynı telefondan ayar
 * ekranlarına girmek isteyebiliyor.
 */
export default function Ben() {
  const { oturum } = useOturum();
  const [cikisOnay, setCikisOnay] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);

  function cikisDene() {
    // Yarım kalmış sipariş varsa çıkış kaydı götürür; ekranın kendi kilidi
    // uyarıyor, tarayıcının popup'ı kullanılmıyor.
    if (kilitliMi()) {
      setUyari("Kaydedilmemiş bir sipariş var. Önce onu bitirin.");
      return;
    }
    setCikisOnay(true);
  }

  return (
    <>
      <header className="m-baslik">
        <h1>Ben</h1>
      </header>

      <div className="m-kisi">
        <div className="m-kisi-ad">{oturum?.ad ?? "—"}</div>
        <div className="m-kisi-alt">
          {oturum?.rolAd} · {isletmeAdi()}
        </div>
      </div>

      <div className="m-liste">
        <button className="m-satir" onClick={kilitle}>
          <Lock size={19} />
          <span>
            Ekranı kilitle
            <small>Telefonu bırakırken; oturum kapanmaz, adisyonlar yerinde kalır.</small>
          </span>
        </button>

        <button className="m-satir" onClick={() => gorunumSec("masaustu")}>
          <Monitor size={19} />
          <span>
            Masaüstü görünüme geç
            <small>Ayarlar, menü ve raporların tam ekranları.</small>
          </span>
        </button>

        <button className="m-satir tehlikeli" onClick={cikisDene}>
          <LogOut size={19} />
          <span>Çıkış yap</span>
        </button>
      </div>

      <div className="m-surum">Garso {GARSO_SURUM}</div>

      {cikisOnay && (
        <OnayModal
          baslik="Çıkış"
          mesaj="Oturumu kapatmak istediğinize emin misiniz?"
          onayMetni="Çıkış yap"
          onOnay={() => {
            setCikisOnay(false);
            oturumuKapat();
          }}
          onKapat={() => setCikisOnay(false)}
        />
      )}

      {uyari && <OnayModal tekTus mesaj={uyari} onKapat={() => setUyari(null)} />}
    </>
  );
}
