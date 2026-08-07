import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Settings } from "lucide-react";
import OnayModal from "./OnayModal";
import { kilitKaldir, kilitliMi } from "../cikisKilidi";

// İşletme ayarları tek ekranda büyüdükçe kalabalıklaşıyor; başlıklar menüden
// ayrı ayrı açılıyor, her biri kendi sayfası.
export const ayarBolumleri = [
  { yol: "/ayarlar/masalar", ad: "Bölgeler ve Masalar" },
  { yol: "/ayarlar/odeme-tipleri", ad: "Ödeme Tipleri" },
];

export const menuBolumleri = [
  { yol: "/menu/kategoriler", ad: "Kategori ve Ürünler" },
  { yol: "/menu/toplu", ad: "Toplu Düzenle" },
  { yol: "/menu/kampanya", ad: "Kampanyalı Menü" },
  { yol: "/menu/gruplar", ad: "Seçenek Grupları" },
  { yol: "/menu/birimler", ad: "Birimler" },
  { yol: "/menu/kdv", ad: "KDV" },
  { yol: "/menu/aktarim", ad: "İçe/Dışa Aktar" },
];

const baglantilar = [
  { yol: "/", ad: "Salon", ikon: "salon" },
  { yol: "/menu", ad: "Menü Stüdyosu", ikon: "menu", alt: menuBolumleri },
  { yol: "/ayarlar", ad: "İşletme Ayarları", ikon: "ayar", alt: ayarBolumleri },
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
  if (tip === "ayar") return <Settings />;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
    </svg>
  );
}

// Her sayfa kendi Duzen'ini kuruyor; menünün açık/kapalı hâli bileşenin
// durumunda tutulsa sayfa değişince kapanırdı. Kasada menüyü kullanıcı açar,
// kullanıcı kapatır — tercih tarayıcıda saklanıyor.
const MENU_ANAHTARI = "garso-menu-acik";

export default function Duzen({ children }: { children: React.ReactNode }) {
  const [acik, setAcik] = useState(() => localStorage.getItem(MENU_ANAHTARI) === "1");
  // Hangi başlığın altı açık. Bulunduğun sayfanın başlığı açılmış gelir ama
  // oradayken de kapatılabilir — açıklık konumdan değil, tıklamadan geliyor.
  const [acikBaslik, setAcikBaslik] = useState<string | null>(
    () => baglantilar.find((b) => b.alt && location.pathname.startsWith(b.yol))?.yol ?? null
  );

  const menuDegis = (yeni: boolean) => {
    setAcik(yeni);
    localStorage.setItem(MENU_ANAHTARI, yeni ? "1" : "0");
  };
  const [cikisYolu, setCikisYolu] = useState<string | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Açık ekranda kaydedilmemiş değişiklik varsa sayfa değiştirmeden önce sorulur.
  const git = (yol: string) => {
    if (yol === pathname) return;
    if (kilitliMi()) setCikisYolu(yol);
    else navigate(yol);
  };

  return (
    <div className="duzen">
      <aside className={acik ? "yan-menu acik" : "yan-menu"}>
        <button className="menu-katla" onClick={() => menuDegis(!acik)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
          <span>Garso</span>
        </button>

        <nav>
          {baglantilar.map((b) => {
            const icinde = pathname === b.yol || pathname.startsWith(b.yol + "/");
            const altAcik = b.alt && acik && acikBaslik === b.yol;
            return (
              <div key={b.yol}>
                <button
                  className={icinde ? "menu-baglanti aktif" : "menu-baglanti"}
                  onClick={() => {
                    if (!b.alt) return git(b.yol);
                    // Menü kapalıyken alt başlık gösterilecek yer yok; doğrudan
                    // ilk bölüme giriliyor.
                    if (!acik) return git(b.alt[0].yol);
                    setAcikBaslik(altAcik ? null : b.yol);
                    if (!icinde) git(b.alt[0].yol);
                  }}
                >
                  <Ikon tip={b.ikon} />
                  <span>{b.ad}</span>
                  {b.alt && acik && (
                    <ChevronDown className={altAcik ? "menu-ok acik" : "menu-ok"} size={16} />
                  )}
                </button>

                {altAcik && (
                  <div className="menu-alt">
                    {b.alt!.map((a) => (
                      <button
                        key={a.yol}
                        className={
                          pathname === a.yol ? "menu-alt-baglanti aktif" : "menu-alt-baglanti"
                        }
                        onClick={() => git(a.yol)}
                      >
                        {a.ad}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="icerik">{children}</div>

      {cikisYolu && (
        <OnayModal
          mesaj="Kaydedilmemiş değişiklikler var. Sayfadan çıkılsın mı?"
          tehlikeli
          onayMetni="Evet, çık"
          onOnay={() => {
            kilitKaldir();
            navigate(cikisYolu);
            setCikisYolu(null);
          }}
          onKapat={() => setCikisYolu(null)}
        />
      )}
    </div>
  );
}