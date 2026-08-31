import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronRight,
  CircleCheckBig,
  Clock,
  Flame,
  MessageSquareText,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Undo2,
  UtensilsCrossed,
} from "lucide-react";
import { ayarlar } from "../isletmeAyarlari";
import { istasyonlariGetir } from "../yazicilar";
import {
  ASAMA_ADI,
  asamadanCik,
  asamayaAl,
  bulunanAsama,
  istasyonAsamalari,
  kartlariGetir,
  mutfagiDinle,
  siradakiAsama,
} from "../mutfak";
import type { Istasyon } from "../yazicilar";
import type { Asama, MutfakKalemi, MutfakKarti } from "../mutfak";
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

/** Durakların ortak sırası; kartta farklı akıştaki tezgâhlar yan yana olabiliyor. */
const DURAK_SIRASI: Asama[] = ["hazirlik", "paketleme", "hazir"];

/** Düğmenin ikonu gidilecek durağı anlatıyor: ocak, paket, bitti. */
function AsamaIkonu({ asama }: { asama: Asama }) {
  if (asama === "hazirlik") return <Flame />;
  if (asama === "paketleme") return <Package />;
  return <Check />;
}

function TipIkonu({ tip }: { tip: AdisyonTipi }) {
  if (tip === "paket") return <Bike />;
  if (tip === "gelal") return <ShoppingBag />;
  return <UtensilsCrossed />;
}

/** Adresteki "1,2" gibi bölümü tezgâh kimliklerine çeviriyor. */
function adrestenIdler(deger?: string) {
  return (deger ?? "")
    .split(",")
    .map((p) => Number(p))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export default function Istasyon() {
  const { istasyonId } = useParams();
  const navigate = useNavigate();
  const [istasyonlar, setIstasyonlar] = useState<Istasyon[]>([]);

  useEffect(() => {
    istasyonlariGetir().then(setIstasyonlar);
  }, []);

  const idler = adrestenIdler(istasyonId);
  const secililer = istasyonlar.filter((i) => idler.includes(i.id));

  // Adres elle yazılmış ya da istasyon silinmiş olabilir; seçim ekranına dönüyor.
  if (idler.length && istasyonlar.length && !secililer.length) {
    return <Secim istasyonlar={istasyonlar} />;
  }
  if (!idler.length) return <Secim istasyonlar={istasyonlar} />;
  if (!secililer.length) return <div className="istasyon-yukleniyor">Yükleniyor…</div>;

  return <Ekran istasyonlar={secililer} onCik={() => navigate("/istasyon")} />;
}

/**
 * Giriş: hangi tezgâhın ekranı açılıyor. Satıra dokunmak o tezgâhı tek başına
 * açıyor — en sık durum bu. Küçük mutfakta ızgaraya ve tatlıya aynı kişi
 * bakıyorsa soldaki kutular işaretlenip hepsi tek ekrana alınıyor.
 */
function Secim({ istasyonlar }: { istasyonlar: Istasyon[] }) {
  const navigate = useNavigate();
  const [isaretli, setIsaretli] = useState<number[]>([]);

  const cevir = (id: number) =>
    setIsaretli((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

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
                <button
                  className={`istasyon-secim-kutucuk${isaretli.includes(i.id) ? " secili" : ""}`}
                  onClick={() => cevir(i.id)}
                  aria-label={`${i.ad} tezgâhını birlikte aç`}
                >
                  {isaretli.includes(i.id) && <Check />}
                </button>
                <button onClick={() => navigate(`/istasyon/${i.id}`)}>
                  <span>{i.ad}</span>
                  <ChevronRight />
                </button>
              </li>
            ))}
          </ul>
        )}

        {isaretli.length > 0 && (
          <button
            className="istasyon-birlikte"
            onClick={() => navigate(`/istasyon/${isaretli.join(",")}`)}
          >
            {isaretli.length === 1
              ? "Seçilen tezgâhı aç"
              : `${isaretli.length} tezgâhı birlikte aç`}
          </button>
        )}

        <button className="istasyon-geri-baglanti" onClick={() => navigate("/")}>
          <ArrowLeft /> Salona dön
        </button>
      </div>
    </div>
  );
}

