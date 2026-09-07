import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Armchair,
  ArrowLeftRight,
  Banknote,
  BookOpenText,
  BookUser,
  Building2,
  ChartColumn,
  ChefHat,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  HandCoins,
  LayoutGrid,
  ListChecks,
  Lock,
  LogOut,
  Percent,
  PieChart,
  Printer,
  QrCode,
  Receipt,
  Ruler,
  ScrollText,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Table,
  Table2,
  TrendingUp,
  UserCog,
  UsersRound,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import OnayModal from "./OnayModal";
import { kilitKaldir, kilitliMi } from "../cikisKilidi";
import { isletmeAdi, isletmeKodu } from "../isletmeAyarlari";
import { kilitle, oturumuKapat, useOturum } from "../oturum";
import { yolaGirebilir } from "../rotaYetkileri";
import { kisaAd } from "../personel";
import { gorunumSec } from "../mobil/mobilTercih";

// İşletme ayarları tek ekranda büyüdükçe kalabalıklaşıyor; başlıklar menüden
// ayrı ayrı açılıyor, her biri kendi sayfası.
export type Bolum = { yol: string; ad: string; ikon?: LucideIcon; alt?: Bolum[] };

// Personel tarafı üç ekrana ayrıldı; üst şeridi kalabalıklaştırmamak için tek
// başlık altında toplanıp kendi alt şeridiyle açılıyor.
export const personelBolumleri: Bolum[] = [
  { yol: "/ayarlar/personel", ad: "Personel", ikon: UsersRound },
  { yol: "/ayarlar/yetkiler", ad: "Genel Yetkiler", ikon: ShieldCheck },
  { yol: "/ayarlar/kisi-yetkileri", ad: "Kişiye Özel Yetkiler", ikon: UserCog },
];

// Yazıcı tarafı da kendi içinde ikiye ayrılıyor: cihazın kendisi ve siparişin
// hazırlandığı istasyonlar.
export const yaziciBolumleri: Bolum[] = [
  { yol: "/ayarlar/yazicilar", ad: "Yazıcılar", ikon: Printer },
  { yol: "/ayarlar/istasyonlar", ad: "İstasyonlar", ikon: ChefHat },
  { yol: "/ayarlar/fis-tasarimi", ad: "Fiş Tasarımı", ikon: Receipt },
  { yol: "/ayarlar/yazdirma-kuyrugu", ad: "Yazdırma Kuyruğu", ikon: ScrollText },
  { yol: "/ayarlar/baglanti-durumu", ad: "Bağlantı Durumu", ikon: Wifi },
];

export const ayarBolumleri: Bolum[] = [
  { yol: "/ayarlar/genel", ad: "Genel", ikon: Building2 },
  { yol: "/ayarlar/masalar", ad: "Bölgeler ve Masalar", ikon: Table2 },
  { yol: "/ayarlar/personel", ad: "Personel ve Yetkiler", ikon: UsersRound, alt: personelBolumleri },
  { yol: "/ayarlar/odeme-tipleri", ad: "Ödeme Tipleri", ikon: CreditCard },
  { yol: "/ayarlar/satis", ad: "Satış", ikon: Receipt },
  { yol: "/ayarlar/qr-menu", ad: "QR Menü", ikon: QrCode },
  { yol: "/ayarlar/odenmezler", ad: "Ödenmezler", ikon: Gift },
  { yol: "/ayarlar/yazicilar", ad: "Yazıcılar", ikon: Printer, alt: yaziciBolumleri },
];

export const menuBolumleri: Bolum[] = [
  { yol: "/menu/kategoriler", ad: "Kategori ve Ürünler", ikon: LayoutGrid },
  { yol: "/menu/toplu", ad: "Toplu Düzenle", ikon: Table },
  { yol: "/menu/kampanya", ad: "Kampanyalı Menü", ikon: Sparkles },
  { yol: "/menu/gruplar", ad: "Seçenek Grupları", ikon: ListChecks },
  { yol: "/menu/birimler", ad: "Birimler", ikon: Ruler },
  { yol: "/menu/kdv", ad: "KDV", ikon: Percent },
  { yol: "/menu/aktarim", ad: "İçe/Dışa Aktar", ikon: ArrowLeftRight },
];

