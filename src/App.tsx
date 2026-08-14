import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { yolaGirebilir } from "./rotaYetkileri";
import { ayarlar, ayarlariGetir, isletmeKimliginiGetir } from "./isletmeAyarlari";
import Salon from "./pages/Salon";
import Siparis from "./pages/Siparis";
import MenuStudyosu from "./pages/MenuStudyosu";
import KasaGecmisi from "./pages/KasaGecmisi";
import Giderler from "./pages/Giderler";
import Analiz from "./pages/Analiz";
import IsletmeAyarlari from "./pages/IsletmeAyarlari";
import Personel from "./pages/Personel";
import Yetkiler from "./pages/Yetkiler";
import Yazicilar from "./pages/Yazicilar";
import BaglantiDurumu from "./pages/BaglantiDurumu";
import FisTasarimi from "./pages/FisTasarimi";
import YazdirmaKuyrugu from "./pages/YazdirmaKuyrugu";
import Giris from "./pages/Giris";
import KilitEkrani from "./components/KilitEkrani";
import { girisKuruldu, kilitle, oturumuYukle, useOturum } from "./oturum";

function App() {
  const { oturum, kilitli } = useOturum();
  // İşletme ayarları toplam hesabına giriyor; okunmadan hiçbir ekran çizilmiyor
  // ki fiyatlar bir an yanlış görünüp sonra düzelmesin.
  const [hazir, setHazir] = useState(false);
  const [girisGerekli, setGirisGerekli] = useState(true);
  useEffect(() => {
    Promise.all([
      ayarlariGetir(),
      oturumuYukle(),
      girisKuruldu().then(setGirisGerekli),
    ]).finally(() => setHazir(true));
  }, []);

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
  if (!oturum && girisGerekli) return <Giris />;

  // Kilit oturumu kapatmıyor, üstünü örtüyor: açık adisyonlar yerinde duruyor.
  if (oturum && kilitli) return <KilitEkrani />;

  return (
    // Ayarlar tazelenince ekranlar yeniden kuruluyor: fiyat ve kasa kuralları
    // eski değerlerle çizilmiş olabilir.
    <BrowserRouter key={ayarTik}>
      <YetkiKapisi>
        <Route path="/" element={<Salon />} />
        <Route path="/siparis/:masaId" element={<Siparis />} />
        <Route path="/adisyon/:adisyonId" element={<Siparis />} />
        <Route path="/menu" element={<Navigate to="/menu/kategoriler" replace />} />
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
        <Route path="/analiz" element={<Navigate to="/analiz/ozet" replace />} />
        <Route path="/analiz/:bolum" element={<Analiz />} />
        <Route path="/ayarlar" element={<Navigate to="/ayarlar/masalar" replace />} />
        <Route path="/ayarlar/personel" element={<Personel />} />
        <Route path="/ayarlar/yetkiler" element={<Yetkiler />} />
        <Route path="/ayarlar/kisi-yetkileri" element={<Yetkiler />} />
        <Route path="/ayarlar/yazicilar" element={<Yazicilar />} />
        <Route path="/ayarlar/istasyonlar" element={<Yazicilar />} />
        <Route path="/ayarlar/fis-tasarimi" element={<FisTasarimi />} />
        <Route path="/ayarlar/yazdirma-kuyrugu" element={<YazdirmaKuyrugu />} />
        <Route path="/ayarlar/baglanti-durumu" element={<BaglantiDurumu />} />
        <Route path="/ayarlar/:bolum" element={<IsletmeAyarlari />} />
      </YetkiKapisi>
    </BrowserRouter>
  );
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