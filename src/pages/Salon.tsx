import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Ban,
  Bike,
  ChevronLeft,
  CircleCheckBig,
  Clock,
  CloudOff,
  Combine,
  Gift,
  LayoutGrid,
  LockKeyhole,
  Pencil,
  Plus,
  Printer,
  RotateCw,
  ShoppingBag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { bekleyenMasalar, cevrimdisiHesap, kopyaMasalari, kuyrugaEkle, useKuyruk } from "../kuyruk";
import { hesapKopyasiSil, kopyaSaati } from "../hesapKopyasi";
import MasaKarti from "../components/MasaKarti";
import MasaPlani, { yerlesimiVar } from "../components/MasaPlani";
import OnayModal from "../components/OnayModal";
import HizliOde from "../components/HizliOde";
import { ODENMEZ_ANAHTAR, odenmezleriGetir, type Odenmez } from "../odenmezler";
import { useTanim, useTanimEtkisi } from "../tanimAbonelik";
import Duzen from "../components/Duzen";
import MasasizSiparis from "../components/MasasizSiparis";
import Kasa from "../components/Kasa";
import { yetkiVar } from "../oturum";
import { ayarlar } from "../isletmeAyarlari";
import { baglantiHatasi, baglantiVar, sureSinirli, useBaglanti } from "../baglanti";
import { useCanli } from "../canli";
import { devralabilir, masayiDevral, useMesguliyetler } from "../mesguliyet";
import {
  adisyonGetir,
  adisyonIkram,
  adisyonIptal,
  adisyonKaydet,
  adisyonOzeti,
  masaBirlestir,
  masaTasi,
  masasizAc,
  masasizAdisyonlar,
  masasizGuncelle,
  masasizSil,
  servisGirdisi,
  tumAdisyonlar,
  yeniTahsilat,
} from "../adisyonlar";
import { servisSatirlari } from "../servis";
import type { AdisyonVerisi, MasaOzeti, MasasizAdisyon } from "../adisyonlar";
import { adisyonFisiYaz } from "../yazicilar";
import { BOLGE_ANAHTAR, bolgeleriGetir, durgunMu, hedefOnayMesaji } from "../masalar";
import type { Bolge, Masa } from "../types";

type Acik = MasaOzeti;

