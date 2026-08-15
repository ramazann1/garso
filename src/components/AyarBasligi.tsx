import { useLocation, useNavigate } from "react-router-dom";
import AramaKutusu from "./AramaKutusu";
import KopruIndir from "./KopruIndir";
import { ayarBolumleri } from "./Duzen";

// İşletme Ayarları'nın ortak başlığı: üstte ana bölümler, altında o bölümün
// kendi sekmeleri. Üç ayar ekranı da aynı şeridi çizsin diye tek yerde duruyor.
export default function AyarBasligi({
  ara,
  araDegistir,
  araYer,
}: {
  ara?: string;
  araDegistir?: (deger: string) => void;
  araYer?: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Kendi alt sekmeleri olan her bölüm (Personel, Yazıcılar) ikinci şeridi
  // çiziyor; liste Duzen'de tek yerde duruyor.
  const bolum = ayarBolumleri.find((b) => b.alt?.some((a) => a.yol === pathname));
  const altSerit = bolum?.alt ?? null;
  const yaziciBolumu = bolum?.ad === "Yazıcılar";

  return (
    <header className="menu-baslik">
      <div className="ayar-baslik-ust">
        <h1>İşletme Ayarları</h1>
        {araDegistir && (
          <AramaKutusu deger={ara ?? ""} degistir={araDegistir} yer={araYer} />
        )}
      </div>
      <div className="ms-sekmeler">
        {ayarBolumleri.map((b) => {
          const aktif = b.alt ? b.alt.some((a) => a.yol === pathname) : pathname === b.yol;
          return (
            <button
              key={b.yol}
              className={aktif ? "aktif" : ""}
              onClick={() => navigate(b.yol)}
            >
              {b.ad}
            </button>
          );
        })}
      </div>

      {altSerit && (
        <div className="ayar-alt-satir">
          <div className="ms-sekmeler alt">
            {altSerit.map((b) => (
              <button
                key={b.yol}
                className={pathname === b.yol ? "aktif" : ""}
                onClick={() => navigate(b.yol)}
              >
                {b.ad}
              </button>
            ))}
          </div>

          {/* Kasa programı Yazıcılar bölümünün her sekmesinde elin altında:
              yazıcı tanımlayan kişi onu kurmadan hiçbirini çalıştıramıyor. */}
          {yaziciBolumu && <KopruIndir />}
        </div>
      )}
    </header>
  );
}
