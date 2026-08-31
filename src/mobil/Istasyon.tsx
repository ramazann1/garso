import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bike,
  ChefHat,
  Check,
  ChevronRight,
  CircleCheckBig,
  Clock,
  Flame,
  MessageSquareText,
  Package,
  RotateCw,
  ShoppingBag,
  Undo2,
  UtensilsCrossed,
} from "lucide-react";
import { istasyonlariGetir } from "../yazicilar";
import type { Istasyon } from "../yazicilar";
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
import type { Asama, MutfakKalemi, MutfakKarti } from "../mutfak";
import { ayarlar } from "../isletmeAyarlari";
import { adetGoster } from "../para";
import type { AdisyonTipi } from "../adisyonlar";

// Hangi tezgâhın ekranı olduğu cihazda duruyor: mutfaktaki telefon her
// açılışta aynı soruyu sormasın.
const ISTASYON_ANAHTARI = "garso-mobil-istasyon";

function gecenSure(baslangic: string) {
  const saniye = Math.max(0, Math.floor((Date.now() - new Date(baslangic).getTime()) / 1000));
  const dk = Math.floor(saniye / 60);
  if (dk < 60) return `${dk}:${String(saniye % 60).padStart(2, "0")}`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

function saat(zaman: string) {
  return new Date(zaman).toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" });
}

/** Durakların ortak sırası; kartta farklı akıştaki tezgâhlar yan yana olabiliyor. */
const DURAK_SIRASI: Asama[] = ["hazirlik", "paketleme", "hazir"];

/** Düğmenin ikonu gidilecek durağı anlatıyor: ocak, paket, bitti. */
function AsamaIkonu({ asama }: { asama: Asama }) {
  if (asama === "hazirlik") return <Flame size={20} />;
  if (asama === "paketleme") return <Package size={20} />;
  return <Check size={20} />;
}

function TipIkonu({ tip }: { tip: AdisyonTipi }) {
  if (tip === "paket") return <Bike size={16} />;
  if (tip === "gelal") return <ShoppingBag size={16} />;
  return <UtensilsCrossed size={16} />;
}

/** Kart sayacı saniye saniye işliyor; ekran sürekli canlı. */
function useSaniye() {
  const [, tik] = useState(0);
  useEffect(() => {
    const s = setInterval(() => tik((n) => n + 1), 1000);
    return () => clearInterval(s);
  }, []);
}

/**
 * Mobil istasyon ekranı.
 *
 * Masaüstü İstasyon ekranı tezgâhtaki tablet ve televizyon için yazıldı —
 * çok sütunlu ızgara, yazı boyutu ayarı, yan panel. Telefonda hepsi daralıyor:
 * burada kartlar tek sütun, bekleyen ve hazırlanan iki sekme, kalem işaretleme
 * parmakla basılacak büyüklükte. Veri katmanı ortak (`mutfak.ts`), canlı
 * dinleme ve yoklama aynı.
 */
export default function MobilIstasyon() {
  const [istasyonlar, setIstasyonlar] = useState<Istasyon[]>([]);
  const [seciliIdler, setSeciliIdler] = useState<number[]>(() => {
    const kayit = localStorage.getItem(ISTASYON_ANAHTARI);
    return (kayit ?? "").split(",").map(Number).filter((n) => n > 0);
  });
  // Birlikte açılacaklar seçilirken işaretlenenler; henüz ekran açılmıyor.
  const [isaretli, setIsaretli] = useState<number[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    istasyonlariGetir().then((liste) => {
      setIstasyonlar(liste);
      // Tek tezgâhı olan işletmede seçtirmenin anlamı yok.
      setSeciliIdler((s) => {
        const kalan = s.filter((id) => liste.some((i) => i.id === id));
        return kalan.length ? kalan : liste.length === 1 ? [liste[0].id] : [];
      });
      setYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    if (seciliIdler.length) {
      localStorage.setItem(ISTASYON_ANAHTARI, seciliIdler.join(","));
    }
  }, [seciliIdler]);

  if (yukleniyor) {
    return <div className="yukleniyor"><div className="cember" /></div>;
  }

  const secililer = istasyonlar.filter((i) => seciliIdler.includes(i.id));

  if (!secililer.length) {
    const cevir = (id: number) =>
      setIsaretli((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    return (
      <>
        <header className="m-baslik">
          <div>
            <h1>İstasyon</h1>
            <p className="m-baslik-alt">Bu cihaz hangi tezgâhı gösterecek?</p>
          </div>
        </header>

        {istasyonlar.length === 0 ? (
          <div className="m-bos">
            <p>Henüz istasyon tanımlanmamış. Kasadan İşletme Ayarları → Yazıcılar → İstasyonlar.</p>
          </div>
        ) : (
          <div className="m-istasyon-sec">
            {istasyonlar.map((i) => (
              <div key={i.id} className="m-istasyon-satir">
                {/* Soldaki kutu birden çok tezgâhı aynı ekrana almak için;
                    satırın kendisi eskisi gibi tek tezgâhı açıyor. */}
                <button
                  className={`m-istasyon-kutucuk${isaretli.includes(i.id) ? " secili" : ""}`}
                  onClick={() => cevir(i.id)}
                  aria-label={`${i.ad} tezgâhını birlikte aç`}
                >
                  {isaretli.includes(i.id) && <Check size={16} />}
                </button>
                <button onClick={() => setSeciliIdler([i.id])}>
                  <ChefHat size={19} />
                  <span>{i.ad}</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isaretli.length > 0 && (
          <button className="m-dugme genis" onClick={() => setSeciliIdler(isaretli)}>
            {isaretli.length === 1
              ? "Seçilen tezgâhı aç"
              : `${isaretli.length} tezgâhı birlikte aç`}
          </button>
        )}
      </>
    );
  }

  return (
    <Ekran
      istasyonlar={secililer}
      cokIstasyon={istasyonlar.length > 1}
      onDegistir={() => {
        setIsaretli([]);
        setSeciliIdler([]);
      }}
    />
  );
}

function Ekran({
  istasyonlar,
  cokIstasyon,
  onDegistir,
}: {
  istasyonlar: Istasyon[];
  cokIstasyon: boolean;
  onDegistir: () => void;
}) {
  const [bekleyen, setBekleyen] = useState<MutfakKarti[]>([]);
  const [hazirlanan, setHazirlanan] = useState<MutfakKarti[]>([]);
  const [sekme, setSekme] = useState<"bekleyen" | "hazirlanan">("bekleyen");
  // Son işaretlenen kalemler; geri alma şeridi bunlara bakıyor.
  const [sonIslem, setSonIslem] = useState<{ idler: number[]; asama: Asama } | null>(null);
  const sonIslemZaman = useRef(0);

  useSaniye();

  const anahtar = istasyonlar.map((i) => i.id).join(",");

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
    // Canlı bağlantı kopabilir (mutfakta kablosuz zayıf olur); yoklama yedekte.
    const kanaliKapat = mutfagiDinle(yenile);
    const yoklama = setInterval(yenile, 30000);
    return () => {
      kanaliKapat();
      clearInterval(yoklama);
    };
  }, [yenile]);

  const isaretle = async (kalemIdler: number[], asama: Asama) => {
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
                        ...(asama === "hazirlik" ? { hazirlikAt: simdi } : { paketlemeAt: simdi }),
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
  };

  const geriAl = async (kalemIdler: number[], asama: Asama) => {
    setSonIslem(null);
    await asamadanCik(kalemIdler, asama);
    yenile();
  };

  // Geri alma şeridi on saniye duruyor: yanlış dokunuş hemen fark ediliyor,
  // sürekli ekranda kalsa kartların önünü kapatırdı.
  const geriAlinabilir =
    sonIslem && Date.now() - sonIslemZaman.current < 10000 ? sonIslem : null;
  // Akış tezgâh bazında: kalemin kendi istasyonuna bakılıyor.
  const tezgahlar = new Map(istasyonlar.map((i) => [i.id, i]));
  const asamalarOf = (kalem: MutfakKalemi) =>
    istasyonAsamalari(tezgahlar.get(kalem.istasyonId) ?? { pisirme: false, paketleme: false });
  // Tek tezgâhta ürünün yanına tezgâh adı yazmak gereksiz gürültü.
  const tezgahAdi = (kalem: MutfakKalemi) =>
    istasyonlar.length > 1 ? tezgahlar.get(kalem.istasyonId)?.ad : undefined;
  const bekleyenAdet = bekleyen.reduce((t, k) => t + k.kalemler.length, 0);
  const gecikme = ayarlar().mutfakGecikmeDk;

  return (
    <>
      <header className="m-baslik">
        <div>
          {/* Tezgâh adına dokunmak seçime dönüyor; tek istasyonlu işletmede
              dönülecek bir yer yok, düz başlık kalıyor. */}
          {cokIstasyon ? (
            <button className="m-istasyon-ad" onClick={onDegistir}>
              <h1>{istasyonlar.map((i) => i.ad).join(" + ")}</h1>
              <ChevronRight size={19} />
            </button>
          ) : (
            <h1>{istasyonlar.map((i) => i.ad).join(" + ")}</h1>
          )}
          <p className="m-baslik-alt">
            {bekleyenAdet > 0 ? `${bekleyenAdet} ürün hazırlanıyor` : "Bekleyen sipariş yok"}
          </p>
        </div>
        {/* Mutfakta kablosuz zayıf olunca canlı bağlantı düşüyor; elle
            tazeleme yoklamanın otuz saniyesini beklemeden kartı getiriyor. */}
        <button className="m-ikon-dugme" onClick={() => yenile()} aria-label="Yenile">
          <RotateCw size={20} />
        </button>
      </header>

      {/* İki liste telefonda yan yana sığmıyor; sekmeye ayrıldı. */}
      <div className="m-bolgeler">
        <button
          className={sekme === "bekleyen" ? "m-cip secili" : "m-cip"}
          onClick={() => setSekme("bekleyen")}
        >
          Bekleyen<span>{bekleyen.length}</span>
        </button>
        <button
          className={sekme === "hazirlanan" ? "m-cip secili" : "m-cip"}
          onClick={() => setSekme("hazirlanan")}
        >
          Hazırlanan<span>{hazirlanan.length}</span>
        </button>
      </div>

      {sekme === "bekleyen" ? (
        bekleyen.length === 0 ? (
          <div className="m-bos">
            <CircleCheckBig size={30} />
            <p>Tezgâh boş. Yeni sipariş geldiğinde kendiliğinden görünecek.</p>
          </div>
        ) : (
          <div className="m-kartlar">
            {bekleyen.map((kart) => (
              <Kart
                key={kart.turId}
                kart={kart}
                gecikme={gecikme}
                asamalarOf={asamalarOf}
                tezgahAdi={tezgahAdi}
                onKalem={isaretle}
                onTumu={isaretle}
              />
            ))}
          </div>
        )
      ) : hazirlanan.length === 0 ? (
        <div className="m-bos">
          <Check size={30} />
          <p>Bu vardiyada henüz hazırlanan yok.</p>
        </div>
      ) : (
        <div className="m-kartlar">
          {hazirlanan.map((kart) => (
            <article key={kart.turId} className="m-kart">
              <header className="m-kart-ust">
                <strong>{kart.masa}</strong>
                {kart.siparisNo ? <span>#{kart.siparisNo}</span> : null}
              </header>
              {kart.kalemler.map((k) => (
                <div key={k.id} className="m-hazir-satir">
                  <Check size={17} />
                  <span>
                    {k.adet !== 1 && `${adetGoster(k.adet)} × `}
                    {k.ad}
                    {k.porsiyon && ` · ${k.porsiyon}`}
                  </span>
                  {k.hazirAt && <time>{saat(k.hazirAt)}</time>}
                  <button onClick={() => geriAl([k.id], "hazir")} aria-label="Geri al">
                    <Undo2 size={17} />
                  </button>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

      {geriAlinabilir && (
        <div className="m-geri-serit">
          <span>{ASAMA_ADI[geriAlinabilir.asama].gecmis}.</span>
          <button onClick={() => geriAl(geriAlinabilir.idler, geriAlinabilir.asama)}>
            <Undo2 size={17} /> Geri al
          </button>
        </div>
      )}
    </>
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

  // Alttaki düğme en geride kalan kaleme göre yazıyor.
  // Kartta iki tezgâhın ürünü olabildiği için sıra ortak durak sırasından
  // okunuyor, kalemin kendi akışından değil.
  const siradakiler = kart.kalemler.map((k) => ({ k, s: siradakiAsama(k, asamalarOf(k)) }));
  const enGeri = DURAK_SIRASI.find((a) => siradakiler.some((x) => x.s === a));
  const toplu = siradakiler.filter((x) => x.s === enGeri).map((x) => x.k);

  return (
    <article className={geciken ? "m-kart seritli geciken" : "m-kart seritli"}>
      <header className="m-kart-ust">
        <span className="m-kart-masa">
          <TipIkonu tip={kart.tip} />
          <b>{kart.masa}</b>
          {kart.garson ? <em>{kart.garson}</em> : null}
        </span>
        <span className="m-kart-sure">
          <Clock size={15} />
          {gecenSure(kart.olusturma)}
        </span>
      </header>

      {kart.not && (
        <p className="m-kart-not">
          <MessageSquareText size={15} />
          {kart.not}
        </p>
      )}

      <div className="m-kart-kalemler">
        {kart.kalemler.map((k) => {
          const kalemAsamalari = asamalarOf(k);
          const sirada = siradakiAsama(k, kalemAsamalari);
          const durak = bulunanAsama(k, kalemAsamalari);
          const tezgah = tezgahAdi(k);
          return (
            <button
              key={k.id}
              className={durak ? "m-kart-kalem asamada" : "m-kart-kalem"}
              disabled={!sirada}
              onClick={() => sirada && onKalem([k.id], sirada)}
            >
              <span className="m-kart-adet">{adetGoster(k.adet)}</span>
              <span className="m-kart-urun">
                {k.ad}
                {(k.porsiyon || k.secimler.length > 0 || tezgah) && (
                  <small>{[tezgah, k.porsiyon, ...k.secimler].filter(Boolean).join(" · ")}</small>
                )}
                {/* Ara duraktaki kalem kartta kalıyor; nerede olduğu rozette
                    yazıyor ki iki aşçı aynı ürüne baştan başlamasın. */}
                {durak && <b className="m-asama-rozet">{ASAMA_ADI[durak].simdi}</b>}
                {k.not && (
                  <em>
                    <MessageSquareText size={14} />
                    {k.not}
                  </em>
                )}
              </span>
              <AsamaIkonu asama={sirada ?? "hazir"} />
            </button>
          );
        })}
      </div>

      {enGeri && (
        <button className="m-dugme genis" onClick={() => onTumu(toplu.map((k) => k.id), enGeri)}>
          {enGeri === "hazir" ? <CircleCheckBig size={18} /> : <AsamaIkonu asama={enGeri} />}
          {enGeri === "hazir" ? "Tümü hazır" : `Tümü ${ASAMA_ADI[enGeri].simdi.toLowerCase()}`}
        </button>
      )}
    </article>
  );
}
