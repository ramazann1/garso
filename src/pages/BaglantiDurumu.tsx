import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Laptop,
  Loader2,
  Network,
  Printer,
  RefreshCw,
  Usb,
  XCircle,
  Zap,
} from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import Ipucu from "../components/Ipucu";
import OnayModal from "../components/OnayModal";
import {
  koprulariGetir,
  yaziciDurumlari,
  yaziciyiDene,
  type KopruCihazi,
  type YaziciDurumu,
} from "../kopru";
import { baglantiAdi, yazicilariGetir, type Yazici } from "../yazicilar";

const baglantiIkon: Record<string, typeof Network> = {
  ethernet: Network,
  usb: Usb,
  webusb: Zap,
};

const zamanMetni = (zaman: string) => {
  const gecen = Math.floor((Date.now() - new Date(zaman).getTime()) / 1000);
  if (gecen < 60) return "az önce";
  if (gecen < 3600) return `${Math.floor(gecen / 60)} dakika önce`;
  if (gecen < 86400) return `${Math.floor(gecen / 3600)} saat önce`;
  return new Date(zaman).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Etiketin yanındaki "i" işaretinde yazan açıklama: yazıcıya neden
 * ulaşılamadığı ya da son fişin neden basılamadığı. Satırda düz metin olarak
 * durunca hem uzuyor hem etiketleri kaydırıyordu.
 */
function sebep(d?: YaziciDurumu) {
  if (!d) return "";
  if (d.cevrimici === null)
    return "Yazıcıyı yoklayan köprü çalışmıyor; durumu şu an bilinmiyor.";
  if (d.cevrimici === false) return d.ulasimHatasi || "Yazıcıya ulaşılamıyor.";
  if (d.sonDurum === "basarisiz") return d.sonHata || "Son fiş basılamadı.";
  return "";
}

/** Deneme düğmesinin yanındaki işarette yazan kuyruk özeti. */
function kuyrukBilgisi(d?: YaziciDurumu) {
  const parcalar: string[] = [];

  if (d?.bekleyen) parcalar.push(`${d.bekleyen} fiş sırada bekliyor.`);

  if (d?.sonDurum === "basildi" && d.sonZaman) {
    parcalar.push(`Son fiş ${zamanMetni(d.sonZaman)} basıldı.`);
  } else if (d?.sonDurum === "basarisiz") {
    parcalar.push(`Son fiş basılamadı: ${d.sonHata || "sebep bilinmiyor"}.`);
  } else {
    parcalar.push("Bu yazıcıdan henüz fiş basılmadı.");
  }

  return parcalar.join(" ");
}

export default function BaglantiDurumu() {
  const [kopruler, setKopruler] = useState<KopruCihazi[]>([]);
  const [yazicilar, setYazicilar] = useState<Yazici[]>([]);
  const [durumlar, setDurumlar] = useState<Map<number, YaziciDurumu>>(new Map());
  const [yukleniyor, setYukleniyor] = useState(true);
  const [denenen, setDenenen] = useState<number | null>(null);
  const [bildirim, setBildirim] = useState("");
  const [uyari, setUyari] = useState("");

  const oku = useCallback(async () => {
    try {
      const [k, y, d] = await Promise.all([
        koprulariGetir(),
        yazicilariGetir(),
        yaziciDurumlari(),
      ]);
      setKopruler(k);
      setYazicilar(y);
      setDurumlar(d);
    } catch (e) {
      setUyari(e instanceof Error ? e.message : "Durum okunamadı.");
    } finally {
      setYukleniyor(false);
    }
  }, []);

  // Ekran açık kaldığı sürece kendini tazeliyor: köprü kapandığında ekranın da
  // kapandığını göstermesi gerekiyor, işletmecinin yenilemesini beklemeden.
  useEffect(() => {
    oku();
    const zaman = setInterval(oku, 15_000);
    return () => clearInterval(zaman);
  }, [oku]);

  const dene = async (yazici: Yazici) => {
    setDenenen(yazici.id);
    try {
      const sonuc = await yaziciyiDene(yazici);
      sonuc.tamam ? setBildirim(`${yazici.ad}: ${sonuc.mesaj}`) : setUyari(sonuc.mesaj);
    } catch (e) {
      setUyari(e instanceof Error ? e.message : "Deneme yapılamadı.");
    } finally {
      setDenenen(null);
      oku();
    }
  };

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <AyarBasligi />

        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2><Laptop size={17} /> Kasa Köprüsü</h2>
            <button className="ayar-ekle" onClick={oku}>
              <RefreshCw size={15} /> Yenile
            </button>
          </div>

          <Bilgi>
            Köprü, kasadaki bilgisayarda çalışan ve fişleri yazıcıya ulaştıran
            programdır. Kapalıyken fişler kaybolmaz, sırada bekler.
          </Bilgi>

          {yukleniyor ? (
            <div className="yukleniyor"><div className="cember" /></div>
          ) : kopruler.length === 0 ? (
            <div className="ayar-bos">
              <Laptop size={30} />
              <p>Hiçbir kasada köprü çalışmamış. Kurulum için köprü klasöründeki
                 açıklamayı izleyin.</p>
            </div>
          ) : (
            <div className="durum-liste">
              {kopruler.map((k) => (
                <div key={k.cihaz} className="durum-satir">
                  <span className={k.calisiyor ? "durum-isik acik" : "durum-isik kapali"}>
                    {k.calisiyor ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                  </span>
                  <span className="durum-ad">
                    <strong>{k.cihaz}</strong>
                    <em>
                      {k.kisi && `${k.kisi} · `}
                      {k.surum && `sürüm ${k.surum} · `}
                      son haber {zamanMetni(k.sonGorulme)}
                    </em>
                  </span>
                  <span className={k.calisiyor ? "durum-etiket acik" : "durum-etiket kapali"}>
                    {k.calisiyor ? "Çalışıyor" : "Ulaşılamıyor"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2><Printer size={17} /> Yazıcılar</h2>
          </div>

          {yazicilar.length === 0 ? (
            <div className="ayar-bos">
              <Printer size={30} />
              <p>Henüz yazıcı tanımlanmadı.</p>
            </div>
          ) : (
            <div className="durum-liste">
              {yazicilar.map((y) => {
                const d = durumlar.get(y.id);
                const Ikon = baglantiIkon[y.baglanti] ?? Printer;
                const sorunlu = d?.cevrimici === false || d?.sonDurum === "basarisiz";

                return (
                  <div key={y.id} className={y.aktif ? "durum-satir" : "durum-satir kapali"}>
                    <span className={sorunlu ? "durum-isik kapali" : "durum-isik acik"}>
                      <Ikon size={17} />
                    </span>

                    <span className="durum-ad">
                      <strong>{y.ad}</strong>
                      <em>
                        {baglantiAdi(y.baglanti)}
                        {y.baglanti === "ethernet" && y.ip && ` · ${y.ip}`}
                        {y.baglanti === "usb" && y.sistemAd && ` · ${y.sistemAd}`}
                        {!y.aktif && " · Kapalı"}
                      </em>
                    </span>

                    {/* Çevrimiçi bilgisi köprünün yoklamasından geliyor; köprü
                        kapalıysa hiç bilgi yok, "bilinmiyor" deniyor. Kendi
                        sütununda duruyor ki yanındaki yazı uzayıp kısaldıkça
                        etiketler satır satır kaymasın. */}
                    <span className="durum-etiket-yeri">
                      {y.baglanti !== "webusb" && (
                        <span
                          className={
                            d?.cevrimici == null
                              ? "durum-etiket bilinmiyor"
                              : d.cevrimici
                                ? "durum-etiket acik"
                                : "durum-etiket kapali"
                          }
                        >
                          {d?.cevrimici == null
                            ? "Bilinmiyor"
                            : d.cevrimici
                              ? "Çevrimiçi"
                              : "Çevrimdışı"}
                          {sebep(d) && <Ipucu>{sebep(d)}</Ipucu>}
                        </span>
                      )}
                    </span>

                    {/* Kuyruk bilgisi de satırda yazı olarak durmuyor: sırada
                        bekleyen fiş varsa etiketi görünüyor, gerisi ikonda. */}
                    <span className="durum-bilgi">
                      {d?.bekleyen ? (
                        <span className="durum-etiket bekleyen">
                          <Clock size={13} /> {d.bekleyen} fiş sırada
                        </span>
                      ) : null}
                      <Ipucu>{kuyrukBilgisi(d)}</Ipucu>
                    </span>

                    <button
                      className="ayar-ekle"
                      disabled={!y.aktif || denenen !== null || y.baglanti === "webusb"}
                      onClick={() => dene(y)}
                      title={
                        y.baglanti === "webusb"
                          ? "Bu yazıcı tarayıcıdan basıyor, köprü denemesi yapılamaz"
                          : undefined
                      }
                    >
                      {denenen === y.id ? (
                        <>
                          <Loader2 size={15} className="doner" /> Deneniyor
                        </>
                      ) : (
                        <>
                          <Printer size={15} /> Dene
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari("")} />}
      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
