import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Combine, LayoutGrid } from "lucide-react";
import MasaKarti from "../components/MasaKarti";
import MasaSecim from "../components/MasaSecim";
import MasaPlani, { yerlesimiVar } from "../components/MasaPlani";
import OnayModal from "../components/OnayModal";
import Duzen from "../components/Duzen";
import { masaBirlestir, masaTasi, tumAdisyonlar } from "../adisyonlar";
import { bolgeleriGetir } from "../masalar";
import type { Bolge, Masa } from "../types";

type Acik = { tutar: number; adet: number; acilis?: string; garson?: string };

function sureFarki(acilis: string): string {
  const dk = Math.floor((Date.now() - new Date(acilis).getTime()) / 60000);
  if (dk < 1) return "şimdi";
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

// Uzun süredir açık duran masa kartında saat işareti çıkıyor — garsonun gözü
// unutulmuş hesaba takılsın.
const UZUN_SURE_DK = 120;
const dakika = (acilis?: string) =>
  acilis ? Math.floor((Date.now() - new Date(acilis).getTime()) / 60000) : 0;

export default function Salon() {
  const navigate = useNavigate();
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [adisyonlar, setAdisyonlar] = useState<Record<number, Acik>>({});
  const [seciliId, setSeciliId] = useState<number | "tumu" | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  // Açık kalma süreleri kendiliğinden ilerlesin; garson ekranı yenilemek zorunda
  // kalmasın diye dakikada bir yeniden çiziliyor.
  const [, setTik] = useState(0);
  // Masa işlemi iki adımda ilerliyor: önce hedef masa seçilir, sonra onaylanır.
  const [islem, setIslem] = useState<{ tip: "tasi" | "birlestir"; masa: Masa } | null>(null);
  const [onay, setOnay] = useState<{ mesaj: string; onOnay: () => void } | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([bolgeleriGetir(), tumAdisyonlar()]).then(([b, a]) => {
      setBolgeler(b);
      setAdisyonlar(a);
      setSeciliId((s) => s ?? b[0]?.id ?? "tumu");
      setYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    const zaman = setInterval(() => setTik((t) => t + 1), 60000);
    return () => clearInterval(zaman);
  }, []);

  const yenile = () => tumAdisyonlar().then(setAdisyonlar);

  // Hedef seçildi: yapılacak işi anlatan onay çıkıyor, "evet" denince uygulanıyor.
  function hedefSecildi(hedef: Masa) {
    if (!islem) return;
    const kaynak = islem.masa;
    const tasima = islem.tip === "tasi";
    setIslem(null);
    setOnay({
      mesaj: tasima
        ? `${kaynak.ad} masasındaki adisyon ${hedef.ad} masasına taşınacak. Onaylıyor musunuz?`
        : `${kaynak.ad} masasındaki adisyon ${hedef.ad} masasının adisyonuna eklenecek. ` +
          `${kaynak.ad} boşalacak, iki hesap tek adisyonda toplanacak. Onaylıyor musunuz?`,
      onOnay: async () => {
        setOnay(null);
        try {
          if (tasima) await masaTasi(kaynak.id, hedef.id);
          else await masaBirlestir(kaynak.id, hedef.id);
          await yenile();
        } catch (e) {
          setUyari(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
        }
      },
    });
  }

  const aksiyonlar = (masa: Masa) => [
    {
      ad: "Masayı taşı",
      ikon: <ArrowRightLeft size={16} />,
      onSec: () => setIslem({ tip: "tasi", masa }),
    },
    {
      ad: "Adisyonu birleştir",
      ikon: <Combine size={16} />,
      onSec: () => setIslem({ tip: "birlestir", masa }),
    },
  ];

  // Masa kartı iki yerde de aynı: ızgarada da planda da bu çıkıyor.
  const kart = (masa: Masa) => {
    const acik = adisyonlar[masa.id];
    return (
      <MasaKarti
        masa={masa}
        durum={
          acik && {
            tutar: acik.tutar,
            sure: acik.acilis ? sureFarki(acik.acilis) : "şimdi",
            garson: acik.garson,
            gecikti: dakika(acik.acilis) >= UZUN_SURE_DK,
          }
        }
        aksiyonlar={aksiyonlar(masa)}
        onClick={() => navigate(`/siparis/${masa.id}`)}
      />
    );
  };

  const gosterilen = seciliId === "tumu" ? bolgeler : bolgeler.filter((b) => b.id === seciliId);
  const tumMasalar = bolgeler.flatMap((b) => b.masalar);
  const doluSayisi = tumMasalar.filter((m) => adisyonlar[m.id]).length;
  const doluluk = (bolge: Bolge) => bolge.masalar.filter((m) => adisyonlar[m.id]).length;

  return (
    <Duzen>
      <div className="sayfa">
        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : bolgeler.length === 0 ? (
          <div className="ayar-bos">
            <LayoutGrid size={30} />
            <p>
              Henüz masa tanımlanmamış. İşletme Ayarları ekranından bölge ve masalarınızı
              ekleyerek başlayın.
            </p>
            <button className="ayar-ekle" onClick={() => navigate("/ayarlar")}>
              İşletme Ayarları
            </button>
          </div>
        ) : (
          <>
            <nav className="salon-sekme">
              {bolgeler.map((b) => (
                <button
                  key={b.id}
                  className={seciliId === b.id ? "aktif" : ""}
                  onClick={() => setSeciliId(b.id)}
                >
                  {b.ad}
                  <em>{doluluk(b)}/{b.masalar.length}</em>
                </button>
              ))}

              <button
                className={seciliId === "tumu" ? "aktif" : ""}
                onClick={() => setSeciliId("tumu")}
              >
                Tümü <em>{doluSayisi}/{tumMasalar.length}</em>
              </button>
            </nav>

            {gosterilen.map((bolge) => (
              <section key={bolge.id} className="bolge">
                {seciliId === "tumu" && (
                  <h2>
                    {bolge.ad}
                    <span>{doluluk(bolge)}/{bolge.masalar.length}</span>
                  </h2>
                )}

                {bolge.masalar.length === 0 ? (
                  <p className="bolge-bos">Bu bölgede masa yok.</p>
                ) : bolge.planModu && bolge.masalar.every(yerlesimiVar) ? (
                  // Plan yalnız işletmeci bölge için açtıysa çiziliyor; masaya
                  // konum yazılmış olması tek başına görünümü değiştirmiyor.
                  <MasaPlani masalar={bolge.masalar} icerik={kart} />
                ) : (
                  <div className="masa-grid">
                    {bolge.masalar.map((masa) => (
                      <div key={masa.id}>{kart(masa)}</div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </>
        )}

        {islem && (
          <MasaSecim
            baslik={islem.tip === "tasi" ? "Masayı taşı" : "Adisyonu birleştir"}
            aciklama={
              islem.tip === "tasi"
                ? `${islem.masa.ad} masasındaki adisyon, seçtiğiniz boş masaya olduğu gibi geçer. Siparişler, notlar ve alınan tahsilatlar korunur.`
                : `${islem.masa.ad} masasındaki siparişler, seçtiğiniz masanın adisyonuna eklenir. İki hesap tek adisyonda birleşir ve ${islem.masa.ad} boşalır.`
            }
            bolgeler={bolgeler}
            doluIdler={new Set(Object.keys(adisyonlar).map(Number))}
            secilebilirlik={islem.tip === "birlestir" ? "dolu" : "bos"}
            haricId={islem.masa.id}
            onSec={hedefSecildi}
            onKapat={() => setIslem(null)}
          />
        )}

        {onay && (
          <OnayModal
            mesaj={onay.mesaj}
            onayMetni="Evet, uygula"
            onOnay={onay.onOnay}
            onKapat={() => setOnay(null)}
          />
        )}

        {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
      </div>
    </Duzen>
  );
}
