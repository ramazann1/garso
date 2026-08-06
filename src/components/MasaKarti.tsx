import { Clock, Plus } from "lucide-react";
import type { Masa, MasaDurumu } from "../types";

// Salon kartında kuruş yer kaplıyor; tam lira yeterli, garson tutarı tek bakışta
// okuyor.
const tutarYaz = (v: number) => "₺" + Math.round(v).toLocaleString("tr-TR");

type Props = {
  masa: Masa;
  durum?: MasaDurumu;
  onClick?: () => void;
};

/**
 * Bilgi ikonla değil yazı boyutuyla sıralanıyor: boş masada tek satır masa adı,
 * dolu masada garson → masa adı → süre ve tutar. Dolu masa mercan zemin ve beyaz
 * yazı alıyor; salonun neresi çalışıyor uzaktan görünsün.
 */
export default function MasaKarti({ masa, durum, onClick }: Props) {
  const sinif = [
    "masa-kart",
    durum ? "dolu" : "bos",
    masa.sekil === "daire" ? "daire" : "",
    durum?.gecikti ? "gecikti" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!durum) {
    return (
      <button
        className={sinif}
        onClick={onClick}
      >
        <span className="masa-ad">{masa.ad}</span>
        <span className="masa-ac"><Plus size={16} /> Adisyon aç</span>
      </button>
    );
  }

  return (
    <button
      className={sinif}
      onClick={onClick}
    >
      <span className="masa-ust">
        {durum.garson && <span className="masa-garson">{durum.garson}</span>}
      </span>

      <span className="masa-ad">{masa.ad}</span>

      <span className="masa-satir">
        <span className="masa-sure">
          {durum.gecikti && <Clock size={13} />}
          {durum.sure}
        </span>
        <strong className="masa-tutar">{tutarYaz(durum.tutar)}</strong>
      </span>
    </button>
  );
}
