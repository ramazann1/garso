import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Clock, MoreVertical, Plus } from "lucide-react";
import type { Masa, MasaDurumu } from "../types";

// Salon kartında kuruş yer kaplıyor; tam lira yeterli, garson tutarı tek bakışta
// okuyor.
const tutarYaz = (v: number) => "₺" + Math.round(v).toLocaleString("tr-TR");

export type MasaAksiyon = {
  ad: string;
  ikon: ReactNode;
  onSec: () => void;
};

type Props = {
  masa: Masa;
  durum?: MasaDurumu;
  aksiyonlar?: MasaAksiyon[];
  onClick?: () => void;
};

/**
 * Bilgi ikonla değil yazı boyutuyla sıralanıyor: boş masada tek satır masa adı,
 * dolu masada garson → masa adı → süre ve tutar. Dolu masa mercan zemin ve beyaz
 * yazı alıyor; salonun neresi çalışıyor uzaktan görünsün.
 */
export default function MasaKarti({ masa, durum, aksiyonlar, onClick }: Props) {
  const [menuAcik, setMenuAcik] = useState(false);
  const sarmal = useRef<HTMLDivElement>(null);

  // Menü açıkken başka yere tıklanınca kapansın; kartın kendisine basmak da
  // menüyü kapatıp adisyona girmesin diye dinleyici sarmalın dışını kolluyor.
  useEffect(() => {
    if (!menuAcik) return;
    const disaTiklama = (e: MouseEvent) => {
      if (!sarmal.current?.contains(e.target as Node)) setMenuAcik(false);
    };
    const kacisTusu = (e: KeyboardEvent) => e.key === "Escape" && setMenuAcik(false);
    document.addEventListener("mousedown", disaTiklama);
    document.addEventListener("keydown", kacisTusu);
    return () => {
      document.removeEventListener("mousedown", disaTiklama);
      document.removeEventListener("keydown", kacisTusu);
    };
  }, [menuAcik]);

  const sinif = [
    "masa-kart",
    durum ? "dolu" : "bos",
    masa.sekil === "daire" ? "daire" : "",
    durum?.gecikti ? "gecikti" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const menuVar = !!durum && !!aksiyonlar?.length;

  return (
    <div className="masa-sarmal" ref={sarmal}>
      {!durum ? (
        <button className={sinif} onClick={onClick}>
          <span className="masa-ad">{masa.ad}</span>
          <span className="masa-ac"><Plus size={16} /> Adisyon aç</span>
        </button>
      ) : (
        <button className={sinif} onClick={onClick}>
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
      )}

      {menuVar && (
        <>
          <button
            className={menuAcik ? "masa-menu-tus acik" : "masa-menu-tus"}
            aria-label={`${masa.ad} işlemleri`}
            onClick={() => setMenuAcik((a) => !a)}
          >
            <MoreVertical size={18} />
          </button>

          {menuAcik && (
            <div className="masa-menu">
              {aksiyonlar!.map((a) => (
                <button
                  key={a.ad}
                  onClick={() => {
                    setMenuAcik(false);
                    a.onSec();
                  }}
                >
                  {a.ikon}
                  {a.ad}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
