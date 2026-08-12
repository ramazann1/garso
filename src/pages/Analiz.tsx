import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Layers,
  Package,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Duzen, { analizBolumleri } from "../components/Duzen";
import AnalizFiltre from "../components/AnalizFiltre";
import AramaKutusu from "../components/AramaKutusu";
import AdisyonDetay from "../components/AdisyonDetay";
import { yolaGirebilir } from "../rotaYetkileri";
import { paraGoster } from "../para";
import { ayarlar } from "../isletmeAyarlari";
import {
  BOS_FILTRE,
  analizAdisyonlari,
  analizDenetimi,
  analizGiderleri,
  analizGiderOzeti,
  analizOzeti,
  analizPersoneli,
  analizUrunleri,
  urunKategorileri,
  tamamiIkram,
  type AnalizAdisyon,
  type AnalizFiltre as Filtre,
  type AnalizOzeti,
  type DenetimSatiri,
  type GiderOzeti,
  type PersonelOzeti,
  type PersonelSatiri,
  type UrunKategorisi,
  type UrunOzeti,
  type UrunSatiri,
} from "../analiz";
import { odemeAdi, type Masraf } from "../masraflar";

export default function Analiz() {
  const { bolum = "ozet" } = useParams();
  const navigate = useNavigate();

  const [filtre, setFiltre] = useState<Filtre>(BOS_FILTRE);
  const [adisyonlar, setAdisyonlar] = useState<AnalizAdisyon[]>([]);
  const [giderler, setGiderler] = useState<Masraf[]>([]);
  const [denetim, setDenetim] = useState<DenetimSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState<number | null>(null);
  // Adisyon yeniden açılınca liste eskiyor; sayaç değişince sorgu tekrarlanıyor.
  const [tazele, setTazele] = useState(0);
  // Özetteki eksik tahsilat satırından gelindiğinde liste o hesaplara daralıyor.
  const [sadeceEksik, setSadeceEksik] = useState(false);
  // Ürün → kategori eşlemesi filtreden bağımsız; bir kez çekilip saklanıyor.
  const [kategoriler, setKategoriler] = useState(new Map<number, UrunKategorisi>());

  useEffect(() => {
    urunKategorileri().then(setKategoriler);
  }, []);

  // Filtre değişince tek sorgu atılıyor; altı sekme de aynı listeden besleniyor.
  useEffect(() => {
    let gecerli = true;
    setYukleniyor(true);
    Promise.all([analizAdisyonlari(filtre), analizGiderleri(filtre), analizDenetimi(filtre)]).then(
      ([a, g, d]) => {
        if (!gecerli) return;
        setAdisyonlar(a);
        setGiderler(g);
        setDenetim(d);
        setYukleniyor(false);
      }
    );
    return () => {
      gecerli = false;
    };
  }, [filtre, tazele]);

  const ozet = useMemo(() => analizOzeti(adisyonlar, giderler), [adisyonlar, giderler]);
  const urunler = useMemo(
    () => analizUrunleri(adisyonlar, kategoriler),
    [adisyonlar, kategoriler]
  );
  const personel = useMemo(() => analizPersoneli(adisyonlar), [adisyonlar]);
  const giderOzeti = useMemo(() => analizGiderOzeti(giderler), [giderler]);

  return (
    <Duzen>
      <div className="sayfa analiz-sayfa">
        <header className="menu-baslik">
          <div className="ayar-baslik-ust">
            <h1>Analiz</h1>
          </div>
          <div className="ms-sekmeler">
            {analizBolumleri
              .filter((b) => yolaGirebilir(b.yol))
              .map((b) => (
                <button
                  key={b.yol}
                  className={b.yol === `/analiz/${bolum}` ? "aktif" : ""}
                  onClick={() => navigate(b.yol)}
                >
                  {b.ad}
                </button>
              ))}
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
            onEksigeGit={() => {
              setSadeceEksik(true);
              navigate("/analiz/adisyonlar");
            }}
          />
        ) : bolum === "adisyonlar" ? (
          <Adisyonlar
            adisyonlar={adisyonlar}
            onSec={setSecili}
            sadeceEksik={sadeceEksik}
            onEksigiBirak={() => setSadeceEksik(false)}
          />
        ) : bolum === "urunler" ? (
          <Urunler ozet={urunler} />
        ) : bolum === "personel" ? (
          <Personel ozet={personel} />
        ) : bolum === "giderler" ? (
          <Giderler giderler={giderler} ozet={giderOzeti} ciro={ozet.ciro} />
        ) : bolum === "denetim" ? (
          <Denetim kayitlar={denetim} />
        ) : (
          <Yapiliyor bolum={bolum} />
        )}
      </div>

      {secili && (
        <AdisyonDetay
          adisyonId={secili}
          onKapat={() => setSecili(null)}
          onDegisti={() => setTazele((s) => s + 1)}
        />
      )}
    </Duzen>
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

  return (
    <section className="ayar-bolum">
      <div className="analiz-liste-ust">
        <h2>
          <ClipboardList size={17} /> {adisyonlar.length} adisyon
        </h2>
        {sadeceEksik && <EksikCipi onBirak={onEksigiBirak} />}
        <AramaKutusu deger={arama} degistir={setArama} yer="Adisyon no, masa, müşteri" />
      </div>

      <div className="tablo-kaydir">
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
              <SiraBaslik alan="indirim" ad="İndirim" sag sira={sira} sirala={sirala} />
              <SiraBaslik alan="bahsis" ad="Bahşiş" sag sira={sira} sirala={sirala} />
              <SiraBaslik alan="toplam" ad="Tutar" sag sira={sira} sirala={sirala} />
            </tr>
          </thead>
          <tbody>
            {adisyonlar.map((a) => (
              <tr key={a.id} onClick={() => onSec(a.id)}>
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
                <td>{tahsilatMetni(a)}</td>
                <td className="sag">{a.indirim ? paraGoster(a.indirim) : "—"}</td>
                <td className="sag">{a.bahsis ? paraGoster(a.bahsis) : "—"}</td>
                <td className="sag hucre-tutar">{paraGoster(a.toplam)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9}>Toplam</td>
              <td className="sag">{paraGoster(topla((a) => a.indirim))}</td>
              <td className="sag">{paraGoster(topla((a) => a.bahsis))}</td>
              <td className="sag hucre-tutar">{paraGoster(topla((a) => a.toplam))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

const zamanMetni = (t: string) => `${gunMetni(t)} ${saatMetni(t)}`;

/** Özetten daraltarak gelindiğini gösteren, tek tıkla bırakılan çip. */
function EksikCipi({ onBirak }: { onBirak: () => void }) {
  return (
    <button type="button" className="analiz-cip-eksik" onClick={onBirak}>
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

function Ozet({ ozet, onEksigeGit }: { ozet: AnalizOzeti; onEksigeGit: () => void }) {
  const kdvDahil = ayarlar().kdvDahil;

  return (
    <div className="analiz-ozet">
      {/*
        Şeridin okunuşu bir toplama işlemi: kapanan ciro + açık masalar = toplam.
        Açık masa yoksa tek sayı kalıyor; "₺0,00 açık" göstermek gereksiz gürültü.
      */}
      <section className="ozet-serit">
        <div className="serit-satir">
          <div className="serit-sayi">
            <span className="serit-etiket">
              <TrendingUp size={15} /> Kapanan ciro
            </span>
            <strong>{paraGoster(ozet.ciro)}</strong>
            <em>{ozet.adisyon} adisyon</em>
          </div>

          {ozet.acik > 0 && (
            <>
              <span className="serit-islem">+</span>
              <div className="serit-sayi serit-acik">
                <span className="serit-etiket">
                  <DoorOpen size={15} /> Açık masalar
                </span>
                <strong>{paraGoster(ozet.acikTutar)}</strong>
                <em>{ozet.acik} hesap sürüyor</em>
              </div>

              <span className="serit-islem">=</span>
              <div className="serit-sayi serit-toplam">
                <span className="serit-etiket">Toplam</span>
                <strong>{paraGoster(ozet.toplamIs)}</strong>
                <em>günün işi</em>
              </div>
            </>
          )}
        </div>

        {/* Ciroyu tarif eden yardımcı sayılar; ayrı kart açmaya değmeyecek kadar kısa. */}
        <dl className="serit-kunye">
          <div>
            <dt>Ortalama adisyon</dt>
            <dd>{paraGoster(ozet.ortalama)}</dd>
          </div>
          <div>
            <dt>Misafir</dt>
            <dd>{ozet.misafir || "—"}</dd>
          </div>
          <div>
            <dt>Kişi başı</dt>
            <dd>{ozet.kisiBasi ? paraGoster(ozet.kisiBasi) : "—"}</dd>
          </div>
          <div>
            <dt>Gider</dt>
            <dd className={ozet.gider ? "azalan" : ""}>
              {ozet.gider ? `−${paraGoster(ozet.gider)}` : "—"}
            </dd>
          </div>
          <div className="kunye-net">
            <dt>Kasaya kalan</dt>
            <dd>{paraGoster(ozet.net)}</dd>
          </div>
        </dl>
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
            <Dagilim satirlar={ozet.odemeler} toplam={ozet.ciro} />
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

      {/* Saat grafiği yarım sütuna sıkışınca çubuklar okunmuyordu; tam genişlikte. */}
      <section className="ayar-bolum">
        <div className="ayar-bolum-ust">
          <h2>
            <BarChart3 size={17} /> Saatlere göre
          </h2>
        </div>
        <Saatler saatler={ozet.saatler} />
      </section>
    </div>
  );
}

/** "pay" ayrı bir sütun ama sıralaması ciroyla aynı — payı belirleyen ciro. */
type UrunAlani = "ad" | "kategoriAd" | "miktar" | "ciro" | "pay" | "ikram" | "iptal";
type Sira = { alan: UrunAlani; artan: boolean };

/** Metin alanı A'dan Z'ye, sayı alanı büyükten küçüğe açılıyor — beklenen yön o. */
const metinAlani = (alan: UrunAlani) => alan === "ad" || alan === "kategoriAd";

function Urunler({ ozet }: { ozet: UrunOzeti }) {
  const [sira, setSira] = useState<Sira>({ alan: "ciro", artan: false });
  const [arama, setArama] = useState("");
  const [kategoriArama, setKategoriArama] = useState("");

  // İki kutu iki ayrı listeyi süzüyor: kategori kartı ile ürün tablosu birbirini
  // etkilemiyor, aynı ekranda iki farklı soru sorulabiliyor.
  const kategoriler = useMemo(() => {
    const ara = kategoriArama.trim().toLocaleLowerCase("tr");
    if (!ara) return ozet.kategoriler;
    return ozet.kategoriler.filter((k) => k.ad.toLocaleLowerCase("tr").includes(ara));
  }, [ozet.kategoriler, kategoriArama]);

  const satirlar = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    const liste = ozet.satirlar.filter(
      (s) => !ara || s.ad.toLocaleLowerCase("tr").includes(ara)
    );

    const yon = sira.artan ? 1 : -1;
    const alan = sira.alan === "pay" ? "ciro" : sira.alan;
    return liste.sort((a, b) => {
      if (metinAlani(alan)) {
        return String(a[alan]).localeCompare(String(b[alan]), "tr") * yon;
      }
      return (Number(a[alan]) - Number(b[alan])) * yon;
    });
  }, [ozet.satirlar, sira, arama]);

  const sirala = (alan: UrunAlani) =>
    setSira((s) =>
      s.alan === alan ? { alan, artan: !s.artan } : { alan, artan: metinAlani(alan) }
    );

  const topla = (alan: (s: UrunSatiri) => number) =>
    satirlar.reduce((t, s) => t + alan(s), 0);

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
            <em>{ozet.ikram > 0 ? `${paraGoster(ozet.ikram)} ikram hariç` : "indirim düşülmüş"}</em>
          </div>
        </div>
      </section>

      <section className="ayar-bolum">
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
          <KategoriDagilimi satirlar={kategoriler} toplam={ozet.ciro} />
        )}
      </section>

      <section className="ayar-bolum">
        <div className="analiz-liste-ust">
          <h2>
            <Package size={17} /> {satirlar.length} ürün
          </h2>
          <AramaKutusu deger={arama} degistir={setArama} yer="Ürün ara" />
        </div>

        <div className="tablo-kaydir">
          <table className="analiz-tablo urun-tablo">
            <thead>
              <tr>
                <SiraBaslik alan="ad" ad="Ürün" sira={sira} sirala={sirala} />
                <SiraBaslik alan="kategoriAd" ad="Kategori" sira={sira} sirala={sirala} />
                <SiraBaslik alan="miktar" ad="Miktar" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="ciro" ad="Ciro" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="pay" ad="Pay" orta sira={sira} sirala={sirala} />
                <SiraBaslik alan="ikram" ad="İkram" sag sira={sira} sirala={sirala} />
                <SiraBaslik alan="iptal" ad="İptal" sag sira={sira} sirala={sirala} />
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr className="tablo-bos-satir">
                  <td colSpan={7}>Aramayla eşleşen ürün yok.</td>
                </tr>
              ) : (
                satirlar.map((s) => (
                  <UrunSatir key={s.anahtar} satir={s} toplam={ozet.ciro} />
                ))
              )}
            </tbody>
            {/* Toplam listede görünenin toplamı; arama daraltınca alt satır da daralıyor. */}
            <tfoot>
              <tr>
                <td colSpan={2}>Toplam</td>
                <td className="sag">{sayiGoster(topla((s) => s.miktar))}</td>
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

function UrunSatir({ satir, toplam }: { satir: UrunSatiri; toplam: number }) {
  const pay = toplam > 0 ? (satir.ciro / toplam) * 100 : 0;

  return (
    <tr>
      <td className="hucre-urun">{satir.ad}</td>
      <td>
        <span className="urun-kategori">
          <i style={{ background: satir.kategoriRenk || "#d9cbb8" }} />
          {satir.kategoriAd}
        </span>
      </td>
      <td className="sag">{satir.miktar ? sayiGoster(satir.miktar) : "—"}</td>
      <td className="sag hucre-tutar">{paraGoster(satir.ciro)}</td>
      {/* Payı satırın içinde çubukla göstermek, ayrı bir yüzde sütunundan hem
          daha hızlı okunuyor hem sıralamayı gözle doğrulatıyor. */}
      <td className="hucre-pay">
        <PayCubugu pay={pay} />
      </td>
      <td className="sag">{satir.ikram ? paraGoster(satir.ikram) : "—"}</td>
      <td className="sag">{satir.iptal ? paraGoster(satir.iptal) : "—"}</td>
    </tr>
  );
}

type PersonelAlani = "ad" | "acilan" | "adisyon" | "adet" | "ciro" | "pay" | "ikram" | "iptal";

function Personel({ ozet }: { ozet: PersonelOzeti }) {
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

        <div className="tablo-kaydir">
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

        <div className="tablo-kaydir">
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

/** Kategori kendi rengiyle çıkıyor — menüde zaten kullanıcının verdiği renk. */
function KategoriDagilimi({
  satirlar,
  toplam,
}: {
  satirlar: { ad: string; tutar: number; adet: number; renk?: string }[];
  toplam: number;
}) {
  return (
    <ul className="analiz-dagilim kategori-dagilim">
      {satirlar.map((s) => {
        const pay = toplam > 0 ? Math.round((s.tutar / toplam) * 100) : 0;
        return (
          <li key={s.ad}>
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
  const dolu = saatler.filter((s) => s.tutar > 0);
  if (dolu.length === 0) {
    return (
      <div className="ayar-bos">
        <BarChart3 size={30} />
        <p>Bu dönemde kapanmış adisyon yok.</p>
      </div>
    );
  }

  const enBuyuk = Math.max(...dolu.map((s) => s.tutar));
  return (
    <div className="analiz-saatler">
      {dolu.map((s) => (
        <div key={s.saat} className="analiz-saat" title={`${s.adet} adisyon`}>
          <span className="saat-tutar">{paraGoster(s.tutar)}</span>
          <i style={{ height: `${Math.max(6, (s.tutar / enBuyuk) * 100)}%` }} />
          <span className="saat-ad">{String(s.saat).padStart(2, "0")}</span>
        </div>
      ))}
    </div>
  );
}

type DenetimAlani = "zaman" | "kisi" | "islemAd" | "yer" | "konu" | "tutar";

/**
 * Denetim defteri: hassas işlemlerin listesi. Diğer sekmelerle aynı desen —
 * üstte şerit, altında başlıktan sıralanan tablo ve sekmenin kendi araması.
 */
function Denetim({ kayitlar }: { kayitlar: DenetimSatiri[] }) {
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

        <div className="tablo-kaydir">
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
