import { useLocation, useNavigate } from "react-router-dom";
import AramaKutusu from "./AramaKutusu";
import { ayarBolumleri } from "./Duzen";
import BolumSecici from "./BolumSecici";

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

  // Kendi alt bölümleri olan başlık (Personel, Yazıcılar) altındaki şeridi
  // çiziyor; liste Duzen'de tek yerde duruyor.
  const bolum = ayarBolumleri.find((b) => b.alt?.some((a) => a.yol === pathname));
  const altSerit = bolum?.alt ?? null;

  return (
    <header className="menu-baslik">
      <div className="ayar-baslik-ust">
        <BolumSecici
          baslik="İşletme Ayarları"
          sekmeler={ayarBolumleri.map((b) => ({ kod: b.yol, ad: b.ad, ikon: b.ikon }))}
          secili={bolum?.yol ?? pathname}
          sec={(yol) => {
            const hedef = ayarBolumleri.find((b) => b.yol === yol);
            navigate(hedef?.alt ? hedef.alt[0].yol : yol);
          }}
        />
        {araDegistir && (
          <AramaKutusu deger={ara ?? ""} degistir={araDegistir} yer={araYer} />
        )}
      </div>

      {altSerit && (
        <div className="alt-serit">
          {altSerit.map((b) => {
            const Ikon = b.ikon;
            return (
              <button
                key={b.yol}
                className={pathname === b.yol ? "alt-sekme aktif" : "alt-sekme"}
                onClick={() => navigate(b.yol)}
              >
                {Ikon && <Ikon size={15} />}
                {b.ad}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
