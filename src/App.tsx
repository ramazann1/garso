import { BrowserRouter, Routes, Route } from "react-router-dom";
import Salon from "./pages/Salon";
import Siparis from "./pages/Siparis";
import MenuStudyosu from "./pages/MenuStudyosu";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Salon />} />
        <Route path="/siparis/:masaAd" element={<Siparis />} />
        <Route path="/menu" element={<MenuStudyosu />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;