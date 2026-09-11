import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChefHat,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Clock,
  CreditCard,
  Gift,
  EyeOff,
  Layers,
  MapPin,
  Package,
  Receipt,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { analizBolumleri } from "../components/Duzen";
import BolumSecici from "../components/BolumSecici";
import AnalizFiltre from "../components/AnalizFiltre";
import { CizgiGrafik, Degisim, Halka } from "../components/Grafikler";
import AramaKutusu from "../components/AramaKutusu";
import Bilgi from "../components/Bilgi";
import AdisyonDetay from "../components/AdisyonDetay";
import { yolaGirebilir } from "../rotaYetkileri";
import { yetkiVar } from "../oturum";
import OnayModal from "../components/OnayModal";
import { paraGoster } from "../para";
import { ayarlar } from "../isletmeAyarlari";
import {
  BOS_FILTRE,
  analizAdisyonlari,
  donemAraligi,
  oncekiAdisyonlar,
  oncekiAralik,
  zamanSerisi,
  analizCariHareketleri,
  analizDenetimi,
  analizGiderleri,
  analizGiderOzeti,
  analizOdenmezleri,
  analizOzeti,
  analizPersoneli,
  analizUrunleri,
  mutfakSureleri,
  urunKategorileri,
  menuUrunKunyeleri,
  tamamiIkram,
  type AnalizAdisyon,
  type AnalizFiltre as Filtre,
  type AnalizOzeti,
  type CariHareketSatiri,
  type DenetimSatiri,
  type GiderOzeti,
  type MutfakSuresiOzeti,
  type OzetDilimi,
  type MutfakSuresiSatiri,
  type OdenmezSatiri,
  type PersonelOzeti,
  type PersonelSatiri,
  type MenuUrunu,
  type SatilmayanUrun,
  type UrunKategorisi,
  type UrunOzeti,
  type UrunSatiri,
  type ZamanSerisi,
} from "../analiz";
import { SAKIN, useCanli } from "../canli";
import { odemeAdi, type Masraf } from "../masraflar";
import { kisaAd } from "../personel";
import { useKutuBoyu } from "../kutuBoyu";

export default function Analiz() {
  const { bolum = "ozet" } = useParams();
  const navigate = useNavigate();

  const [filtre, setFiltre] = useState<Filtre>(BOS_FILTRE);
  const [adisyonlar, setAdisyonlar] = useState<AnalizAdisyon[]>([]);
  // Karşılaştırma listesi: seçili dönemin bir öncesi. Yalnız Özet kullanıyor.
  const [oncekiler, setOncekiler] = useState<AnalizAdisyon[]>([]);
  const [giderler, setGiderler] = useState<Masraf[]>([]);
  const [denetim, setDenetim] = useState<DenetimSatiri[]>([]);
  const [cariHareketler, setCariHareketler] = useState<CariHareketSatiri[]>([]);
  const [mutfak, setMutfak] = useState<MutfakSuresiOzeti | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState<number | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  // Adisyon yeniden açılınca liste eskiyor; sayaç değişince sorgu tekrarlanıyor.
  const [tazele, setTazele] = useState(0);
  // Canlı haberle gelen tazelemede dönen halka gösterilmiyor: rakam yerinde
  // güncelleniyor, okumakta olan kişinin ekranı boşalmıyor. Halka yalnız ilk
  // açılışta ve filtre değiştiğinde çıkıyor.
  const sessizTazeleme = useRef(false);
  // Özetteki eksik tahsilat satırından gelindiğinde liste o hesaplara daralıyor.
  const [sadeceEksik, setSadeceEksik] = useState(false);
  // Ürün → kategori eşlemesi filtreden bağımsız; bir kez çekilip saklanıyor.
  const [kategoriler, setKategoriler] = useState(new Map<number, UrunKategorisi>());
  // Menünün tamamı ve seçenek tanımları da döneme bağlı değil: satılmayanlar
  // listesi ile seçim ağacı bunlardan çıkıyor, filtre her değiştiğinde
  // yeniden sorulmalarının anlamı yok.
  const [menuUrunleri, setMenuUrunleri] = useState<MenuUrunu[]>([]);

  useEffect(() => {
    urunKategorileri().then(setKategoriler);
    menuUrunKunyeleri().then(setMenuUrunleri);
  }, []);

  // Filtre değişince tek sorgu atılıyor; altı sekme de aynı listeden besleniyor.
  useEffect(() => {
    let gecerli = true;
    if (!sessizTazeleme.current) setYukleniyor(true);
    Promise.all([
      analizAdisyonlari(filtre),
      analizGiderleri(filtre),
      analizDenetimi(filtre),
      analizCariHareketleri(filtre),
      // Hazırlık süreleri adisyondan değil turdan çıkıyor; kendi sorgusu var.
      mutfakSureleri(filtre),
      oncekiAdisyonlar(filtre),
    ]).then(([a, g, d, c, m, o]) => {
      if (!gecerli) return;
      setAdisyonlar(a);
      setOncekiler(o);
      setGiderler(g);
      setDenetim(d);
      setCariHareketler(c);
      setMutfak(m);
      setYukleniyor(false);
      sessizTazeleme.current = false;
    });
    return () => {
      gecerli = false;
    };
  }, [filtre, tazele]);

  // Satış, tahsilat ve gider girildiği anda buradaki rakamlar eskiyor. Bakma
  // ekranı olduğu için sakin hızda: yoğun saatte her kaleme sorgu atılmıyor,
  // okunan sayı da altından kaymıyor.
  useCanli(
    ["adisyonlar", "adisyon_kalemleri", "tahsilatlar", "turlar", "masraflar"],
    () => {
      sessizTazeleme.current = true;
      setTazele((t) => t + 1);
    },
    SAKIN
  );

  const ozet = useMemo(() => analizOzeti(adisyonlar, giderler), [adisyonlar, giderler]);
  // Karşılaştırmada gider yok: giderin kendi dönemi var, ciroyla aynı pencereye
  // oturmuyor. Kıyaslanan sayılar adisyondan çıkanlar.
  const oncekiOzet = useMemo(
    () => (oncekiAralik(filtre) ? analizOzeti(oncekiler, []) : null),
    [oncekiler, filtre]
  );
  const seri = useMemo(() => {
    const { bas, bit } = donemAraligi(filtre);
    return zamanSerisi(adisyonlar, bas, bit);
  }, [adisyonlar, filtre]);
  const oncekiSeri = useMemo(() => {
    const aralik = oncekiAralik(filtre);
    if (!aralik) return null;
    return zamanSerisi(oncekiler, aralik.bas, aralik.bit);
  }, [oncekiler, filtre]);
  const urunler = useMemo(
    () =>
      analizUrunleri(adisyonlar, kategoriler, {
        oncekiler: oncekiAralik(filtre) ? oncekiler : null,
        menu: menuUrunleri,
      }),
    [adisyonlar, kategoriler, oncekiler, filtre, menuUrunleri]
  );
  const personel = useMemo(() => analizPersoneli(adisyonlar), [adisyonlar]);
  const giderOzeti = useMemo(() => analizGiderOzeti(giderler), [giderler]);
  const odenmezler = useMemo(() => analizOdenmezleri(adisyonlar), [adisyonlar]);

  return (
    <>
      <div className="sayfa analiz-sayfa">
        <header className="menu-baslik">
          <div className="ayar-baslik-ust">
            <BolumSecici
              baslik="Analiz"
              sekmeler={analizBolumleri
                .filter((b) => yolaGirebilir(b.yol))
                .map((b) => ({ kod: b.yol, ad: b.ad, ikon: b.ikon }))}
              secili={`/analiz/${bolum}`}
              sec={(yol) => navigate(yol)}
            />
          </div>
        </header>

        <AnalizFiltre filtre={filtre} degistir={setFiltre} />

        {yukleniyor ? (
          <div className="yukleniyor">
            <div className="cember" />
          </div>
        ) : bolum === "ozet" ? (
          <Ozet
            ozet={ozet}
            onceki={oncekiOzet}
            seri={seri}
            oncekiSeri={oncekiSeri}
            onEksigeGit={() => {
              setSadeceEksik(true);
              navigate("/analiz/adisyonlar");
            }}
          />
        ) : bolum === "adisyonlar" ? (
          <Adisyonlar
            adisyonlar={adisyonlar}
            onSec={(id) => {
              // Kapanmış adisyonun içini görmek ayrı bir yetki: geçmiş hesabın
              // kalemleri, indirimi ve tahsilatı orada duruyor.
              const a = adisyonlar.find((x) => x.id === id);
              if (a && a.durum !== "acik" && !yetkiVar("siparis.kapali_gor")) {
                setUyari("Kapanmış adisyonu görüntüleme yetkiniz yok.");
                return;
              }
              setSecili(id);
            }}
            sadeceEksik={sadeceEksik}
            // Bu daralma yalnız Özet'teki eksik tahsilat satırından gelince
            // oluşuyor; çip kapanınca listede kalmak değil, geldiği yere dönmek
            // doğru olan. Kullanıcı adisyon aramaya değil, özete bakmaya
            // gelmişti — arada bir sayıyı açıp kapattı.
            onEksigiBirak={() => {
              setSadeceEksik(false);
              navigate("/analiz/ozet");
            }}
          />
        ) : bolum === "urunler" ? (
          <Urunler ozet={urunler} />
        ) : bolum === "mutfak" ? (
          <Mutfak ozet={mutfak} />
        ) : bolum === "personel" ? (
          <Personel ozet={personel} />
        ) : bolum === "giderler" ? (
          <Giderler giderler={giderler} ozet={giderOzeti} ciro={ozet.ciro} />
        ) : bolum === "odenmezler" ? (
          <OdenmezDokumu satirlar={odenmezler} />
        ) : bolum === "acik-hesap" ? (
          <AcikHesap hareketler={cariHareketler} />
        ) : bolum === "denetim" ? (
          <Denetim kayitlar={denetim} />
        ) : (
          <Yapiliyor bolum={bolum} />
        )}
      </div>

      {uyari && <OnayModal tekTus mesaj={uyari} onKapat={() => setUyari(null)} />}

      {secili && (
        <AdisyonDetay
          adisyonId={secili}
          onKapat={() => setSecili(null)}
          onDegisti={() => setTazele((s) => s + 1)}
        />
      )}
    </>
  );
}

const TIP_ADLARI = { masa: "Masa", gelal: "Gel Al", paket: "Paket" };

const saatMetni = (t: string) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const gunMetni = (t: string) =>
  new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });

