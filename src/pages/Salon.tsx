import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Bike,
  ChevronLeft,
  CircleCheckBig,
  Clock,
  Combine,
  LayoutGrid,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Zap,
} from "lucide-react";
import MasaKarti from "../components/MasaKarti";
import MasaSecim from "../components/MasaSecim";
import MasaPlani, { yerlesimiVar } from "../components/MasaPlani";
import OnayModal from "../components/OnayModal";
import HizliOde from "../components/HizliOde";
import Duzen from "../components/Duzen";
import MasasizSiparis from "../components/MasasizSiparis";
import {
  adisyonGetir,
  adisyonKaydet,
  adisyonOzeti,
  masaBirlestir,
  masaTasi,
  masasizAc,
  masasizAdisyonlar,
  masasizGuncelle,
  masasizSil,
  tumAdisyonlar,
} from "../adisyonlar";
import type { AdisyonVerisi, MasaOzeti, MasasizAdisyon } from "../adisyonlar";
import { bolgeleriGetir } from "../masalar";
import type { Bolge, Masa } from "../types";

type Acik = MasaOzeti;

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

/**
 * Gel al / paket kartı. Masa kartıyla aynı düzeni izliyor ama masa adı yerine
 * müşteri, boşta ise adisyon numarası yazıyor.
 */
function MasasizKart({
  adisyon,
  sure,
  gecikti,
  onAc,
  onDuzenle,
  onSil,
}: {
  adisyon: MasasizAdisyon;
  sure: string;
  gecikti: boolean;
  onAc: () => void;
  onDuzenle: () => void;
  onSil: () => void;
}) {
  const paket = adisyon.tip === "paket";
  return (
    <div className={adisyon.adet > 0 ? "masasiz-kart dolu" : "masasiz-kart"}>
      <button className="masasiz-govde" onClick={onAc}>
        <span className="masasiz-tip">
          {paket ? <Bike size={15} /> : <ShoppingBag size={15} />}
          {paket ? "Paket" : "Gel Al"}
          <em>#{adisyon.no}</em>
        </span>

        <strong className="masasiz-ad">{adisyon.ad || (paket ? "Adres yok" : "Müşteri yok")}</strong>

        {adisyon.adet > 0 ? (
          <span className="masasiz-tutar">
            ₺{adisyon.tutar}
            {adisyon.odenen > 0 && <em>₺{adisyon.kalan} kalan</em>}
          </span>
        ) : (
          <span className="masasiz-bos">Ürün eklenmedi</span>
        )}

        <span className={gecikti ? "masasiz-sure gecikti" : "masasiz-sure"}>
          <Clock size={13} /> {sure}
        </span>
      </button>

      <span className="masasiz-islem">
        <button onClick={onDuzenle} title="Sipariş bilgileri">
          <Pencil size={14} />
        </button>
        <button onClick={onSil} title="Siparişi iptal et">
          <Trash2 size={14} />
        </button>
      </span>
    </div>
  );
}

const SEKME_ANAHTAR = "salon.sekme";

function sekmeOku(): number | "tumu" | "masasiz" | null {
  const kayit = localStorage.getItem(SEKME_ANAHTAR);
  if (!kayit) return null;
  if (kayit === "tumu" || kayit === "masasiz") return kayit;
  const id = Number(kayit);
  return Number.isFinite(id) ? id : null;
}

