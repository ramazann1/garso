import { useEffect, useRef, useState } from "react";
import { CloudOff, RotateCw, Utensils } from "lucide-react";
import { OdemeIkon } from "../odemeIkon";
import { analizAdisyonlari, analizOzeti, BOS_FILTRE } from "../analiz";
import type { AnalizOzeti } from "../analiz";
import { baglantiVar, useBaglanti } from "../baglanti";
import { SAKIN, useCanli } from "../canli";
import { paraGoster } from "../para";
import Bilgi from "../components/Bilgi";

/**
 * Mobil Satış ekranı — Analiz'in tamamı değil, telefonda bakılacak kadarı.
 *
 * Tek soruya cevap veriyor: bugün ne oldu. Dönem seçimi yok, ekran her zaman
 * içinde bulunulan kasa gününü gösteriyor; işletmeci telefonu açtığında filtre
 * kurmakla uğraşmıyor. Gider ve kâr burada yok — kasa günü kapanışına bağlı
 * işler, yarım gösterilmesi yanlış karar verdiriyor.
 */
export default function MobilSatis() {
  const cevrimici = useBaglanti();
  const [ozet, setOzet] = useState<AnalizOzeti | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [okunamadi, setOkunamadi] = useState(false);

  // Sessiz okuma canlı tazeleme için: halka her seferinde dönerse ekran
  // işletmecinin gözünün önünde titrer, oysa sayılar sadece güncelleniyor.
  const oku = async (sessiz = false) => {
    if (!baglantiVar()) {
      setOkunamadi(true);
      setYukleniyor(false);
      return;
    }
    if (!sessiz) setYukleniyor(true);
    setOkunamadi(false);
    try {
      // Gider listesi boş geçiliyor: bu ekranda kâr yazmıyoruz, giderler kasada.
      const adisyonlar = await analizAdisyonlari({ ...BOS_FILTRE, donem: "bugun" });
      setOzet(analizOzeti(adisyonlar, []));
    } catch {
      setOkunamadi(true);
    }
    setYukleniyor(false);
  };

  useEffect(() => {
    oku();
  }, []);

  // Gün içinde satış oldukça sayılar kendiliğinden ilerliyor. Sakin tempoda:
  // bakma ekranı, hesap ağır ve rakamın gözün önünde zıplaması rahatsız eder.
  // Ekran arkadayken (telefon cepte) hiç sorgu yapılmıyor.
  useCanli(["adisyonlar", "tahsilatlar", "adisyon_kalemleri"], () => oku(true), SAKIN);

  // Bağlantı geri gelince ekran kendini tazeliyor; işletmeci "yenile"ye
  // basmayı beklemesin.
  const oncekiDurum = useRef(cevrimici);
  useEffect(() => {
    if (cevrimici && !oncekiDurum.current) oku();
    oncekiDurum.current = cevrimici;
  }, [cevrimici]);

  const bugun = new Date().toLocaleDateString("tr", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  return (
    <>
      <header className="m-baslik">
        <div>
          <h1>Satış</h1>
          <p className="m-baslik-alt">{bugun}</p>
        </div>
        <button className="m-ikon-dugme" onClick={() => oku()} aria-label="Yenile">
          <RotateCw size={20} />
        </button>
      </header>

      {yukleniyor && !ozet ? (
        <div className="yukleniyor"><div className="cember" /></div>
      ) : okunamadi ? (
        <div className="m-bos">
          {/* Bayat ciro yanlış bilgidir: rakam gösterilmiyor, durum söyleniyor. */}
          <p>{cevrimici ? "Satışlar okunamadı." : "Bağlantı yok, satışlar okunamıyor."}</p>
          <button className="m-dugme" onClick={() => oku()}>
            {cevrimici ? <RotateCw size={18} /> : <CloudOff size={18} />}
            Yeniden dene
          </button>
        </div>
      ) : ozet ? (
        <div className="m-satis">
          <section className="m-ciro">
            <p className="m-ciro-etiket">Bugünün cirosu</p>
            <strong className="m-ciro-tutar">{paraGoster(ozet.ciro)}</strong>
            <div className="m-ciro-alt">
              <span>
                <b>{ozet.adisyon}</b> adisyon
              </span>
              <span>
                ortalama <b>{paraGoster(ozet.ortalama)}</b>
              </span>
            </div>
          </section>

          {/* Cironun altındaki her şey tek kartta, aralarında ince çizgi.
              Ayrı ayrı çerçevelenince ekran kutu yığınına dönüyordu. */}
          <section className="m-kutu">
            {/* Açık masa ciroya girmiyor ama işletmecinin gördüğü paranın
                yarısı orada; ikisi ayrı yazılıp altta toplanıyor. */}
            <div className="m-kutu-satir">
              <span>
                <Utensils size={17} />
                Açık masa
              </span>
              <span className="m-kutu-deger">
                {ozet.acik} masa · {paraGoster(ozet.acikTutar)}
              </span>
            </div>
            <div className="m-kutu-satir toplam">
              <span>Günün toplam işi</span>
              <strong>{paraGoster(ozet.toplamIs)}</strong>
            </div>

            <div className="m-kutu-grup">
              <p className="m-alt-baslik">Ödeme tipleri</p>
              {ozet.odemeler.length === 0 ? (
                <p className="m-kutu-bos">Bugün henüz tahsilat yok.</p>
              ) : (
                ozet.odemeler.map((o) => {
                  const enBuyuk = ozet.odemeler[0].tutar || 1;
                  return (
                    <div key={o.ad} className="m-pay">
                      <span className="m-pay-ad">
                        <OdemeIkon ad={o.ad} size={17} />
                        {o.ad}
                        <small>{o.adet} tahsilat</small>
                      </span>
                      <span className="m-kutu-deger">{paraGoster(o.tutar)}</span>
                      {/* Çubuk rakamın süsü değil: hangi tipin ağır bastığı
                          listeye bakmadan görünsün. */}
                      <div className="m-pay-cubuk">
                        <div style={{ width: `${Math.max(4, (o.tutar / enBuyuk) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {(ozet.eksikTahsilat > 0 || ozet.bahsis > 0 || ozet.ikram > 0) && (
              <div className="m-kutu-grup">
                <div className="m-kutu-satir">
                  <span>Kasaya giren</span>
                  <span className="m-kutu-deger">{paraGoster(ozet.tahsilEdilen)}</span>
                </div>
                {ozet.eksikTahsilat > 0 && (
                  <div className="m-kutu-satir eksik">
                    <span>Eksik tahsilat</span>
                    <span className="m-kutu-deger">{paraGoster(ozet.eksikTahsilat)}</span>
                  </div>
                )}
                {ozet.ikram > 0 && (
                  <div className="m-kutu-satir">
                    <span>İkram</span>
                    <span className="m-kutu-deger">{paraGoster(ozet.ikram)}</span>
                  </div>
                )}
                {ozet.bahsis > 0 && (
                  <div className="m-kutu-satir">
                    <span>Bahşiş</span>
                    <span className="m-kutu-deger">{paraGoster(ozet.bahsis)}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          <Bilgi>Gider, kâr ve ayrıntılı raporlar kasadaki Analiz ekranında.</Bilgi>
        </div>
      ) : null}
    </>
  );
}
