import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { ayarlariGetir } from "./isletmeAyarlari";
import Salon from "./pages/Salon";
import Siparis from "./pages/Siparis";
import MenuStudyosu from "./pages/MenuStudyosu";
import IsletmeAyarlari from "./pages/IsletmeAyarlari";
import Personel from "./pages/Personel";
import Yetkiler from "./pages/Yetkiler";
import Giris from "./pages/Giris";
import KilitEkrani from "./components/KilitEkrani";
import { girisKuruldu, oturumuYukle, useOturum } from "./oturum";

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

  if (!hazir) return <div className="yukleniyor"><div className="cember" /></div>;

  // Oturum yoksa hiçbir ekran açılmıyor; adresi elle yazmak da giriş ekranına düşer.
  if (!oturum && girisGerekli) return <Giris />;

  // Kilit oturumu kapatmıyor, üstünü örtüyor: açık adisyonlar yerinde duruyor.
  if (oturum && kilitli) return <KilitEkrani />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Salon />} />
        <Route path="/siparis/:masaId" element={<Siparis />} />
        <Route path="/adisyon/:adisyonId" element={<Siparis />} />
        <Route path="/menu" element={<Navigate to="/menu/kategoriler" replace />} />
        <Route path="/menu/:bolum" element={<MenuStudyosu />} />
        <Route path="/ayarlar" element={<Navigate to="/ayarlar/masalar" replace />} />
        <Route path="/ayarlar/personel" element={<Personel />} />
        <Route path="/ayarlar/yetkiler" element={<Yetkiler />} />
        <Route path="/ayarlar/kisi-yetkileri" element={<Yetkiler />} />
        <Route path="/ayarlar/:bolum" element={<IsletmeAyarlari />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;