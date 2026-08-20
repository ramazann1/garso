import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  CircleCheckBig,
  CloudOff,
  Delete,
  HandCoins,
  Lock,
  Percent,
  Save,
  Wallet,
  X,
} from "lucide-react";
import OnayModal from "../components/OnayModal";
import IndirimModal from "../components/IndirimModal";
import MusteriSecici from "../components/MusteriSecici";
import EksikKapat from "../components/EksikKapat";
import OdemeTipleri from "./OdemeTipleri";
import KalemIslemleri, { kalemiUygula } from "./KalemIslemleri";
import { OdemeIkon } from "../odemeIkon";
import { masaGetir } from "../masalar";
import {
  CEVRIMDISI_ADISYON,
  adisyonGetir,
  adisyonKaydet,
  adisyonOzeti,
  kalemTasi,
  kalemTutari,
  servisGirdisi,
} from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { servisSatirlari } from "../servis";
import { odemeTipleriniGetir } from "../odemeTipleri";
import type { OdemeTipi } from "../odemeTipleri";
import { useCanli } from "../canli";
import { baglantiVar, useBaglanti } from "../baglanti";
import { indirimYapabilir, yetkiVar } from "../oturum";
import { paraGoster } from "../para";
import type { SepetKalemi, Tahsilat } from "../types";

/**
 * Mobil adisyon ekranı — hesabın kendi sayfası.
 *
 * Sipariş almak ve hesap kapatmak ayrı anlar: sipariş ekranında ödeme yok,
 * burada ürün eklemek yok. Kalemler yukarıda kayıyor, ödeme alanı ekrana
 * sabit. Sıradan iş iki dokunuş: Öde → tipi seç. Farklı tutar isteyen tuş
 * takımını kendi sayfasında açıyor; ekranda sürekli klavye durmuyor.
 *
 * Kaleme dokunmak masaüstündeki kalem panelinin mobil hâlini açıyor: adet,
 * not, ikram, satır indirimi, iptal ve başka masaya taşıma.
 */
