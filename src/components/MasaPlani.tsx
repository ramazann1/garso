import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Masa } from "../types";
import type { Yerlesim } from "../masalar";

// Plan sabit birimli bir tuvalde çiziliyor; ekran genişliği ne olursa olsun
// masaların birbirine göre yeri değişmesin diye. Tuval ekrana orantılı sığıyor.
export const TUVAL_EN = 1000;
export const TUVAL_BOY = 640;

const IZGARA = 10;
const EN_KUCUK_EN = 80;
const EN_KUCUK_BOY = 70;
const VARSAYILAN_EN = 150;
const VARSAYILAN_BOY = 110;

const kirp = (deger: number, alt: number, ust: number) => Math.min(ust, Math.max(alt, deger));
const izgaraya = (deger: number) => Math.round(deger / IZGARA) * IZGARA;

/** Masanın kayıtlı yerleşimi; hiç taşınmamışsa boyut varsayılana düşer. */
export function yerlesimAl(masa: Masa): Yerlesim {
  return {
    konumX: masa.konumX ?? 0,
    konumY: masa.konumY ?? 0,
    genislik: masa.genislik || VARSAYILAN_EN,
    yukseklik: masa.yukseklik || VARSAYILAN_BOY,
  };
}

export const yerlesimiVar = (masa: Masa) => masa.konumX != null && masa.konumY != null;

/**
 * Masaları sıraya göre tuvale dizer. Plan ilk açıldığında ve "Otomatik diz"
 * denince kullanılıyor — boş tuvalle karşılaşılmasın.
 */
export function otomatikDiz(masalar: Masa[]): (Yerlesim & { id: number })[] {
  const bosluk = 20;
  const sutun = Math.max(1, Math.floor((TUVAL_EN + bosluk) / (VARSAYILAN_EN + bosluk)));

  return masalar.map((m, i) => ({
    id: m.id,
    konumX: bosluk + (i % sutun) * (VARSAYILAN_EN + bosluk),
    konumY: bosluk + Math.floor(i / sutun) * (VARSAYILAN_BOY + bosluk),
    genislik: m.genislik || VARSAYILAN_EN,
    yukseklik: m.yukseklik || VARSAYILAN_BOY,
  }));
}

type Props = {
  masalar: Masa[];
  /** Sürükleme ve boyutlandırma yalnız ayar ekranında açık. */
  duzenlenebilir?: boolean;
  onYerlesim?: (id: number, yerlesim: Yerlesim) => void;
  icerik: (masa: Masa) => ReactNode;
};

type Surukleme = {
  id: number;
  tip: "tasi" | "boyutlandir";
  baslangicX: number;
  baslangicY: number;
  ilk: Yerlesim;
};

export default function MasaPlani({ masalar, duzenlenebilir, onYerlesim, icerik }: Props) {
  const tuval = useRef<HTMLDivElement>(null);
  const [surukleme, setSurukleme] = useState<Surukleme | null>(null);
  // Sürüklenen masanın anlık hâli; bırakılana kadar yalnız ekranda duruyor.
  const [gecici, setGecici] = useState<(Yerlesim & { id: number }) | null>(null);

  // Ekrandaki piksel farkını tuval birimine çeviriyor; tuval ölçeklendiği için
  // 1 piksel her ekranda farklı sayıda birime denk geliyor.
  const birime = (piksel: number) => {
    const genislik = tuval.current?.getBoundingClientRect().width ?? TUVAL_EN;
    return (piksel * TUVAL_EN) / genislik;
  };

  const yerlesim = (masa: Masa): Yerlesim =>
    gecici?.id === masa.id ? gecici : yerlesimAl(masa);

  // Salt okunur planda tuval kullanılan alana göre kırpılıyor; dört masalık bir
  // bölgenin altında yarım ekran boşluk kalmasın. Düzenlerken tuvalin tamamı
  // duruyor, yoksa masayı aşağı taşıyacak yer olmazdı.
  const boy = duzenlenebilir
    ? TUVAL_BOY
    : Math.min(
        TUVAL_BOY,
        Math.max(
          220,
          ...masalar.map((m) => {
            const y = yerlesimAl(m);
            return y.konumY + y.yukseklik + 20;
          })
        )
      );

  const basla = (e: React.PointerEvent, masa: Masa, tip: Surukleme["tip"]) => {
    if (!duzenlenebilir) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSurukleme({
      id: masa.id,
      tip,
      baslangicX: e.clientX,
      baslangicY: e.clientY,
      ilk: yerlesimAl(masa),
    });
  };

  const hareket = (e: React.PointerEvent) => {
    if (!surukleme) return;
    const dx = birime(e.clientX - surukleme.baslangicX);
    const dy = birime(e.clientY - surukleme.baslangicY);
    const { ilk } = surukleme;

    if (surukleme.tip === "tasi") {
      setGecici({
        id: surukleme.id,
        genislik: ilk.genislik,
        yukseklik: ilk.yukseklik,
        konumX: izgaraya(kirp(ilk.konumX + dx, 0, TUVAL_EN - ilk.genislik)),
        konumY: izgaraya(kirp(ilk.konumY + dy, 0, TUVAL_BOY - ilk.yukseklik)),
      });
    } else {
      setGecici({
        id: surukleme.id,
        konumX: ilk.konumX,
        konumY: ilk.konumY,
        genislik: izgaraya(kirp(ilk.genislik + dx, EN_KUCUK_EN, TUVAL_EN - ilk.konumX)),
        yukseklik: izgaraya(kirp(ilk.yukseklik + dy, EN_KUCUK_BOY, TUVAL_BOY - ilk.konumY)),
      });
    }
  };

  // Kaydetme bırakışta: sürükleme boyunca her karede yazsak veritabanı boğulurdu.
  const bitir = () => {
    if (gecici) {
      const { id, ...yeni } = gecici;
      onYerlesim?.(id, yeni);
    }
    setSurukleme(null);
    setGecici(null);
  };

  return (
    <div
      ref={tuval}
      className={duzenlenebilir ? "masa-plani duzenlenebilir" : "masa-plani"}
      style={{ aspectRatio: `${TUVAL_EN} / ${boy}` }}
      onPointerMove={hareket}
      onPointerUp={bitir}
      onPointerCancel={bitir}
    >
      {masalar.map((masa) => {
        const y = yerlesim(masa);
        return (
          <div
            key={masa.id}
            className={surukleme?.id === masa.id ? "plan-masa tasiniyor" : "plan-masa"}
            style={{
              left: `${(y.konumX / TUVAL_EN) * 100}%`,
              top: `${(y.konumY / boy) * 100}%`,
              width: `${(y.genislik / TUVAL_EN) * 100}%`,
              height: `${(y.yukseklik / boy) * 100}%`,
            }}
            onPointerDown={(e) => basla(e, masa, "tasi")}
          >
            {icerik(masa)}

            {duzenlenebilir && (
              <span
                className="plan-tutamac"
                onPointerDown={(e) => basla(e, masa, "boyutlandir")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
