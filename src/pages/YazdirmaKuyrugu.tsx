import { useEffect, useState } from "react";
import { Ban, Printer, RotateCw, X } from "lucide-react";
import Duzen from "../components/Duzen";
import Bilgi from "../components/Bilgi";
import AyarBasligi from "../components/AyarBasligi";
import OnayModal from "../components/OnayModal";
import Bildirim from "../components/Bildirim";
import { icerikOzeti } from "../fis";
import { kuyrugaBak, kuyrugaGeriKoy, kuyruktanIptal, turAdi } from "../yazicilar";
import type { KuyrukDurumu, KuyrukSatiri } from "../yazicilar";

const SUZGECLER: { kod: KuyrukDurumu | "hepsi"; ad: string }[] = [
  { kod: "bekliyor", ad: "Bekleyen" },
  { kod: "basarisiz", ad: "Başarısız" },
  { kod: "basildi", ad: "Basılmış" },
  { kod: "hepsi", ad: "Hepsi" },
];

const DURUM_ADI: Record<KuyrukDurumu, string> = {
  bekliyor: "Sırada",
  basildi: "Basıldı",
  basarisiz: "Basılamadı",
  iptal: "İptal",
};

// Rozet renkleri mevcut listelerdekiyle aynı: basılamayan fiş uyarı tonunda,
// iptal edilen nötr — biri hata, diğeri bilinçli bir karar.
const DURUM_SINIFI: Record<KuyrukDurumu, string> = {
  bekliyor: "rozet",
  basildi: "rozet acik",
  basarisiz: "rozet eksik",
  iptal: "rozet iptal",
};

const zamanMetni = (z: string) =>
  new Date(z).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function YazdirmaKuyrugu() {
  const [suzgec, setSuzgec] = useState<KuyrukDurumu | "hepsi">("bekliyor");
  const [satirlar, setSatirlar] = useState<KuyrukSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState<KuyrukSatiri | null>(null);
  const [bildirim, setBildirim] = useState("");
  const [hata, setHata] = useState("");

  const tazele = async (kod = suzgec) => {
    try {
      setSatirlar(await kuyrugaBak(kod === "hepsi" ? undefined : kod));
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kuyruk okunamadı.");
    }
    setYukleniyor(false);
  };

  // Basma işini köprü yapıyor, durum bu ekranın haberi olmadan değişiyor —
  // liste kendi kendini tazelemezse fiş basıldığı halde sırada görünür.
  useEffect(() => {
    setYukleniyor(true);
    tazele(suzgec);
    const zamanlayici = setInterval(() => tazele(suzgec), 15000);
    return () => clearInterval(zamanlayici);
  }, [suzgec]);

  const calistir = async (is: () => Promise<void>, mesaj: string) => {
    try {
      await is();
      await tazele();
      setSecili(null);
      setBildirim(mesaj);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    }
  };

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <AyarBasligi />

        <div className="bilgi-serit">
          <Bilgi>
            Fişler önce buraya düşer, kasa köprüsü sırayla basar. Yazıcı kapalıyken
            gönderilen fiş kaybolmaz; basılamayanı buradan yeniden sıraya alırsınız.
          </Bilgi>
        </div>

        <div className="ms-sekmeler alt">
          {SUZGECLER.map((s) => (
            <button
              key={s.kod}
              className={suzgec === s.kod ? "aktif" : ""}
              onClick={() => setSuzgec(s.kod)}
            >
              {s.ad}
            </button>
          ))}
        </div>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : satirlar.length === 0 ? (
          <div className="ayar-bos">
            <Printer size={30} />
            <p>
              {suzgec === "bekliyor"
                ? "Sırada bekleyen fiş yok."
                : "Bu durumda fiş yok."}
            </p>
          </div>
        ) : (
          <section className="ayar-bolum">
            <div className="tablo-kaydir">
              <table className="analiz-tablo">
                <thead>
                  <tr>
                    <th>Saat</th>
                    <th>Fiş</th>
                    <th>Yazıcı</th>
                    <th>Adisyon</th>
                    <th>Durum</th>
                    <th>Hata</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((s) => (
                    <tr key={s.id} onClick={() => setSecili(s)}>
                      <td>{zamanMetni(s.olusturma)}</td>
                      <td>{turAdi(s.tip)}</td>
                      <td>{s.yaziciAd ?? "—"}</td>
                      <td className="hucre-no">{s.adisyonNo ? `#${s.adisyonNo}` : "—"}</td>
                      <td>
                        <span className={DURUM_SINIFI[s.durum]}>{DURUM_ADI[s.durum]}</span>
                        {/* Kasanın doğrudan bastırdığı fiş kuyrukta hiç
                            beklemedi; internet yokken de çıktığı buradan
                            anlaşılıyor. */}
                        {s.kaynak === "yerel" && <span className="rozet">Kasadan</span>}
                      </td>
                      <td>{s.hata ?? (s.deneme > 0 ? `${s.deneme} deneme` : "—")}</td>
                      <td className="sag kuyruk-islem">
                        {s.durum !== "bekliyor" && (
                          <button
                            className="satir-tus"
                            onClick={(e) => {
                              e.stopPropagation();
                              calistir(
                                () => kuyrugaGeriKoy(s.id),
                                "Fiş yeniden sıraya alındı."
                              );
                            }}
                          >
                            <RotateCw size={15} /> Yeniden bas
                          </button>
                        )}
                        {(s.durum === "bekliyor" || s.durum === "basarisiz") && (
                          <button
                            className="satir-tus"
                            onClick={(e) => {
                              e.stopPropagation();
                              calistir(() => kuyruktanIptal(s.id), "Fiş iptal edildi.");
                            }}
                          >
                            <Ban size={15} /> İptal
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Fişin donmuş metni: kâğıda ne çıkacaksa o. */}
        {secili && (
          <div className="modal-fon" onClick={() => setSecili(null)}>
            <div className="kuyruk-onizleme" onClick={(e) => e.stopPropagation()}>
              <header>
                <h3>{turAdi(secili.tip)} fişi</h3>
                <button className="panel-kapat" onClick={() => setSecili(null)}>
                  <X size={19} />
                </button>
              </header>
              <pre>{icerikOzeti(secili.icerik) || "Fiş içeriği boş."}</pre>
            </div>
          </div>
        )}

        {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
        {hata && <OnayModal mesaj={hata} tekTus onKapat={() => setHata("")} />}
      </div>
    </Duzen>
  );
}
