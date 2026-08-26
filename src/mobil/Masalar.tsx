import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Ban,
  Check,
  CircleCheckBig,
  CloudOff,
  CloudUpload,
  EllipsisVertical,
  Gift,
  LockKeyhole,
  Merge,
  Plus,
  Printer,
  RotateCw,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { bolgeleriGetir, durgunMu } from "../masalar";
import {
  adisyonGetir,
  adisyonIkram,
  adisyonIptal,
  adisyonKaydet,
  adisyonOzeti,
  masaBirlestir,
  masaTasi,
  tumAdisyonlar,
  type MasaOzeti,
  yeniTahsilat,
} from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { adisyonFisiYaz } from "../yazicilar";
import { yetkiVar } from "../oturum";
import OnayModal from "../components/OnayModal";
import AltSayfa from "./AltSayfa";
import OdemeTipleri from "./OdemeTipleri";
import MusteriSecici from "../components/MusteriSecici";
import { odemeTipleriniGetir, type OdemeTipi } from "../odemeTipleri";
import { bekleyenMasalar, kopyaMasalari, kuyrugaEkle, useKuyruk } from "../kuyruk";
import { hesapKopyasiOku, hesapKopyasiSil, kopyaSaati } from "../hesapKopyasi";
import { baglantiHatasi, baglantiVar, sureSinirli, useBaglanti } from "../baglanti";
import { useCanli } from "../canli";
import { devralabilir, masayiDevral, useMesguliyetler } from "../mesguliyet";
import { odenmezleriGetir, type Odenmez } from "../odenmezler";
import { paraGoster } from "../para";
import type { Bolge, Masa } from "../types";

// İkram ve iptal sebepleri denetim defterine yazılıyor; hazır seçenekler
// kasadakiyle aynı ki iki ekranın defteri aynı dille dolsun.
const IKRAM_SEBEPLERI = ["İşletme ikramı", "Müşteri şikâyeti", "Tanıtım"];

const IPTAL_SEBEPLERI = [
  "Müşteri vazgeçti",
  "Yanlış masaya girildi",
  "Sipariş verilmedi",
  "Deneme kaydı",
];