function sureFarki(acilis: string): string {
  const dk = Math.floor((Date.now() - new Date(acilis).getTime()) / 60000);
  if (dk < 1) return "şimdi";
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

// Gel Al / Paket kartında bu süreyi aşan hesabın süresi renkleniyor — kapıda
// bekleyen paket gözden kaçmasın. Masa kartı bu ölçüyü kullanmıyor: orada
// masanın en son ne zaman sipariş verdiğine bakılıyor (bkz. masalar.ts).
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

  // Masa/bölge tanımı başka cihazda değişince kopya tazeleniyor; plan açıkken
  // de yeni masa görünsün diye haberi burada alıyoruz. Adisyon durumu buradan
  // gelmiyor — o canlı okumanın işi. Boş liste yazılmıyor: kopya okunamadığında
  // ekrandaki plan silinmemeli.
  useTanimEtkisi(BOLGE_ANAHTAR, (gecerliMi) => {
    bolgeleriGetir().then((liste) => {
      if (gecerliMi() && liste.length) setBolgeler(liste);
    });
  });

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
  const [okunamadi, setOkunamadi] = useState(false);
  // Açık kalma süreleri kendiliğinden ilerlesin; garson ekranı yenilemek zorunda
  // kalmasın diye dakikada bir yeniden çiziliyor.
  const [, setTik] = useState(0);
  // Masa işlemi iki adımda ilerliyor: önce hedef masa seçilir, sonra onaylanır.
  const [islem, setIslem] = useState<{ tip: "tasi" | "birlestir"; masa: Masa } | null>(null);
  const [onay, setOnay] = useState<{
    mesaj: string;
    baslik?: string;
    ikon?: ReactNode;
    onOnay: () => void;
  } | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  // İkram penceresindeki "kime yazılsın" listesi; ekran açılırken bir kez okunuyor.
  // Liste sunucuda değişince ekran kendiliğinden yeniliyor.
  const odenmezler = useTanim<Odenmez[]>(ODENMEZ_ANAHTAR, odenmezleriGetir, []);
  // Adisyonun tamamına iptal/ikram: ikisi de sebep sorduğu için ayrı pencere.
  const [adisyonIslem, setAdisyonIslem] = useState<
    { tip: "iptal" | "ikram"; masa: Masa; adisyonId: number } | null
  >(null);
  // Hızlı Öde masadan açılıyor; adisyonun tamamı okunup panele veriliyor.
  const [hizli, setHizli] = useState<{ masa: Masa; veri: AdisyonVerisi } | null>(null);
  // Masada başkası varsa girişten önce sorulan pencere.
  const [mesgulSorusu, setMesgulSorusu] = useState<{ masa: Masa; ad: string } | null>(null);
  const mesguliyetler = useMesguliyetler();

  const masayaGir = (masa: Masa) => {
    // Engel değil uyarı: kim olduğu söyleniyor, karar kişide kalıyor.
    const mesgul = mesguliyetler[masa.id];
    if (mesgul) {
      setMesgulSorusu({ masa, ad: mesgul.ad });
      return;
    }
    navigate(`/siparis/${masa.id}`);
  };

  // Seçim kipi pencere değil ama penceredeki alışkanlık sürüyor: Escape çıkarır.
  useEffect(() => {
    if (!islem) return;
    const kacis = (e: KeyboardEvent) => e.key === "Escape" && setIslem(null);
    document.addEventListener("keydown", kacis);
    return () => document.removeEventListener("keydown", kacis);
  }, [islem]);

  // `gorunur`: yükleniyor halkası çıksın mı. İlk açılışta ve "Yeniden dene"de
  // çıkıyor — ekranda gösterilecek bir şey yok, beklediğini söylemek gerekiyor.
  //
  // Canlı tazelemede çıkmıyor. Çıkarsa salon her haberde boşalıp yeniden
  // çiziliyordu: bir fiş basılırken kuyruk satırı üç kez değişiyor (kuyruğa
  // düştü, köprü aldı, basıldı) ve ekran üç kez zıplıyordu. Aynısı başka bir
  // garson kalem eklediğinde de oluyordu. Ekranda zaten doğru masalar duruyor,
  // yeni veri gelince sessizce yerini alıyor.
  const salonuOku = async (gorunur = false) => {
    if (gorunur) setYukleniyor(true);
    setOkunamadi(false);

    // Okuma düşerse ya da cevapsız kalırsa halka sonsuza kadar dönüyordu:
    // ekran boş, sebep yok. Salon kasanın açılış ekranı; hiçbir şey söylemeden
    // dönmesi en kötüsü. Süre dolduğunda da okunamadı sayılıyor.
    // Üç okuma birbirinden ayrı bekleniyor. Masa tanımları çevrimdışıyken
    // cihazdaki kopyadan gelebiliyor; adisyonlar gelemiyor (dolu/boş bilgisi
    // bayatlarsa yanlış olur). Tek pakette beklenirse adisyonun düşmesi masa
    // planını da götürüyordu — salon bomboş kalıyordu.
    const dene = <T,>(is: Promise<T>) => sureSinirli(is.catch(() => undefined));
    // Bağlantı yokken adisyonlar zaten okunamıyor; istek atılırsa ekran
    // boşuna saniyelerce bekliyor. Masa tanımları cihazdaki kopyadan anında
    // geliyor, salon hemen çiziliyor.
    const bos = Promise.resolve(undefined);
    const [b, a, m] = await Promise.all([
      dene(bolgeleriGetir()),
      baglantiVar() ? dene(tumAdisyonlar()) : bos,
      baglantiVar() ? dene(masasizAdisyonlar()) : bos,
    ]);
    setYukleniyor(false);

    if (!b) {
      setOkunamadi(true);
      return;
    }

    setBolgeler(b);
    // Cihazda bekleyen siparişler sunucudakilerin üstüne biniyor: masa dolu
    // görünsün, garson aynı masaya ikinci hesap açmasın. Gönderilmiş kayıt
    // kuyruktan düştüğü için burada kendiliğinden sunucununki geçerli oluyor.
    setAdisyonlar({ ...(baglantiVar() ? {} : kopyaMasalari()), ...(a ?? {}), ...bekleyenMasalar() });
    setMasasizlar(m ?? []);
    // Kayıtlı bölge silinmiş olabilir; öyleyse ilk bölgeye dönülüyor.
    setSeciliId((s) =>
      s === "tumu" || s === "masasiz" || b.some((x) => x.id === s) ? s : b[0]?.id ?? "tumu"
    );
  };

  useEffect(() => {
    salonuOku(true);
  }, []);

  // Garson telefondan sipariş girdiğinde kasadaki salon kendiliğinden
  // tazeleniyor; kasiyerin ekranı yenilemesi gerekmiyor.
  useCanli(["adisyonlar", "adisyon_kalemleri", "tahsilatlar", "yazdirma_kuyrugu"], salonuOku);

  // Bağlantı geri gelince salon kendiliğinden doluyor: garson "Yeniden dene"ye
  // basmayı beklemesin, ekran zaten düzelmiş olsun. Kopukken ekranda masa
  // tanımları cihazdaki kopyadan duruyor ama adisyonlar yok — masalar boş
  // görünüyor. O yüzden yalnız okuma düştüğünde değil, kopukluktan çıkan her
  // seferde yeniden okunuyor.
  // Kuyruk boşaldıkça salon tazeleniyor: bekleyen sipariş sunucuya yazılınca
  // masa kartı artık gerçek adisyonu göstersin, "bekliyor" işareti kalksın.
  const { bekleyen } = useKuyruk();
  const oncekiBekleyen = useRef(bekleyen);
  useEffect(() => {
    if (bekleyen !== oncekiBekleyen.current) salonuOku();
    oncekiBekleyen.current = bekleyen;
  }, [bekleyen]);

  const cevrimici = useBaglanti();
  const oncekiDurum = useRef(cevrimici);
  useEffect(() => {
    if (cevrimici && (okunamadi || !oncekiDurum.current)) salonuOku(true);
    oncekiDurum.current = cevrimici;
  }, [cevrimici]);

  // Çalışma tipleri: kapatılan tür arayüzde hiç durmuyor. İkisi de kapalıysa
  // sekmenin kendisi kalkıyor, tek tür açıksa sekme adını o tür alıyor.
  // Tür işletmede açık olsa bile kişinin o siparişi alma yetkisi olmayabilir:
  // ayar "bu işletme yapıyor mu", yetki "bu kişi yapabilir mi" sorusu.
  const gelalAcik = ayarlar().gelalAcik && yetkiVar("siparis.gelal");
  const paketAcik = ayarlar().paketAcik && yetkiVar("siparis.paket");
  const masasizVar = gelalAcik || paketAcik;
  const tekTip: "gelal" | "paket" | null =
    gelalAcik && paketAcik ? null : paketAcik ? "paket" : "gelal";
  const masasizBaslik = !tekTip ? "Paket & Gel Al" : tekTip === "paket" ? "Paket" : "Gel Al";

  useEffect(() => {
    if (seciliId !== null) localStorage.setItem(SEKME_ANAHTAR, String(seciliId));
  }, [seciliId]);

  // Sekme tarayıcıdan geri geldiğinde de tek tür kuralı geçerli olsun; tek
  // kartlık bir seçim ekranı gösterip kullanıcıyı boşuna tıklatmayalım.
  useEffect(() => {
    if (seciliId === "masasiz" && tekTip) setMasasizTip(tekTip);
  }, [seciliId, tekTip]);

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
      mesaj: `*${a.tip === "paket" ? "Paket" : "Gel Al"} #${a.no}* siparişi ürünleriyle birlikte silinsin mi?`,
      onOnay: sil,
    });
  }

  // Hedef seçildi: yapılacak işi anlatan onay çıkıyor, "evet" denince uygulanıyor.
  // Kipe masasız sekmesinden girilirse hedef masa görünmüyor; şerit çıkarken
  // ekran masaların olduğu yere alınıyor.
  function secimKipineGir(tip: "tasi" | "birlestir", masa: Masa) {
    if (seciliId === "masasiz") setSeciliId("tumu");
    setIslem({ tip, masa });
  }

  function hedefSecildi(hedef: Masa) {
    if (!islem) return;
    const kaynak = islem.masa;
    const tasima = islem.tip === "tasi";
    setIslem(null);
    setOnay({
      baslik: tasima ? "Masayı taşı" : "Adisyonu birleştir",
      ikon: tasima ? <ArrowRightLeft size={20} /> : <Combine size={20} />,
      mesaj: hedefOnayMesaji(islem.tip, kaynak.ad, hedef.ad),
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
    // Bağlantı yokken hesap cihazdaki kopyadan açılıyor; alınan ödeme kuyruğa
    // girip bağlantı gelince kasaya yazılıyor.
    if (!baglantiVar()) {
      const hesap = cevrimdisiHesap({ tip: "masa", masaId: masa.id });
      if (!hesap) {
        setUyari("Bağlantı yok ve bu hesabın cihazda kaydı yok, ödeme alınamıyor.");
        return;
      }
      setHizli({ masa, veri: hesap.veri });
      return;
    }
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
      mesaj: `*${masa.ad}* masasının hesabı tamamen ödendi. Adisyon kapatılsın mı?`,
      onOnay: async () => {
        setOnay(null);
        // Bağlantı yoksa kapanış kuyruğa giriyor; masa cihazda boşalıyor.
        if (!baglantiVar()) {
          const hesap = cevrimdisiHesap({ tip: "masa", masaId: masa.id });
          if (!hesap) {
            setUyari("Bağlantı yok ve bu hesabın cihazda kaydı yok, kapatılamıyor.");
            return;
          }
          kuyrugaEkle({
            tip: "masa",
            masaId: masa.id,
            masaAdi: masa.ad,
            veri: hesap.veri,
            kapat: true,
          });
          hesapKopyasiSil({ tip: "masa", masaId: masa.id });
          await yenile();
          return;
        }
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

  // Fiş doğrudan yazıcıya gitmiyor, kuyruğa düşüyor: kasa köprüsü sırayla
  // basıyor. Yazıcı kapalıysa fiş kaybolmasın diye böyle.
  async function fisYazdir(masa: Masa) {
    try {
      const veri = await adisyonGetir(masa.id);
      const adet = await adisyonFisiYaz({ ...veri, ad: veri.ad || masa.ad });
      setUyari(
        adet > 0
          ? "Fiş yazdırmaya gönderildi."
          : "Adisyon fişi basacak açık bir yazıcı tanımlı değil."
      );
    } catch {
      setUyari("Fiş yazdırmaya gönderilemedi.");
    }
  }

  const aksiyonlar = (masa: Masa) => {
    const acik = adisyonlar[masa.id];
    const odendi = !!acik && acik.tutar > 0 && acik.odenen > 0 && acik.kalan <= 0;
    return [
      // Hesabı ödenmiş masada kapatma, ödenmemişte Hızlı Öde çıkıyor; ikisi de
      // `odeme.al` istiyor. Kapatmak para almak değil ama adisyonu kapanmışlara
      // taşıyor, geri açmak ayrı yetki — parayla ilgili işler tek yetkide duruyor.
      ...(yetkiVar("odeme.al")
        ? odendi
          ? [
              {
                ad: "Adisyonu kapat",
                ikon: <CircleCheckBig size={16} />,
                onSec: () => kapatmaSor(masa),
              },
            ]
          : [
              {
                ad: "Hızlı Öde",
                ikon: <Zap size={16} />,
                onSec: () => hizliOdeAc(masa),
              },
            ]
        : []),
      // Taşıma ve birleştirme yetkiye bağlı; yetkisi olmayan bu satırları hiç
      // görmüyor, üç nokta menüsü onun için kısalıyor.
      ...(yetkiVar("siparis.tasi")
        ? [
            {
              ad: "Masayı taşı",
              ikon: <ArrowRightLeft size={16} />,
              onSec: () => secimKipineGir("tasi", masa),
            },
            {
              ad: "Adisyonu birleştir",
              ikon: <Combine size={16} />,
              onSec: () => secimKipineGir("birlestir", masa),
            },
          ]
        : []),
      ...(acik && yetkiVar("siparis.fis_yazdir")
        ? [
            {
              ad: "Yazdır",
              ikon: <Printer size={16} />,
              onSec: () => fisYazdir(masa),
            },
          ]
        : []),
      // Adisyonun tamamına yapılan işlemler yalnız açık masada anlamlı.
      ...(acik && yetkiVar("siparis.adisyon_ikram")
        ? [
            {
              ad: "Adisyonu ikram et",
              ikon: <Gift size={16} />,
              onSec: () => setAdisyonIslem({ tip: "ikram", masa, adisyonId: acik.id }),
            },
          ]
        : []),
      ...(acik && yetkiVar("siparis.iptal")
        ? [
            {
              ad: "Adisyonu iptal et",
              ikon: <Ban size={16} />,
              onSec: () => setAdisyonIslem({ tip: "iptal", masa, adisyonId: acik.id }),
            },
          ]
        : []),
    ];
  };

  // Taşıma ve birleştirmede hedef masa ayrı bir pencerede aranmıyor; salon
  // planının kendisi seçim kipine giriyor. Garson masayı ezberlediği yerde
  // buluyor, plan ikinci kez küçültülmüş hâlde çizilmiyor.
  const hedefUygun = (masa: Masa) => {
    if (!islem || masa.id === islem.masa.id) return false;
    return islem.tip === "birlestir" ? !!adisyonlar[masa.id] : !adisyonlar[masa.id];
  };

  // Masa kartı iki yerde de aynı: ızgarada da planda da bu çıkıyor.
  const kart = (masa: Masa) => {
    const acik = adisyonlar[masa.id];
    const secim = islem ? (hedefUygun(masa) ? "uygun" : "kilitli") : undefined;
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
            durgun: durgunMu(acik),
            fisBasildi: acik.fisBasildi,
            ad: acik.ad,
            kisiSayisi: acik.kisiSayisi,
            bekliyor: acik.bekliyor,
            kopyaSaati: acik.kopyaZamani ? kopyaSaati(acik.kopyaZamani) : undefined,
          }
        }
        aksiyonlar={aksiyonlar(masa)}
        mesgul={mesguliyetler[masa.id]?.ad}
        secim={secim}
        onClick={() => (islem ? hedefSecildi(masa) : masayaGir(masa))}
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
  const uygunSayisi = islem ? tumMasalar.filter(hedefUygun).length : 0;

  return (
    <Duzen>
      <div className="sayfa">
        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : okunamadi ? (
          <div className="ayar-bos">
            <CloudOff size={30} />
            <p>
              Masalar yüklenemedi. Sunucuya ulaşılamıyor; bağlantı gelince yeniden deneyin.
            </p>
            <button className="ayar-ekle" onClick={() => salonuOku(true)}>
              <RotateCw size={16} /> Yeniden dene
            </button>
          </div>
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
            {/* Kip şeridi sekmelerin üstünde ve sabit: hangi işin ortasında
                olduğunu yazıyor ve hiçbir masanın üstünü örtmüyor. */}
            {islem && (
              <div className="ss-serit">
                <span className="ss-im">
                  {islem.tip === "tasi" ? <ArrowRightLeft size={17} /> : <Combine size={17} />}
                </span>
                <span className="ss-yazi">
                  <strong>
                    {islem.masa.ad} {islem.tip === "tasi" ? "taşınıyor" : "birleştiriliyor"}
                  </strong>
                  <em>
                    {islem.tip === "tasi"
                      ? "Adisyonun geçeceği boş masaya dokunun."
                      : "Adisyonun ekleneceği açık masaya dokunun."}
                  </em>
                </span>
                <span className="ss-sayac">
                  {uygunSayisi > 0
                    ? `${uygunSayisi} masa uygun`
                    : islem.tip === "tasi"
                      ? "Boş masa yok"
                      : "Başka açık masa yok"}
                </span>
                <button className="ss-vazgec" onClick={() => setIslem(null)}>
                  <X size={16} /> Vazgeç
                </button>
              </div>
            )}

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
              {/* Kipte gizli: adisyon masasız bir satışa taşınmıyor. */}
              {masasizVar && !islem && (
                <button
                  className={seciliId === "masasiz" ? "masasiz-sekme aktif" : "masasiz-sekme"}
                  onClick={() => { setSeciliId("masasiz"); setMasasizTip(tekTip); }}
                >
                  <ShoppingBag size={15} />
                  {masasizBaslik}
                  {masasizlar.length > 0 && <em>{masasizlar.length}</em>}
                </button>
              )}

              {/* Kasa şeridin sonunda, bölge sekmelerinden ayrı durur: sekme
                  değil, durumu üstünde yazan bir düğme. */}
              {ayarlar().kasaTakibi && yetkiVar("kasa.ac_kapat") && <Kasa />}
            </nav>

            {/* Tek tür açıksa seçim adımı anlamsız; sekme doğrudan listeye giriyor. */}
            {seciliId === "masasiz" && masasizTip === null && (
              <section className="bolge">
                <div className="tur-secim">
                  {paketAcik && (
                    <button className="tur-kart" onClick={() => setMasasizTip("paket")}>
                      <Bike size={40} />
                      <strong>Paket</strong>
                      <span>
                        {paketler.length > 0 ? `${paketler.length} açık sipariş` : "Açık sipariş yok"}
                      </span>
                    </button>
                  )}
                  {gelalAcik && (
                    <button className="tur-kart" onClick={() => setMasasizTip("gelal")}>
                      <ShoppingBag size={40} />
                      <strong>Gel Al</strong>
                      <span>
                        {gelaller.length > 0 ? `${gelaller.length} açık sipariş` : "Açık sipariş yok"}
                      </span>
                    </button>
                  )}
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

        {hizli && (() => {
          const { araToplam, toplam, odenen, kalan } = adisyonOzeti(hizli.veri);
          return (
            <HizliOde
              baslik={hizli.masa.ad}
              araToplam={araToplam}
              indirim={hizli.veri.indirim}
              servis={servisSatirlari(
                servisGirdisi(hizli.veri, Math.max(0, araToplam - hizli.veri.indirim))
              )}
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
              onSec={async (tip, tutar, kapat, bahsis, musteriId) => {
                const { masa, veri } = hizli;
                setHizli(null);
                const tam = {
                  ...veri,
                  tahsilatlar: [...veri.tahsilatlar, yeniTahsilat({ tip, tutar, bahsis, musteriId })],
                };
                // Bağlantı yoksa ödeme kuyrukta bekliyor, müşteri bekletilmiyor.
                const kuyruga = async () => {
                  kuyrugaEkle({ tip: "masa", masaId: masa.id, masaAdi: masa.ad, veri: tam, kapat });
                  if (kapat) hesapKopyasiSil({ tip: "masa", masaId: masa.id });
                  await yenile();
                };
                if (!baglantiVar()) {
                  await kuyruga();
                  return;
                }
                try {
                  await adisyonKaydet(masa.id, tam, kapat);
                  await yenile();
                } catch (e) {
                  if (baglantiHatasi(e) || !baglantiVar()) {
                    await kuyruga();
                    return;
                  }
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
                    musteriId: duzenlenen.musteriId,
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
            baslik={onay.baslik}
            ikon={onay.ikon}
            mesaj={onay.mesaj}
            onayMetni="Evet, uygula"
            onOnay={onay.onOnay}
            onKapat={() => setOnay(null)}
          />
        )}

        {adisyonIslem && (
          <OnayModal
            baslik={
              adisyonIslem.tip === "iptal" ? "Adisyon iptal edilsin mi?" : "Adisyon ikram edilsin mi?"
            }
            ikon={adisyonIslem.tip === "iptal" ? <Ban size={18} /> : <Gift size={18} />}
            tehlikeli={adisyonIslem.tip === "iptal"}
            mesaj={
              adisyonIslem.tip === "iptal"
                ? `*${adisyonIslem.masa.ad}* masasındaki adisyon iptal edilecek. Masa boşalır, hesap ciroya yazılmaz; kayıt silinmez, iptal olarak durur.`
                : `*${adisyonIslem.masa.ad}* masasındaki ürünlerin tamamı ikrama çevrilecek ve hesap sıfırlanıp kapanacak.`
            }
            sebepler={
              adisyonIslem.tip === "iptal"
                ? ["Yanlış masa açıldı", "Müşteri vazgeçti", "Sipariş yanlış girildi"]
                : ["İşletme ikramı", "Müşteri şikâyeti", "Tanıtım"]
            }
            onayMetni={adisyonIslem.tip === "iptal" ? "Evet, iptal et" : "Evet, ikram et"}
            // İkramda kime yazıldığı da soruluyor; iptalde böyle bir şey yok.
            odenmezler={adisyonIslem.tip === "ikram" ? odenmezler : undefined}
            onOnay={async (sebep, odenmezId) => {
              const { tip, adisyonId } = adisyonIslem;
              setAdisyonIslem(null);
              try {
                if (tip === "iptal") await adisyonIptal(adisyonId, sebep ?? "");
                else await adisyonIkram(adisyonId, sebep, odenmezId);
                await yenile();
              } catch (e) {
                setUyari(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
              }
            }}
            onKapat={() => setAdisyonIslem(null)}
          />
        )}

        {mesgulSorusu && (
          <OnayModal
            baslik="Masada biri var"
            ikon={<LockKeyhole size={20} />}
            tekTus={!devralabilir()}
            mesaj={
              devralabilir()
                ? `*${mesgulSorusu.masa.ad}* masasında şu an *${mesgulSorusu.ad}* işlem yapıyor. Devralırsan *${mesgulSorusu.ad}* masadan çıkarılır.`
                : `*${mesgulSorusu.masa.ad}* masasında şu an *${mesgulSorusu.ad}* işlem yapıyor. İşi bitince masa serbest kalacak.`
            }
            onayMetni="Devral"
            iptalMetni="Vazgeç"
            onOnay={async () => {
              const { masa } = mesgulSorusu;
              setMesgulSorusu(null);
              await masayiDevral(masa.id).catch(() => {});
              navigate(`/siparis/${masa.id}`);
            }}
            onKapat={() => setMesgulSorusu(null)}
          />
        )}

        {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
      </div>
    </Duzen>
  );
}
