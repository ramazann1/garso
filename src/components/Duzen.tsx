import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Banknote, ChartColumn, ChevronDown, Lock, LogOut, Settings, Store } from "lucide-react";
import OnayModal from "./OnayModal";
import { kilitKaldir, kilitliMi } from "../cikisKilidi";
import { isletmeAdi, isletmeKodu } from "../isletmeAyarlari";
import { kilitle, oturumuKapat, useOturum } from "../oturum";
import { yolaGirebilir } from "../rotaYetkileri";
import { kisaAd } from "../personel";

// İşletme ayarları tek ekranda büyüdükçe kalabalıklaşıyor; başlıklar menüden
// ayrı ayrı açılıyor, her biri kendi sayfası.
export type Bolum = { yol: string; ad: string; alt?: Bolum[] };

// Personel tarafı üç ekrana ayrıldı; üst şeridi kalabalıklaştırmamak için tek
// başlık altında toplanıp kendi alt şeridiyle açılıyor.
export const personelBolumleri: Bolum[] = [
  { yol: "/ayarlar/personel", ad: "Personel" },
  { yol: "/ayarlar/yetkiler", ad: "Genel Yetkiler" },
  { yol: "/ayarlar/kisi-yetkileri", ad: "Kişiye Özel Yetkiler" },
];

// Yazıcı tarafı da kendi içinde ikiye ayrılıyor: cihazın kendisi ve siparişin
// hazırlandığı istasyonlar.
export const yaziciBolumleri: Bolum[] = [
  { yol: "/ayarlar/yazicilar", ad: "Yazıcılar" },
  { yol: "/ayarlar/istasyonlar", ad: "İstasyonlar" },
  { yol: "/ayarlar/fis-tasarimi", ad: "Fiş Tasarımı" },
];

export const ayarBolumleri: Bolum[] = [
  { yol: "/ayarlar/genel", ad: "Genel" },
  { yol: "/ayarlar/masalar", ad: "Bölgeler ve Masalar" },
  { yol: "/ayarlar/personel", ad: "Personel ve Yetkiler", alt: personelBolumleri },
  { yol: "/ayarlar/odeme-tipleri", ad: "Ödeme Tipleri" },
  { yol: "/ayarlar/satis", ad: "Satış" },
  { yol: "/ayarlar/yazicilar", ad: "Yazıcılar", alt: yaziciBolumleri },
];

export const menuBolumleri: Bolum[] = [
  { yol: "/menu/kategoriler", ad: "Kategori ve Ürünler" },
  { yol: "/menu/toplu", ad: "Toplu Düzenle" },
  { yol: "/menu/kampanya", ad: "Kampanyalı Menü" },
  { yol: "/menu/gruplar", ad: "Seçenek Grupları" },
  { yol: "/menu/birimler", ad: "Birimler" },
  { yol: "/menu/kdv", ad: "KDV" },
  { yol: "/menu/aktarim", ad: "İçe/Dışa Aktar" },
];

export const kasaBolumleri: Bolum[] = [
  { yol: "/kasa/gecmis", ad: "Kasa Geçmişi" },
  { yol: "/kasa/giderler", ad: "Giderler" },
];

// Adisyo'da her rapor ayrı bir sayfa; bizde tek Analiz ekranı, tür sekmede.
export const analizBolumleri: Bolum[] = [
  { yol: "/analiz/ozet", ad: "Özet" },
  { yol: "/analiz/adisyonlar", ad: "Adisyonlar" },
  { yol: "/analiz/urunler", ad: "Ürünler" },
  { yol: "/analiz/personel", ad: "Personel" },
  { yol: "/analiz/giderler", ad: "Giderler" },
  { yol: "/analiz/denetim", ad: "Denetim" },
];

const baglantilar = [
  { yol: "/", ad: "Salon", ikon: "salon" },
  { yol: "/menu", ad: "Menü Stüdyosu", ikon: "menu", alt: menuBolumleri },
  { yol: "/kasa", ad: "Kasa", ikon: "kasa", alt: kasaBolumleri },
  { yol: "/analiz", ad: "Analiz", ikon: "analiz", alt: analizBolumleri },
  { yol: "/ayarlar", ad: "İşletme Ayarları", ikon: "ayar", alt: ayarBolumleri },
];

// Yetkisi olmayan ekranı menüde hiç görmüyor. Başlık, altındaki bölümlerin
// hepsi kapalıysa kendisi de düşüyor — boş bir "İşletme Ayarları" kalmasın.
// Kuralın kaynağı rotaYetkileri.ts; menü ile kapı aynı listeye bakıyor.
function gorunenBolumler<T extends { yol: string; alt?: Bolum[] }>(bolumler: T[]): T[] {
  return bolumler
    .map((b) => (b.alt ? { ...b, alt: gorunenBolumler(b.alt) } : b))
    .filter((b) =>
      // Başlığın kendi adresi değil, altında kalan bölümler belirleyici: yalnızca
      // masa yetkisi olan kişi "İşletme Ayarları"nı görüp altında tek satır bulur.
      b.alt ? b.alt.length > 0 : yolaGirebilir(b.yol)
    );
}

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
  if (tip === "kasa") return <Banknote />;
  if (tip === "analiz") return <ChartColumn />;
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