export default function MobilAdisyon() {
  const { masaId: param } = useParams();
  const masaId = Number(param);
  const git = useNavigate();
  const cevrimici = useBaglanti();

  const [masaAdi, setMasaAdi] = useState("");
  const [veri, setVeri] = useState<AdisyonVerisi | null>(null);
  const [odemeTipleri, setOdemeTipleri] = useState<OdemeTipi[]>([]);
  const [girilen, setGirilen] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);

  // Kalandan fazla girilen tutar onaya düşüyor: üstü bahşiş mi, yanlış giriş mi?
  const [bahsisSorusu, setBahsisSorusu] = useState<{ tip: string; bahsis: number } | null>(null);
  // Açık hesap kasaya para getirmiyor; borcun kime yazıldığı sorulmadan işlenmiyor.
  const [cariSorusu, setCariSorusu] = useState<{ tip: string; tutar: number } | null>(null);
  const [eksikAcik, setEksikAcik] = useState(false);
  // Ödeme tipi ve tutar sayfaları; ikisi de alttan açılıyor.
  const [tipSecim, setTipSecim] = useState(false);
  const [tutarAcik, setTutarAcik] = useState(false);
  const [kalemIslem, setKalemIslem] = useState<SepetKalemi | null>(null);
  const [indirimAcik, setIndirimAcik] = useState(false);

  useEffect(() => {
    masaGetir(masaId).then((m) => setMasaAdi(m?.ad ?? ""));
    odemeTipleriniGetir().then(setOdemeTipleri);
  }, [masaId]);

  useEffect(() => {
    // Bağlantı yoksa istek atılmıyor; tahsilat zaten çevrimdışı alınmıyor.
    if (!baglantiVar()) {
      setVeri(CEVRIMDISI_ADISYON);
      return;
    }
    adisyonGetir(masaId).then(setVeri);
  }, [masaId, cevrimici]);

  // Hesap ödenirken başka bir cihaz aynı masaya ürün ekleyebiliyor; tutar
  // güncellenmezse eksik tahsil edilir. Alttan açılan bir sayfa varken
  // tazelenmiyor: kişi tutar girerken hesabın altından değişmesi daha kötü.
  const sayfaAcik = tipSecim || tutarAcik || indirimAcik || !!kalemIslem;
  useCanli(["adisyonlar", "adisyon_kalemleri", "tahsilatlar"], () => {
    if (!baglantiVar() || sayfaAcik) return;
    adisyonGetir(masaId).then(setVeri);
  });

  if (!veri) {
    return (
      <div className="yukleniyor">
        <div className="cember" />
      </div>
    );
  }

  const ozet = adisyonOzeti(veri);
  const servisler = servisSatirlari(servisGirdisi(veri, Math.max(0, ozet.araToplam - veri.indirim)));
  const kurus = (t: number) => Math.round(t * 100) / 100;
  const kalan = kurus(ozet.kalan);

  // İkram ve iptal edilen kalemler listede durur ama hesaba girmez.
  const odenebilir = (k: SepetKalemi) => (k.durum ?? "normal") === "normal";

  // Girilen tutar metin olarak tutuluyor: "12," yazarken virgül silinmesin.
  const girilenTutar = kurus(Number(girilen.replace(",", ".")) || 0);

  const numpadTus = (t: string) => {
    if (t === "⌫") { setGirilen((g) => g.slice(0, -1)); return; }
    // Virgül bir kere girilir; ikincisi sayıyı bozardı.
    if (t === "," && girilen.includes(",")) return;
    setGirilen((g) => g + t);
  };

  /**
   * Adisyonu diske yazar. Kuver, garsoniye, indirim ve kişi sayısı okunan
   * hâliyle geri gidiyor: kaydetme çağrısı verinin tamamını yazdığı için
   * yalnız tahsilatı göndermek diğer alanları siler.
   */
  const yaz = async (
    tahsilatlar: Tahsilat[],
    kapat = false,
    eksik?: AdisyonVerisi["eksik"],
    degisen?: Partial<AdisyonVerisi>
  ) => {
    setCalisiyor(true);
    try {
      const kayitli = await adisyonKaydet(masaId, { ...veri, ...degisen, tahsilatlar, eksik }, kapat);
      // Yeni ödemeler kayıtta kimlik kazanıyor; ekran onları geri almazsa
      // aynı sayfadan alınan ikinci ödeme birincisini bir daha yazardı.
      if (!kapat) setVeri({ ...veri, ...degisen, ...kayitli });
      setGirilen("");
      return true;
    } catch (e) {
      setUyari(e instanceof Error ? e.message : "Kaydedilemedi.");
      return false;
    } finally {
      setCalisiyor(false);
    }
  };

  /**
   * Tahsilatı işler: ödeme kaydedilir, hesabın parası tamamlandıysa adisyon
   * kapanır. Fiş yazdırmak ayrı bir iş, masa kartının menüsünde duruyor.
   */
  const tahsilatIsle = async (tip: string, tutar: number, bahsis?: number, musteriId?: number) => {
    const tahsilatlar = [...veri.tahsilatlar, { tip, tutar, bahsis, musteriId }];
    const odenen = tahsilatlar.reduce((t, o) => t + o.tutar, 0);
    const kapat = odenen >= ozet.toplam - 0.005;

    setTipSecim(false);
    const oldu = await yaz(tahsilatlar, kapat);
    if (oldu && kapat) git("/mobil/masalar");
  };

  const odemeAl = (tip: string) => {
    const tutar = girilen ? girilenTutar : kalan;
    if (!tutar || tutar <= 0) return;
    if (tutar > kalan) { setBahsisSorusu({ tip, bahsis: kurus(tutar - kalan) }); return; }
    if (odemeTipleri.find((t) => t.ad === tip)?.acikHesap) {
      setCariSorusu({ tip, tutar });
      return;
    }
    tahsilatIsle(tip, tutar);
  };

  const odemeBitti = kalan <= 0;
  const odemeAlabilir = yetkiVar("odeme.al");
  const musteriAdi = veri.musteri?.ad || veri.ad;

  return (
    <div className="m-adisyon">
      <header className="m-siparis-ust">
        <button className="m-ikon-dugme" onClick={() => git("/mobil/masalar")} aria-label="Geri">
          <ArrowLeft size={20} />
        </button>
        <h1>{masaAdi}</h1>
        {indirimYapabilir() && veri.sepet.length > 0 && (
          <button
            className="m-ikon-dugme"
            onClick={() => setIndirimAcik(true)}
            aria-label="Hesaba indirim"
          >
            <Percent size={19} />
          </button>
        )}
      </header>

      <div className="m-adisyon-icerik">
        {veri.sepet.length === 0 ? (
          <div className="m-bos">
            <p>{cevrimici ? "Bu masada açık hesap yok." : "Bağlantı yok, hesap okunamadı."}</p>
          </div>
        ) : (
          <>
            {/* Kaleme dokunmak o satırın işlemlerini açıyor. */}
            <div className="m-adisyon-kalemler">
              {veri.sepet.map((k) => (
                <button
                  key={k.id}
                  className={odenebilir(k) ? "m-kalem" : `m-kalem ${k.durum}`}
                  onClick={() => setKalemIslem(k)}
                >
                  <span className="m-kalem-adet">{k.adet}</span>
                  <span className="m-kalem-ad">
                    {k.ad}
                    {!!(k.porsiyon || k.secimler?.length || k.not) && (
                      <small>
                        {[k.porsiyon, ...(k.secimler ?? []), k.not].filter(Boolean).join(" · ")}
                      </small>
                    )}
                  </span>
                  <span className="m-kalem-tutar">
                    {!odenebilir(k) ? (
                      k.durum === "ikram" ? "İkram" : "İptal"
                    ) : k.indirim ? (
                      <>
                        <s>{paraGoster(k.fiyat * k.adet)}</s>
                        {paraGoster(kalemTutari(k))}
                      </>
                    ) : (
                      paraGoster(kalemTutari(k))
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div className="m-dokum">
              <div className="m-dokum-satir">
                <span>Ara toplam</span>
                <span>{paraGoster(ozet.araToplam)}</span>
              </div>
              {veri.indirim > 0 && (
                <div className="m-dokum-satir">
                  <span>İndirim</span>
                  <span>-{paraGoster(veri.indirim)}</span>
                </div>
              )}
              {servisler.map((s) => (
                <div key={s.ad} className="m-dokum-satir">
                  <span>{s.ad}</span>
                  <span>{paraGoster(s.tutar)}</span>
                </div>
              ))}
              {ozet.kdv > 0 && (
                <div className="m-dokum-satir">
                  <span>KDV</span>
                  <span>{paraGoster(ozet.kdv)}</span>
                </div>
              )}
              <div className="m-dokum-satir toplam">
                <span>Toplam</span>
                <strong>{paraGoster(ozet.toplam)}</strong>
              </div>
            </div>

            {veri.tahsilatlar.length > 0 && (
              <div className="m-odenenler">
                <p className="m-alt-baslik">Alınan ödemeler</p>
                {veri.tahsilatlar.map((o, i) => (
                  <div key={i} className="m-odeme-satir">
                    <span>
                      <OdemeIkon ad={o.tip} size={16} />
                      {o.tip}
                    </span>
                    <span>
                      {paraGoster(o.tutar)}
                      {o.bahsis ? <em> +{paraGoster(o.bahsis)} bahşiş</em> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {veri.sepet.length > 0 && (
        <div className="m-odeme">
          {!odemeAlabilir ? (
            // Yetkisi olmayan hesabı görüyor ama parayı almıyor.
            <div className="m-odeme-kapali">
              <Lock size={18} />
              Ödeme alma yetkiniz yok.
            </div>
          ) : !cevrimici ? (
            // Para işlemi kuyruğa girmiyor: bağlantı gelmeden tahsilat alınmıyor.
            <div className="m-odeme-kapali">
              <CloudOff size={18} />
              Bağlantı yok — tahsilat alınamıyor.
            </div>
          ) : odemeBitti ? (
            <button
              className="m-ode-btn"
              disabled={calisiyor}
              onClick={async () => {
                if (await yaz(veri.tahsilatlar, true)) git("/mobil/masalar");
              }}
            >
              <CircleCheckBig size={19} />
              Adisyonu kapat
            </button>
          ) : (
            <div className="m-odeme-dugmeler">
              <div className="m-odeme-ikincil">
                <button className="m-tutar-btn" disabled={calisiyor} onClick={() => setTutarAcik(true)}>
                  <Calculator size={18} />
                  Tutar gir
                </button>
                {/* Ödemeler zaten anında kaydediliyor; bu düğme hesabı yarım
                    bırakıp başka masaya geçen garsona net bir çıkış veriyor. */}
                <button
                  className="m-tutar-btn"
                  disabled={calisiyor}
                  onClick={() => git("/mobil/masalar")}
                >
                  <Save size={18} />
                  Kaydet
                </button>
              </div>
              <button
                className="m-ode-btn"
                disabled={calisiyor}
                onClick={() => {
                  setGirilen("");
                  setTipSecim(true);
                }}
              >
                <Wallet size={20} />
                {paraGoster(kalan)} öde
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tuş takımı kendi sayfasında: rakamlar iri, tek işi var. */}
      {tutarAcik && (
        <div className="m-perde" onClick={() => setTutarAcik(false)}>
          <div className="m-sayfa" onClick={(e) => e.stopPropagation()}>
            <header className="m-odeme-ust">
              <div>
                <p>Tahsil edilecek</p>
                <strong>{paraGoster(girilen ? girilenTutar : 0)}</strong>
              </div>
              <button className="m-ikon-dugme" onClick={() => setTutarAcik(false)} aria-label="Kapat">
                <X size={20} />
              </button>
            </header>

            <div className="m-tutar-govde">
              <p className="m-tutar-kalan">Kalan {paraGoster(kalan)}</p>
              <div className="m-numpad-grid">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"].map((t) => (
                  <button key={t} className="m-numpad-tus" onClick={() => numpadTus(t)}>
                    {t === "⌫" ? <Delete size={22} /> : t}
                  </button>
                ))}
              </div>

              <div className="m-tutar-alt">
                {yetkiVar("odeme.eksik_kapat") && (
                  <button
                    className="m-tutar-btn"
                    onClick={() => {
                      setTutarAcik(false);
                      setEksikAcik(true);
                    }}
                  >
                    <HandCoins size={18} />
                    Eksik kapat
                  </button>
                )}
                <button
                  className="m-ode-btn"
                  disabled={girilenTutar <= 0}
                  onClick={() => {
                    setTutarAcik(false);
                    setTipSecim(true);
                  }}
                >
                  <Wallet size={19} />
                  Devam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kalem işlemleri masaüstü panelinin mobil hâli; sipariş ekranı da aynı
          bileşeni kullanıyor. Buradaki değişiklik anında diske yazılıyor. */}
      {kalemIslem && (
        <KalemIslemleri
          kalem={kalemIslem}
          tasinabilir
          onKapat={() => setKalemIslem(null)}
          onUygula={(yeni) => {
            setKalemIslem(null);
            yaz(veri.tahsilatlar, false, undefined, {
              sepet: kalemiUygula(veri.sepet, kalemIslem, yeni),
            });
          }}
          onTasi={async (hedefMasaId, adet) => {
            const kalemId = kalemIslem.id!;
            setKalemIslem(null);
            setCalisiyor(true);
            try {
              await kalemTasi(masaId, hedefMasaId, kalemId, adet);
              setVeri(await adisyonGetir(masaId));
            } catch (e) {
              setUyari(e instanceof Error ? e.message : "Kalem taşınamadı.");
            } finally {
              setCalisiyor(false);
            }
          }}
        />
      )}

      {indirimAcik && (
        <IndirimModal
          araToplam={ozet.araToplam}
          mevcutIndirim={veri.indirim}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar, kaynak) => {
            setIndirimAcik(false);
            yaz(veri.tahsilatlar, false, undefined, { indirim: tutar, indirimTanim: kaynak });
          }}
        />
      )}

      {tipSecim && (
        <OdemeTipleri
          baslik="Tahsilat"
          tutar={girilen ? girilenTutar : kalan}
          pasif={calisiyor}
          onSec={odemeAl}
          onKapat={() => setTipSecim(false)}
        />
      )}

      {bahsisSorusu && (
        <OnayModal
          mesaj={`Girilen tutar kalandan ${paraGoster(bahsisSorusu.bahsis)} fazla. Üstü bahşiş olarak yazılsın mı?`}
          onayMetni="Bahşiş yaz"
          onOnay={() => {
            tahsilatIsle(bahsisSorusu.tip, kalan, bahsisSorusu.bahsis);
            setBahsisSorusu(null);
          }}
          onKapat={() => setBahsisSorusu(null)}
        />
      )}

      {cariSorusu && (
        <MusteriSecici
          onSec={(m) => {
            tahsilatIsle(cariSorusu.tip, cariSorusu.tutar, undefined, m.id);
            setCariSorusu(null);
          }}
          onKapat={() => setCariSorusu(null)}
        />
      )}

      {eksikAcik && (
        <EksikKapat
          kalan={kalan}
          musteri={musteriAdi}
          onKapat={() => setEksikAcik(false)}
          onOnay={async (kisi, sebep) => {
            setEksikAcik(false);
            const oldu = await yaz(veri.tahsilatlar, true, { kisi, sebep, tutar: kalan });
            if (oldu) git("/mobil/masalar");
          }}
        />
      )}

      {uyari && <OnayModal tekTus mesaj={uyari} onKapat={() => setUyari(null)} />}
    </div>
  );
}
