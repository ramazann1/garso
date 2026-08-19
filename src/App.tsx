import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { yolaGirebilir } from "./rotaYetkileri";
import { ayarlar, ayarlariGetir, isletmeKimliginiGetir } from "./isletmeAyarlari";
import Salon from "./pages/Salon";
import Siparis from "./pages/Siparis";
import MenuStudyosu from "./pages/MenuStudyosu";
import Istasyon from "./pages/Istasyon";
import KasaGecmisi from "./pages/KasaGecmisi";
import Giderler from "./pages/Giderler";
import Musteriler from "./pages/Musteriler";
import Analiz from "./pages/Analiz";
import IsletmeAyarlari from "./pages/IsletmeAyarlari";
import Personel from "./pages/Personel";
import Yetkiler from "./pages/Yetkiler";
import Odenmezler from "./pages/Odenmezler";
import Yazicilar from "./pages/Yazicilar";
import BaglantiDurumu from "./pages/BaglantiDurumu";
import FisTasarimi from "./pages/FisTasarimi";
import YazdirmaKuyrugu from "./pages/YazdirmaKuyrugu";
import Giris from "./pages/Giris";
import MobilKabuk, { acikSekmeler } from "./mobil/MobilKabuk";
import MobilMasalar from "./mobil/Masalar";
import MobilSiparis from "./mobil/Siparis";
import MobilAdisyon from "./mobil/Adisyon";
import MobilSatis from "./mobil/Satis";
import MobilIstasyon from "./mobil/Istasyon";
import Ben from "./mobil/Ben";
import { useGorunum } from "./mobil/mobilTercih";
import KilitEkrani from "./components/KilitEkrani";
import CevrimdisiSerit from "./components/CevrimdisiSerit";
import { baglantiyiIzle, sureSinirli, useBaglanti } from "./baglanti";
import { kuyruguIzle } from "./kuyruk";
import { girisKuruldu, kilitle, oturumuYukle, useOturum } from "./oturum";

