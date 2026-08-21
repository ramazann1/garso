import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronRight,
  CircleCheckBig,
  Clock,
  MessageSquareText,
  Minus,
  Plus,
  ShoppingBag,
  Undo2,
  UtensilsCrossed,
} from "lucide-react";
import { ayarlar } from "../isletmeAyarlari";
import { istasyonlariGetir } from "../yazicilar";
import { hazirGeriAl, hazirYap, kartlariGetir, mutfagiDinle } from "../mutfak";
import type { Istasyon } from "../yazicilar";
import type { MutfakKarti } from "../mutfak";
import { adetGoster } from "../para";
import type { AdisyonTipi } from "../adisyonlar";

// Yazı boyutu tezgâhın kendi tercihi: aynı işletmede mutfak tabletle, bar
// duvardaki televizyonla çalışabiliyor. Bu yüzden sunucuda değil cihazda.
const BOYUT_ANAHTARI = "garso-istasyon-boyut";
const BOYUTLAR = [
  { kod: "kucuk", ad: "Küçük" },
  { kod: "orta", ad: "Orta" },
  { kod: "buyuk", ad: "Büyük" },
];

/** Kart sayacı saniye saniye işliyor; ekran dakikada bir değil, sürekli canlı. */
function useSaniye() {
  const [, tik] = useState(0);
  useEffect(() => {
    const s = setInterval(() => tik((n) => n + 1), 1000);
    return () => clearInterval(s);
  }, []);
}

function gecenSure(baslangic: string) {
  const saniye = Math.max(0, Math.floor((Date.now() - new Date(baslangic).getTime()) / 1000));
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  if (dk < 60) return `${dk}:${String(sn).padStart(2, "0")}`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

function saat(zaman: string) {
  return new Date(zaman).toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });
}

function TipIkonu({ tip }: { tip: AdisyonTipi }) {
  if (tip === "paket") return <Bike />;
  if (tip === "gelal") return <ShoppingBag />;
  return <UtensilsCrossed />;
}

export default function Istasyon() {
  const { istasyonId } = useParams();
  const navigate = useNavigate();
  const [istasyonlar, setIstasyonlar] = useState<Istasyon[]>([]);

  useEffect(() => {
    istasyonlariGetir().then(setIstasyonlar);
  }, []);

  const secili = istasyonlar.find((i) => String(i.id) === istasyonId);

  // Adres elle yazılmış ya da istasyon silinmiş olabilir; seçim ekranına dönüyor.
  if (istasyonId && istasyonlar.length && !secili) {
    return <Secim istasyonlar={istasyonlar} />;
  }
  if (!istasyonId) return <Secim istasyonlar={istasyonlar} />;
  if (!secili) return <div className="istasyon-yukleniyor">Yükleniyor…</div>;

  return <Ekran istasyon={secili} onCik={() => navigate("/istasyon")} />;
}

