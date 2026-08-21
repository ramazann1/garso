import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bike,
  Check,
  ChevronRight,
  CircleCheckBig,
  Clock,
  MessageSquareText,
  ShoppingBag,
  Undo2,
  UtensilsCrossed,
} from "lucide-react";
import { istasyonlariGetir } from "../yazicilar";
import type { Istasyon } from "../yazicilar";
import { hazirGeriAl, hazirYap, kartlariGetir, mutfagiDinle } from "../mutfak";
import type { MutfakKarti } from "../mutfak";
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
  const [seciliId, setSeciliId] = useState<number | null>(() => {
    const kayit = localStorage.getItem(ISTASYON_ANAHTARI);
    return kayit ? Number(kayit) : null;
  });
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    istasyonlariGetir().then((liste) => {
      setIstasyonlar(liste);
      // Tek tezgâhı olan işletmede seçtirmenin anlamı yok.
      setSeciliId((s) => (liste.some((i) => i.id === s) ? s : liste.length === 1 ? liste[0].id : null));
      setYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    if (seciliId) localStorage.setItem(ISTASYON_ANAHTARI, String(seciliId));
  }, [seciliId]);

  if (yukleniyor) {
    return <div className="yukleniyor"><div className="cember" /></div>;
  }

  const secili = istasyonlar.find((i) => i.id === seciliId);

  if (!secili) {
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
          <div className="m-liste">
            {istasyonlar.map((i) => (
              <button key={i.id} className="m-satir" onClick={() => setSeciliId(i.id)}>
                <span>{i.ad}</span>
                <ChevronRight size={18} style={{ marginLeft: "auto" }} />
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <Ekran
      istasyon={secili}
      cokIstasyon={istasyonlar.length > 1}
      onDegistir={() => setSeciliId(null)}
    />
  );
}

function Ekran({
  istasyon,
  cokIstasyon,
  onDegistir,
}: {
  istasyon: Istasyon;
  cokIstasyon: boolean;
  onDegistir: () => void;
}) {
  const [bekleyen, setBekleyen] = useState<MutfakKarti[]>([]);
  const [hazirlanan, setHazirlanan] = useState<MutfakKarti[]>([]);
  const [sekme, setSekme] = useState<"bekleyen" | "hazirlanan">("bekleyen");
  // Son işaretlenen kalemler; geri alma şeridi bunlara bakıyor.
  const [sonHazir, setSonHazir] = useState<number[] | null>(null);
  const sonHazirZaman = useRef(0);

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
    // Canlı bağlantı kopabilir (mutfakta kablosuz zayıf olur); yoklama yedekte.
    const kanaliKapat = mutfagiDinle(yenile);
    const yoklama = setInterval(yenile, 30000);
    return () => {
      kanaliKapat();
      clearInterval(yoklama);
    };
  }, [yenile]);

  const isaretle = async (kalemIdler: number[]) => {
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
  };

  const geriAl = async (kalemIdler: number[]) => {
    setSonHazir(null);
    await hazirGeriAl(kalemIdler);
    yenile();
  };

  // Geri alma şeridi on saniye duruyor: yanlış dokunuş hemen fark ediliyor,
  // sürekli ekranda kalsa kartların önünü kapatırdı.
  const geriAlinabilir = sonHazir && Date.now() - sonHazirZaman.current < 10000 ? sonHazir : null;
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
              <h1>{istasyon.ad}</h1>
              <ChevronRight size={19} />
            </button>
          ) : (
            <h1>{istasyon.ad}</h1>
          )}
          <p className="m-baslik-alt">
            {bekleyenAdet > 0 ? `${bekleyenAdet} ürün hazırlanıyor` : "Bekleyen sipariş yok"}
          </p>
        </div>
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
                onKalem={(id) => isaretle([id])}
                onTumu={() => isaretle(kart.kalemler.map((k) => k.id))}
              />
            ))}
          </div>
        )
      ) : hazirlanan.length === 0 ? (
        <div className="m-bos">
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
                  <button onClick={() => geriAl([k.id])} aria-label="Geri al">
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
          <span>Hazır olarak işaretlendi.</span>
          <button onClick={() => geriAl(geriAlinabilir)}>
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
    <article className={geciken ? "m-kart geciken" : "m-kart"}>
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
        {kart.kalemler.map((k) => (
          <button key={k.id} className="m-kart-kalem" onClick={() => onKalem(k.id)}>
            <span className="m-kart-adet">{adetGoster(k.adet)}</span>
            <span className="m-kart-urun">
              {k.ad}
              {(k.porsiyon || k.secimler.length > 0) && (
                <small>{[k.porsiyon, ...k.secimler].filter(Boolean).join(" · ")}</small>
              )}
              {k.not && (
                <em>
                  <MessageSquareText size={14} />
                  {k.not}
                </em>
              )}
            </span>
            <Check size={20} />
          </button>
        ))}
      </div>

      <button className="m-dugme genis" onClick={onTumu}>
        <CircleCheckBig size={18} /> Tümü hazır
      </button>
    </article>
  );
}