type AdisyonAlani =
  | "no"
  | "acilis"
  | "kapanis"
  | "tip"
  | "masa"
  | "kisiSayisi"
  | "garson"
  | "durum"
  | "tahsilat"
  | "kuver"
  | "garsoniye"
  | "indirim"
  | "bahsis"
  | "toplam";

/**
 * Sütunun sıralanacak değeri. Ekranda yazan neyse ona göre diziliyor: masa
 * sütununda masasız siparişte müşteri adı yazıyor, tahsilat sütununda ödeme
 * tipi — sıralama da onları görüyor.
 */
function adisyonDegeri(a: AnalizAdisyon, alan: AdisyonAlani): string | number {
  switch (alan) {
    case "no":
      return a.no;
    case "acilis":
      return a.acilis;
    // Açık adisyonun kapanışı yok; boş kalanlar hep listenin sonuna düşsün.
    case "kapanis":
      return a.kapanis ?? "";
    case "tip":
      return TIP_ADLARI[a.tip];
    case "masa":
      return a.tip === "masa" ? a.masaAd : a.musteri;
    case "kisiSayisi":
      return a.kisiSayisi;
    case "garson":
      return a.garson;
    case "durum":
      return durumMetni(a);
    case "tahsilat":
      return tahsilatMetni(a);
    case "kuver":
      return a.kuver;
    case "garsoniye":
      return a.garsoniye;
    case "indirim":
      return a.indirim;
    case "bahsis":
      return a.bahsis;
    case "toplam":
      return a.toplam;
  }
}

const adisyonMetni = (alan: AdisyonAlani) =>
  ["tip", "masa", "garson", "durum", "tahsilat", "kapanis", "acilis"].includes(alan);

/** Saat ve tutar sütunlarında en büyükle başlamak doğal; adlarda alfabetik. */
const adisyonIlkYon = (alan: AdisyonAlani) =>
  adisyonMetni(alan) && alan !== "acilis" && alan !== "kapanis";

/**
 * Adisyo aynı listeyi üç ayrı ekranda tekrarlıyor (Gün Sonu, Masa Siparişleri,
 * Vardiya Raporu); bizde tek liste var, gerisini filtre yapıyor.
 */
