import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { paraGoster } from "../para";

/**
 * Analiz ekranının çizim bileşenleri. Hazır grafik kütüphanesi kullanılmıyor:
 * kütüphanelerin varsayılan görünümü (her çubuk ayrı renk, altında aynı
 * etiketleri tekrarlayan lejant, eksende 20000.00 gibi ham sayı) bizim görsel
 * dilimize uymuyor ve düzeltmesi baştan çizmekten uzun sürüyor. Hepsi SVG;
 * renkler değişkenlerden, para biçimi kendi biçimleyicimizden geliyor.
 */

const KISA_PARA = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}B`;
  return String(Math.round(n));
};

/** Eksen için yuvarlak bir tavan: 8.430 → 10.000, 137 → 150. */
function tavan(enBuyuk: number) {
  if (enBuyuk <= 0) return 1;
  const basamak = 10 ** Math.floor(Math.log10(enBuyuk));
  const kat = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((k) => k * basamak >= enBuyuk) ?? 10;
  return kat * basamak;
}

export type Nokta = { etiket: string; baslik: string; tutar: number; adet: number };

/**
 * Ciro eğrisi. Önceki dönem soluk bir çizgi olarak arkada duruyor — Adisyo'da
 * hiçbir grafikte karşılaştırma yok, rakam tek başına anlamsız.
 *
 * Eğri değil kırık çizgi çiziliyor: yumuşatılmış eğri olmayan bir tepe
 * uydurabiliyor (saat 03:00'te satış yokken çizginin şişmesi gibi).
 */
export function CizgiGrafik({
  noktalar,
  onceki,
  yukseklik = 210,
  koyu,
}: {
  noktalar: Nokta[];
  onceki?: Nokta[];
  yukseklik?: number;
  /** Koyu kahraman kartın içinde: eksen ve kılavuzlar açık tona dönüyor. */
  koyu?: boolean;
}) {
  const id = useId();
  const [uzerinde, setUzerinde] = useState<number | null>(null);

  if (noktalar.length === 0) return null;

  // Çizim alanı kendi kutusuna esniyor (preserveAspectRatio="none"). Bu yüzden
  // SVG'nin içine yazı konmuyor: eksen rakamları da çizgiyle birlikte dikey
  // olarak geriliyor ve şişkin, yamuk bir tipografi çıkıyordu. Eksen etiketleri
  // HTML'de, kendi puntosunda duruyor.
  const G = 1000;
  const Y = 300;
  const cizimG = G;
  const cizimY = Y;
  const ustBosluk = 0;
  const solBosluk = 0;

  const enBuyuk = Math.max(
    ...noktalar.map((n) => n.tutar),
    ...(onceki ?? []).map((n) => n.tutar)
  );
  const ust = tavan(enBuyuk);

  // Noktanın soldan oranı. Çizim, daire ve eksen etiketi aynı orandan
  // besleniyor ki üçü birbirinden kaymasın.
  const oran = (i: number) => (noktalar.length === 1 ? 0.5 : i / (noktalar.length - 1));

  const x = (i: number) => solBosluk + oran(i) * cizimG;
  const y = (tutar: number) => ustBosluk + cizimY - (tutar / ust) * cizimY;

  /**
   * Yumuşatılmış eğri (Fritsch–Carlson). Kırık çizgi testere gibi duruyordu.
   * Sıradan bir bezier yumuşatma olmayan tepeler uydurur — bu yöntem iki nokta
   * arasında asla ikisinin dışına çıkmıyor, yani grafik veride olmayan bir
   * zirve göstermiyor.
   */
  const yol = (dizi: Nokta[]) => {
    if (dizi.length === 1) return `M${x(0).toFixed(1)},${y(dizi[0].tutar).toFixed(1)}`;

    const px = dizi.map((_, i) => x(i));
    const py = dizi.map((n) => y(n.tutar));
    const egim: number[] = [];

    for (let i = 0; i < dizi.length; i++) {
      if (i === 0 || i === dizi.length - 1) {
        const j = i === 0 ? 0 : i - 1;
        egim.push((py[j + 1] - py[j]) / (px[j + 1] - px[j]));
        continue;
      }
      const onceki = (py[i] - py[i - 1]) / (px[i] - px[i - 1]);
      const sonraki = (py[i + 1] - py[i]) / (px[i + 1] - px[i]);
      // İşaret değiştiren yerde eğim sıfır: tepe ve çukurlar yerinde kalıyor.
      egim.push(onceki * sonraki <= 0 ? 0 : (onceki + sonraki) / 2);
    }

    let d = `M${px[0].toFixed(1)},${py[0].toFixed(1)}`;
    for (let i = 0; i < dizi.length - 1; i++) {
      const dx = (px[i + 1] - px[i]) / 3;
      d +=
        ` C${(px[i] + dx).toFixed(1)},${(py[i] + egim[i] * dx).toFixed(1)}` +
        ` ${(px[i + 1] - dx).toFixed(1)},${(py[i + 1] - egim[i + 1] * dx).toFixed(1)}` +
        ` ${px[i + 1].toFixed(1)},${py[i + 1].toFixed(1)}`;
    }
    return d;
  };

  const alan =
    `${yol(noktalar)} L${x(noktalar.length - 1).toFixed(1)},${ustBosluk + cizimY} ` +
    `L${x(0).toFixed(1)},${ustBosluk + cizimY} Z`;

  // Etiketler sıkışınca üst üste biniyor; kaç noktada bir yazılacağı nokta
  // sayısından çıkıyor, ilk ve son her zaman yazılıyor.
  const atla = Math.ceil(noktalar.length / 12);
  const secili = uzerinde != null ? noktalar[uzerinde] : null;

  return (
    <div
      className={`gr-sarmal${koyu ? " koyu" : ""}`}
      style={{ minHeight: yukseklik }}
      onMouseLeave={() => setUzerinde(null)}
    >
      <div className="gr-orta">
        <div className="gr-y">
          {[1, 0.5, 0].map((oran) => (
            <span key={oran}>{KISA_PARA(ust * oran)}</span>
          ))}
        </div>

        <div className="gr-tuval">
          <i className="gr-kilavuz" style={{ top: 0 }} />
          <i className="gr-kilavuz" style={{ top: "50%" }} />
          <i className="gr-kilavuz" style={{ bottom: 0 }} />

          <svg viewBox={`0 0 ${G} ${Y}`} preserveAspectRatio="none" role="img">
            <defs>
              <linearGradient id={`${id}-dolgu`} x1="0" y1="0" x2="0" y2="1">
                <stop className="gr-dolgu-ust" offset="0%" stopColor="var(--mercan)" stopOpacity=".3" />
                <stop offset="100%" stopColor="var(--mercan)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Önceki dönem: kesikli çizgi bu dönemin eğrisiyle kesişince ikisi
                birbirine karışıp taralı bir kalabalık oluyordu. Artık dolgusuz,
                ince ve düz bir hat — geride duruyor ama okunuyor. */}
            {onceki && onceki.length > 1 && <path className="gr-onceki" d={yol(onceki)} />}

            <path d={alan} fill={`url(#${id}-dolgu)`} />
            <path className="gr-yol" d={yol(noktalar)} />
          </svg>

          {/* Dokunma alanları HTML'de: her nokta için eşit bir sütun. Fare
              çizginin tam üstüne gelmek zorunda değil. */}
          <div className="gr-sutunlar">
            {noktalar.map((n, i) => (
              <button
                key={n.etiket}
                type="button"
                className={uzerinde === i ? "acik" : ""}
                onMouseEnter={() => setUzerinde(i)}
                onFocus={() => setUzerinde(i)}
                aria-label={`${n.baslik}: ${paraGoster(n.tutar)}`}
              />
            ))}
          </div>

          {/*
            Nokta sütunun ortasına değil, çizginin gerçekten geçtiği yere
            konuyor. Sütunlar eşit genişlikte ve ortadan hizalıydı; çizgi ise
            ilk noktadan son noktaya eşit aralıkla gidiyor. İkisi yalnız
            grafiğin ortasında çakışıyor, uçlarda daire tarihin yanına düşüyordu.
          */}
          {secili && (
            <i
              className="gr-nokta"
              style={{
                left: `${oran(uzerinde as number) * 100}%`,
                bottom: `${(secili.tutar / ust) * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Etiketler de noktanın oranına oturuyor; eşit paylara bölündüğünde
          yarım sütun kayıyor ve tarih çizginin altına denk gelmiyordu. */}
      <div className="gr-x">
        {noktalar.map((n, i) =>
          i % atla === 0 || i === noktalar.length - 1 ? (
            <span
              key={n.etiket}
              className={uzerinde === i ? "acik" : ""}
              style={{ left: `${oran(i) * 100}%` }}
            >
              {n.etiket}
            </span>
          ) : null
        )}
      </div>

      {secili && (
        <div className="gr-balon">
          <strong>{secili.baslik}</strong>
          <span>{paraGoster(secili.tutar)}</span>
          <em>{secili.adet} adisyon</em>
        </div>
      )}
    </div>
  );
}

export type Dilim = { ad: string; tutar: number; adet: number };

/**
 * Halka. Tek renk ailesi: en büyük dilim mercan, gerisi aynı tonun açılan
 * kademeleri. Adisyo'nun grafiklerinde her dilim başka bir renk ve altında
 * aynı adları tekrar eden lejant var; renk orada bilgi taşımıyor, gürültü.
 */
export function Halka({
  dilimler,
  toplam,
  enFazla,
  onTumu,
  lejantsiz,
  vurguAd,
}: {
  dilimler: Dilim[];
  toplam: number;
  /** Lejantta gösterilecek en çok satır; kalanı tek düğmede toplanıyor. */
  enFazla?: number;
  onTumu?: () => void;
  /** Yalnız çember: lejantı kendi listesi olan pencerede tekrarlanmasın. */
  lejantsiz?: boolean;
  /**
   * Dışarıdan gelen vurgu. Lejant başka bir bileşende duruyorsa (kategori
   * penceresi) halkanın hangi dilimi yakacağını o liste söylüyor.
   */
  vurguAd?: string | null;
}) {
  const [icVurgu, setIcVurgu] = useState<number | null>(null);
  const gecerli = dilimler.filter((d) => d.tutar > 0);
  if (!gecerli.length || toplam <= 0) return null;

  const disVurgu = vurguAd ? gecerli.findIndex((d) => d.ad === vurguAd) : -1;
  const uzerinde = disVurgu >= 0 ? disVurgu : icVurgu;
  const setUzerinde = setIcVurgu;

  // Halka bütün dilimleri çiziyor, kısaltma yalnız lejantta: otuz kategorili
  // menüde liste kartı ekran boyu uzatıyordu.
  const lejant = enFazla ? gecerli.slice(0, enFazla) : gecerli;
  const gizli = gecerli.length - lejant.length;

  const R = 62;
  const kalinlik = 22;
  const cevre = 2 * Math.PI * R;
  const secili = uzerinde != null ? gecerli[uzerinde] : null;

  let birikim = 0;
  const halkalar = gecerli.map((d, i) => {
    const pay = d.tutar / toplam;
    const parca = { d, pay, kayma: birikim, i };
    birikim += pay;
    return parca;
  });

  return (
    <div className={`gr-halka-sarmal${uzerinde != null ? " secili" : ""}`}>
      <div className="gr-halka">
        <svg viewBox="0 0 160 160" role="img">
          <circle className="gr-halka-zemin" cx="80" cy="80" r={R} strokeWidth={kalinlik} />
          {halkalar.map(({ d, pay, kayma, i }) => (
            <circle
              key={d.ad}
              className={`gr-dilim k${i % 5}${uzerinde === i ? " vurgu" : ""}`}
              cx="80"
              cy="80"
              r={R}
              strokeWidth={kalinlik}
              strokeDasharray={`${(pay * cevre).toFixed(2)} ${cevre.toFixed(2)}`}
              strokeDashoffset={(-kayma * cevre).toFixed(2)}
              onMouseEnter={() => setUzerinde(i)}
              onMouseLeave={() => setUzerinde(null)}
            />
          ))}
        </svg>
        <div className="gr-halka-ic">
          <strong>{paraGoster(secili ? secili.tutar : toplam)}</strong>
          <span>{secili ? secili.ad : "toplam"}</span>
        </div>
      </div>

      {lejantsiz ? null : (
      <ul className="gr-lejant">
        {lejant.map((d, i) => (
          <li
            key={d.ad}
            className={uzerinde === i ? "vurgu" : ""}
            onMouseEnter={() => setUzerinde(i)}
            onMouseLeave={() => setUzerinde(null)}
          >
            <i className={`k${i % 5}`} />
            <span>{d.ad}</span>
            <strong>{paraGoster(d.tutar)}</strong>
            <em>%{Math.round((d.tutar / toplam) * 100)}</em>
          </li>
        ))}

        {gizli > 0 && onTumu ? (
          <li className="gr-lejant-devam">
            <button type="button" onClick={onTumu}>
              <span>{gizli} kategori daha</span>
              <b>
                Tümünü gör
                <ChevronRight size={15} />
              </b>
            </button>
          </li>
        ) : null}
      </ul>
      )}
    </div>
  );
}

/**
 * Değişim rozeti: "▲ %12 · geçen döneme göre". Önceki dönemde hiç satış yoksa
 * yüzde hesaplanamaz — "%100 artış" demek yerine rozet çıkmıyor.
 */
export function Degisim({ simdi, onceki }: { simdi: number; onceki: number | null }) {
  if (onceki == null || onceki <= 0) return null;

  const oran = ((simdi - onceki) / onceki) * 100;
  // Yarım puanlık oynama gürültü; "değişmedi" demek daha dürüst.
  const yon = Math.abs(oran) < 0.5 ? "esit" : oran > 0 ? "artan" : "azalan";

  return (
    <span className={`gr-degisim ${yon}`}>
      {yon === "esit" ? "≈" : yon === "artan" ? "▲" : "▼"}
      {yon === "esit" ? " aynı" : ` %${Math.abs(Math.round(oran))}`}
    </span>
  );
}
