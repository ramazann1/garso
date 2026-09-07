import { useLocation, useNavigate } from "react-router-dom";
import AramaKutusu from "./AramaKutusu";
import { kasaBolumleri } from "./Duzen";
import BolumSecici from "./BolumSecici";
import { yolaGirebilir } from "../rotaYetkileri";

// Kasa ekranlarının ortak başlığı. Ayarlarınkiyle aynı şerit deseni; yetkisi
// olmayan bölüm sekmede de görünmüyor.
export default function KasaBasligi({
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

  return (
    <header className="menu-baslik">
      <div className="ayar-baslik-ust">
        <BolumSecici
          baslik="Kasa"
          sekmeler={kasaBolumleri
            .filter((b) => yolaGirebilir(b.yol))
            .map((b) => ({ kod: b.yol, ad: b.ad, ikon: b.ikon }))}
          secili={pathname}
          sec={(yol) => navigate(yol)}
        />
        {araDegistir && (
          <AramaKutusu deger={ara ?? ""} degistir={araDegistir} yer={araYer} />
        )}
      </div>
    </header>
  );
}
