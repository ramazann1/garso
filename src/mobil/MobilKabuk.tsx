import { NavLink, useLocation } from "react-router-dom";
import { ChefHat, LayoutGrid, UserRound } from "lucide-react";
import { yolaGirebilir } from "../rotaYetkileri";

/**
 * Mobil arayüzün kabuğu: içerik + altta sekme çubuğu.
 *
 * Sekmeler kişinin yetkisinden hesaplanıyor — garson Masalar'ı görür, mutfak
 * personeli yalnız Mutfak'ı, yönetici hepsini. Ayrı uygulama ya da ayrı giriş
 * yok; aynı program herkese kendi işini gösteriyor. Yetki kuralı
 * rotaYetkileri.ts'te tek yerde duruyor, burada tekrar yazılmıyor.
 */
type Sekme = { yol: string; ad: string; ikon: typeof LayoutGrid; yetkiYolu: string };

const SEKMELER: Sekme[] = [
  { yol: "/mobil/masalar", ad: "Masalar", ikon: LayoutGrid, yetkiYolu: "/siparis" },
  { yol: "/mobil/mutfak", ad: "Mutfak", ikon: ChefHat, yetkiYolu: "/istasyon" },
  { yol: "/mobil/ben", ad: "Ben", ikon: UserRound, yetkiYolu: "/mobil/ben" },
];

export function acikSekmeler() {
  return SEKMELER.filter((s) => yolaGirebilir(s.yetkiYolu));
}

export default function MobilKabuk({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const sekmeler = acikSekmeler();

  return (
    <div className="m-kabuk">
      <div className="m-icerik">{children}</div>

      {/* Tek sekmesi olan kişiye çubuk gösterilmiyor: seçenek yokken yer kaplıyor. */}
      {sekmeler.length > 1 && (
        <nav className="m-sekmeler">
          {sekmeler.map((s) => {
            const Ikon = s.ikon;
            const secili = pathname === s.yol || pathname.startsWith(s.yol + "/");
            return (
              <NavLink key={s.yol} to={s.yol} className={secili ? "m-sekme secili" : "m-sekme"}>
                <Ikon size={22} />
                <span>{s.ad}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