function sure(acilis?: string) {
  if (!acilis) return "";
  const dk = Math.floor((Date.now() - new Date(acilis).getTime()) / 60000);
  if (dk < 1) return "şimdi";
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

/**
 * Mobil Masalar ekranı — garsonun ana ekranı.
 *
 * Masa kartı tek bakışta cevap veriyor: adı, kalan tutarı, ne kadardır açık
 * olduğu, kaç kişi. Kartın kendisi siparişe gidiyor, sağ üstteki üç nokta
 * masanın işlemlerini açıyor. Taşıma ve birleştirme ayrı bir listede değil,
 * ızgaranın kendi üstünde seçiliyor: garson hedefi masaların yerleşiminden
 * tanıyor, listedeki adından değil.
 */
// Seçili bölge cihazda kalıyor: garson bahçeden sipariş gönderdiğinde masalara
// dönerken yine bahçeyi buluyor, her seferinde ilk bölgeden aramıyor.
const BOLGE_ANAHTAR = "mobil.bolge";

function bolgeOku(): number | null {
  const id = Number(localStorage.getItem(BOLGE_ANAHTAR));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export default function MobilMasalar() {
  const git = useNavigate();
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [adisyonlar, setAdisyonlar] = useState<Record<number, MasaOzeti>>({});
  const [seciliBolge, setSeciliBolge] = useState<number | null>(bolgeOku);
  const [mesgulSorusu, setMesgulSorusu] = useState<{ masa: Masa; ad: string } | null>(null);
  const mesguliyetler = useMesguliyetler();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [okunamadi, setOkunamadi] = useState(false);

  const [islemMasasi, setIslemMasasi] = useState<Masa | null>(null);
  // Izgara seçim modu: hangi işlem için hedef masa bekleniyor.
  const [secimModu, setSecimModu] = useState<{
    tip: "tasi" | "birlestir";
    kaynak: Masa;
    hedef?: number;
  } | null>(null);
  const [hizliMasa, setHizliMasa] = useState<{ masa: Masa; veri: AdisyonVerisi } | null>(null);
  const [iptalSorusu, setIptalSorusu] = useState<{ masa: Masa; adisyonId: number } | null>(null);
  const [ikramSorusu, setIkramSorusu] = useState<{ masa: Masa; adisyonId: number } | null>(null);
  // İkramın kime yazıldığı soruluyor; liste ekran açılırken bir kez okunuyor.
  const [odenmezler, setOdenmezler] = useState<Odenmez[]>([]);
  const [cariSorusu, setCariSorusu] = useState<string | null>(null);
  const [odemeTipleri, setOdemeTipleri] = useState<OdemeTipi[]>([]);
  const [uyari, setUyari] = useState<string | null>(null);
  const [, setTik] = useState(0);

  const oku = async () => {
    setYukleniyor(true);
    setOkunamadi(false);

    // Masa tanımları cihazdaki kopyadan da gelebiliyor; adisyonlar gelemiyor
    // (bir dakika öncesinin dolu/boş bilgisi yanlış bilgidir).
    const dene = <T,>(is: Promise<T>) => sureSinirli(is.catch(() => undefined));
    const [b, a] = await Promise.all([
      dene(bolgeleriGetir()),
      baglantiVar() ? dene(tumAdisyonlar()) : Promise.resolve(undefined),
    ]);
    setYukleniyor(false);

    if (!b) {
      setOkunamadi(true);
      return;
    }

    setBolgeler(b);
    // Cihazda bekleyen siparişler sunucudakinin üstüne biniyor: masa dolu
    // görünsün, aynı masaya ikinci hesap açılmasın.
    setAdisyonlar({ ...(baglantiVar() ? {} : kopyaMasalari()), ...(a ?? {}), ...bekleyenMasalar() });
    setSeciliBolge((s) => (b.some((x) => x.id === s) ? s : b[0]?.id ?? null));
  };

  useEffect(() => {
    if (seciliBolge !== null) localStorage.setItem(BOLGE_ANAHTAR, String(seciliBolge));
  }, [seciliBolge]);

  useEffect(() => {
    odemeTipleriniGetir().then(setOdemeTipleri);
    odenmezleriGetir().then(setOdenmezler);
  }, []);

  useEffect(() => {
    oku();
    const zaman = setInterval(() => setTik((t) => t + 1), 60000);
    return () => clearInterval(zaman);
  }, []);

  // Başka bir cihaz masaya sipariş girdiğinde ekran kendini tazeliyor: garson
  // telefonda, kasiyer bilgisayarda aynı masayı görüyor.
  useCanli(["adisyonlar", "adisyon_kalemleri", "tahsilatlar", "yazdirma_kuyrugu"], oku);

  // Kuyruk boşaldıkça ve bağlantı geri geldikçe ekran kendini tazeliyor.
  const { bekleyen } = useKuyruk();
  const oncekiBekleyen = useRef(bekleyen);
  useEffect(() => {
    if (bekleyen !== oncekiBekleyen.current) oku();
    oncekiBekleyen.current = bekleyen;
  }, [bekleyen]);

  const cevrimici = useBaglanti();
  const oncekiDurum = useRef(cevrimici);
  useEffect(() => {
    if (cevrimici && (okunamadi || !oncekiDurum.current)) oku();
    oncekiDurum.current = cevrimici;
  }, [cevrimici]);

  if (yukleniyor && bolgeler.length === 0) {
    return <div className="yukleniyor"><div className="cember" /></div>;
  }

  if (okunamadi) {
    return (
      <div className="m-bos">
        <p>Masalar yüklenemedi.</p>
        <button className="m-dugme" onClick={oku}>
          <RotateCw size={18} /> Yeniden dene
        </button>
      </div>
    );
  }

  const bolge = bolgeler.find((b) => b.id === seciliBolge);
  const masalar = (bolge?.masalar ?? []).filter((m) => m.aktif);

  // Seçim modunda taşımada boş, birleştirmede dolu masalar seçilebilir.
  const secilebilir = (m: Masa) => {
    if (!secimModu || m.id === secimModu.kaynak.id) return false;
    return secimModu.tip === "tasi" ? !adisyonlar[m.id] : !!adisyonlar[m.id];
  };

  const masayaDokun = (m: Masa) => {
    if (secimModu) {
      if (secilebilir(m)) setSecimModu({ ...secimModu, hedef: m.id });
      return;
    }
    // Masada başkası varsa doğrudan girilmiyor; kim olduğu söylenip karar
    // kişiye bırakılıyor. Engel değil uyarı: garson ekranı açık unutmuş
    // olabilir, kasiyer müşteriyi kapıda bekletmesin.
    const mesgul = mesguliyetler[m.id];
    if (mesgul) {
      setMesgulSorusu({ masa: m, ad: mesgul.ad });
      return;
    }
    git(`/mobil/siparis/${m.id}`);
  };

  const devral = async () => {
    const soru = mesgulSorusu;
    if (!soru) return;
    setMesgulSorusu(null);
    await masayiDevral(soru.masa.id).catch(() => {});
    git(`/mobil/siparis/${soru.masa.id}`);
  };

  const secimiUygula = async () => {
    if (!secimModu?.hedef) return;
    const { tip, kaynak, hedef } = secimModu;
    setSecimModu(null);
    try {
      if (tip === "tasi") await masaTasi(kaynak.id, hedef);
      else await masaBirlestir(kaynak.id, hedef);
      await oku();
    } catch (e) {
      setUyari(e instanceof Error ? e.message : "İşlem yapılamadı.");
    }
  };

  const fisYazdir = async (masa: Masa) => {
    setIslemMasasi(null);
    try {
      const veri = await adisyonGetir(masa.id);
      const adet = await adisyonFisiYaz({ ...veri, ad: veri.ad || masa.ad });
      setUyari(
        adet > 0 ? "Fiş yazdırmaya gönderildi." : "Hesap fişi basacak açık bir yazıcı tanımlı değil."
      );
    } catch {
      setUyari("Fiş yazdırmaya gönderilemedi.");
    }
  };

  const hizliOdeAc = async (masa: Masa) => {
    setIslemMasasi(null);
    // Bağlantı yokken hesap cihazdaki kopyadan açılıyor; ödeme kuyruğa girecek.
    if (!baglantiVar()) {
      const kopya = hesapKopyasiOku({ tip: "masa", masaId: masa.id });
      if (!kopya) {
        setUyari("Bağlantı yok ve bu hesabın cihazda kopyası yok, ödeme alınamıyor.");
        return;
      }
      setHizliMasa({ masa, veri: kopya.veri });
      return;
    }
    try {
      setHizliMasa({ masa, veri: await adisyonGetir(masa.id) });
    } catch {
      setUyari("Hesap okunamadı.");
    }
  };

  // Hızlı Öde: kalanın tamamı tek dokunuşla tahsil edilip hesap kapanıyor.
  // Bölme, kısmi tahsilat ve bahşiş adisyon ekranının işi.
  const hizliTahsil = async (tip: string, musteriId?: number) => {
    if (!hizliMasa) return;
    const { masa, veri } = hizliMasa;

    // Açık hesap kasaya para getirmiyor, birinin borcuna yazılıyor: kime
    // yazıldığı sorulmadan hesap kapanmaz.
    const tipi = odemeTipleri.find((t) => t.ad === tip);
    if (tipi?.acikHesap && !musteriId) {
      setCariSorusu(tip);
      return;
    }

    const kalan = Math.round(adisyonOzeti(veri).kalan * 100) / 100;
    setCariSorusu(null);
    setHizliMasa(null);

    const tam = {
      ...veri,
      tahsilatlar: [...veri.tahsilatlar, yeniTahsilat({ tip, tutar: kalan, musteriId })],
    };
    // Bağlantı yoksa ödeme kuyrukta bekliyor; masa cihazda boşalıyor.
    const kuyruga = async () => {
      kuyrugaEkle({ tip: "masa", masaId: masa.id, masaAdi: masa.ad, veri: tam, kapat: true });
      hesapKopyasiSil({ tip: "masa", masaId: masa.id });
      await oku();
    };

    if (!baglantiVar()) {
      await kuyruga();
      return;
    }
    try {
      await adisyonKaydet(masa.id, tam, true);
      await oku();
    } catch (e) {
      if (baglantiHatasi(e) || !baglantiVar()) {
        await kuyruga();
        return;
      }
      setUyari(e instanceof Error ? e.message : "Ödeme kaydedilemedi.");
    }
  };

  return (
    <>
      <header className="m-baslik">
        <h1>Masalar</h1>
        <button className="m-ikon-dugme" onClick={oku} aria-label="Yenile">
          <RotateCw size={20} />
        </button>
      </header>

      <div className="m-bolgeler">
        {bolgeler.map((b) => {
          const dolu = b.masalar.filter((m) => adisyonlar[m.id]).length;
          return (
            <button
              key={b.id}
              className={b.id === seciliBolge ? "m-cip secili" : "m-cip"}
              onClick={() => setSeciliBolge(b.id)}
            >
              {b.ad}
              <span>{dolu}/{b.masalar.length}</span>
            </button>
          );
        })}
      </div>

      {masalar.length === 0 ? (
        <div className="m-bos"><p>Bu bölgede masa yok.</p></div>
      ) : (
        <div className={secimModu ? "m-masalar secim" : "m-masalar"}>
          {masalar.map((m) => {
            const acik = adisyonlar[m.id];
            const mesgul = secimModu ? undefined : mesguliyetler[m.id];
            // Kart rengi masanın durumunu anlatıyor; sıra en acilden en sakine:
            // hesabı ödenmiş ama kalkmamış masa gri (iş bitti), hesap fişi
            // çıkarılmış masa kırmızı (müşteri ödemeyi bekliyor), bir süredir
            // sipariş vermeyen masa mor, tahsilatı başlamış masa sarı, olağan
            // dolu masa yeşil. Masaüstüyle aynı dil.
            const odenen = acik?.odenen ?? 0;
            const kalan = acik ? acik.kalan || acik.tutar : 0;
            const odendi = !!acik && acik.tutar > 0 && odenen > 0 && kalan <= 0;
            const sinif = [
              "m-masa",
              acik ? "dolu" : "",
              acik
                ? odendi
                  ? "odendi"
                  : acik.fisBasildi
                    ? "fisli"
                    : durgunMu(acik)
                      ? "durgun"
                      : odenen > 0
                        ? "kismi"
                        : ""
                : "",
              mesgul ? "mesgul" : "",
              secimModu ? (secilebilir(m) ? "secilebilir" : "kapali") : "",
              secimModu?.hedef === m.id ? "secili" : "",
              secimModu?.kaynak.id === m.id ? "kaynak" : "",
            ]
              .filter(Boolean)
              .join(" ");

            // İçeride biri varken kart sadeleşiyor: masa adı ve kimin girdiği.
            // Tutar, süre ve misafir sayısı o sırada zaten değişiyor, yanlış
            // rakam göstermektense hiç göstermemek doğru. Bir yandan da rozet
            // satır akışına girip diğer yazıları aşağı kaydırıyordu.
            if (mesgul) {
              return (
                <button key={m.id} className={sinif} onClick={() => masayaDokun(m)}>
                  <span className="m-masa-ust">
                    <span className="m-masa-ad">{m.ad}</span>
                  </span>
                  <span className="m-masa-kilit">
                    <LockKeyhole size={20} />
                    {mesgul.ad}
                  </span>
                </button>
              );
            }

            return (
              <button key={m.id} className={sinif} onClick={() => masayaDokun(m)}>
                <span className="m-masa-ust">
                  <span className="m-masa-ad">{m.ad}</span>
                  {!secimModu && acik && (
                    <span
                      className="m-masa-menu"
                      role="button"
                      aria-label="Masa işlemleri"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIslemMasasi(m);
                      }}
                    >
                      <EllipsisVertical size={16} />
                    </span>
                  )}
                  {secimModu?.hedef === m.id && <Check size={18} />}
                </span>

                {/* Hesap fişi şeridi masa adının altında ve yeri her kartta
                    ayrılıyor — fiş basılmamış masada görünmüyor ama yerini
                    koruyor. Yoksa şerit çıkan kartta garson adı ve tutar bir
                    satır aşağı kayıyor, ızgaradaki masalar birbirini tutmuyor.
                    Masaya yeni ürün girilirse şerit kendiliğinden kalkıyor. */}
                {acik && (
                  <span className={acik.fisBasildi ? "m-masa-fis" : "m-masa-fis gizli"}>
                    <Printer size={13} />
                    Hesap çıktı
                  </span>
                )}

                {acik ? (
                  <>
                    {/* Masayı açan kişi masa adının altında: kartı uzatmadan
                        tek satır, garson ızgaraya bakınca kendi masalarını
                        seçebiliyor. */}
                    {acik.garson && <span className="m-masa-garson">{acik.garson}</span>}

                    {/* Hesabı kapanan masada rakam yerine durum yazıyor: kalan
                        sıfır olduğu için tutar göstermek yanıltıyordu. Hesap
                        fişi basılmışsa yazıcı işareti tutarın sağına düşüyor;
                        masaya yeni ürün girilirse işaret kendiliğinden kalkıyor. */}
                    <span className="m-masa-tutar">
                      {odendi ? (
                        <>
                          <CircleCheckBig size={17} />
                          Ödendi
                        </>
                      ) : (
                        paraGoster(kalan)
                      )}
                    </span>

                    <span className="m-masa-alt">
                      {acik.bekliyor ? (
                        <>
                          <CloudUpload size={13} /> Gönderilmedi
                        </>
                      ) : acik.kopyaZamani ? (
                        // Gönderilmemiş kayıt değil: masa sunucuya sorulamadı,
                        // cihazdaki kopyadan çiziliyor. Kopyanın saati yazıyor.
                        <>
                          <CloudOff size={13} /> {kopyaSaati(acik.kopyaZamani)} hâli
                        </>
                      ) : (
                        sure(acik.acilis)
                      )}
                    </span>

                    {/* Kişi sayısı kartın sağ alt köşesinde sabit duruyor:
                        satır akışına girmediği için masadan masaya kaymıyor. */}
                    {!!acik.kisiSayisi && (
                      <span className="m-masa-kisi">
                        <Users size={12} />
                        {acik.kisiSayisi}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="m-masa-bos">
                    <Plus size={22} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Seçim modunun kendi şeridi: ne yapıldığı üstte yazıyor, onay altta. */}
      {secimModu && (
        <div className="m-secim-serit">
          <span>
            {secimModu.kaynak.ad}
            {secimModu.tip === "tasi" ? " → hangi masaya?" : " → hangi masayla birleşsin?"}
          </span>
          <div>
            <button className="m-serit-vazgec" onClick={() => setSecimModu(null)}>
              Vazgeç
            </button>
            <button className="m-serit-onay" disabled={!secimModu.hedef} onClick={secimiUygula}>
              <Check size={17} />
              Uygula
            </button>
          </div>
        </div>
      )}

      {islemMasasi && (
        <MasaIslemleri
          masa={islemMasasi}
          ozet={adisyonlar[islemMasasi.id]}
          onKapat={() => setIslemMasasi(null)}
          onOde={() => git(`/mobil/adisyon/${islemMasasi.id}`)}
          onHizli={() => hizliOdeAc(islemMasasi)}
          onYazdir={() => fisYazdir(islemMasasi)}
          onTasi={(tip) => {
            setSecimModu({ tip, kaynak: islemMasasi });
            setIslemMasasi(null);
          }}
          onIkram={(adisyonId) => {
            setIkramSorusu({ masa: islemMasasi, adisyonId });
            setIslemMasasi(null);
          }}
          onIptal={(adisyonId) => {
            setIptalSorusu({ masa: islemMasasi, adisyonId });
            setIslemMasasi(null);
          }}
        />
      )}

      {/* Müşteri sorulurken tip sayfası kapanıyor: iki sayfa üst üste
          durunca hangisine dokunulduğu belirsizleşiyordu. */}
      {hizliMasa && !cariSorusu && (
        <OdemeTipleri
          baslik={`${hizliMasa.masa.ad} · Hızlı Öde`}
          tutar={Math.round(adisyonOzeti(hizliMasa.veri).kalan * 100) / 100}
          onSec={hizliTahsil}
          onKapat={() => setHizliMasa(null)}
        />
      )}

      {cariSorusu && (
        <MusteriSecici
          onSec={(m) => hizliTahsil(cariSorusu, m.id)}
          onKapat={() => setCariSorusu(null)}
        />
      )}

      {iptalSorusu && (
        <OnayModal
          baslik="Adisyonu iptal et"
          ikon={<Ban size={20} />}
          mesaj={`${iptalSorusu.masa.ad} masasının hesabı iptal edilecek. Ciroya yazılmaz; kayıt silinmez, iptal olarak durur. Sebebi nedir?`}
          tehlikeli
          sebepler={IPTAL_SEBEPLERI}
          onayMetni="Evet, iptal et"
          onOnay={async (sebep) => {
            const { adisyonId } = iptalSorusu;
            setIptalSorusu(null);
            try {
              await adisyonIptal(adisyonId, sebep ?? "");
              await oku();
            } catch (e) {
              setUyari(e instanceof Error ? e.message : "Adisyon iptal edilemedi.");
            }
          }}
          onKapat={() => setIptalSorusu(null)}
        />
      )}

      {ikramSorusu && (
        <OnayModal
          baslik="Adisyonu ikram et"
          ikon={<Gift size={20} />}
          mesaj={`${ikramSorusu.masa.ad} masasındaki ürünlerin tamamı ikrama çevrilecek, hesap sıfırlanıp kapanacak. Sebebi nedir?`}
          sebepler={IKRAM_SEBEPLERI}
          odenmezler={odenmezler}
          onayMetni="Evet, ikram et"
          onOnay={async (sebep, odenmezId) => {
            const { adisyonId } = ikramSorusu;
            setIkramSorusu(null);
            try {
              await adisyonIkram(adisyonId, sebep, odenmezId);
              await oku();
            } catch (e) {
              setUyari(e instanceof Error ? e.message : "Adisyon ikram edilemedi.");
            }
          }}
          onKapat={() => setIkramSorusu(null)}
        />
      )}

      {mesgulSorusu && (
        <OnayModal
          baslik="Masada biri var"
          ikon={<LockKeyhole size={20} />}
          tekTus={!devralabilir()}
          mesaj={
            devralabilir()
              ? `${mesgulSorusu.masa.ad} masasında şu an ${mesgulSorusu.ad} işlem yapıyor. Devralırsan ${mesgulSorusu.ad} masadan çıkarılır.`
              : `${mesgulSorusu.masa.ad} masasında şu an ${mesgulSorusu.ad} işlem yapıyor. İşi bitince masa serbest kalacak.`
          }
          onayMetni="Devral"
          iptalMetni="Vazgeç"
          onOnay={devral}
          onKapat={() => setMesgulSorusu(null)}
        />
      )}

      {uyari && <OnayModal tekTus mesaj={uyari} onKapat={() => setUyari(null)} />}
    </>
  );
}

/**
 * Masanın işlemleri. Başlıkta masa adı ve hesabın o anki özeti; altında
 * yapılacak işler. Her satırın ikonu kendi renginde: para yeşil, yazdırma
 * mavi, geri alınamayan iş kırmızı — garson satırı okumadan da tanıyor.
 * Yetkisi olmayan satırı hiç görmüyor.
 */
function MasaIslemleri({
  masa,
  ozet,
  onKapat,
  onOde,
  onHizli,
  onYazdir,
  onTasi,
  onIkram,
  onIptal,
}: {
  masa: Masa;
  ozet?: MasaOzeti;
  onKapat: () => void;
  onOde: () => void;
  onHizli: () => void;
  onYazdir: () => void;
  onTasi: (tip: "tasi" | "birlestir") => void;
  onIkram: (adisyonId: number) => void;
  onIptal: (adisyonId: number) => void;
}) {
  const odeyebilir = yetkiVar("odeme.al");
  const satirlar = [
    ...(odeyebilir
      ? [
          { ad: "Öde", ikon: <Wallet size={19} />, renk: "ode", sec: onOde },
          {
            ad: `Hızlı Öde · ${paraGoster(ozet?.kalan ?? 0)}`,
            ikon: <Zap size={19} />,
            renk: "hizli",
            sec: onHizli,
          },
        ]
      : [{ ad: "Hesabı gör", ikon: <Wallet size={19} />, renk: "ode", sec: onOde }]),
    ...(yetkiVar("siparis.fis_yazdir")
      ? [{ ad: "Yazdır", ikon: <Printer size={19} />, renk: "yazdir", sec: onYazdir }]
      : []),
    ...(yetkiVar("siparis.tasi")
      ? [
          {
            ad: "Masayı taşı",
            ikon: <ArrowRightLeft size={19} />,
            renk: "tasi",
            sec: () => onTasi("tasi"),
          },
          {
            ad: "Masaları birleştir",
            ikon: <Merge size={19} />,
            renk: "tasi",
            sec: () => onTasi("birlestir"),
          },
        ]
      : []),
  ];

  // Geri alınamayan işler kendi bölümünde: parmak listeyi kaydırırken
  // yanlışlıkla iptale düşmesin.
  const agirlar = [
    ...(yetkiVar("siparis.adisyon_ikram") && ozet
      ? [
          {
            ad: "Adisyonu ikram et",
            ikon: <Gift size={19} />,
            renk: "ikram",
            sec: () => onIkram(ozet.id),
          },
        ]
      : []),
    ...(yetkiVar("siparis.iptal") && ozet
      ? [
          {
            ad: "Adisyonu iptal et",
            ikon: <Ban size={19} />,
            renk: "iptal",
            sec: () => onIptal(ozet.id),
          },
        ]
      : []),
  ];

  const satir = (s: (typeof satirlar)[number]) => (
    <button key={s.ad} className={`m-islem m-islem-${s.renk}`} onClick={s.sec}>
      <span className="m-islem-ikon">{s.ikon}</span>
      {s.ad}
    </button>
  );

  return (
    <AltSayfa kisa onKapat={onKapat}>
      {(kapat) => (
        <>
          <span className="m-tutamak" />

          <header className="m-islem-ust">
            <span>
              <strong className="m-islem-masa">{masa.ad}</strong>
              {ozet && (
                <span className="m-islem-ozet">
                  <strong>{paraGoster(ozet.kalan || ozet.tutar)}</strong>
                  {!!ozet.kisiSayisi && (
                    <>
                      ·
                      <Users size={13} />
                      {ozet.kisiSayisi}
                    </>
                  )}
                  {ozet.garson && <>· {ozet.garson}</>}
                </span>
              )}
            </span>
            <button className="m-islem-kapat" onClick={kapat} aria-label="Kapat">
              <X size={19} />
            </button>
          </header>

          <div className="m-islemler">
            {satirlar.map(satir)}
            {agirlar.length > 0 && <span className="m-islem-ayirici" />}
            {agirlar.map(satir)}
          </div>
        </>
      )}
    </AltSayfa>
  );
}
