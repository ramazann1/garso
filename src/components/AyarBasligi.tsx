import { useLocation, useNavigate } from "react-router-dom";
import AramaKutusu from "./AramaKutusu";
import { ayarBolumleri, personelBolumleri } from "./Duzen";

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

  const altSerit = personelBolumleri.some((b) => b.yol === pathname)
    ? personelBolumleri
    : null;

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
      )}
    </header>
  );
}