export const kasaBolumleri: Bolum[] = [
  { yol: "/kasa/gecmis", ad: "Kasa Geçmişi", ikon: HandCoins },
  { yol: "/kasa/giderler", ad: "Giderler", ikon: Banknote },
];

// Adisyo'da her rapor ayrı bir sayfa; bizde tek Analiz ekranı, tür sekmede.
export const analizBolumleri: Bolum[] = [
  { yol: "/analiz/ozet", ad: "Özet", ikon: PieChart },
  { yol: "/analiz/adisyonlar", ad: "Adisyonlar", ikon: FileText },
  { yol: "/analiz/urunler", ad: "Ürünler", ikon: TrendingUp },
  { yol: "/analiz/personel", ad: "Personel", ikon: UsersRound },
  { yol: "/analiz/mutfak", ad: "Mutfak", ikon: ChefHat },
  { yol: "/analiz/giderler", ad: "Giderler", ikon: Banknote },
  { yol: "/analiz/acik-hesap", ad: "Açık Hesap", ikon: BookUser },
  { yol: "/analiz/odenmezler", ad: "Ödenmezler", ikon: Gift },
  { yol: "/analiz/denetim", ad: "Denetim", ikon: ClipboardList },
];

// Menü üç öbeğe ayrıldı: gün içinde kullanılanlar, tanımlar, yönetim.
// Yedi satır düz bir liste hâlinde dururken hepsi aynı ağırlıkta görünüyordu;
// oysa Salon gün boyu açık, Ayarlar ayda bir açılıyor.
const OBEKLER = ["Gün içinde", "Tanımlar", "Yönetim"] as const;