function App() {
  const { oturum, kilitli } = useOturum();
  // İşletme ayarları toplam hesabına giriyor; okunmadan hiçbir ekran çizilmiyor
  // ki fiyatlar bir an yanlış görünüp sonra düzelmesin.
  const [hazir, setHazir] = useState(false);
  const [girisGerekli, setGirisGerekli] = useState(true);

  // Bağlantı izlemesi program açılır açılmaz başlıyor: giriş ekranındayken de
  // kopukluk görünsün, garson "şifremi mi yanlış girdim" diye uğraşmasın.
  useEffect(baglantiyiIzle, []);

  // Bekleyen siparişler bağlantı gelir gelmez gönderiliyor. Program yeniden
  // açılsa da kuyruk cihazda durduğu için kayıp yok.
  useEffect(kuyruguIzle, []);

  useEffect(() => {
    // Her okuma kendi hatasını yutuyor ve süreyle sınırlı: bağlantı yokken
    // biri düşse ya da cevapsız kalsa bile ekran açılıyor. Açılmazsa garson
    // dönen halkaya bakıp kalıyor, sorunun ne olduğunu göremiyor.
    const dene = (is: Promise<unknown>) => sureSinirli(is.catch(() => undefined));

    Promise.all([
      dene(ayarlariGetir()),
      dene(oturumuYukle()),
      dene(girisKuruldu().then(setGirisGerekli)),
    ]).finally(() => setHazir(true));
  }, []);

  // Bağlantı geri geldiğinde oturum yeniden okunuyor. Kopukken kişi bilgisi
  // sunucudan alınamadığı için program giriş ekranında kalıyor; bağlantı
  // gelince kendiliğinden içeri dönsün, kimse yeniden şifre girmesin.
  const cevrimici = useBaglanti();
  useEffect(() => {
    if (cevrimici && !oturum) oturumuYukle().catch(() => undefined);
  }, [cevrimici]);

  // Ayarlar program açılırken okunuyor ama o an henüz oturum yok — satır
  // güvenliği hiçbir satır döndürmüyor, elde varsayılanlar kalıyor. Giriş
  // yapılınca işletmenin kendi ayarları yeniden okunuyor.
  const [ayarTik, setAyarTik] = useState(0);
  useEffect(() => {
    if (!oturum) return;
    Promise.all([ayarlariGetir(), isletmeKimliginiGetir()]).then(() =>
      setAyarTik((t) => t + 1)
    );
  }, [oturum?.isletmeId]);

  // Boşta kalan kasa kendiliğinden kilitleniyor: tezgâhtan ayrılan garsonun
  // oturumuyla başkası işlem yapmasın. Süre 0'sa özellik kapalı.
  useEffect(() => {
    const sure = ayarlar().kilitSuresi;
    if (!oturum || kilitli || sure <= 0) return;

    let zaman: ReturnType<typeof setTimeout>;
    const kur = () => {
      clearTimeout(zaman);
      zaman = setTimeout(kilitle, sure * 1000);
    };
    const olaylar = ["mousedown", "keydown", "touchstart", "wheel"] as const;
    for (const o of olaylar) window.addEventListener(o, kur);
    kur();

    return () => {
      clearTimeout(zaman);
      for (const o of olaylar) window.removeEventListener(o, kur);
    };
  }, [oturum, kilitli]);

  if (!hazir) return <div className="yukleniyor"><div className="cember" /></div>;

  // Oturum yoksa hiçbir ekran açılmıyor; adresi elle yazmak da giriş ekranına düşer.
  if (!oturum && girisGerekli) return <Ekran><Giris /></Ekran>;

  // Kilit oturumu kapatmıyor, üstünü örtüyor: açık adisyonlar yerinde duruyor.
  if (oturum && kilitli) return <Ekran><KilitEkrani /></Ekran>;

  return (
    // Ayarlar tazelenince ekranlar yeniden kuruluyor: fiyat ve kasa kuralları
    // eski değerlerle çizilmiş olabilir.
    <Ekran>
    <BrowserRouter key={ayarTik}>
      <GorunumKapisi />
      <YetkiKapisi>
        <Route path="/" element={<Salon />} />
        {/* Mobil arayüz kendi ekranlarıyla; masaüstü sayfaları olduğu gibi kalıyor. */}
        <Route path="/mobil" element={<MobilAcilis />} />
        <Route path="/mobil/masalar" element={<MobilKabuk><MobilMasalar /></MobilKabuk>} />
        {/* Sipariş ekranı kabuksuz: sepet şeridi altta, sekme çubuğu onun yerini almasın. */}
        <Route path="/mobil/siparis/:masaId" element={<MobilSiparis />} />
        {/* Hesabın kendi ekranı: ödeme sipariş almaktan ayrı bir an. */}
        <Route path="/mobil/adisyon/:masaId" element={<MobilAdisyon />} />
        <Route path="/mobil/mutfak" element={<MobilKabuk><MobilIstasyon /></MobilKabuk>} />
        <Route path="/mobil/satis" element={<MobilKabuk><MobilSatis /></MobilKabuk>} />
        <Route path="/mobil/ben" element={<MobilKabuk><Ben /></MobilKabuk>} />
        <Route path="/siparis/:masaId" element={<Siparis />} />
        <Route path="/adisyon/:adisyonId" element={<Siparis />} />
        <Route path="/menu" element={<Navigate to="/menu/kategoriler" replace />} />
        {/* İstasyon ekranı yan menüsüz, tam ekran: mutfaktaki tablette kart alanı bölünmesin. */}
        <Route path="/istasyon" element={<Istasyon />} />
        <Route path="/istasyon/:istasyonId" element={<Istasyon />} />
        <Route path="/menu/:bolum" element={<MenuStudyosu />} />
        {/* Kasa takibi kapalıysa geçmiş ekranı yok; başlık doğrudan Giderler'i açar. */}
        <Route
          path="/kasa"
          element={
            <Navigate to={yolaGirebilir("/kasa/gecmis") ? "/kasa/gecmis" : "/kasa/giderler"} replace />
          }
        />
        <Route path="/kasa/gecmis" element={<KasaGecmisi />} />
        <Route path="/kasa/giderler" element={<Giderler />} />
        <Route path="/musteriler" element={<Musteriler />} />
        <Route path="/analiz" element={<Navigate to="/analiz/ozet" replace />} />
        <Route path="/analiz/:bolum" element={<Analiz />} />
        <Route path="/ayarlar" element={<Navigate to="/ayarlar/masalar" replace />} />
        <Route path="/ayarlar/personel" element={<Personel />} />
        <Route path="/ayarlar/yetkiler" element={<Yetkiler />} />
        <Route path="/ayarlar/kisi-yetkileri" element={<Yetkiler />} />
        <Route path="/ayarlar/odenmezler" element={<Odenmezler />} />
        <Route path="/ayarlar/yazicilar" element={<Yazicilar />} />
        <Route path="/ayarlar/istasyonlar" element={<Yazicilar />} />
        <Route path="/ayarlar/fis-tasarimi" element={<FisTasarimi />} />
        <Route path="/ayarlar/yazdirma-kuyrugu" element={<YazdirmaKuyrugu />} />
        <Route path="/ayarlar/baglanti-durumu" element={<BaglantiDurumu />} />
        <Route path="/ayarlar/:bolum" element={<IsletmeAyarlari />} />
      </YetkiKapisi>
    </BrowserRouter>
    </Ekran>
  );
}

/**
 * Hangi ekran açık olursa olsun üstte duran şerit. Giriş ve kilit ekranı da
 * dahil: bağlantı kopukken şifre denemenin de anlamı yok, sebebi görünsün.
 */
function Ekran({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CevrimdisiSerit />
      {children}
    </>
  );
}

/**
 * Mobil arayüzün girişi: kişinin ilk açık sekmesi. Garson Masalar'a, mutfak
 * personeli doğrudan Mutfak'a düşüyor — kimse kendine kapalı bir ekranı
 * görmüyor.
 */
function MobilAcilis() {
  return <Navigate to={acikSekmeler()[0]?.yol ?? "/mobil/ben"} replace />;
}

/**
 * Cihaza göre doğru arayüzü açıyor: telefon mobile, kasa bilgisayarı masaüstüne.
 * Yönlendirme yalnız iki uç adreste yapılıyor (masaüstünün ana ekranı ve mobil
 * kök) — kişi elle bir adrese gittiyse orada bırakılıyor, ekran altından
 * kaydırılmıyor.
 */
function GorunumKapisi() {
  const gorunum = useGorunum();
  const { pathname } = useLocation();
  const git = useNavigate();

  useEffect(() => {
    if (gorunum === "mobil" && pathname === "/") git("/mobil", { replace: true });
    if (gorunum === "masaustu" && pathname.startsWith("/mobil")) git("/", { replace: true });
  }, [gorunum, pathname]);

  return null;
}

/**
 * Yetkisiz adresi sayfa açılmadan çeviriyor. Kapı burada, rotaların önünde:
 * ekranların içine tek tek kontrol koyarsak yeni eklenen bir sayfada unutulur.
 * Sayfa hiç kurulmadığı için veri de çekilmiyor.
 */
function YetkiKapisi({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (!yolaGirebilir(pathname)) return <Navigate to="/" replace />;
  return <Routes>{children}</Routes>;
}

export default App;