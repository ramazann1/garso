import { CloudOff } from "lucide-react";
import { useBaglanti } from "../baglanti";

/**
 * Bağlantı koptuğunda ekranın üstünde duran şerit.
 *
 * Kopukluk şimdiye kadar yalnız işlem sırasında, "kaydedilemedi" hatasıyla
 * fark ediliyordu; garson siparişi girip kaydedene kadar sorunu bilmiyordu.
 * Şerit sürekli görünüyor: bağlantı gelene kadar duruyor, gelince kendiliğinden
 * kalkıyor. Sayfanın üstüne biniyor, düzeni kaydırmıyor — kopukluk anında
 * bütün ekran zıplamasın.
 */
export default function CevrimdisiSerit() {
  const cevrimici = useBaglanti();
  if (cevrimici) return null;

  return (
    <div className="cevrimdisi-serit" role="status">
      <CloudOff size={17} />
      <strong>Bağlantı yok</strong>
      <span>Sipariş ve tahsilat kaydedilemiyor. Bağlantı gelince kendiliğinden düzelir.</span>
    </div>
  );
}