/** Giriş: hangi tezgâhın ekranı açılıyor. Her istasyon kendi cihazında duruyor. */
function Secim({ istasyonlar }: { istasyonlar: Istasyon[] }) {
  const navigate = useNavigate();

  return (
    <div className="istasyon-secim">
      <div className="istasyon-secim-kutu">
        <header>
          <UtensilsCrossed />
          <div>
            <h1>İstasyon Ekranı</h1>
            <p>Bu cihaz hangi tezgâhın siparişlerini gösterecek?</p>
          </div>
        </header>

        {istasyonlar.length === 0 ? (
          <p className="istasyon-bos-tanim">
            Henüz istasyon tanımlanmamış. İşletme Ayarları → Yazıcılar →
            İstasyonlar bölümünden mutfak, bar gibi tezgâhları ekleyin.
          </p>
        ) : (
          <ul>
            {istasyonlar.map((i) => (
              <li key={i.id}>
                <button onClick={() => navigate(`/istasyon/${i.id}`)}>
                  <span>{i.ad}</span>
                  <ChevronRight />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="istasyon-geri-baglanti" onClick={() => navigate("/")}>
          <ArrowLeft /> Salona dön
        </button>
      </div>
    </div>
  );
}

function Ekran({ istasyon, onCik }: { istasyon: Istasyon; onCik: () => void }) {
  const [bekleyen, setBekleyen] = useState<MutfakKarti[]>([]);
  const [hazirlanan, setHazirlanan] = useState<MutfakKarti[]>([]);
  const [panelAcik, setPanelAcik] = useState(false);
  const [boyut, setBoyut] = useState(
    () => localStorage.getItem(BOYUT_ANAHTARI) ?? "orta"
  );
  // Son işaretlenen kalemler; geri alma düğmesi bunlara bakıyor.
  const [sonHazir, setSonHazir] = useState<number[] | null>(null);
  const sonHazirZaman = useRef<number>(0);

  useSaniye();

  const yenile = useCallback(async () => {
    const [b, h] = await Promise.all([
      kartlariGetir(istasyon.id),
      kartlariGetir(istasyon.id, true),
    ]);
    setBekleyen(b);
    setHazirlanan(h);
  }, [istasyon.id]);

  useEffect(() => {
    yenile();
    // Canlı bağlantı kopabilir (mutfakta kablosuz zayıf olur); yoklama yedekte
    // duruyor, sipariş en kötü ihtimalle yarım dakika sonra görünüyor.
    const kanaliKapat = mutfagiDinle(yenile);
    const yoklama = setInterval(yenile, 30000);
    return () => {
      kanaliKapat();
      clearInterval(yoklama);
    };
  }, [yenile]);

  useEffect(() => {
    localStorage.setItem(BOYUT_ANAHTARI, boyut);
  }, [boyut]);

  const gecikme = ayarlar().mutfakGecikmeDk;

  async function isaretle(kalemIdler: number[]) {
    // Ekran beklemesin: kalemler hemen kalkıyor, veritabanı arkadan yetişiyor.
    setBekleyen((k) =>
      k
        .map((kart) => ({
          ...kart,
          kalemler: kart.kalemler.filter((x) => !kalemIdler.includes(x.id)),
        }))
        .filter((kart) => kart.kalemler.length)
    );
    setSonHazir(kalemIdler);
    sonHazirZaman.current = Date.now();
    await hazirYap(kalemIdler);
    yenile();
  }

  async function geriAl(kalemIdler: number[]) {
    setSonHazir(null);
    await hazirGeriAl(kalemIdler);
    yenile();
  }

  // Geri alma şeridi on saniye duruyor: yanlış dokunuş hemen fark ediliyor,
  // sürekli ekranda kalsa tezgâhın önünü kapatırdı.
  const geriAlinabilir =
    sonHazir && Date.now() - sonHazirZaman.current < 10000 ? sonHazir : null;

  const bekleyenAdet = useMemo(
    () => bekleyen.reduce((t, k) => t + k.kalemler.length, 0),
    [bekleyen]
  );

  return (
    <div className={`istasyon istasyon-${boyut}`}>
      <header className="istasyon-ust">
        <button className="istasyon-cik" onClick={onCik}>
          <ArrowLeft />
        </button>

        <div className="istasyon-ad">
          <h1>{istasyon.ad}</h1>
          <span>
            {bekleyenAdet > 0
              ? `${bekleyenAdet} ürün hazırlanıyor`
              : "Bekleyen sipariş yok"}
          </span>
        </div>

        <div className="istasyon-araclar">
          <div className="istasyon-boyut">
            <button
              onClick={() =>
                setBoyut(BOYUTLAR[Math.max(0, BOYUTLAR.findIndex((b) => b.kod === boyut) - 1)].kod)
              }
              disabled={boyut === BOYUTLAR[0].kod}
              title="Yazıyı küçült"
            >
              <Minus />
            </button>
            <span>{BOYUTLAR.find((b) => b.kod === boyut)?.ad}</span>
            <button
              onClick={() =>
                setBoyut(
                  BOYUTLAR[
                    Math.min(BOYUTLAR.length - 1, BOYUTLAR.findIndex((b) => b.kod === boyut) + 1)
                  ].kod
                )
              }
              disabled={boyut === BOYUTLAR[BOYUTLAR.length - 1].kod}
              title="Yazıyı büyüt"
            >
              <Plus />
            </button>
          </div>

          <button
            className={`istasyon-panel-dugme${panelAcik ? " acik" : ""}`}
            onClick={() => setPanelAcik((a) => !a)}
          >
            <CircleCheckBig />
            Hazırlananlar
            {hazirlanan.length > 0 && <b>{hazirlanan.length}</b>}
          </button>
        </div>
      </header>

      <div className="istasyon-govde">
        <main className="istasyon-kartlar">
          {bekleyen.length === 0 ? (
            <div className="istasyon-bos">
              <CircleCheckBig />
              <p>Tezgâh boş</p>
              <span>Yeni sipariş geldiğinde kendiliğinden görünecek.</span>
            </div>
          ) : (
            bekleyen.map((kart) => (
              <Kart
                key={kart.turId}
                kart={kart}
                gecikme={gecikme}
                onKalem={(id) => isaretle([id])}
                onTumu={() => isaretle(kart.kalemler.map((k) => k.id))}
              />
            ))
          )}
        </main>

        {panelAcik && (
          <aside className="istasyon-panel">
            <h2>Hazırlananlar</h2>
            {hazirlanan.length === 0 ? (
              <p className="istasyon-panel-bos">Bu vardiyada henüz hazırlanan yok.</p>
            ) : (
              hazirlanan.map((kart) => (
                <div className="istasyon-panel-kart" key={kart.turId}>
                  <header>
                    <strong>{kart.masa}</strong>
                    {kart.siparisNo && <span>#{kart.siparisNo}</span>}
                  </header>
                  {kart.kalemler.map((k) => (
                    <div className="istasyon-panel-satir" key={k.id}>
                      <Check />
                      <span>
                        {k.adet !== 1 && `${adetGoster(k.adet)} × `}
                        {k.ad}
                        {k.porsiyon && ` · ${k.porsiyon}`}
                      </span>
                      {k.hazirAt && <time>{saat(k.hazirAt)}</time>}
                      <button onClick={() => geriAl([k.id])} title="Geri al">
                        <Undo2 />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </aside>
        )}
      </div>

      {geriAlinabilir && (
        <div className="istasyon-geri-serit">
          <span>Hazır olarak işaretlendi.</span>
          <button onClick={() => geriAl(geriAlinabilir)}>
            <Undo2 /> Geri al
          </button>
        </div>
      )}
    </div>
  );
}

function Kart({
  kart,
  gecikme,
  onKalem,
  onTumu,
}: {
  kart: MutfakKarti;
  gecikme: number;
  onKalem: (kalemId: number) => void;
  onTumu: () => void;
}) {
  const dakika = (Date.now() - new Date(kart.olusturma).getTime()) / 60000;
  const geciken = gecikme > 0 && dakika >= gecikme;

  return (
    <article className={`istasyon-kart${geciken ? " geciken" : ""}`}>
      <header>
        <div className="istasyon-kart-masa">
          <TipIkonu tip={kart.tip} />
          <div>
            {/* Siparişi kimin yazdığı masa adının üstünde: tezgâh hazırlananı
                kime seslenerek vereceğini künye satırını okumadan görüyor. */}
            {kart.garson && <em>{kart.garson}</em>}
            <strong>{kart.masa}</strong>
            <span>
              {kart.siparisNo ? `#${kart.siparisNo}` : `Adisyon ${kart.adisyonNo ?? ""}`}
              {kart.kisiSayisi ? ` · ${kart.kisiSayisi} kişi` : ""}
            </span>
          </div>
        </div>
        <div className="istasyon-kart-sure">
          <Clock />
          {gecenSure(kart.olusturma)}
        </div>
      </header>

      {kart.not && (
        <p className="istasyon-kart-not">
          <MessageSquareText />
          {kart.not}
        </p>
      )}

      <ul>
        {kart.kalemler.map((k) => (
          <li key={k.id}>
            <span className="istasyon-adet">{adetGoster(k.adet)}</span>
            <div className="istasyon-urun">
              <strong>{k.ad}</strong>
              {(k.porsiyon || k.secimler.length > 0) && (
                <span>{[k.porsiyon, ...k.secimler].filter(Boolean).join(" · ")}</span>
              )}
              {k.not && (
                <em>
                  <MessageSquareText />
                  {k.not}
                </em>
              )}
            </div>
            <button onClick={() => onKalem(k.id)} title="Hazır">
              <Check />
            </button>
          </li>
        ))}
      </ul>

      <button className="istasyon-tumu" onClick={onTumu}>
        <CircleCheckBig /> Tümü hazır
      </button>
    </article>
  );
}
