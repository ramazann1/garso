import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Ban,
  Banknote,
  Clock,
  DoorOpen,
  Gift,
  History,
  Merge,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { adetGoster, paraGoster } from "../para";
import { adisyonDetayi, type AdisyonDetay as Detay } from "../analiz";
import { adisyonDenetimi, type DenetimSatiri } from "../denetim";

const saat = (t: string) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const gunSaat = (t: string) =>
  `${new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })} ${saat(t)}`;

/**
 * Denetim defterinin işlemleri çizelgede kendi imlerini taşıyor: hepsi aynı
 * ikonla çizilseydi "ne oldu" sorusunun cevabı yalnız yazıda kalırdı.
 */
const DENETIM_IKONLARI: Record<string, React.ReactNode> = {
  kalem_iptal: <Ban size={15} />,
  kalem_iptal_geri: <Undo2 size={15} />,
  kalem_ikram: <Gift size={15} />,
  kalem_ikram_geri: <Undo2 size={15} />,
  adisyon_iptal: <Ban size={15} />,
  adisyon_ikram: <Gift size={15} />,
  tahsilat_sil: <Trash2 size={15} />,
  tahsilat_tip_duzelt: <Pencil size={15} />,
  hesap_eksik_kapat: <TriangleAlert size={15} />,
  adisyon_masa_degisti: <ArrowRightLeft size={15} />,
  adisyon_birlestirildi: <Merge size={15} />,
};

/** Defter satırının altına yazılan tek cümle: neye, ne kadar, niçin. */
function denetimAlt(k: DenetimSatiri) {
  const parcalar: string[] = [];
  if (k.konu) parcalar.push(k.adet ? `${adetGoster(k.adet)} × ${k.konu}` : k.konu);
  if (k.tutar) parcalar.push(paraGoster(k.tutar));
  if (k.odenmez) parcalar.push(k.odenmez);
  if (k.sebep) parcalar.push(k.sebep);
  return parcalar.join(" · ");
}

/**
 * Hesabın kendi penceresi: açılışından kapanışına ne olduysa tek hatta,
 * zaman sırasında. Kendi verisini kendi çekiyor — salondan, sipariş
 * ekranından ve adisyon detayından aynı pencere açılıyor, üçünün ayrı ayrı
 * veri hazırlaması gerekmesin diye.
 */
export default function SiparisGecmisi({
  adisyonId,
  baslik,
  onKapat,
}: {
  adisyonId: number;
  /** Pencere başlığındaki ad: masa adı ya da "Adisyon #3105". */
  baslik?: string;
  onKapat: () => void;
}) {
  const [detay, setDetay] = useState<Detay | null>(null);
  const [kayitlar, setKayitlar] = useState<DenetimSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    setYukleniyor(true);
    Promise.all([adisyonDetayi(adisyonId), adisyonDenetimi(adisyonId)]).then(([d, k]) => {
      setDetay(d);
      setKayitlar(k);
      setYukleniyor(false);
    });
  }, [adisyonId]);

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal gecmis-pencere" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          <h3>
            <History size={18} />
            {baslik ? `${baslik} · Sipariş geçmişi` : "Sipariş geçmişi"}
          </h3>
          <button className="up-kapat" onClick={onKapat}>
            <X size={19} />
          </button>
        </header>

        <div className="gecmis-govde">
          {yukleniyor ? (
            <div className="yukleniyor">
              <div className="cember" />
            </div>
          ) : detay ? (
            <ZamanCizelgesi detay={detay} kayitlar={kayitlar} />
          ) : (
            <p className="detay-bos">Bu adisyon bulunamadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Olaylar üç kaynaktan geliyor: adisyonun kendi saatleri (açılış, turlar,
 * tahsilatlar, kapanış), bir de denetim defteri. Hepsi tek listede toplanıp
 * zamana göre diziliyor — hangi kaynaktan geldikleri sırayı belirlemiyor.
 */
export function ZamanCizelgesi({
  detay,
  kayitlar,
}: {
  detay: Detay;
  kayitlar: DenetimSatiri[];
}) {
  type Olay = {
    zaman: string;
    ikon: React.ReactNode;
    kisi: string;
    baslik: string;
    alt?: string;
    dikkat?: boolean;
  };

  const olaylar: Olay[] = [
    {
      zaman: detay.acilis,
      ikon: <DoorOpen size={15} />,
      kisi: detay.garson,
      baslik: "Sipariş açıldı",
    },
    ...detay.turlar.map((tur) => ({
      zaman: tur.saat,
      ikon: <Plus size={15} />,
      kisi: tur.garson,
      baslik: "Yeni ürün eklendi",
      alt: tur.kalemler.map((k) => `${adetGoster(k.adet)} × ${k.ad}`).join(" · "),
    })),
    ...detay.tahsilatlar.map((t) => ({
      zaman: t.olusturma,
      ikon: <Banknote size={15} />,
      kisi: t.kisi,
      baslik: "Ödeme yapıldı",
      alt: `${t.tip} · ${paraGoster(t.tutar)}`,
    })),
    // Defterdeki hassas işlemler: iptal, ikram, tahsilat silme, eksik kapatma.
    // Hesapta ne olduğu sorusunun asıl cevabı bunlar; ürün ve ödeme satırlarıyla
    // aynı hatta, kendi zamanlarında duruyorlar.
    ...kayitlar.map((k) => ({
      zaman: k.zaman,
      ikon: DENETIM_IKONLARI[k.islem] ?? <History size={15} />,
      kisi: k.kisi === "—" ? "" : k.kisi,
      baslik: k.islemAd,
      alt: denetimAlt(k),
      dikkat: true,
    })),
  ];

  if (detay.kapanis) {
    olaylar.push({
      zaman: detay.kapanis,
      ikon: <Clock size={15} />,
      kisi: detay.kapatan,
      baslik: "Sipariş kapatıldı",
      alt: paraGoster(detay.toplam),
    });
  }

  olaylar.sort((a, b) => a.zaman.localeCompare(b.zaman));

  return (
    <ol className="detay-cizelge">
      {olaylar.map((o, i) => (
        <li key={i} className={o.dikkat ? "dikkat" : undefined}>
          <span className="cizelge-saat">{gunSaat(o.zaman)}</span>
          <span className="cizelge-im">{o.ikon}</span>
          <span className="cizelge-metin">
            <strong>{o.baslik}</strong>
            {o.kisi && <b>{o.kisi}</b>}
            {o.alt && <em>{o.alt}</em>}
          </span>
        </li>
      ))}
    </ol>
  );
}