export default function Salon() {
  const navigate = useNavigate();
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [adisyonlar, setAdisyonlar] = useState<Record<number, Acik>>({});
  // Sekme tarayıcıda saklanıyor: masaya girip dönünce veya sayfa yenilenince
  // garson kendini başka bölgede bulmasın.
  const [seciliId, setSeciliId] = useState<number | "tumu" | "masasiz" | null>(sekmeOku);
  // Gel al / paket siparişleri masaya bağlı değil; kendi sekmesinde listeleniyor.
  const [masasizlar, setMasasizlar] = useState<MasasizAdisyon[]>([]);
  // Sekmeye girince önce tür seçiliyor (paket mi gel al mı), liste sonra geliyor.
  const [masasizTip, setMasasizTip] = useState<"gelal" | "paket" | null>(null);
  const [yeniSiparis, setYeniSiparis] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<MasasizAdisyon | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  // Açık kalma süreleri kendiliğinden ilerlesin; garson ekranı yenilemek zorunda
  // kalmasın diye dakikada bir yeniden çiziliyor.
  const [, setTik] = useState(0);
  // Masa işlemi iki adımda ilerliyor: önce hedef masa seçilir, sonra onaylanır.
  const [islem, setIslem] = useState<{ tip: "tasi" | "birlestir"; masa: Masa } | null>(null);
  const [onay, setOnay] = useState<{ mesaj: string; onOnay: () => void } | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  // Hızlı Öde masadan açılıyor; adisyonun tamamı okunup panele veriliyor.
  const [hizli, setHizli] = useState<{ masa: Masa; veri: AdisyonVerisi } | null>(null);

  useEffect(() => {
    Promise.all([bolgeleriGetir(), tumAdisyonlar(), masasizAdisyonlar()]).then(([b, a, m]) => {
      setBolgeler(b);
      setAdisyonlar(a);
      setMasasizlar(m);
      // Kayıtlı bölge silinmiş olabilir; öyleyse ilk bölgeye dönülüyor.
      setSeciliId((s) =>
        s === "tumu" || s === "masasiz" || b.some((x) => x.id === s)
          ? s
          : b[0]?.id ?? "tumu"
      );
      setYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    if (seciliId !== null) localStorage.setItem(SEKME_ANAHTAR, String(seciliId));
  }, [seciliId]);

  useEffect(() => {
    const zaman = setInterval(() => setTik((t) => t + 1), 60000);
    return () => clearInterval(zaman);
  }, []);

  const yenile = () =>
    Promise.all([tumAdisyonlar(), masasizAdisyonlar()]).then(([a, m]) => {
      setAdisyonlar(a);
      setMasasizlar(m);
    });

  // Boş sipariş sessizce silinir; ürün girilmişse iptal onaya bağlı.
  function siparisSil(a: MasasizAdisyon) {
    const sil = async () => {
      setOnay(null);
      await masasizSil(a.id);
      await yenile();
    };
    if (a.adet === 0) {
      sil();
      return;
    }
    setOnay({
      mesaj: `${a.tip === "paket" ? "Paket" : "Gel Al"} #${a.no} siparişi ürünleriyle birlikte silinsin mi?`,
      onOnay: sil,
    });
  }

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

  // Masadan tek dokunuşla tahsilat: adisyon okunup panel açılıyor, ödenecek
  // bir şey kalmamışsa panel yerine uyarı çıkıyor.
  async function hizliOdeAc(masa: Masa) {
    try {
      const veri = await adisyonGetir(masa.id);
      if (adisyonOzeti(veri).kalan <= 0) {
        setUyari(`${masa.ad} masasında tahsil edilecek tutar kalmadı.`);
        return;
      }
      setHizli({ masa, veri });
    } catch {
      setUyari("Adisyon okunamadı.");
    }
  }

  // Tahsilatı tamamlanmış masada yeni ödeme almanın anlamı yok; oradaki iş
  // hesabı kapatmak.
  function kapatmaSor(masa: Masa) {
    setOnay({
      mesaj: `${masa.ad} masasının hesabı tamamen ödendi. Adisyon kapatılsın mı?`,
      onOnay: async () => {
        setOnay(null);
        try {
          const veri = await adisyonGetir(masa.id);
          await adisyonKaydet(masa.id, veri, true);
          await yenile();
        } catch (e) {
          setUyari(e instanceof Error ? e.message : "Adisyon kapatılamadı.");
        }
      },
    });
  }

  const aksiyonlar = (masa: Masa) => {
    const acik = adisyonlar[masa.id];
    const odendi = !!acik && acik.tutar > 0 && acik.odenen > 0 && acik.kalan <= 0;
    return [
      odendi
        ? {
            ad: "Adisyonu kapat",
            ikon: <CircleCheckBig size={16} />,
            onSec: () => kapatmaSor(masa),
          }
        : {
            ad: "Hızlı Öde",
            ikon: <Zap size={16} />,
            onSec: () => hizliOdeAc(masa),
          },
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
  };

  // Masa kartı iki yerde de aynı: ızgarada da planda da bu çıkıyor.
  const kart = (masa: Masa) => {
    const acik = adisyonlar[masa.id];
    return (
      <MasaKarti
        masa={masa}
        durum={
          acik && {
            tutar: acik.tutar,
            odenen: acik.odenen,
            kalan: acik.kalan,
            sure: acik.acilis ? sureFarki(acik.acilis) : "şimdi",
            garson: acik.garson,
            gecikti: dakika(acik.acilis) >= UZUN_SURE_DK,
            ad: acik.ad,
            kisiSayisi: acik.kisiSayisi,
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
  const paketler = masasizlar.filter((a) => a.tip === "paket");
  const gelaller = masasizlar.filter((a) => a.tip === "gelal");
  const listelenen = masasizTip === "paket" ? paketler : gelaller;

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

              {/* Masaya oturmayan satışlar salonun kendi dilinde: ayrı ekran
                  değil, şeridin sonunda duran sabit bir sekme. */}
              <button
                className={seciliId === "masasiz" ? "masasiz-sekme aktif" : "masasiz-sekme"}
                onClick={() => { setSeciliId("masasiz"); setMasasizTip(null); }}
              >
                <ShoppingBag size={15} />
                Paket &amp; Gel Al
                {masasizlar.length > 0 && <em>{masasizlar.length}</em>}
              </button>
            </nav>

            {seciliId === "masasiz" && masasizTip === null && (
              <section className="bolge">
                <div className="tur-secim">
                  <button className="tur-kart" onClick={() => setMasasizTip("paket")}>
                    <Bike size={40} />
                    <strong>Paket</strong>
                    <span>
                      {paketler.length > 0 ? `${paketler.length} açık sipariş` : "Açık sipariş yok"}
                    </span>
                  </button>
                  <button className="tur-kart" onClick={() => setMasasizTip("gelal")}>
                    <ShoppingBag size={40} />
                    <strong>Gel Al</strong>
                    <span>
                      {gelaller.length > 0 ? `${gelaller.length} açık sipariş` : "Açık sipariş yok"}
                    </span>
                  </button>
                </div>
              </section>
            )}

            {seciliId === "masasiz" && masasizTip !== null && (
              <section className="bolge">
                <h2 className="masasiz-baslik">
                  <button className="masasiz-geri" onClick={() => setMasasizTip(null)}>
                    <ChevronLeft size={18} />
                  </button>
                  {masasizTip === "paket" ? "Paket" : "Gel Al"}
                  <span>{listelenen.length}</span>
                </h2>

                <div className="masa-grid">
                  <button className="masasiz-yeni" onClick={() => setYeniSiparis(true)}>
                    <Plus size={22} />
                    Yeni sipariş
                  </button>

                  {listelenen.map((a) => (
                    <MasasizKart
                      key={a.id}
                      adisyon={a}
                      sure={sureFarki(a.acilis)}
                      gecikti={dakika(a.acilis) >= UZUN_SURE_DK}
                      onAc={() => navigate(`/adisyon/${a.id}`)}
                      onDuzenle={() => setDuzenlenen(a)}
                      onSil={() => siparisSil(a)}
                    />
                  ))}
                </div>
              </section>
            )}

            {seciliId !== "masasiz" && gosterilen.map((bolge) => (
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

        {hizli && (() => {
          const { araToplam, toplam, odenen, kalan } = adisyonOzeti(hizli.veri);
          return (
            <HizliOde
              baslik={hizli.masa.ad}
              araToplam={araToplam}
              indirim={hizli.veri.indirim}
              toplam={toplam}
              odenen={odenen}
              kalan={kalan}
              onKapat={() => setHizli(null)}
              // Salon'da "kaydet" adımı yok; indirim verilir verilmez diske yazılıyor,
              // pencere kapatılsa bile masa kartındaki tutar doğru kalsın.
              onIndirimDegis={async (tutar, kaynak) => {
                const { masa, veri } = hizli;
                const yeni = { ...veri, indirim: tutar, indirimTanim: kaynak };
                setHizli({ masa, veri: yeni });
                try {
                  await adisyonKaydet(masa.id, yeni);
                  await yenile();
                } catch (e) {
                  setUyari(e instanceof Error ? e.message : "İndirim kaydedilemedi.");
                }
              }}
              onSec={async (tip, tutar, kapat, bahsis) => {
                const { masa, veri } = hizli;
                setHizli(null);
                try {
                  await adisyonKaydet(
                    masa.id,
                    { ...veri, tahsilatlar: [...veri.tahsilatlar, { tip, tutar, bahsis }] },
                    kapat
                  );
                  await yenile();
                } catch (e) {
                  setUyari(e instanceof Error ? e.message : "Tahsilat kaydedilemedi.");
                }
              }}
            />
          );
        })()}

        {(yeniSiparis || duzenlenen) && (
          <MasasizSiparis
            baslangicTipi={masasizTip ?? "gelal"}
            mevcut={
              duzenlenen
                ? {
                    tip: duzenlenen.tip,
                    ad: duzenlenen.ad,
                    telefon: duzenlenen.telefon,
                    adres: duzenlenen.adres,
                  }
                : undefined
            }
            onKapat={() => { setYeniSiparis(false); setDuzenlenen(null); }}
            onAc={async (tip, musteri) => {
              try {
                if (duzenlenen) {
                  await masasizGuncelle(duzenlenen.id, musteri);
                  setDuzenlenen(null);
                  await yenile();
                  return;
                }
                const id = await masasizAc(tip, musteri);
                setYeniSiparis(false);
                navigate(`/adisyon/${id}`);
              } catch (e) {
                setYeniSiparis(false);
                setDuzenlenen(null);
                setUyari(e instanceof Error ? e.message : "Sipariş açılamadı.");
              }
            }}
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