function Ekran({ istasyonlar, onCik }: { istasyonlar: Istasyon[]; onCik: () => void }) {
  const [bekleyen, setBekleyen] = useState<MutfakKarti[]>([]);
  const [hazirlanan, setHazirlanan] = useState<MutfakKarti[]>([]);
  const [panelAcik, setPanelAcik] = useState(false);
  const [boyut, setBoyut] = useState(
    () => localStorage.getItem(BOYUT_ANAHTARI) ?? "orta"
  );
  // Son işaretlenen kalemler ve hangi durağa alındıkları; geri alma düğmesi
  // bunlara bakıyor.
  const [sonIslem, setSonIslem] = useState<{ idler: number[]; asama: Asama } | null>(null);
  const sonIslemZaman = useRef<number>(0);

  useSaniye();

  const idler = useMemo(() => istasyonlar.map((i) => i.id), [istasyonlar]);
  const anahtar = idler.join(",");

  const yenile = useCallback(async () => {
    const liste = anahtar.split(",").map(Number);
    const [b, h] = await Promise.all([
      kartlariGetir(liste),
      kartlariGetir(liste, true),
    ]);
    setBekleyen(b);
    setHazirlanan(h);
  }, [anahtar]);

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

  async function isaretle(kalemIdler: number[], asama: Asama) {
    // Ekran beklemesin: kalem hemen yeni hâline geçiyor, veritabanı arkadan
    // yetişiyor. Hazır olan karttan kalkıyor, ara durakta kalan yerinde duruyor.
    const simdi = new Date().toISOString();
    setBekleyen((k) =>
      k
        .map((kart) => ({
          ...kart,
          kalemler:
            asama === "hazir"
              ? kart.kalemler.filter((x) => !kalemIdler.includes(x.id))
              : kart.kalemler.map((x) =>
                  kalemIdler.includes(x.id)
                    ? {
                        ...x,
                        ...(asama === "hazirlik"
                          ? { hazirlikAt: simdi }
                          : { paketlemeAt: simdi }),
                      }
                    : x
                ),
        }))
        .filter((kart) => kart.kalemler.length)
    );
    setSonIslem({ idler: kalemIdler, asama });
    sonIslemZaman.current = Date.now();
    await asamayaAl(kalemIdler, asama);
    yenile();
  }

  async function geriAl(kalemIdler: number[], asama: Asama) {
    setSonIslem(null);
    await asamadanCik(kalemIdler, asama);
    yenile();
  }

  // Geri alma şeridi on saniye duruyor: yanlış dokunuş hemen fark ediliyor,
  // sürekli ekranda kalsa tezgâhın önünü kapatırdı.
  const geriAlinabilir =
    sonIslem && Date.now() - sonIslemZaman.current < 10000 ? sonIslem : null;

  // Akış tezgâh bazında: Mutfak'ta "Hazırlanıyor" açıkken Bar'da kapalı
  // olabiliyor, o yüzden kalemin kendi istasyonuna bakılıyor. Anahtarlar
  // kapalıysa tek durak kalıyor ve ekran eskisi gibi çalışıyor.
  const tezgahlar = useMemo(
    () => new Map(istasyonlar.map((i) => [i.id, i])),
    [istasyonlar]
  );
  const asamalarOf = useCallback(
    (kalem: { istasyonId: number }) => {
      const t = tezgahlar.get(kalem.istasyonId);
      return istasyonAsamalari(t ?? { pisirme: false, paketleme: false });
    },
    [tezgahlar]
  );
  // Tek tezgâhta ürünün yanına tezgâh adı yazmak gereksiz gürültü.
  const tezgahAdi = useCallback(
    (kalem: { istasyonId: number }) =>
      istasyonlar.length > 1 ? tezgahlar.get(kalem.istasyonId)?.ad : undefined,
    [istasyonlar.length, tezgahlar]
  );

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
          <h1>{istasyonlar.map((i) => i.ad).join(" + ")}</h1>
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
                asamalarOf={asamalarOf}
                tezgahAdi={tezgahAdi}
                onKalem={isaretle}
                onTumu={isaretle}
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
                      <button onClick={() => geriAl([k.id], "hazir")} title="Geri al">
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
          <span>{ASAMA_ADI[geriAlinabilir.asama].gecmis}.</span>
          <button onClick={() => geriAl(geriAlinabilir.idler, geriAlinabilir.asama)}>
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
  asamalarOf,
  tezgahAdi,
  onKalem,
  onTumu,
}: {
  kart: MutfakKarti;
  gecikme: number;
  asamalarOf: (kalem: MutfakKalemi) => Asama[];
  tezgahAdi: (kalem: MutfakKalemi) => string | undefined;
  onKalem: (kalemIdler: number[], asama: Asama) => void;
  onTumu: (kalemIdler: number[], asama: Asama) => void;
}) {
  const dakika = (Date.now() - new Date(kart.olusturma).getTime()) / 60000;
  const geciken = gecikme > 0 && dakika >= gecikme;

  // Kartın düğmesi en geride kalan kaleme göre yazıyor: "Tümü hazır" demeden
  // önce hepsinin hazırlıktan geçmesi gerekiyorsa düğme önce onu söylüyor.
  // Kartta iki tezgâhın ürünü olabildiği için sıra kalemin kendi akışından
  // değil, ortak durak sırasından okunuyor.
  const siradakiler = kart.kalemler.map((k) => ({ k, s: siradakiAsama(k, asamalarOf(k)) }));
  const enGeri = DURAK_SIRASI.find((a) => siradakiler.some((x) => x.s === a));
  const toplu = siradakiler.filter((x) => x.s === enGeri).map((x) => x.k);

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
        {kart.kalemler.map((k) => {
          const kalemAsamalari = asamalarOf(k);
          const sirada = siradakiAsama(k, kalemAsamalari);
          const durak = bulunanAsama(k, kalemAsamalari);
          const tezgah = tezgahAdi(k);
          return (
            <li key={k.id} className={durak ? `istasyon-asamada ${durak}` : undefined}>
              <span className="istasyon-adet">{adetGoster(k.adet)}</span>
              <div className="istasyon-urun">
                <strong>{k.ad}</strong>
                {(k.porsiyon || k.secimler.length > 0 || tezgah) && (
                  <span>
                    {[tezgah, k.porsiyon, ...k.secimler].filter(Boolean).join(" · ")}
                  </span>
                )}
                {/* Ara duraktaki kalem kartta kalıyor; nerede olduğu rozette
                    yazıyor ki iki aşçı aynı ürüne baştan başlamasın. */}
                {durak && <b className="istasyon-asama-rozet">{ASAMA_ADI[durak].simdi}</b>}
                {k.not && (
                  <em>
                    <MessageSquareText />
                    {k.not}
                  </em>
                )}
              </div>
              {sirada && (
                <button
                  onClick={() => onKalem([k.id], sirada)}
                  title={ASAMA_ADI[sirada].dugme}
                >
                  <AsamaIkonu asama={sirada} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {enGeri && (
        <button
          className="istasyon-tumu"
          onClick={() => onTumu(toplu.map((k) => k.id), enGeri)}
        >
          {enGeri === "hazir" ? <CircleCheckBig /> : <AsamaIkonu asama={enGeri} />}
          {enGeri === "hazir" ? "Tümü hazır" : `Tümü ${ASAMA_ADI[enGeri].simdi.toLowerCase()}`}
        </button>
      )}
    </article>
  );
}
