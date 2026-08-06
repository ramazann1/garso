import { BrowserRouter, Routes, Route } from "react-router-dom";
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
        <Route path="/menu" element={<MenuStudyosu />} />
        <Route path="/ayarlar" element={<IsletmeAyarlari />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;