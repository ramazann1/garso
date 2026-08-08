import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { ayarlariGetir } from "./isletmeAyarlari";
import Salon from "./pages/Salon";
import Siparis from "./pages/Siparis";
import MenuStudyosu from "./pages/MenuStudyosu";
import IsletmeAyarlari from "./pages/IsletmeAyarlari";

function App() {
  // İşletme ayarları toplam hesabına giriyor; okunmadan hiçbir ekran çizilmiyor
  // ki fiyatlar bir an yanlış görünüp sonra düzelmesin.
  const [hazir, setHazir] = useState(false);
  useEffect(() => {
    ayarlariGetir().finally(() => setHazir(true));
  }, []);

  if (!hazir) return <div className="yukleniyor"><div className="cember" /></div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Salon />} />
        <Route path="/siparis/:masaId" element={<Siparis />} />
        <Route path="/adisyon/:adisyonId" element={<Siparis />} />
        <Route path="/menu" element={<Navigate to="/menu/kategoriler" replace />} />
        <Route path="/menu/:bolum" element={<MenuStudyosu />} />
        <Route path="/ayarlar" element={<Navigate to="/ayarlar/masalar" replace />} />
        <Route path="/ayarlar/:bolum" element={<IsletmeAyarlari />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;