const baglantilar = [
  { yol: "/", ad: "Salon", ikon: "salon", obek: "Gün içinde" },
  { yol: "/istasyon", ad: "İstasyon Ekranı", ikon: "istasyon", obek: "Gün içinde" },
  { yol: "/kasa", ad: "Kasa", ikon: "kasa", obek: "Gün içinde", alt: kasaBolumleri },
  { yol: "/musteriler", ad: "Müşteriler", ikon: "musteri", obek: "Gün içinde" },
  { yol: "/menu", ad: "Menü Stüdyosu", ikon: "menu", obek: "Tanımlar", alt: menuBolumleri },
  { yol: "/analiz", ad: "Analiz", ikon: "analiz", obek: "Yönetim", alt: analizBolumleri },
  { yol: "/ayarlar", ad: "İşletme Ayarları", ikon: "ayar", obek: "Yönetim", alt: ayarBolumleri },
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

// Salon dört kare ızgara, Menü Stüdyosu üç çizgiydi; ikisi de Adisyo'nun
// ikonlarıyla aynı düşmüştü. Salon artık oturma yeri, menü ise açık bir
// menü kitabı — kendi anlamlarını taşıyorlar.
function Ikon({ tip }: { tip: string }) {
  if (tip === "salon") return <Armchair />;
  if (tip === "menu") return <BookOpenText />;
  if (tip === "ayar") return <Settings />;
  if (tip === "kasa") return <Banknote />;
  if (tip === "istasyon") return <UtensilsCrossed />;
  if (tip === "analiz") return <ChartColumn />;
  if (tip === "musteri") return <UsersRound />;
  return <LayoutGrid />;
}

// Her sayfa kendi Duzen'ini kuruyor; menünün açık/kapalı hâli bileşenin
// durumunda tutulsa sayfa değişince kapanırdı. Kasada menüyü kullanıcı açar,
// kullanıcı kapatır — tercih tarayıcıda saklanıyor.
const MENU_ANAHTARI = "garso-menu-acik";

// Her sayfa kendi Duzen'ini kuruyor, yani bileşen her geçişte sıfırdan
// doğuyor. En son hangi ekranda olduğumuz bileşenin durumunda tutulsaydı her
// gezinmede unutulur, sayfa hep başa dönerdi. Modül seviyesinde duruyor.
let sonEkran = "";

// Menünün kendi kaydırma konumu da bileşenle birlikte sıfırlanıyordu: uzun
// listede aşağıdayken başka bölüme geçince menü tepeye fırlıyordu.
let menuKaydirma = 0;

// Açılan bölümü görünür hâle getirir. Liste yumuşak açıldığı için hemen
// kaydırmak işe yaramıyordu: o an yüksekliği henüz sıfır, kaydıracak bir şey
// yok. Açılma bitince yapılıyor.
function gorunureGetir(dugme: HTMLElement) {
  setTimeout(() => {
    dugme.parentElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, 300);
}

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

  // Ekran değişince sayfa başa dönüyor: aşağı kaydırılmış hâlde yeni ekrana
  // geçilince içerik ortasından açılıyor, ekran kaymış gibi görünüyordu.
  // Aynı ekranın bölümleri arasında (Yazıcılar → Fiş Tasarımı) dönülmüyor;
  // orada sayfanın altına inip başka bölüme bakmak olağan.
  const ekran = pathname.split("/")[1] ?? "";
  useEffect(() => {
    if (ekran === sonEkran) return;
    sonEkran = ekran;
    window.scrollTo({ top: 0 });
  }, [ekran]);

  // Açık ekranda kaydedilmemiş değişiklik varsa sayfa değiştirmeden önce sorulur.
  // Menü gezinirken açık kalıyor: kasada arka arkaya bölüm değiştirmek olağan,
  // her seferinde menüyü yeniden açtırmak yorucu.
  const git = (yol: string) => {
    if (yol === pathname) return;
    if (kilitliMi()) setCikisYolu(yol);
    else navigate(yol);
  };

  return (
    <div className="duzen">
      {/* Menü açıkken içeriği itmiyor, üstüne geliyor: sayfa yerinde kalsın,
          bir ekranın düzeni menü yüzünden değişmesin. Arkası bulanıklaşıyor,
          perdeye basınca menü kapanıyor. */}
      {acik && <div className="menu-perde" onClick={() => menuDegis(false)} />}

      <aside className={acik ? "yan-menu acik" : "yan-menu"}>
        <button className="menu-katla" onClick={() => menuDegis(!acik)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
          <span>Garso</span>
        </button>

        {/* Çok işletmeli yapıda kullanıcı hangi işletmede olduğunu her ekranda
            görmeli. Kapalı menüde yazıya yer yok ama kart yerini koruyor:
            yoksa menü açılınca altındaki bütün satırlar aşağı kayıyordu. */}
        {isletmeAdi() && (
          <div className="menu-isletme" title={isletmeAdi()}>
            <Store size={15} />
            <div className="menu-isletme-yazi">
              <strong>{isletmeAdi()}</strong>
              {isletmeKodu() > 0 && (
                <em>
                  İşletme kodu {isletmeKodu()}
                </em>
              )}
            </div>
          </div>
        )}

        <nav
          ref={(el) => {
            if (el) el.scrollTop = menuKaydirma;
          }}
          onScroll={(e) => {
            menuKaydirma = e.currentTarget.scrollTop;
          }}
        >
          {OBEKLER.map((obek) => {
            const satirlar = gorunenBolumler(baglantilar).filter((b) => b.obek === obek);
            if (!satirlar.length) return null;
            return (
              <div className="menu-obek" key={obek}>
                {/* Öbek adı kapalı menüde görünmüyor ama yerini koruyor:
                    yoksa menü açılıp kapandıkça bütün ikonlar aşağı yukarı
                    kayıyor, göz her seferinde yerlerini yeniden arıyordu. */}
                <p className="menu-obek-ad">{obek}</p>
                {satirlar.map((b) => {
            const icinde = pathname === b.yol || pathname.startsWith(b.yol + "/");
            const altAcik = b.alt && acik && acikBaslik === b.yol;
            return (
              <div key={b.yol}>
                <button
                  className={
                    // Mercan yalnız bulunulan sayfada yanıyor. Başlık, altında
                    // açık bir bölüm varken "içinde" oluyor: yazısı koyulaşıyor
                    // ama vurgu rengini almıyor, yoksa üç kademe birden yanıp
                    // hangisinde olduğun kayboluyordu.
                    // Alt listesi olan başlık hiçbir zaman yanmıyor: kendi
                    // adresi ilk çocuğununkiyle aynı (Yazıcılar → Yazıcılar),
                    // yoksa ikisi birden mercan olurdu.
                    !b.alt && pathname === b.yol
                      ? "menu-baglanti aktif"
                      : icinde
                        ? "menu-baglanti icinde"
                        : "menu-baglanti"
                  }
                  title={acik ? undefined : b.ad}
                  onClick={(e) => {
                    if (!b.alt) return git(b.yol);
                    // Menü kapalıyken alt başlık gösterilecek yer yok; doğrudan
                    // ilk bölüme giriliyor.
                    if (!acik) return git(b.alt[0].yol);
                    // Açık menüde başlık yalnız listesini açıp kapatıyor.
                    const dugme = e.currentTarget;
                    setAcikBaslik(altAcik ? null : b.yol);
                    // Açılan liste menünün altında kalmasın diye kendisi
                    // görünür hâle geliyor.
                    if (!altAcik) gorunureGetir(dugme);
                  }}
                >
                  <Ikon tip={b.ikon} />
                  <span>{b.ad}</span>
                  {b.alt && acik && (
                    <ChevronDown className={altAcik ? "menu-ok acik" : "menu-ok"} size={16} />
                  )}
                </button>

                {/* Sarmalayıcı hep duruyor, yüksekliği değişiyor: açılırken
                    olduğu gibi kapanırken de yumuşak insin. Koşullu çizilseydi
                    kapanış anında elemanla birlikte animasyon da silinirdi. */}
                {b.alt && (
                <div className={altAcik ? "menu-katlanir acik" : "menu-katlanir"}>
                  <div className="menu-alt">
                    {b.alt.map((a) => {
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
                              !torunlar && pathname === a.yol
                                ? "menu-alt-baglanti aktif"
                                : altIcinde
                                  ? "menu-alt-baglanti icinde"
                                  : "menu-alt-baglanti"
                            }
                            onClick={(e) => {
                              if (!torunlar) return git(a.yol);
                              const dugme = e.currentTarget;
                              setAcikAltBaslik(torunAcik ? null : a.yol);
                              // Açılan liste menünün altında kalıyordu, elle
                              // aşağı sürüklemek gerekiyordu; kendisi görünür
                              // hâle geliyor.
                              if (!torunAcik) gorunureGetir(dugme);
                            }}
                          >
                            {a.ikon && <a.ikon size={15} />}
                            <span>{a.ad}</span>
                            {torunlar && (
                              <ChevronDown
                                className={torunAcik ? "menu-ok acik" : "menu-ok"}
                                size={15}
                              />
                            )}
                          </button>

                          {torunlar && (
                          <div className={torunAcik ? "menu-katlanir acik" : "menu-katlanir"}>
                            <div className="menu-torun">
                              {torunlar?.map((t) => (
                                <button
                                  key={t.yol}
                                  className={
                                    pathname === t.yol
                                      ? "menu-alt-baglanti aktif"
                                      : "menu-alt-baglanti"
                                  }
                                  onClick={() => git(t.yol)}
                                >
                                  {t.ikon && <t.ikon size={15} />}
                                  <span>{t.ad}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>
            );
                })}
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
            {/* Mobil arayüze geçiş. Ekran genişliğine bakılmıyor: işletmeci
                kasadan da mobili görmek istiyor — ekranını denemek, garsonun
                gördüğünü görmek için. Dönüş yolu mobildeki Ben sekmesinde. */}
            {acik && (
              <button
                className="kisi-cikis"
                onClick={() => gorunumSec("mobil")}
                title="Mobil görünüme geç"
              >
                <Smartphone size={16} />
              </button>
            )}
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