function Adisyonlar({
  adisyonlar: hepsi,
  onSec,
  sadeceEksik,
  onEksigiBirak,
}: {
  adisyonlar: AnalizAdisyon[];
  onSec: (id: number) => void;
  sadeceEksik: boolean;
  onEksigiBirak: () => void;
}) {
  const [arama, setArama] = useState("");
  const [sira, setSira] = useState<{ alan: AdisyonAlani; artan: boolean }>({
    alan: "acilis",
    artan: false,
  });

  const { kutu, boy } = useKutuBoyu(hepsi.length);

  const adisyonlar = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    const liste = hepsi.filter((a) => {
      if (sadeceEksik && !(a.durum === "kapali" && a.kalan > 0)) return false;
      if (!ara) return true;
      const metin = `${a.no} ${a.masaAd} ${a.bolgeAd} ${a.garson} ${a.ad} ${a.musteri}`;
      return metin.toLocaleLowerCase("tr").includes(ara);
    });

    const yon = sira.artan ? 1 : -1;
    return liste.sort((a, b) => {
      const x = adisyonDegeri(a, sira.alan);
      const y = adisyonDegeri(b, sira.alan);
      if (adisyonMetni(sira.alan)) {
        return String(x).localeCompare(String(y), "tr") * yon;
      }
      return (Number(x) - Number(y)) * yon;
    });
  }, [hepsi, sadeceEksik, arama, sira]);

  const sirala = (alan: AdisyonAlani) =>
    setSira((s) =>
      s.alan === alan ? { alan, artan: !s.artan } : { alan, artan: adisyonIlkYon(alan) }
    );

  if (adisyonlar.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>
            <ClipboardList size={17} /> Adisyonlar
          </h2>
          {sadeceEksik && <EksikCipi onBirak={onEksigiBirak} />}
          <AramaKutusu deger={arama} degistir={setArama} yer="Adisyon no, masa, müşteri" />
        </div>
        <div className="ayar-bos">
          <ClipboardList size={30} />
          <p>Seçilen dönem ve filtrelerle eşleşen adisyon yok.</p>
        </div>
      </section>
    );
  }

  const topla = (alan: (a: AnalizAdisyon) => number) =>
    adisyonlar.reduce((t, a) => t + alan(a), 0);

  // Kuver, garsoniye, indirim ve bahşiş her işletmede kullanılmıyor; hiç
  // kullanılmamış sütun baştan sona "—" ile dolup tabloyu kalabalıklaştırıyordu.
  // Ölçüt dönemin tamamı, arama sonucu değil — yazdıkça sütun kaybolmasın.
  const varsa = (alan: (a: AnalizAdisyon) => number) => hepsi.some((a) => alan(a) > 0);
  const kuverVar = varsa((a) => a.kuver);
  const garsoniyeVar = varsa((a) => a.garsoniye);
  const indirimVar = varsa((a) => a.indirim);
  const bahsisVar = varsa((a) => a.bahsis);

  const toplamSatiri = (
    <tr className="analiz-toplam">
      <th colSpan={9}>Toplam</th>
      {kuverVar && <th className="sag">{paraGoster(topla((a) => a.kuver))}</th>}
      {garsoniyeVar && <th className="sag">{paraGoster(topla((a) => a.garsoniye))}</th>}
      {indirimVar && <th className="sag">{paraGoster(topla((a) => a.indirim))}</th>}
      {bahsisVar && <th className="sag">{paraGoster(topla((a) => a.bahsis))}</th>}
      <th className="sag hucre-tutar">{paraGoster(topla((a) => a.toplam))}</th>
    </tr>
  );

  // Şeridin rakamları listede görünenin toplamı: arama daraldıkça şerit de
  // daralıyor, alttaki toplam satırıyla aynı kaynaktan besleniyor.
  const misafir = topla((a) => a.kisiSayisi);
  const ciro = topla((a) => a.toplam);
  const eksikSayisi = adisyonlar.filter((a) => a.durum === "kapali" && a.kalan > 0).length;

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <ClipboardList size={15} /> Adisyon
            </span>
            <strong>{adisyonlar.length}</strong>
            <em>
              {eksikSayisi > 0 ? `${eksikSayisi} tanesinde eksik tahsilat` : "hesap açıldı"}
            </em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Ortalama adisyon</span>
            <strong>{paraGoster(adisyonlar.length ? ciro / adisyonlar.length : 0)}</strong>
            <em>hesap başına</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Misafir</span>
            <strong>{misafir ? sayiGoster(misafir) : "—"}</strong>
            <em>{misafir ? `kişi başı ${paraGoster(ciro / misafir)}` : "sayı girilmemiş"}</em>
          </div>
          <div className="serit-sayi serit-toplam">
            <span className="serit-etiket">Toplam</span>
            <strong>{paraGoster(ciro)}</strong>
            <em>listedeki hesapların tutarı</em>
          </div>
        </div>
      </section>

      <section className="ayar-bolum">
      <div className="analiz-liste-ust">
        <h2>
          <ClipboardList size={17} /> {adisyonlar.length} adisyon
        </h2>
        {sadeceEksik && <EksikCipi onBirak={onEksigiBirak} />}
        <AramaKutusu deger={arama} degistir={setArama} yer="Adisyon no, masa, müşteri" />
      </div>

      <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
        <table className="analiz-tablo">
          <thead>
            <tr>
              <SiraBaslik alan="no" ad="No" sira={sira} sirala={sirala} />
              <SiraBaslik alan="acilis" ad="Açılış" sira={sira} sirala={sirala} />
              <SiraBaslik alan="kapanis" ad="Kapanış" sira={sira} sirala={sirala} />
              <SiraBaslik alan="tip" ad="Tip" sira={sira} sirala={sirala} />
              <SiraBaslik alan="masa" ad="Masa" sira={sira} sirala={sirala} />
              <SiraBaslik alan="kisiSayisi" ad="Misafir" orta sira={sira} sirala={sirala} />
              <SiraBaslik alan="garson" ad="Açan" sira={sira} sirala={sirala} />
              <SiraBaslik alan="durum" ad="Durum" sira={sira} sirala={sirala} />
              <SiraBaslik alan="tahsilat" ad="Tahsilat" sira={sira} sirala={sirala} />
              {kuverVar && <SiraBaslik alan="kuver" ad="Kuver" sag sira={sira} sirala={sirala} />}
              {garsoniyeVar && (
                <SiraBaslik alan="garsoniye" ad="Garsoniye" sag sira={sira} sirala={sirala} />
              )}
              {indirimVar && (
                <SiraBaslik alan="indirim" ad="İndirim" sag sira={sira} sirala={sirala} />
              )}
              {bahsisVar && <SiraBaslik alan="bahsis" ad="Bahşiş" sag sira={sira} sirala={sirala} />}
              <SiraBaslik alan="toplam" ad="Tutar" sag sira={sira} sirala={sirala} />
            </tr>
          </thead>
          <tbody>
            {adisyonlar.map((a) => (
              <tr
                key={a.id}
                className={a.durum === "kapali" && a.kalan > 0 ? "adisyon-eksik" : undefined}
                onClick={() => onSec(a.id)}
              >
                <td className="hucre-no">#{a.no}</td>
                <td>{zamanMetni(a.acilis)}</td>
                <td>{a.kapanis ? zamanMetni(a.kapanis) : "—"}</td>
                <td>{TIP_ADLARI[a.tip]}</td>
                <td>{a.tip === "masa" ? a.masaAd || "—" : a.musteri || "—"}</td>
                <td className="orta">{a.kisiSayisi || "—"}</td>
                <td>{a.garson || "—"}</td>
                <td>
                  <Durum adisyon={a} />
                </td>
                <td>
                  <TahsilatCipi adisyon={a} />
                </td>
                {kuverVar && <td className="sag">{a.kuver ? paraGoster(a.kuver) : ""}</td>}
                {garsoniyeVar && (
                  <td className="sag">{a.garsoniye ? paraGoster(a.garsoniye) : ""}</td>
                )}
                {indirimVar && <td className="sag">{a.indirim ? paraGoster(a.indirim) : ""}</td>}
                {bahsisVar && <td className="sag">{a.bahsis ? paraGoster(a.bahsis) : ""}</td>}
                <td className="sag hucre-tutar">{paraGoster(a.toplam)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>{toplamSatiri}</tfoot>
        </table>
      </div>
      </section>
    </div>
  );
}

const zamanMetni = (t: string) => `${gunMetni(t)} ${saatMetni(t)}`;

/** Özetten daraltarak gelindiğini gösteren, tek tıkla bırakılan çip. */
function EksikCipi({ onBirak }: { onBirak: () => void }) {
  return (
    <button type="button" className="analiz-cip-eksik" onClick={onBirak} title="Özete dön">
      Eksik tahsilatı olanlar
      <X size={14} />
    </button>
  );
}

/**
 * Rozette yazan durum. Sıralama da bu metne bakıyor — sütunda okunan sırayla
 * dizilenin aynı olması için tek kaynak.
 */
function durumMetni(a: AnalizAdisyon) {
  if (a.durum === "acik") return "Açık";
  if (a.durum === "iptal") return "İptal";
  if (tamamiIkram(a)) return "İkram";
  return a.kalan > 0 ? "Eksik tahsilat" : "Kapandı";
}

const DURUM_RENKLERI: Record<string, string> = {
  Açık: "acik",
  İptal: "iptal",
  İkram: "ikram",
  "Eksik tahsilat": "eksik",
};

/**
 * Adisyo'da tek bir "Durum" sütunu var; bizde kapanmış ama parası eksik kalan
 * hesap ayrıca işaretleniyor — gün sonunda gözden kaçan en pahalı şey o.
 */
function Durum({ adisyon }: { adisyon: AnalizAdisyon }) {
  const metin = durumMetni(adisyon);
  const renk = DURUM_RENKLERI[metin];
  return (
    <span
      className={renk ? `rozet ${renk}` : "rozet"}
      title={adisyon.durum === "iptal" ? adisyon.iptalSebep : undefined}
    >
      {metin}
    </span>
  );
}

/** Tek ödeme varsa tipi yazılıyor, birden fazlaysa sayısı — sütun taşmasın. */
function tahsilatMetni(a: AnalizAdisyon) {
  if (a.odemeler.length === 0) return "—";
  if (a.odemeler.length === 1) return a.odemeler[0].tip;
  const tipler = new Set(a.odemeler.map((o) => o.tip));
  return tipler.size === 1
    ? `${a.odemeler.length} × ${a.odemeler[0].tip}`
    : `${a.odemeler.length} tahsilat`;
}

/**
 * Ödeme tipi düz yazıyken durum rozetinin yanında sıradan bir metin gibi
 * kalıyordu; ikisi aynı dili konuşsun diye tip de kendi çipinde. Adet çipin
 * dışında: "3 ×" bir sayı, ödeme tipinin parçası değil.
 */
function TahsilatCipi({ adisyon: a }: { adisyon: AnalizAdisyon }) {
  if (a.odemeler.length === 0) return <span className="tahsilat-yok">—</span>;

  const tipler = new Set(a.odemeler.map((o) => o.tip));
  const tek = tipler.size === 1;
  return (
    <span className="tahsilat-cip">
      {a.odemeler.length > 1 && <b>{a.odemeler.length} ×</b>}
      <em>{tek ? a.odemeler[0].tip : "tahsilat"}</em>
    </span>
  );
}

function Ozet({
  ozet,
  onceki,
  seri,
  oncekiSeri,
  onEksigeGit,
}: {
  ozet: AnalizOzeti;
  onceki: AnalizOzeti | null;
  seri: ZamanSerisi;
  oncekiSeri: ZamanSerisi | null;
  onEksigeGit: () => void;
}) {
  const kdvDahil = ayarlar().kdvDahil;

  return (
    <div className="analiz-ozet">
      {/*
        Kahraman kart. Önce dokuz beyaz kutu yan yana diziliydi ve ekranın en
        önemli sayısı olan ciro, "kasaya kalan" ile aynı ağırlıkta duruyordu —
        ekran yönetim paneli gibi görünüyordu, hiyerarşi yoktu. Ciro ve seyri
        artık tek bir koyu kartta, birlikte okunuyor. Koyu yüzey yalnız burada:
        ekranın geri kalanı beyaz kart, fiş ve QR menü de her zaman beyaz kâğıt.
      */}
      <section className="oz-kahraman">
        {/*
          En büyük sayı toplam satış. Önce kapanan ciro dev puntodaydı, açık
          masalar altta bir cümlenin içinde geçiyordu — işletmenin baktığı sayı
          günün toplam işi, kapanmış olması ayrı bir bilgi. İkisi artık cironun
          altında yan yana duruyor: kapanan + açık = toplam.
        */}
        <div className="oz-kahraman-sol">
          <span className="oz-etiket">
            <TrendingUp size={16} /> Toplam satış
          </span>
          <strong className="oz-dev">{paraGoster(ozet.toplamIs)}</strong>
          <div className="oz-alt">
            <Degisim simdi={ozet.toplamIs} onceki={onceki?.toplamIs ?? null} />
            <em>{onceki ? "önceki döneme göre" : `${ozet.adisyon} adisyon`}</em>
          </div>

          <div className="oz-kirilim">
            <div>
              <dt>Kapanan ciro</dt>
              <dd>{paraGoster(ozet.ciro)}</dd>
              <em>
                {ozet.toplamIs > 0
                  ? `toplam satışın %${Math.round((ozet.ciro / ozet.toplamIs) * 100)}'i`
                  : "hesap kapanmadı"}
              </em>
            </div>
            <span className="oz-arti">+</span>
            <div className={ozet.acik ? "oz-acik-blok" : "oz-acik-blok bos"}>
              <dt>Masalarda açık</dt>
              <dd>{paraGoster(ozet.acikTutar)}</dd>
              <em>{ozet.acik ? `${ozet.acik} hesap sürüyor` : "açık hesap yok"}</em>
            </div>
          </div>

          <dl className="oz-kunye">
            <div>
              <dt>Adisyon</dt>
              <dd>
                {sayiGoster(ozet.adisyon)}
                <Degisim simdi={ozet.adisyon} onceki={onceki?.adisyon ?? null} />
              </dd>
            </div>
            <div>
              <dt>Ortalama adisyon</dt>
              <dd>
                {paraGoster(ozet.ortalama)}
                <Degisim simdi={ozet.ortalama} onceki={onceki?.ortalama ?? null} />
              </dd>
            </div>
            <div>
              <dt>Misafir</dt>
              <dd>
                {ozet.misafir ? sayiGoster(ozet.misafir) : "—"}
                <Degisim simdi={ozet.misafir} onceki={onceki?.misafir ?? null} />
              </dd>
            </div>
            <div>
              <dt>Kişi başı</dt>
              <dd>
                {ozet.kisiBasi ? paraGoster(ozet.kisiBasi) : "—"}
                <Degisim simdi={ozet.kisiBasi} onceki={onceki?.kisiBasi ?? null} />
              </dd>
            </div>
            <div className="kunye-net">
              <dt>Kasaya kalan</dt>
              <dd>{paraGoster(ozet.net)}</dd>
              <em>
                {ozet.gider ? `${paraGoster(ozet.gider)} gider düşüldü` : "gider girilmemiş"}
              </em>
            </div>
          </dl>
        </div>

        <div className="oz-kahraman-sag">
          <div className="oz-egri-bas">
            <h2>Ciro seyri</h2>
            <span className="oz-egri-lejant">
              <i className="simdi" /> bu dönem
              {oncekiSeri && oncekiSeri.noktalar.length > 1 && (
                <>
                  <i className="onceki" /> önceki
                </>
              )}
            </span>
          </div>
          {seri.noktalar.length === 0 ? (
            <div className="oz-egri-bos">
              <BarChart3 size={30} />
              <p>Bu dönemde kapanmış adisyon yok.</p>
            </div>
          ) : (
            <CizgiGrafik noktalar={seri.noktalar} onceki={oncekiSeri?.noktalar} koyu />
          )}
        </div>
      </section>

      <div className="analiz-uclu">
        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <Receipt size={17} /> Hesap dökümü
            </h2>
          </div>
          <dl className="kasa-dokum">
            <div>
              <dt>Ara toplam</dt>
              <dd>{paraGoster(ozet.araToplam)}</dd>
            </div>
            <div>
              <dt>İndirim</dt>
              <dd className={ozet.indirim ? "azalan" : ""}>
                {ozet.indirim ? `−${paraGoster(ozet.indirim)}` : paraGoster(0)}
              </dd>
            </div>
            <div>
              <dt>Brüt {kdvDahil ? "(KDV hariç)" : "(matrah)"}</dt>
              <dd>{paraGoster(ozet.matrah)}</dd>
            </div>
            <div>
              <dt>KDV</dt>
              <dd>{paraGoster(ozet.kdv)}</dd>
            </div>
            {ozet.servis > 0 && (
              <div>
                <dt>Kuver / garsoniye</dt>
                <dd>{paraGoster(ozet.servis)}</dd>
              </div>
            )}
            <div className="kasa-beklenen">
              <dt>Ciro</dt>
              <dd>{paraGoster(ozet.ciro)}</dd>
            </div>
            <div>
              <dt>Kasaya giren</dt>
              <dd>{paraGoster(ozet.tahsilEdilen)}</dd>
            </div>
            {ozet.eksikTahsilat > 0 && (
              <div className="dokum-eksik">
                <dt>Eksik tahsilat</dt>
                <dd>
                  <button type="button" onClick={onEksigeGit}>
                    {paraGoster(ozet.eksikTahsilat)}
                    <ChevronRight size={15} />
                  </button>
                </dd>
              </div>
            )}
            {ozet.ikram > 0 && (
              <div>
                <dt>İkram edilen</dt>
                <dd>{paraGoster(ozet.ikram)}</dd>
              </div>
            )}
            {ozet.bahsis > 0 && (
              <div>
                <dt>Bahşiş</dt>
                <dd className="artan">{paraGoster(ozet.bahsis)}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <CreditCard size={17} /> Ödeme dağılımı
            </h2>
          </div>
          {ozet.odemeler.length === 0 ? (
            <div className="ayar-bos">
              <CreditCard size={30} />
              <p>Bu dönemde tahsilat yok.</p>
            </div>
          ) : (
            <Halka dilimler={ozet.odemeler} toplam={ozet.tahsilEdilen || ozet.ciro} />
          )}
        </section>

        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <ClipboardList size={17} /> Sipariş tipi
            </h2>
          </div>
          {ozet.tipler.length === 0 ? (
            <div className="ayar-bos">
              <ClipboardList size={30} />
              <p>Bu dönemde kapanmış adisyon yok.</p>
            </div>
          ) : (
            <Dagilim satirlar={ozet.tipler} toplam={ozet.ciro} />
          )}
        </section>
      </div>

      {/* Saat grafiği yarım sütuna sıkışınca okunmuyordu; tam genişlikte. */}
      <section className="ayar-bolum">
        <div className="ayar-bolum-ust">
          <h2>
            <Clock size={17} /> Saatlere göre
          </h2>
        </div>
        <Saatler saatler={ozet.saatler} />
      </section>
    </div>
  );
}

/** "pay" ayrı bir sütun ama sıralaması ciroyla aynı — payı belirleyen ciro. */
type UrunAlani = "ad" | "kategoriAd" | "miktar" | "ciro" | "pay" | "degisim" | "ikram" | "iptal";
type Sira = { alan: UrunAlani; artan: boolean };

/** Metin alanı A'dan Z'ye, sayı alanı büyükten küçüğe açılıyor — beklenen yön o. */
const metinAlani = (alan: UrunAlani) => alan === "ad" || alan === "kategoriAd";

/** Önceki döneme göre yüzde değişim; kıyaslanacak rakam yoksa hesaplanmıyor. */
function degisimOrani(s: UrunSatiri) {
  if (!s.oncekiCiro) return null;
  return ((s.ciro - s.oncekiCiro) / s.oncekiCiro) * 100;
}

type UrunGrubu = "yildiz" | "hacim" | "pahali" | "geride";

const GRUP_ADLARI: Record<UrunGrubu, { ad: string; aciklama: string }> = {
  yildiz: { ad: "Yıldız", aciklama: "çok satıyor, çok kazandırıyor" },
  hacim: { ad: "Hacim", aciklama: "çok satıyor, az kazandırıyor" },
  pahali: { ad: "Pahalı", aciklama: "az satıyor, çok kazandırıyor" },
  geride: { ad: "Geride", aciklama: "az satıyor, az kazandırıyor" },
};

/**
 * Ürünü dört gruptan birine yerleştiriyor: adedi ve cirosu dönem ortalamasının
 * üstünde mi altında mı. Önce dağılım grafiği çizilmişti; tek yüksek adetli ürün
 * (çay gibi) yatay ekseni tek başına doldurup diğerlerini köşeye eziyordu,
 * üstelik grafiği okumak için önce grafiği öğrenmek gerekiyordu. Aynı bilgi
 * satırın kendi rozetinde okunuyor artık.
 *
 * Ortalama değil ortanca kullanılıyor: ortalamayı da o tek ürün kaydırıyor.
 */
function urunGruplari(satirlar: UrunSatiri[]) {
  const satanlar = satirlar.filter((s) => s.miktar > 0);
  if (satanlar.length < 4) return new Map<string, UrunGrubu>();

  const ortanca = (sayilar: number[]) => {
    const d = [...sayilar].sort((a, b) => a - b);
    const o = Math.floor(d.length / 2);
    return d.length % 2 ? d[o] : (d[o - 1] + d[o]) / 2;
  };
  const adetEsigi = ortanca(satanlar.map((s) => s.miktar));
  const ciroEsigi = ortanca(satanlar.map((s) => s.ciro));

  const harita = new Map<string, UrunGrubu>();
  for (const s of satanlar) {
    const cok = s.miktar >= adetEsigi;
    const kazanc = s.ciro >= ciroEsigi;
    harita.set(s.anahtar, cok && kazanc ? "yildiz" : cok ? "hacim" : kazanc ? "pahali" : "geride");
  }
  return harita;
}

function Urunler({ ozet }: { ozet: UrunOzeti }) {
  const [sira, setSira] = useState<Sira>({ alan: "ciro", artan: false });
  const [arama, setArama] = useState("");
  const [kategoriArama, setKategoriArama] = useState("");
  // Kadrandan bir ürüne basılınca tabloya o ad yazılıyor: grafikte gördüğü
  // noktanın rakamlarını aramak için kullanıcı listeyi elle taramasın.
  // Dört gruptan biri seçilince tablo o gruba daralıyor; ürün adıyla arama
  // kutusu ise ayrı çalışıyor, ikisi birlikte de kullanılabiliyor.
  const [grup, setGrup] = useState<UrunGrubu | null>(null);
  const [kategoriPenceresi, setKategoriPenceresi] = useState(false);

  // İki kutu iki ayrı listeyi süzüyor: kategori kartı ile ürün tablosu birbirini
  // etkilemiyor, aynı ekranda iki farklı soru sorulabiliyor.
  const kategoriler = useMemo(() => {
    const ara = kategoriArama.trim().toLocaleLowerCase("tr");
    if (!ara) return ozet.kategoriler;
    return ozet.kategoriler.filter((k) => k.ad.toLocaleLowerCase("tr").includes(ara));
  }, [ozet.kategoriler, kategoriArama]);

  const gruplama = useMemo(() => urunGruplari(ozet.satirlar), [ozet.satirlar]);

  const satirlar = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    const liste = ozet.satirlar.filter(
      (s) =>
        (!ara || s.ad.toLocaleLowerCase("tr").includes(ara)) &&
        (!grup || gruplama.get(s.anahtar) === grup)
    );

    const yon = sira.artan ? 1 : -1;
    if (sira.alan === "degisim") {
      // Kıyaslanacak rakamı olmayan satır sıralamanın dışında kalıyor; sona
      // yığılıyor ki listenin başı gerçekten değişenlerle dolsun.
      return [...liste].sort((a, b) => {
        const x = degisimOrani(a);
        const y = degisimOrani(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x - y) * yon;
      });
    }

    const alan = sira.alan === "pay" ? "ciro" : sira.alan;
    return liste.sort((a, b) => {
      if (metinAlani(alan)) {
        return String(a[alan]).localeCompare(String(b[alan]), "tr") * yon;
      }
      return (Number(a[alan]) - Number(b[alan])) * yon;
    });
  }, [ozet.satirlar, sira, arama, grup, gruplama]);

  const sirala = (alan: UrunAlani) =>
    setSira((s) =>
      s.alan === alan ? { alan, artan: !s.artan } : { alan, artan: metinAlani(alan) }
    );

  const topla = (alan: (s: UrunSatiri) => number) =>
    satirlar.reduce((t, s) => t + alan(s), 0);

  // Kullanılmayan sütun hiç çizilmiyor. Ölçüt dönemin tamamı, arama sonucu
  // değil — yoksa kullanıcı yazdıkça sütunlar kaybolurdu.
  const ikramVar = ozet.satirlar.some((s) => s.ikram > 0);
  const iptalVar = ozet.satirlar.some((s) => s.iptal > 0);
  const kiyasVar = ozet.oncekiCiro != null;
  const sutunSayisi = 5 + (kiyasVar ? 1 : 0) + (ikramVar ? 1 : 0) + (iptalVar ? 1 : 0);

  const { kutu, boy } = useKutuBoyu(`${kategoriler.length}-${satirlar.length}`);

  if (ozet.satirlar.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <Package size={30} />
          <p>Bu dönemde satılmış ürün yok.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <Package size={15} /> Satılan
            </span>
            <strong>{sayiGoster(ozet.miktar)}</strong>
            <em>adet ürün</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Çeşit</span>
            <strong>{ozet.cesit}</strong>
            <em>farklı ürün satıldı</em>
          </div>
          <div className="serit-sayi serit-toplam">
            <span className="serit-etiket">Ürün cirosu</span>
            <strong>{paraGoster(ozet.ciro)}</strong>
            <em>
              <Degisim simdi={ozet.ciro} onceki={ozet.oncekiCiro} />
              {ozet.ikram > 0 ? `${paraGoster(ozet.ikram)} ikram hariç` : "indirim düşülmüş"}
            </em>
          </div>
        </div>
      </section>

      <OneCikanlar ozet={ozet} />

      <div className="urun-ikili">
        <section className="ayar-bolum urun-kat-kart">
          <div className="ayar-bolum-ust">
            <h2>
              <Layers size={17} /> Kategoriler
            </h2>
            <AramaKutusu deger={kategoriArama} degistir={setKategoriArama} yer="Kategori ara" />
          </div>
          {kategoriler.length === 0 ? (
            <div className="ayar-bos">
              <Layers size={30} />
              <p>Aramayla eşleşen kategori yok.</p>
            </div>
          ) : (
            /* Halkanın kendi lejantı zaten kategorileri tutar ve pay ile
               sıralıyor; altına bir de çubuklu dağılım konunca aynı liste iki
               kez çiziliyordu. Lejant altı satırda kesiliyor — menüsünde otuz
               kategori olan işletmede kart ekran boyu uzuyordu. */
            <Halka
              dilimler={kategoriler}
              toplam={kategoriler.reduce((t, k) => t + k.tutar, 0)}
              enFazla={6}
              onTumu={() => setKategoriPenceresi(true)}
            />
          )}
        </section>

        {/* Bölge Adisyo'nun raporunda ilk sırada; bizde salon planı zaten
            bölgeli ama Analiz bugüne kadar hiç kırmıyordu. */}
        <section className="ayar-bolum">
          <div className="analiz-liste-ust">
            <h2>
              <MapPin size={17} /> Bölgeler
            </h2>
          </div>
          {ozet.bolgeler.length === 0 ? (
            <div className="ayar-bos">
              <MapPin size={30} />
              <p>Bölge bilgisi olan satış yok.</p>
            </div>
          ) : (
            <Dagilim satirlar={ozet.bolgeler} toplam={ozet.ciro} birim="adet" />
          )}
        </section>
      </div>

      <UrunGruplari
        satirlar={ozet.satirlar}
        toplam={ozet.ciro}
        secili={grup}
        sec={(g) => setGrup(grup === g ? null : g)}
      />

      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>
            <Package size={17} /> {satirlar.length} ürün
          </h2>
          <AramaKutusu deger={arama} degistir={setArama} yer="Ürün ara" />
        </div>

        <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
          <table className="analiz-tablo urun-tablo">
            <thead>
              <tr>
                <SiraBaslik alan="ad" ad="Ürün" sira={sira} sirala={sirala} />
                <SiraBaslik alan="kategoriAd" ad="Kategori" sira={sira} sirala={sirala} />
                <SiraBaslik alan="miktar" ad="Miktar" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="ciro" ad="Ciro" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="pay" ad="Pay" orta sira={sira} sirala={sirala} />
                {/* Karşılaştırma sütunu yalnız kıyaslanacak bir önceki dönem
                    varsa açılıyor; vardiya seçiminde o pencere yok. */}
                {kiyasVar && (
                  <SiraBaslik alan="degisim" ad="Değişim" sag sira={sira} sirala={sirala} />
                )}
                {ikramVar && <SiraBaslik alan="ikram" ad="İkram" sag sira={sira} sirala={sirala} />}
                {iptalVar && <SiraBaslik alan="iptal" ad="İptal" sag sira={sira} sirala={sirala} />}
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr className="tablo-bos-satir">
                  <td colSpan={sutunSayisi}>Aramayla eşleşen ürün yok.</td>
                </tr>
              ) : (
                satirlar.map((s) => (
                  <UrunSatir
                    key={s.anahtar}
                    satir={s}
                    toplam={ozet.ciro}
                    kiyasVar={kiyasVar}
                    ikramVar={ikramVar}
                    iptalVar={iptalVar}
                    grup={gruplama.get(s.anahtar)}
                  />
                ))
              )}
            </tbody>
            {/* Toplam listede görünenin toplamı; arama daraltınca alt satır da daralıyor. */}
            <tfoot>
              <tr>
                <td colSpan={2}>TOPLAM</td>
                <td className="sag">{sayiGoster(topla((s) => s.miktar))}</td>
                <td className="sag hucre-tutar">{paraGoster(topla((s) => s.ciro))}</td>
                <td />
                {kiyasVar && <td />}
                {ikramVar && (
                  <td className="sag">
                    {topla((s) => s.ikram) ? paraGoster(topla((s) => s.ikram)) : ""}
                  </td>
                )}
                {iptalVar && (
                  <td className="sag">
                    {topla((s) => s.iptal) ? paraGoster(topla((s) => s.iptal)) : ""}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <Satilmayanlar liste={ozet.satilmayanlar} />

      {kategoriPenceresi ? (
        <KategoriPenceresi
          satirlar={ozet.kategoriler}
          toplam={ozet.ciro}
          onKapat={() => setKategoriPenceresi(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Dört kutu, dört cümle. "Çok satan" ile "çok kazandıran" ürün çoğu zaman aynı
 * değil ama iki ayrı sıralamada bakınca bu ayrım görünmüyor: her iki listede de
 * ortalarda kalan ürün gözden kaçıyor. Kutuya basınca alttaki liste o gruba
 * daralıyor.
 */
function UrunGruplari({
  satirlar,
  toplam,
  secili,
  sec,
}: {
  satirlar: UrunSatiri[];
  toplam: number;
  secili: UrunGrubu | null;
  sec: (g: UrunGrubu) => void;
}) {
  const harita = useMemo(() => urunGruplari(satirlar), [satirlar]);
  if (harita.size === 0) return null;

  const sirali: UrunGrubu[] = ["yildiz", "hacim", "pahali", "geride"];

  return (
    <div className="urun-gruplari">
      {sirali.map((g) => {
        const liste = satirlar.filter((s) => harita.get(s.anahtar) === g);
        const ciro = liste.reduce((t, s) => t + s.ciro, 0);
        return (
          <button
            key={g}
            type="button"
            className={`urun-grup ${g}${secili === g ? " secili" : ""}`}
            onClick={() => sec(g)}
            disabled={liste.length === 0}
          >
            <strong>{GRUP_ADLARI[g].ad}</strong>
            <span className="urun-grup-sayi">
              {liste.length} ürün · cironun %{toplam > 0 ? Math.round((ciro / toplam) * 100) : 0}'i
            </span>
            <em>{GRUP_ADLARI[g].aciklama}</em>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Dönemin üç cümlesi. Tablo "hangi ürün ne kadar sattı"yı söylüyor; asıl merak
 * edilen "bu dönemde ne değişti" ise ancak satır satır karşılaştırınca
 * çıkıyordu. Adisyo'nun hiçbir raporunda önceki dönem yok.
 */
function OneCikanlar({ ozet }: { ozet: UrunOzeti }) {
  const yildiz = ozet.satirlar.find((s) => s.miktar > 0) ?? null;

  // Kıyas yalnız iki dönemde de satılmış üründe anlamlı: tek adetten üç adede
  // çıkan ürün "%200 arttı" diye başa geçmesin diye küçük satışlar eleniyor.
  const oranli = ozet.satirlar
    .filter((s) => (s.oncekiCiro ?? 0) > 0 && s.miktar > 0 && (s.oncekiMiktar ?? 0) >= 2)
    .map((s) => ({ satir: s, oran: degisimOrani(s) ?? 0 }))
    .sort((a, b) => b.oran - a.oran);

  const yukselen = oranli.length && oranli[0].oran > 0 ? oranli[0] : null;
  const dusen =
    oranli.length && oranli[oranli.length - 1].oran < 0 ? oranli[oranli.length - 1] : null;

  if (!yildiz) return null;

  return (
    <div className="one-cikanlar">
      <article className="one-cikan yildiz">
        <span className="one-cikan-etiket">
          <Star size={15} /> Dönemin yıldızı
        </span>
        <strong>{yildiz.ad}</strong>
        <em>
          {sayiGoster(yildiz.miktar)} adet · {paraGoster(yildiz.ciro)}
        </em>
      </article>

      {yukselen ? (
        <article className="one-cikan artan">
          <span className="one-cikan-etiket">
            <TrendingUp size={15} /> En çok yükselen
          </span>
          <strong>{yukselen.satir.ad}</strong>
          <em>
            <Degisim simdi={yukselen.satir.ciro} onceki={yukselen.satir.oncekiCiro ?? null} />
            geçen döneme göre
          </em>
        </article>
      ) : null}

      {dusen ? (
        <article className="one-cikan azalan">
          <span className="one-cikan-etiket">
            <TrendingDown size={15} /> En çok düşen
          </span>
          <strong>{dusen.satir.ad}</strong>
          <em>
            <Degisim simdi={dusen.satir.ciro} onceki={dusen.satir.oncekiCiro ?? null} />
            geçen döneme göre
          </em>
        </article>
      ) : null}
    </div>
  );
}

/**
 * Kategorilerin tamamı. Halkanın lejantı ilk altıyı gösteriyor; menüsünde otuz
 * kategori olan işletme kalanını buradan görüyor. Kartı uzatmak yerine pencere
 * açılıyor — kategori listesi ekranın asıl işi değil, arada bakılan bir döküm.
 */
function KategoriPenceresi({
  satirlar,
  toplam,
  onKapat,
}: {
  satirlar: (OzetDilimi & { renk?: string })[];
  toplam: number;
  onKapat: () => void;
}) {
  const [arama, setArama] = useState("");
  // Listede farenin üstünde olduğu kategori halkada da yanıyor: yüzdeyi okurken
  // karşılığının çemberde nereye düştüğü görünsün.
  const [uzerinde, setUzerinde] = useState<string | null>(null);
  const ara = arama.trim().toLocaleLowerCase("tr");
  const liste = ara
    ? satirlar.filter((s) => s.ad.toLocaleLowerCase("tr").includes(ara))
    : satirlar;

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal kat-pencere" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          <h3>
            <Layers size={18} /> {satirlar.length} kategori
          </h3>
          <button className="up-kapat" onClick={onKapat} aria-label="Kapat">
            <X size={19} />
          </button>
        </header>

        {/* Halka solda sabit duruyor, liste sağda kendi içinde kayıyor: halka
            listenin üstündeyken aşağı inildiği anda ekrandan çıkıyor, oysa
            okunan yüzdenin karşılığı odur. */}
        <div className="kat-pencere-icerik">
          <div className="kat-pencere-halka">
            <Halka dilimler={satirlar} toplam={toplam} lejantsiz vurguAd={uzerinde} />
          </div>

          <div className="kat-pencere-sag">
            <AramaKutusu deger={arama} degistir={setArama} yer="Kategori ara" />

            <div className="kat-pencere-govde">
              {liste.length === 0 ? (
                <div className="ayar-bos">
                  <Layers size={30} />
                  <p>Aramayla eşleşen kategori yok.</p>
                </div>
              ) : (
                <ul className="analiz-dagilim kategori-dagilim">
                  {liste.map((s) => {
                    const pay = toplam > 0 ? Math.round((s.tutar / toplam) * 100) : 0;
                    return (
                      <li
                        key={s.ad}
                        className={uzerinde === s.ad ? "vurgu" : undefined}
                        onMouseEnter={() => setUzerinde(s.ad)}
                        onMouseLeave={() => setUzerinde(null)}
                      >
                        <span className="dagilim-ad">
                          <span className="kategori-ad">
                            <i style={{ background: s.renk || "#d9cbb8" }} />
                            {s.ad}
                          </span>
                          <em>{sayiGoster(s.adet)} adet</em>
                        </span>
                        <span className="dagilim-cubuk">
                          <i
                            style={{
                              width: `${Math.min(100, pay)}%`,
                              background: s.renk || undefined,
                            }}
                          />
                        </span>
                        <span className="dagilim-tutar">
                          {paraGoster(s.tutar)}
                          <em>%{pay}</em>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Menüde durup bu dönemde hiç satılmayan ürünler. Satış raporu yalnız satılanı
 * bilir; menüden kaldırma kararı ise satılmayana bakılarak veriliyor.
 */
function Satilmayanlar({ liste }: { liste: SatilmayanUrun[] }) {
  const [acik, setAcik] = useState(false);
  if (liste.length === 0) return null;

  // Satışta gizli ve tükenmiş ürünler ayrı sayılıyor: onlar satmadığı için
  // değil, satılamadığı için listede.
  const engelli = liste.filter((u) => u.gizli || u.tukendi).length;

  return (
    <section className="ayar-bolum">
      <div className="analiz-liste-ust">
        <h2>
          <EyeOff size={17} /> Hiç satılmayan {liste.length} ürün
        </h2>
        <button type="button" className="detay-dugme" onClick={() => setAcik((a) => !a)}>
          {acik ? "Gizle" : "Göster"}
          <ChevronRight size={15} className={acik ? "dokum-ok acik" : "dokum-ok"} />
        </button>
      </div>

      <Bilgi>
        Bu ürünler menüde duruyor ama seçili dönemde tek adet bile satılmadı.
        {engelli > 0
          ? ` ${engelli} tanesi zaten satışa kapalı ya da tükendi olarak işaretli.`
          : ""}
      </Bilgi>

      {acik ? (
        <ul className="satilmayan-liste">
          {liste.map((u) => (
            <li key={u.id}>
              <span className="kategori-ad">
                <i style={{ background: u.kategoriRenk || "#d9cbb8" }} />
                {u.ad}
              </span>
              <em>{u.kategoriAd}</em>
              {u.gizli ? <span className="rozet">satışta gizli</span> : null}
              {u.tukendi ? <span className="rozet">tükendi</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * Payı satırın içinde çubukla göstermek, ayrı bir yüzde sütunundan hem daha hızlı
 * okunuyor hem sıralamayı gözle doğrulatıyor.
 */
function PayCubugu({ pay }: { pay: number }) {
  return (
    <span className="pay-kutu">
      <span className="pay-cubuk">
        <i style={{ width: `${Math.max(2, Math.min(100, pay))}%` }} />
      </span>
      <em>%{pay < 10 && pay > 0 ? pay.toFixed(1) : Math.round(pay)}</em>
    </span>
  );
}

/**
 * Sıralanabilir sütun başlığı. Sıralamayı ayrı bir düğme şeridine taşımak yerine
 * başlığın kendisine bağlamak, hangi sütuna göre dizildiğini de gösteriyor.
 */
function SiraBaslik<T extends string>({
  alan,
  ad,
  sag,
  orta,
  sira,
  sirala,
}: {
  alan: T;
  ad: string;
  sag?: boolean;
  orta?: boolean;
  sira: { alan: T; artan: boolean };
  sirala: (alan: T) => void;
}) {
  const aktif = sira.alan === alan;
  return (
    <th className={`${sag ? "sag " : ""}${orta ? "orta " : ""}${aktif ? "sirali" : ""}`}>
      <button type="button" onClick={() => sirala(alan)}>
        {ad}
        {aktif ? (
          sira.artan ? (
            <ArrowUp size={14} />
          ) : (
            <ArrowDown size={14} />
          )
        ) : (
          <ChevronsUpDown size={14} />
        )}
      </button>
    </th>
  );
}

function UrunSatir({
  satir,
  toplam,
  kiyasVar,
  ikramVar,
  iptalVar,
  grup,
}: {
  satir: UrunSatiri;
  toplam: number;
  kiyasVar: boolean;
  ikramVar: boolean;
  iptalVar: boolean;
  grup?: UrunGrubu;
}) {
  const pay = toplam > 0 ? (satir.ciro / toplam) * 100 : 0;

  return (
    <tr>
      <td className="hucre-urun">
        {satir.ad}
        {/* Grup rozeti adın yanında: ayrı sütun açmak yedi sütunlu tabloyu
            sekize çıkarırdı, üstelik rozet ürünün kendi künyesi. */}
        {grup ? <span className={`urun-grup-rozet ${grup}`}>{GRUP_ADLARI[grup].ad}</span> : null}
      </td>
      <td>
        <span className="urun-kategori">
          <i style={{ background: satir.kategoriRenk || "#d9cbb8" }} />
          {satir.kategoriAd}
        </span>
      </td>
      {/* Boş para hücresine tire konmuyor: ekranın yarısı "—" ile dolunca
          dolu hücreler kayboluyor. */}
      <td className="sag">{satir.miktar ? sayiGoster(satir.miktar) : ""}</td>
      <td className="sag hucre-tutar">{paraGoster(satir.ciro)}</td>
      {/* Payı satırın içinde çubukla göstermek, ayrı bir yüzde sütunundan hem
          daha hızlı okunuyor hem sıralamayı gözle doğrulatıyor. */}
      <td className="hucre-pay">
        <PayCubugu pay={pay} />
      </td>
      {kiyasVar && (
        <td className="sag">
          <Degisim simdi={satir.ciro} onceki={satir.oncekiCiro ?? null} />
        </td>
      )}
      {ikramVar && <td className="sag">{satir.ikram ? paraGoster(satir.ikram) : ""}</td>}
      {iptalVar && <td className="sag">{satir.iptal ? paraGoster(satir.iptal) : ""}</td>}
    </tr>
  );
}

type PersonelAlani = "ad" | "acilan" | "adisyon" | "adet" | "ciro" | "pay" | "ikram" | "iptal";

type MutfakAlani = "ad" | "istasyonAd" | "adet" | "ortalama" | "enUzun" | "geciken";

/** Saniyeyi tezgâh diliyle yazıyor: 45 sn, 6 dk, 1 sa 12 dk. */
function sureGoster(saniye: number) {
  if (saniye < 60) return `${saniye} sn`;
  const dk = Math.round(saniye / 60);
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

/**
 * Hazırlık süreleri. Sorusu "nerede tıkanıyoruz": hangi ürün beklettiriyor,
 * hangi tezgâh yetişemiyor. Para geçmiyor, o yüzden ciroyu görmeyen tezgâh
 * sorumlusu da bakabiliyor.
 */
function Mutfak({ ozet }: { ozet: MutfakSuresiOzeti | null }) {
  const { kutu, boy } = useKutuBoyu(ozet?.satirlar.length ?? 0);
  const [sira, setSira] = useState<{ alan: MutfakAlani; artan: boolean }>({
    alan: "ortalama",
    artan: false,
  });
  const [arama, setArama] = useState("");

  const satirlar = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    const liste = (ozet?.satirlar ?? []).filter(
      (s) => !ara || s.ad.toLocaleLowerCase("tr").includes(ara)
    );
    const yon = sira.artan ? 1 : -1;
    return liste.sort((a, b) =>
      sira.alan === "ad" || sira.alan === "istasyonAd"
        ? String(a[sira.alan]).localeCompare(String(b[sira.alan]), "tr") * yon
        : (Number(a[sira.alan]) - Number(b[sira.alan])) * yon
    );
  }, [ozet, sira, arama]);

  const sirala = (alan: MutfakAlani) =>
    setSira((s) =>
      s.alan === alan
        ? { alan, artan: !s.artan }
        : { alan, artan: alan === "ad" || alan === "istasyonAd" }
    );

  if (!ozet || ozet.satirlar.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <ChefHat size={30} />
          <p>Bu dönemde hazır işaretlenmiş ürün yok.</p>
        </div>
      </section>
    );
  }

  const gecikmeDk = ayarlar().mutfakGecikmeDk;
  const gecikmePay = ozet.adet ? Math.round((ozet.geciken / ozet.adet) * 100) : 0;
  const asamali = ozet.asamaliVar;

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <ChefHat size={15} /> Hazırlanan
            </span>
            <strong>{ozet.adet}</strong>
            <em>ürün hazır işaretlendi</em>
          </div>
          <div className="serit-sayi serit-toplam">
            <span className="serit-etiket">Ortalama süre</span>
            <strong>{sureGoster(ozet.ortalama)}</strong>
            <em>sipariş düştükten sonra</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">En uzun</span>
            <strong>{sureGoster(ozet.enUzun)}</strong>
            <em>tek bir üründe</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Gecikme</span>
            <strong>{gecikmeDk > 0 ? `%${gecikmePay}` : "—"}</strong>
            <em>
              {gecikmeDk > 0
                ? `${ozet.geciken} ürün ${gecikmeDk} dakikayı aştı`
                : "gecikme eşiği tanımlı değil"}
            </em>
          </div>
        </div>
      </section>

      <Bilgi>
        Süre, siparişin tezgâha düştüğü an ile hazır işaretlendiği an arasını
        ölçüyor. Mutfak tuşa geç basarsa ya da biten ürünleri sonradan toplu
        işaretlerse rakam gerçekte geçen süreden uzun çıkar.
      </Bilgi>

      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>
            <ChefHat size={17} /> {satirlar.length} ürün
          </h2>
          <AramaKutusu deger={arama} degistir={setArama} yer="Ürün ara" />
        </div>

        <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
          <table className="analiz-tablo">
            <thead>
              <tr>
                <SiraBaslik alan="ad" ad="Ürün" sira={sira} sirala={sirala} />
                <SiraBaslik alan="istasyonAd" ad="İstasyon" sira={sira} sirala={sirala} />
                <SiraBaslik alan="adet" ad="Adet" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="ortalama" ad="Ortalama" sag sira={sira} sirala={sirala} />
                {/* Sıra/hazırlık ayrımı yalnız aşaması açık istasyonda oluşuyor;
                    kapalıysa sütunlar boş kalacağına hiç açılmıyor. */}
                {asamali && <th className="sag">Sırada</th>}
                {asamali && <th className="sag">Hazırlanma</th>}
                <SiraBaslik alan="enUzun" ad="En uzun" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="geciken" ad="Geciken" sag sira={sira} sirala={sirala} />
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr className="tablo-bos-satir">
                  <td colSpan={asamali ? 8 : 6}>Aramayla eşleşen ürün yok.</td>
                </tr>
              ) : (
                satirlar.map((s: MutfakSuresiSatiri) => (
                  <tr key={s.anahtar}>
                    <td>{s.ad}</td>
                    <td>{s.istasyonAd}</td>
                    <td className="sag">{s.adet}</td>
                    <td className="sag hucre-tutar">{sureGoster(s.ortalama)}</td>
                    {asamali && (
                      <td className="sag">
                        {s.ortalamaBekleme ? sureGoster(s.ortalamaBekleme) : "—"}
                      </td>
                    )}
                    {asamali && (
                      <td className="sag">
                        {s.ortalamaHazirlik ? sureGoster(s.ortalamaHazirlik) : "—"}
                      </td>
                    )}
                    <td className="sag">{sureGoster(s.enUzun)}</td>
                    <td className="sag">{s.geciken || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Personel({ ozet }: { ozet: PersonelOzeti }) {
  const { kutu, boy } = useKutuBoyu(ozet.satirlar.length);
  const [sira, setSira] = useState<{ alan: PersonelAlani; artan: boolean }>({
    alan: "ciro",
    artan: false,
  });
  const [arama, setArama] = useState("");

  const satirlar = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    const liste = ozet.satirlar.filter(
      (s) => !ara || s.ad.toLocaleLowerCase("tr").includes(ara)
    );
    const yon = sira.artan ? 1 : -1;
    const alan = sira.alan === "pay" ? "ciro" : sira.alan;
    return liste.sort((a, b) =>
      alan === "ad"
        ? a.ad.localeCompare(b.ad, "tr") * yon
        : (Number(a[alan]) - Number(b[alan])) * yon
    );
  }, [ozet.satirlar, sira, arama]);

  const sirala = (alan: PersonelAlani) =>
    setSira((s) => (s.alan === alan ? { alan, artan: !s.artan } : { alan, artan: alan === "ad" }));

  if (ozet.satirlar.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <Users size={30} />
          <p>Bu dönemde kapanmış adisyon yok.</p>
        </div>
      </section>
    );
  }

  const topla = (alan: (s: PersonelSatiri) => number) =>
    satirlar.reduce((t, s) => t + alan(s), 0);

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <Users size={15} /> Satış yapan
            </span>
            <strong>{ozet.kisi}</strong>
            <em>kişi</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Satılan</span>
            <strong>{sayiGoster(ozet.adet)}</strong>
            <em>adet ürün</em>
          </div>
          <div className="serit-sayi serit-toplam">
            <span className="serit-etiket">Kişi başı ciro</span>
            <strong>{paraGoster(ozet.kisi ? ozet.ciro / ozet.kisi : 0)}</strong>
            <em>ortalama</em>
          </div>
        </div>
      </section>

      <section className="ayar-bolum">
        <div className="ayar-bolum-ust">
          <h2>
            <TrendingUp size={17} /> Ciro dağılımı
          </h2>
        </div>
        <Dagilim
          satirlar={ozet.satirlar
            .filter((s) => s.ciro > 0)
            .map((s) => ({ ad: s.ad, tutar: s.ciro, adet: s.adisyon }))}
          toplam={ozet.ciro}
          birim="adisyon"
        />
      </section>

      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>
            <Users size={17} /> {satirlar.length} kişi
          </h2>
          <AramaKutusu deger={arama} degistir={setArama} yer="Personel ara" />
        </div>

        <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
          <table className="analiz-tablo urun-tablo">
            <thead>
              <tr>
                <SiraBaslik alan="ad" ad="Personel" sira={sira} sirala={sirala} />
                <SiraBaslik alan="acilan" ad="Açtığı masa" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="adisyon" ad="Satış yaptığı" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="adet" ad="Ürün" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="ciro" ad="Ciro" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="pay" ad="Pay" orta sira={sira} sirala={sirala} />
                <SiraBaslik alan="ikram" ad="İkram" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="iptal" ad="İptal" sag sira={sira} sirala={sirala} />
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr className="tablo-bos-satir">
                  <td colSpan={8}>Aramayla eşleşen kişi yok.</td>
                </tr>
              ) : (
                satirlar.map((s) => {
                  const pay = ozet.ciro > 0 ? (s.ciro / ozet.ciro) * 100 : 0;
                  return (
                    <tr key={s.anahtar}>
                      <td className="hucre-urun">{s.ad}</td>
                      <td className="sag">{s.acilan || "—"}</td>
                      <td className="sag">{s.adisyon || "—"}</td>
                      <td className="sag">{s.adet ? sayiGoster(s.adet) : "—"}</td>
                      <td className="sag hucre-tutar">{paraGoster(s.ciro)}</td>
                      <td className="hucre-pay">
                        <PayCubugu pay={pay} />
                      </td>
                      <td className="sag">{s.ikram ? paraGoster(s.ikram) : "—"}</td>
                      <td className="sag">{s.iptal ? paraGoster(s.iptal) : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Toplam</td>
                <td className="sag">{topla((s) => s.acilan) || "—"}</td>
                <td className="sag">{topla((s) => s.adisyon) || "—"}</td>
                <td className="sag">{sayiGoster(topla((s) => s.adet))}</td>
                <td className="sag hucre-tutar">{paraGoster(topla((s) => s.ciro))}</td>
                <td />
                <td className="sag">
                  {topla((s) => s.ikram) ? paraGoster(topla((s) => s.ikram)) : "—"}
                </td>
                <td className="sag">
                  {topla((s) => s.iptal) ? paraGoster(topla((s) => s.iptal)) : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

type GiderAlani = "zaman" | "tipAd" | "aciklama" | "odemeTipi" | "kisi" | "tutar";

function Giderler({
  giderler,
  ozet,
  ciro,
}: {
  giderler: Masraf[];
  ozet: GiderOzeti;
  ciro: number;
}) {
  const { kutu, boy } = useKutuBoyu(giderler.length);
  const [sira, setSira] = useState<{ alan: GiderAlani; artan: boolean }>({
    alan: "zaman",
    artan: false,
  });
  const [arama, setArama] = useState("");

  const satirlar = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    const liste = giderler.filter(
      (g) =>
        !ara ||
        `${g.tipAd} ${g.aciklama} ${g.kisi}`.toLocaleLowerCase("tr").includes(ara)
    );
    const yon = sira.artan ? 1 : -1;
    return liste.sort((a, b) => {
      if (sira.alan === "tutar") return (a.tutar - b.tutar) * yon;
      if (sira.alan === "zaman") return (+new Date(a.zaman) - +new Date(b.zaman)) * yon;
      const metin = (g: Masraf) =>
        sira.alan === "odemeTipi" ? odemeAdi(g.odemeTipi) : String(g[sira.alan]);
      return metin(a).localeCompare(metin(b), "tr") * yon;
    });
  }, [giderler, sira, arama]);

  const sirala = (alan: GiderAlani) =>
    setSira((s) =>
      s.alan === alan
        ? { alan, artan: !s.artan }
        : { alan, artan: alan !== "tutar" && alan !== "zaman" }
    );

  if (giderler.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <Wallet size={30} />
          <p>Bu dönemde gider kaydı yok.</p>
        </div>
      </section>
    );
  }

  // Giderin ciroya oranı: tek başına tutar değil, "kazandığımızın ne kadarı
  // gitti" sorusunun cevabı işletmecinin bakmak istediği sayı.
  const oran = ciro > 0 ? (ozet.toplam / ciro) * 100 : 0;
  const toplam = satirlar.reduce((t, g) => t + g.tutar, 0);

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <Wallet size={15} /> Toplam gider
            </span>
            <strong>{paraGoster(ozet.toplam)}</strong>
            <em>{ozet.kayit} kayıt</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Dönemin cirosu</span>
            <strong>{paraGoster(ciro)}</strong>
            <em>kapanan hesaplar</em>
          </div>
          <div className="serit-sayi serit-toplam">
            <span className="serit-etiket">Cironun</span>
            <strong>%{oran < 10 && oran > 0 ? oran.toFixed(1) : Math.round(oran)}</strong>
            <em>gidere gitti</em>
          </div>
        </div>
      </section>

      <div className="analiz-ikili">
        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <Layers size={17} /> Gider türü
            </h2>
          </div>
          <Dagilim satirlar={ozet.turler} toplam={ozet.toplam} birim="kayıt" />
        </section>

        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <CreditCard size={17} /> Ödeme tipi
            </h2>
          </div>
          <Dagilim satirlar={ozet.odemeler} toplam={ozet.toplam} birim="kayıt" />
        </section>
      </div>

      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>
            <Wallet size={17} /> {satirlar.length} gider
          </h2>
          <AramaKutusu deger={arama} degistir={setArama} yer="Tür, açıklama, kişi" />
        </div>

        <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
          <table className="analiz-tablo urun-tablo">
            <thead>
              <tr>
                <SiraBaslik alan="zaman" ad="Tarih" sira={sira} sirala={sirala} />
                <SiraBaslik alan="tipAd" ad="Tür" sira={sira} sirala={sirala} />
                <SiraBaslik alan="aciklama" ad="Açıklama" sira={sira} sirala={sirala} />
                <SiraBaslik alan="odemeTipi" ad="Ödeme" sira={sira} sirala={sirala} />
                <SiraBaslik alan="kisi" ad="Kaydeden" sira={sira} sirala={sirala} />
                <SiraBaslik alan="tutar" ad="Tutar" sag sira={sira} sirala={sirala} />
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr className="tablo-bos-satir">
                  <td colSpan={6}>Aramayla eşleşen gider yok.</td>
                </tr>
              ) : (
                satirlar.map((g) => (
                  <tr key={g.id}>
                    <td>{zamanMetni(g.zaman)}</td>
                    <td className="hucre-urun">{g.tipAd}</td>
                    <td className="hucre-aciklama">{g.aciklama || "—"}</td>
                    <td>{odemeAdi(g.odemeTipi)}</td>
                    <td>{g.kisi || "—"}</td>
                    <td className="sag hucre-tutar">{paraGoster(g.tutar)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Toplam</td>
                <td className="sag hucre-tutar">{paraGoster(toplam)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Adet kesirli olabiliyor (yarım porsiyon, 1/n bölüşme); tam sayıda sıfır artığı yok. */
const sayiGoster = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

/** Ödeme ve sipariş tipi aynı desende: ad, tutar ve payı gösteren şerit. */
function Dagilim({
  satirlar,
  toplam,
  birim = "işlem",
}: {
  satirlar: { ad: string; tutar: number; adet: number }[];
  toplam: number;
  birim?: string;
}) {
  return (
    <ul className="analiz-dagilim">
      {satirlar.map((s) => {
        const pay = toplam > 0 ? Math.round((s.tutar / toplam) * 100) : 0;
        return (
          <li key={s.ad}>
            <span className="dagilim-ad">
              {s.ad}
              <em>
                {sayiGoster(s.adet)} {birim}
              </em>
            </span>
            <span className="dagilim-cubuk">
              <i style={{ width: `${Math.min(100, pay)}%` }} />
            </span>
            <span className="dagilim-tutar">
              {paraGoster(s.tutar)}
              <em>%{pay}</em>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Günün hangi saatinde ne kadar satıldığı. Boş saatler listeden düşüyor —
 * kapalıyken geçen sekiz saat grafiğin yarısını yutmasın.
 */
function Saatler({ saatler }: { saatler: { saat: number; tutar: number; adet: number }[] }) {
  // Kasa gününün tamamı çiziliyor. Önce ilk satıştan son satışa kırpılıyordu;
  // işletmenin günü 08:00'de başlasa bile grafik "21 – 06" gibi bir aralık
  // gösteriyor, günün neresinde olduğun anlaşılmıyordu. Sessiz geçen saat de
  // bilgidir: hangi saatlerde iş olmadığı ancak boş saat görününce okunuyor.
  if (saatler.every((s) => s.tutar === 0)) {
    return (
      <div className="ayar-bos">
        <BarChart3 size={30} />
        <p>Bu dönemde kapanmış adisyon yok.</p>
      </div>
    );
  }

  return (
    <CizgiGrafik
      noktalar={saatler.map((s) => ({
        etiket: String(s.saat).padStart(2, "0"),
        baslik: `${String(s.saat).padStart(2, "0")}:00 – ${String((s.saat + 1) % 24).padStart(2, "0")}:00`,
        tutar: s.tutar,
        adet: s.adet,
      }))}
    />
  );
}

type DenetimAlani = "zaman" | "kisi" | "islemAd" | "yer" | "konu" | "tutar";

/**
 * Denetim defteri: hassas işlemlerin listesi. Diğer sekmelerle aynı desen —
 * üstte şerit, altında başlıktan sıralanan tablo ve sekmenin kendi araması.
 */
function Denetim({ kayitlar }: { kayitlar: DenetimSatiri[] }) {
  const { kutu, boy } = useKutuBoyu(kayitlar.length);
  const [sira, setSira] = useState<{ alan: DenetimAlani; artan: boolean }>({
    alan: "zaman",
    artan: false,
  });
  const [arama, setArama] = useState("");
  const [islem, setIslem] = useState("");

  const turler = useMemo(() => {
    const sayac = new Map<string, { ad: string; adet: number }>();
    for (const k of kayitlar) {
      const dilim = sayac.get(k.islem) ?? { ad: k.islemAd, adet: 0 };
      dilim.adet += 1;
      sayac.set(k.islem, dilim);
    }
    return [...sayac].map(([kod, d]) => ({ kod, ...d })).sort((a, b) => b.adet - a.adet);
  }, [kayitlar]);

  const satirlar = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    const liste = kayitlar.filter(
      (k) =>
        (!islem || k.islem === islem) &&
        (!ara ||
          `${k.kisi} ${k.islemAd} ${k.yer} ${k.konu} ${k.sebep}`
            .toLocaleLowerCase("tr")
            .includes(ara))
    );
    const yon = sira.artan ? 1 : -1;
    return [...liste].sort((a, b) => {
      if (sira.alan === "tutar") return (a.tutar - b.tutar) * yon;
      if (sira.alan === "zaman") return (+new Date(a.zaman) - +new Date(b.zaman)) * yon;
      return String(a[sira.alan]).localeCompare(String(b[sira.alan]), "tr") * yon;
    });
  }, [kayitlar, sira, arama, islem]);

  const sirala = (alan: DenetimAlani) =>
    setSira((s) =>
      s.alan === alan
        ? { alan, artan: !s.artan }
        : { alan, artan: alan !== "tutar" && alan !== "zaman" }
    );

  if (kayitlar.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <ShieldCheck size={30} />
          <p>Bu dönemde denetim kaydı yok.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <ShieldCheck size={15} /> Toplam işlem
            </span>
            <strong>{kayitlar.length}</strong>
            <em>kayıt</em>
          </div>
          {turler.slice(0, 3).map((t) => (
            <div key={t.kod} className="serit-sayi">
              <span className="serit-etiket">{t.ad}</span>
              <strong>{t.adet}</strong>
              <em>kayıt</em>
            </div>
          ))}
        </div>
      </section>

      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>
            <ShieldCheck size={17} /> {satirlar.length} işlem
          </h2>
          <div className="denetim-suzgec">
            {/* İşlem türü çip olarak duruyor: "sadece iptaller" en çok sorulan
                soru, her seferinde arama kutusuna yazmak gerekmesin. */}
            <div className="denetim-turler">
              <button className={islem ? "" : "aktif"} onClick={() => setIslem("")}>
                Hepsi
              </button>
              {turler.map((t) => (
                <button
                  key={t.kod}
                  className={islem === t.kod ? "aktif" : ""}
                  onClick={() => setIslem(islem === t.kod ? "" : t.kod)}
                >
                  {t.ad}
                </button>
              ))}
            </div>
            <AramaKutusu deger={arama} degistir={setArama} yer="Kişi, ürün, sebep" />
          </div>
        </div>

        <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
          <table className="analiz-tablo urun-tablo">
            <thead>
              <tr>
                <SiraBaslik alan="zaman" ad="Tarih" sira={sira} sirala={sirala} />
                <SiraBaslik alan="kisi" ad="Kim" sira={sira} sirala={sirala} />
                <SiraBaslik alan="islemAd" ad="İşlem" sira={sira} sirala={sirala} />
                <SiraBaslik alan="yer" ad="Yer" sira={sira} sirala={sirala} />
                <SiraBaslik alan="konu" ad="Konu" sira={sira} sirala={sirala} />
                <th>Sebep</th>
                <SiraBaslik alan="tutar" ad="Tutar" sag sira={sira} sirala={sirala} />
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr className="tablo-bos-satir">
                  <td colSpan={7}>Aramayla eşleşen kayıt yok.</td>
                </tr>
              ) : (
                satirlar.map((k) => (
                  <tr key={k.id}>
                    <td>{zamanMetni(k.zaman)}</td>
                    <td>{k.kisi}</td>
                    <td className="hucre-urun">{k.islemAd}</td>
                    <td>{k.yer || "—"}</td>
                    <td className="hucre-urun">
                      {k.konu || "—"}
                      {k.adet ? <em className="denetim-adet"> × {k.adet}</em> : null}
                    </td>
                    <td className="hucre-aciklama">{k.sebep || "—"}</td>
                    <td className="sag hucre-tutar">{paraGoster(k.tutar)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/**
 * İkramların kime gittiği. Kişi satırına basınca hangi üründen kaç adet
 * ikram edildiği açılıyor — "ayda 300 lira çay ikramı" satırının altında ne
 * olduğu görünmezse rakam bir şey anlatmıyor.
 */
function OdenmezDokumu({ satirlar }: { satirlar: OdenmezSatiri[] }) {
  const { kutu, boy } = useKutuBoyu(satirlar.length);
  const [acik, setAcik] = useState<string | null>(null);

  if (satirlar.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <Gift size={30} />
          <p>Bu dönemde ikram yok.</p>
        </div>
      </section>
    );
  }

  const toplam = satirlar.reduce((t, s) => t + s.tutar, 0);
  const adet = satirlar.reduce((t, s) => t + s.adet, 0);
  const belirtilmemis = satirlar.find((s) => s.ad === "Belirtilmemiş");

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <Gift size={15} /> Toplam ikram
            </span>
            <strong>{paraGoster(toplam)}</strong>
            <em>{adet} adet ürün</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Kişi sayısı</span>
            <strong>{satirlar.filter((s) => s.ad !== "Belirtilmemiş").length}</strong>
            <em>adına yazıldı</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Belirtilmemiş</span>
            <strong>{paraGoster(belirtilmemis?.tutar ?? 0)}</strong>
            <em>kime yazıldığı yok</em>
          </div>
        </div>
      </section>

      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>Kime yazıldı</h2>
        </div>

        <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
          <table className="analiz-tablo urun-tablo">
            <thead>
              <tr>
                <th>Kişi</th>
                <th className="orta">Ürün adedi</th>
                <th className="sag">Tutar</th>
                <th className="sag">Pay</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s) => (
                <Fragment key={s.ad}>
                  <tr
                    className="tiklanir"
                    onClick={() => setAcik(acik === s.ad ? null : s.ad)}
                  >
                    <td>
                      <ChevronRight
                        size={14}
                        className={acik === s.ad ? "dokum-ok acik" : "dokum-ok"}
                      />
                      {s.ad}
                    </td>
                    <td className="orta">{s.adet}</td>
                    <td className="sag">{paraGoster(s.tutar)}</td>
                    <td className="sag">
                      {toplam > 0 ? `%${Math.round((s.tutar / toplam) * 100)}` : "—"}
                    </td>
                  </tr>

                  {acik === s.ad &&
                    s.urunler.map((u) => (
                      <tr key={u.ad} className="dokum-alt">
                        <td colSpan={2}>{u.ad}</td>
                        <td className="orta">{u.adet}</td>
                        <td className="sag">{paraGoster(u.tutar)}</td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/**
 * Açık Hesap Hareketleri. Adisyo'daki gibi iki ayrı tablo: hesaba yazılan
 * borçlar ve müşterilerden alınan tahsilatlar. Tek listede karışınca "bugün
 * ne kadar veresiye verdik, ne kadar topladık" sorusu okunmuyordu.
 */
function AcikHesap({ hareketler }: { hareketler: CariHareketSatiri[] }) {
  const { kutu, boy } = useKutuBoyu(hareketler.length);
  const borclar = hareketler.filter((h) => h.borc > 0);
  const tahsilatlar = hareketler.filter((h) => h.alacak > 0);

  const toplamBorc = borclar.reduce((t, h) => t + h.borc, 0);
  const toplamTahsilat = tahsilatlar.reduce((t, h) => t + h.alacak, 0);

  if (hareketler.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <ClipboardList size={30} />
          <p>Bu dönemde açık hesap hareketi yok.</p>
        </div>
      </section>
    );
  }

  const tablo = (
    liste: CariHareketSatiri[],
    baslik: string,
    tutarBasligi: string,
    tutar: (h: CariHareketSatiri) => number
  ) => (
    <section className="ayar-bolum">
      <div className="analiz-liste-ust">
        <h2>{baslik}</h2>
      </div>
      {liste.length === 0 ? (
        <div className="ayar-bos">
          <p>Bu dönemde kayıt yok.</p>
        </div>
      ) : (
        <div className="tablo-kaydir tablo-kaydir-dikey" ref={kutu} style={{ maxHeight: boy || undefined }}>
          <table className="analiz-tablo urun-tablo">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Açıklama</th>
                <th>İşlemi yapan</th>
                <th className="sag">{tutarBasligi}</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((h) => (
                <tr key={h.id}>
                  <td>{zamanMetni(h.zaman)}</td>
                  <td>
                    {h.musteri}
                    {h.musteriNo ? <small> #{h.musteriNo}</small> : null}
                  </td>
                  <td>
                    {h.adisyonId
                      ? `Adisyon #${h.adisyonId}`
                      : h.aciklama || h.odemeTipi || "—"}
                  </td>
                  <td>{kisaAd(h.kisi) || "—"}</td>
                  <td className="sag">{paraGoster(tutar(h))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="analiz-ozet">
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">Hesaba yazılan</span>
            <strong>{paraGoster(toplamBorc)}</strong>
            <em>{borclar.length} işlem</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Tahsil edilen</span>
            <strong>{paraGoster(toplamTahsilat)}</strong>
            <em>{tahsilatlar.length} işlem</em>
          </div>
          <div className="serit-sayi">
            <span className="serit-etiket">Dönem farkı</span>
            <strong>{paraGoster(toplamBorc - toplamTahsilat)}</strong>
            <em>alacak artışı</em>
          </div>
        </div>
      </section>

      {tablo(borclar, "Borç hareketleri", "Borç", (h) => h.borc)}
      {tablo(tahsilatlar, "Tahsilat hareketleri", "Tahsilat", (h) => h.alacak)}
    </div>
  );
}

// Sekme iskeleti duruyor ama içeriği henüz yok; boş ekran bırakmak yerine ne
// geleceği yazılıyor — kullanıcı yanlış yere geldiğini sanmasın.
const ACIKLAMALAR: Record<string, { ad: string; metin: string }> = {};

function Yapiliyor({ bolum }: { bolum: string }) {
  const bilgi = ACIKLAMALAR[bolum];
  return (
    <section className="ayar-bolum">
      <div className="ayar-bos">
        <ClipboardList size={30} />
        <p>
          <strong>{bilgi?.ad ?? "Bu bölüm"}</strong> hazırlanıyor.
          {bilgi ? ` ${bilgi.metin}` : ""}
        </p>
      </div>
    </section>
  );
}
