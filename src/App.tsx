import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Salon from "./pages/Salon";
import Siparis from "./pages/Siparis";
import MenuStudyosu from "./pages/MenuStudyosu";
import IsletmeAyarlari from "./pages/IsletmeAyarlari";

function App() {
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