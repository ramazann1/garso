import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, CircleCheckBig, Clock, CloudOff, CloudUpload, LockKeyhole, MoreVertical, Plus, Printer, Users } from "lucide-react";
import { paraGoster } from "../para";
import type { Masa, MasaDurumu } from "../types";

export type MasaAksiyon = {
  ad: string;
  ikon: ReactNode;
  onSec: () => void;
};

type Props = {
  masa: Masa;
  durum?: MasaDurumu;
  aksiyonlar?: MasaAksiyon[];
  /** Masada şu an işlem yapan başka kişi varsa adı; kart rozet gösteriyor. */
  mesgul?: string;
  /**
   * Salon hedef masa seçme kipindeyken doluyor: kart artık adisyona girmiyor,
   * hedefi seçiyor. "kilitli" masa seçilemez — silikleşmiyor, köşesine kilit
   * alıyor ki adı ve tutarı okunur kalsın.
   */
  secim?: "uygun" | "kilitli";
  onClick?: () => void;
};

/**
 * Bilgi ikonla değil yazı boyutuyla sıralanıyor: boş masada tek satır masa adı,
 * dolu masada garson → masa adı → süre ve tutar. Dolu masa mercan zemin ve beyaz
 * yazı alıyor; salonun neresi çalışıyor uzaktan görünsün.
 */
export default function MasaKarti({ masa, durum, aksiyonlar, mesgul, secim, onClick }: Props) {
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

  // Hesabı kapanmış ama henüz kalkmamış masa: kart yeşile dönüyor ki garson
  // uzaktan "burada iş bitti" desin. Kısmi ödemede hesap sürüyor, kart mercan
  // kalıyor ama tutar artık kalanı gösteriyor.
  const odenen = durum?.odenen ?? 0;
  const kalan = durum?.kalan ?? durum?.tutar ?? 0;
  const odendi = !!durum && durum.tutar > 0 && odenen > 0 && kalan <= 0;

  const sinif = [
    "masa-kart",
    durum ? "dolu" : "bos",
    masa.sekil === "daire" ? "daire" : "",
    durum?.durgun ? "durgun" : "",
    durum?.fisBasildi ? "fisli" : "",
    odendi ? "odendi" : odenen > 0 ? "kismi" : "",
    mesgul ? "mesgul" : "",
    secim ? `secim-${secim}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Seçim kipinde üç nokta menüsü kapanıyor: o an kartın tek bir işi var,
  // hedef olup olmadığını söylemek.
  const menuVar = !!durum && !!aksiyonlar?.length && !secim;
  const kilitli = secim === "kilitli";

  return (
    <div className="masa-sarmal" ref={sarmal}>
      {/* Masada biri varsa kartın altına adı düşüyor: garson ızgaraya bakınca
          hangi masaya girmemesi gerektiğini görüyor. */}
      {mesgul && (
        <span className="masa-mesgul">
          <LockKeyhole size={15} />
          {mesgul}
        </span>
      )}
      {/* Seçilemeyen masanın kilidi köşede duruyor; kartın içine girmiyor ki
          dolu masadaki rakam düzeni bozulmasın. */}
      {kilitli && (
        <span className="masa-secilemez">
          <LockKeyhole size={14} />
        </span>
      )}
      {!durum ? (
        <button className={sinif} disabled={kilitli} onClick={onClick}>
          <span className="masa-ad">{masa.ad}</span>
          {/* Seçim kipinde boş masa adisyon açmıyor, hedef oluyor: alt yazı
              da o işi söylüyor. Seçilemeyen masada hiç çıkmıyor. */}
          <span className="masa-ac">
            {secim === "uygun" ? (
              <>
                <ArrowRight size={16} /> Buraya taşı
              </>
            ) : (
              <>
                <Plus size={16} /> Adisyon aç
              </>
            )}
          </span>
        </button>
      ) : (
        <button className={sinif} disabled={kilitli} onClick={onClick}>
          <span className="masa-ust">
            {durum.garson && <span className="masa-garson">{durum.garson}</span>}
            {/* Hesap fişi basılmışsa kartta yazıcı işareti duruyor; masaya yeni
                ürün girilince işaret kalkıyor, kâğıttaki tutar artık tutmuyor. */}
            {durum.fisBasildi && (
              <span className="masa-fis" title="Hesap fişi basıldı">
                <Printer size={13} />
              </span>
            )}
          </span>

          {/* Süre masa adının sağında: üç nokta düğmesinin tam altındaki satır,
              düğmeyle aynı hizaya düşüp sıkışmıyor. */}
          <span className="masa-baslik">
            <span className="masa-ad">{masa.ad}</span>
            {/* Süre yerine masanın hâli yazıyor, ikisi de olduğunda önemli
                olan bu: sipariş cihazda mı bekliyor, yoksa masa sunucuya
                sorulamayıp cihazdaki kopyadan mı çiziliyor. İkisi ayrı şey —
                kopyada gönderilmemiş bir kayıt yok, bilgi eski olabilir. */}
            {durum.bekliyor ? (
              <span className="masa-bekliyor">
                <CloudUpload size={13} />
                Gönderilmedi
              </span>
            ) : durum.kopyaSaati ? (
              <span className="masa-bekliyor kopya">
                <CloudOff size={13} />
                {durum.kopyaSaati} hâli
              </span>
            ) : (
              <span className="masa-sure">
                <Clock size={12} />
                {durum.sure}
              </span>
            )}
          </span>

          {/* Kişi sayısı üç nokta düğmesinin solunda, onunla aynı hizada:
              satır akışına girmiyor ki kart düzeni masadan masaya kaymasın. */}
          {!!durum.kisiSayisi && (
            <span className="masa-kisi">
              <Users size={13} />
              {durum.kisiSayisi}
            </span>
          )}

          {/* Rakamlar her dolu masada aynı düzende: masadan masaya kayan bir
              yerleşim yerine üç sütun hep aynı yerde duruyor. */}
          <span className="masa-rakamlar">
            <span className="masa-rakam">
              <em>Toplam</em>
              <strong>{paraGoster(durum.tutar)}</strong>
            </span>
            <span className="masa-rakam">
              <em>Ödenen</em>
              <strong>{paraGoster(odenen)}</strong>
            </span>
            <span className="masa-rakam kalan">
              <em>{odendi ? "Durum" : "Kalan"}</em>
              <strong>
                {odendi ? (
                  <>
                    <CircleCheckBig size={14} />
                    Ödendi
                  </>
                ) : (
                  paraGoster(kalan)
                )}
              </strong>
            </span>
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
