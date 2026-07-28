import { BrowserRouter, Routes, Route } from "react-router-dom";
import Salon from "./pages/Salon";
import Siparis from "./pages/Siparis";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Salon />} />
        <Route path="/siparis/:masaAd" element={<Siparis />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;