import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Ban,
  Check,
  CloudOff,
  EllipsisVertical,
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
import { bolgeleriGetir } from "../masalar";
import {
  adisyonGetir,
  adisyonIptal,
  adisyonKaydet,
  adisyonOzeti,
  masaBirlestir,
  masaTasi,
  tumAdisyonlar,
  type MasaOzeti,
} from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { adisyonFisiYaz } from "../yazicilar";
import { yetkiVar } from "../oturum";
import OnayModal from "../components/OnayModal";
import OdemeTipleri from "./OdemeTipleri";
import MusteriSecici from "../components/MusteriSecici";
import { odemeTipleriniGetir, type OdemeTipi } from "../odemeTipleri";
import { bekleyenMasalar, useKuyruk } from "../kuyruk";
import { baglantiVar, sureSinirli, useBaglanti } from "../baglanti";
import { useCanli } from "../canli";
import { devralabilir, masayiDevral, useMesguliyetler } from "../mesguliyet";
import { paraGoster } from "../para";
import type { Bolge, Masa } from "../types";

// İptal sebebi denetim defterine yazılıyor; hazır seçenekler kasadakiyle aynı.
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
    setAdisyonlar({ ...(a ?? {}), ...bekleyenMasalar() });
    setSeciliBolge((s) => (b.some((x) => x.id === s) ? s : b[0]?.id ?? null));
  };

  useEffect(() => {
    if (seciliBolge !== null) localStorage.setItem(BOLGE_ANAHTAR, String(seciliBolge));
  }, [seciliBolge]);

  useEffect(() => {
    odemeTipleriniGetir().then(setOdemeTipleri);
  }, []);

  useEffect(() => {
    oku();
    const zaman = setInterval(() => setTik((t) => t + 1), 60000);
    return () => clearInterval(zaman);
  }, []);

  // Başka bir cihaz masaya sipariş girdiğinde ekran kendini tazeliyor: garson
  // telefonda, kasiyer bilgisayarda aynı masayı görüyor.
  useCanli(["adisyonlar", "adisyon_kalemleri", "tahsilatlar"], oku);

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
    try {
      await adisyonKaydet(
        masa.id,
        { ...veri, tahsilatlar: [...veri.tahsilatlar, { tip, tutar: kalan, musteriId }] },
        true
      );
      await oku();
    } catch (e) {
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
            const sinif = [
              "m-masa",
              acik ? "dolu" : "",
              mesgul ? "mesgul" : "",
              secimModu ? (secilebilir(m) ? "secilebilir" : "kapali") : "",
              secimModu?.hedef === m.id ? "secili" : "",
              secimModu?.kaynak.id === m.id ? "kaynak" : "",
            ]
              .filter(Boolean)
              .join(" ");

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

                {mesgul && (
                  <span className="m-masa-mesgul">
                    <LockKeyhole size={12} />
                    {mesgul.ad}
                  </span>
                )}

                {acik ? (
                  <>
                    <span className="m-masa-tutar">{paraGoster(acik.kalan || acik.tutar)}</span>
                    <span className="m-masa-alt">
                      {acik.bekliyor ? (
                        <>
                          <CloudOff size={13} /> Gönderilmedi
                        </>
                      ) : (
                        <>
                          {sure(acik.acilis)}
                          {acik.kisiSayisi ? (
                            <em>
                              <Users size={12} />
                              {acik.kisiSayisi}
                            </em>
                          ) : null}
                        </>
                      )}
                    </span>
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

/** Masanın işlemleri; ikon + ad, açıklama yok. Yetkisi olmayan satırı görmüyor. */
function MasaIslemleri({
  masa,
  ozet,
  onKapat,
  onOde,
  onHizli,
  onYazdir,
  onTasi,
  onIptal,
}: {
  masa: Masa;
  ozet?: MasaOzeti;
  onKapat: () => void;
  onOde: () => void;
  onHizli: () => void;
  onYazdir: () => void;
  onTasi: (tip: "tasi" | "birlestir") => void;
  onIptal: (adisyonId: number) => void;
}) {
  const odeyebilir = yetkiVar("odeme.al");
  const satirlar = [
    ...(odeyebilir
      ? [
          { ad: "Öde", ikon: <Wallet size={19} />, sec: onOde },
          {
            ad: `Hızlı Öde · ${paraGoster(ozet?.kalan ?? 0)}`,
            ikon: <Zap size={19} />,
            sec: onHizli,
          },
        ]
      : [{ ad: "Hesabı gör", ikon: <Wallet size={19} />, sec: onOde }]),
    { ad: "Yazdır", ikon: <Printer size={19} />, sec: onYazdir },
    ...(yetkiVar("siparis.tasi")
      ? [
          { ad: "Masayı taşı", ikon: <ArrowRightLeft size={19} />, sec: () => onTasi("tasi") },
          { ad: "Masaları birleştir", ikon: <Merge size={19} />, sec: () => onTasi("birlestir") },
        ]
      : []),
    ...(yetkiVar("siparis.iptal") && ozet
      ? [
          {
            ad: "Adisyonu iptal et",
            ikon: <Ban size={19} />,
            sec: () => onIptal(ozet.id),
            tehlikeli: true,
          },
        ]
      : []),
  ];

  return (
    <div className="m-perde" onClick={onKapat}>
      <div className="m-sayfa kisa" onClick={(e) => e.stopPropagation()}>
        <header className="m-sayfa-ust">
          <h2>{masa.ad}</h2>
          <button className="m-ikon-dugme" onClick={onKapat} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>
        <div className="m-islemler">
          {satirlar.map((s) => (
            <button
              key={s.ad}
              className={s.tehlikeli ? "m-islem tehlikeli" : "m-islem"}
              onClick={s.sec}
            >
              {s.ikon}
              {s.ad}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
