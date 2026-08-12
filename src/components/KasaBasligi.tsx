import { useLocation, useNavigate } from "react-router-dom";
import AramaKutusu from "./AramaKutusu";
import { kasaBolumleri } from "./Duzen";
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
        <h1>Kasa</h1>
        {araDegistir && (
          <AramaKutusu deger={ara ?? ""} degistir={araDegistir} yer={araYer} />
        )}
      </div>
      <div className="ms-sekmeler">
        {kasaBolumleri.filter((b) => yolaGirebilir(b.yol)).map((b) => (
          <button
            key={b.yol}
            className={pathname === b.yol ? "aktif" : ""}
            onClick={() => navigate(b.yol)}
          >
            {b.ad}
          </button>
        ))}
      </div>
    </header>
  );
}