// Menü kapalıyken kişinin yerinde adı değil baş harfleri duruyor.
function basHarfler(ad: string) {
  return ad
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase("tr"))
    .join("");
}

export default function Duzen({ children }: { children: React.ReactNode }) {
  const [acik, setAcik] = useState(() => localStorage.getItem(MENU_ANAHTARI) === "1");
  // Hangi başlığın altı açık. Bulunduğun sayfanın başlığı açılmış gelir ama
  // oradayken de kapatılabilir — açıklık konumdan değil, tıklamadan geliyor.
  const [acikBaslik, setAcikBaslik] = useState<string | null>(
    () => baglantilar.find((b) => b.alt && location.pathname.startsWith(b.yol))?.yol ?? null
  );

  // Alt başlığın kendi alt başlıkları (Personel ve Yetkiler) açık mı.
  const [acikAltBaslik, setAcikAltBaslik] = useState<string | null>(
    () =>
      ayarBolumleri.find((b) => b.alt?.some((a) => a.yol === location.pathname))?.yol ??
      null
  );

  const menuDegis = (yeni: boolean) => {
    setAcik(yeni);
    localStorage.setItem(MENU_ANAHTARI, yeni ? "1" : "0");
  };
  const [cikisYolu, setCikisYolu] = useState<string | null>(null);
  const [oturumSor, setOturumSor] = useState(false);
  const { oturum } = useOturum();
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

        {/* Çok işletmeli yapıda kullanıcı hangi işletmede olduğunu her ekranda
            görmeli. Menü kapalıyken yazacak yer yok, yalnız açıkken duruyor. */}
        {acik && isletmeAdi() && (
          <div className="menu-isletme" title={isletmeAdi()}>
            <Store size={15} />
            <div className="menu-isletme-yazi">
              <strong>{isletmeAdi()}</strong>
              {isletmeKodu() > 0 && <em>Kod {isletmeKodu()}</em>}
            </div>
          </div>
        )}

        <nav>
          {gorunenBolumler(baglantilar).map((b) => {
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
                    {b.alt!.map((a) => {
                      // Kendi alt başlıkları olan bölüm (Personel ve Yetkiler)
                      // menüde de okla açılıyor; sekmeleri sayfaya girmeden görünsün.
                      const torunlar = a.alt;
                      const torunAcik = torunlar && acikAltBaslik === a.yol;
                      const altIcinde = torunlar
                        ? torunlar.some((t) => t.yol === pathname)
                        : pathname === a.yol;
                      return (
                        <div key={a.yol}>
                          <button
                            className={
                              altIcinde ? "menu-alt-baglanti aktif" : "menu-alt-baglanti"
                            }
                            onClick={() => {
                              if (!torunlar) return git(a.yol);
                              setAcikAltBaslik(torunAcik ? null : a.yol);
                              if (!altIcinde) git(torunlar[0].yol);
                            }}
                          >
                            {a.ad}
                            {torunlar && (
                              <ChevronDown
                                className={torunAcik ? "menu-ok acik" : "menu-ok"}
                                size={15}
                              />
                            )}
                          </button>

                          {torunAcik && (
                            <div className="menu-torun">
                              {torunlar!.map((t) => (
                                <button
                                  key={t.yol}
                                  className={
                                    pathname === t.yol
                                      ? "menu-alt-baglanti aktif"
                                      : "menu-alt-baglanti"
                                  }
                                  onClick={() => git(t.yol)}
                                >
                                  {t.ad}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Gündelik hareket kilitleme: kasanın başındaki kişi değişiyor, oturum
            kapanmıyor. Çıkış onun yanında, ayrı ve küçük duruyor. */}
        {oturum && (
          <div className="menu-kisi">
            <button className="kisi-kilit" onClick={kilitle} title="Ekranı kilitle">
              <span className="bas-harf">{basHarfler(oturum.ad)}</span>
              <span className="kisi-bilgi">
                <strong>{kisaAd(oturum.ad)}</strong>
                <em>{oturum.rolAd}</em>
              </span>
              {acik && <Lock className="kisi-cik" size={16} />}
            </button>
            {acik && (
              <button
                className="kisi-cikis"
                onClick={() => setOturumSor(true)}
                title="Oturumu kapat"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
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

      {oturumSor && (
        <OnayModal
          mesaj={`${oturum?.ad} oturumu kapatılsın mı? Ekran giriş ekranına döner.`}
          onayMetni="Evet, çık"
          onOnay={oturumuKapat}
          onKapat={() => setOturumSor(false)}
        />
      )}
    </div>
  );
}