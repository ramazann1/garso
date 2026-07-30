import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const baglantilar = [
  { yol: "/", ad: "Salon", ikon: "salon" },
  { yol: "/menu", ad: "Menü", ikon: "menu" },
];

function Ikon({ tip }: { tip: string }) {
  if (tip === "salon") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
    </svg>
  );
}

export default function Duzen({ children }: { children: React.ReactNode }) {
  const [acik, setAcik] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="duzen">
      <aside className={acik ? "yan-menu acik" : "yan-menu"}>
        <button className="menu-katla" onClick={() => setAcik(!acik)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
          <span>Garso</span>
        </button>

        <nav>
          {baglantilar.map((b) => (
            <button
              key={b.yol}
              className={pathname === b.yol ? "menu-baglanti aktif" : "menu-baglanti"}
              onClick={() => navigate(b.yol)}
            >
              <Ikon tip={b.ikon} />
              <span>{b.ad}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="icerik">{children}</div>
    </div>
  );
}