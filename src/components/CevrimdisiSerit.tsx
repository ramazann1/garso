import { CloudOff, CloudUpload, TriangleAlert } from "lucide-react";
import { useBaglanti } from "../baglanti";
import { useKuyruk } from "../kuyruk";
import { useYerelVeriZamani, zamanMetni } from "../onbellek";

/**
 * Bağlantı koptuğunda ve cihazda gönderilmemiş sipariş kaldığında ekranın
 * altında duran şerit.
 *
 * Kopukluk şimdiye kadar yalnız işlem sırasında, "kaydedilemedi" hatasıyla
 * fark ediliyordu; garson siparişi girip kaydedene kadar sorunu bilmiyordu.
 * Şerit sürekli görünüyor: bağlantı gelip bekleyenler gönderilene kadar
 * duruyor, sonra kendiliğinden kalkıyor.
 */
export default function CevrimdisiSerit() {
  const cevrimici = useBaglanti();
  const yerelZaman = useYerelVeriZamani();
  const { bekleyen, hata } = useKuyruk();

  if (cevrimici && !bekleyen && !hata) return null;

  // Bağlantı geldiğinde şerit hemen kaybolmuyor: bekleyen siparişler
  // gönderilirken de duruyor, garson kaydın gittiğini görsün.
  if (cevrimici) {
    return (
      <div className="cevrimdisi-serit" role="status">
        {hata ? <TriangleAlert size={17} /> : <CloudUpload size={17} />}
        <strong>{hata ? "Sipariş yazılamadı" : "Bekleyen sipariş gönderiliyor"}</strong>
        <span>{hata ?? `${bekleyen} sipariş sunucuya yazılıyor.`}</span>
      </div>
    );
  }

  return (
    <div className="cevrimdisi-serit" role="status">
      <CloudOff size={17} />
      <strong>Bağlantı yok</strong>
      <span>
        {bekleyen > 0
          ? `${bekleyen} sipariş cihazda bekliyor, bağlantı gelince gönderilecek.`
          : "Sipariş kaydı cihazda bekletilir, tahsilat alınamaz."}
        {/* Menü ve fiyatlar cihazdaki kopyadan geliyor: kopya ne zamanın,
            garson görsün — aradaki zam ekranda görünmüyor olabilir. */}
        {yerelZaman !== null && ` Menü ve ayarlar ${zamanMetni(yerelZaman)} bilgileriyle görünüyor.`}
      </span>
    </div>
  );
}
