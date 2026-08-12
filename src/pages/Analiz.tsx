import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Receipt,
  TrendingUp,
} from "lucide-react";
import Duzen, { analizBolumleri } from "../components/Duzen";
import Bilgi from "../components/Bilgi";
import AnalizFiltre from "../components/AnalizFiltre";
import AdisyonDetay from "../components/AdisyonDetay";
import { yolaGirebilir } from "../rotaYetkileri";
import { paraGoster } from "../para";
import { ayarlar } from "../isletmeAyarlari";
import {
  BOS_FILTRE,
  analizAdisyonlari,
  analizGiderleri,
  analizOzeti,
  type AnalizAdisyon,
  type AnalizFiltre as Filtre,
  type AnalizOzeti,
} from "../analiz";
import type { Masraf } from "../masraflar";

export default function Analiz() {
  const { bolum = "ozet" } = useParams();
  const navigate = useNavigate();

  const [filtre, setFiltre] = useState<Filtre>(BOS_FILTRE);
  const [adisyonlar, setAdisyonlar] = useState<AnalizAdisyon[]>([]);
  const [giderler, setGiderler] = useState<Masraf[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState<number | null>(null);
  // Adisyon yeniden açılınca liste eskiyor; sayaç değişince sorgu tekrarlanıyor.
  const [tazele, setTazele] = useState(0);

  // Filtre değişince tek sorgu atılıyor; altı sekme de aynı listeden besleniyor.
  useEffect(() => {
    let gecerli = true;
    setYukleniyor(true);
    Promise.all([analizAdisyonlari(filtre), analizGiderleri(filtre)]).then(([a, g]) => {
      if (!gecerli) return;
      setAdisyonlar(a);
      setGiderler(g);
      setYukleniyor(false);
    });
    return () => {
      gecerli = false;
    };
  }, [filtre, tazele]);

  const ozet = useMemo(() => analizOzeti(adisyonlar, giderler), [adisyonlar, giderler]);

  return (
    <Duzen>
      <div className="sayfa analiz-sayfa">
        <header className="menu-baslik">
          <div className="ayar-baslik-ust">
            <h1>Analiz</h1>
          </div>
          <div className="ms-sekmeler">
            {analizBolumleri
              .filter((b) => yolaGirebilir(b.yol))
              .map((b) => (
                <button
                  key={b.yol}
                  className={b.yol === `/analiz/${bolum}` ? "aktif" : ""}
                  onClick={() => navigate(b.yol)}
                >
                  {b.ad}
                </button>
              ))}
          </div>
        </header>

        <AnalizFiltre filtre={filtre} degistir={setFiltre} />

        {yukleniyor ? (
          <div className="yukleniyor">
            <div className="cember" />
          </div>
        ) : bolum === "ozet" ? (
          <Ozet ozet={ozet} />
        ) : bolum === "adisyonlar" ? (
          <Adisyonlar adisyonlar={adisyonlar} onSec={setSecili} />
        ) : (
          <Yapiliyor bolum={bolum} />
        )}
      </div>

      {secili && (
        <AdisyonDetay
          adisyonId={secili}
          onKapat={() => setSecili(null)}
          onDegisti={() => setTazele((s) => s + 1)}
        />
      )}
    </Duzen>
  );
}

const TIP_ADLARI = { masa: "Masa", gelal: "Gel Al", paket: "Paket" };

const saatMetni = (t: string) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const gunMetni = (t: string) =>
  new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });

/**
 * Adisyo aynı listeyi üç ayrı ekranda tekrarlıyor (Gün Sonu, Masa Siparişleri,
 * Vardiya Raporu); bizde tek liste var, gerisini filtre yapıyor.
 */
function Adisyonlar({
  adisyonlar,
  onSec,
}: {
  adisyonlar: AnalizAdisyon[];
  onSec: (id: number) => void;
}) {
  if (adisyonlar.length === 0) {
    return (
      <section className="ayar-bolum">
        <div className="ayar-bos">
          <ClipboardList size={30} />
          <p>Seçilen dönem ve filtrelerle eşleşen adisyon yok.</p>
        </div>
      </section>
    );
  }

  const topla = (alan: (a: AnalizAdisyon) => number) =>
    adisyonlar.reduce((t, a) => t + alan(a), 0);

  return (
    <section className="ayar-bolum">
      <div className="analiz-liste-ust">
        <h2>
          <ClipboardList size={17} /> {adisyonlar.length} adisyon
        </h2>
      </div>

      <div className="tablo-kaydir">
        <table className="analiz-tablo">
          <thead>
            <tr>
              <th>No</th>
              <th>Açılış</th>
              <th>Kapanış</th>
              <th>Tip</th>
              <th>Masa</th>
              <th className="orta">Misafir</th>
              <th>Açan</th>
              <th>Durum</th>
              <th>Tahsilat</th>
              <th className="sag">İndirim</th>
              <th className="sag">Bahşiş</th>
              <th className="sag">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {adisyonlar.map((a) => (
              <tr key={a.id} onClick={() => onSec(a.id)}>
                <td className="hucre-no">#{a.no}</td>
                <td>{zamanMetni(a.acilis)}</td>
                <td>{a.kapanis ? zamanMetni(a.kapanis) : "—"}</td>
                <td>{TIP_ADLARI[a.tip]}</td>
                <td>{a.tip === "masa" ? a.masaAd || "—" : a.musteri || "—"}</td>
                <td className="orta">{a.kisiSayisi || "—"}</td>
                <td>{a.garson || "—"}</td>
                <td>
                  <Durum adisyon={a} />
                </td>
                <td>{tahsilatMetni(a)}</td>
                <td className="sag">{a.indirim ? paraGoster(a.indirim) : "—"}</td>
                <td className="sag">{a.bahsis ? paraGoster(a.bahsis) : "—"}</td>
                <td className="sag hucre-tutar">{paraGoster(a.toplam)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9}>Toplam</td>
              <td className="sag">{paraGoster(topla((a) => a.indirim))}</td>
              <td className="sag">{paraGoster(topla((a) => a.bahsis))}</td>
              <td className="sag hucre-tutar">{paraGoster(topla((a) => a.toplam))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

const zamanMetni = (t: string) => `${gunMetni(t)} ${saatMetni(t)}`;

/**
 * Adisyo'da tek bir "Durum" sütunu var; bizde kapanmış ama parası eksik kalan
 * hesap ayrıca işaretleniyor — gün sonunda gözden kaçan en pahalı şey o.
 */
function Durum({ adisyon }: { adisyon: AnalizAdisyon }) {
  if (adisyon.durum === "acik") return <span className="rozet acik">Açık</span>;
  if (adisyon.kalan > 0) return <span className="rozet eksik">Eksik tahsilat</span>;
  return <span className="rozet">Kapandı</span>;
}

/** Tek ödeme varsa tipi yazılıyor, birden fazlaysa sayısı — sütun taşmasın. */
function tahsilatMetni(a: AnalizAdisyon) {
  if (a.odemeler.length === 0) return "—";
  if (a.odemeler.length === 1) return a.odemeler[0].tip;
  const tipler = new Set(a.odemeler.map((o) => o.tip));
  return tipler.size === 1
    ? `${a.odemeler.length} × ${a.odemeler[0].tip}`
    : `${a.odemeler.length} tahsilat`;
}

function Ozet({ ozet }: { ozet: AnalizOzeti }) {
  const kdvDahil = ayarlar().kdvDahil;

  return (
    <div className="analiz-ozet">
      {/* Ekranın başrolü tek sayı: işletmecinin sabah ilk baktığı şey ciro. */}
      <section className="ciro-kart">
        <div className="ciro-ana">
          <span className="ciro-etiket">
            <TrendingUp size={16} /> Ciro
          </span>
          <strong>{paraGoster(ozet.ciro)}</strong>
          <em>{ozet.adisyon} kapanmış adisyon</em>
        </div>

        <dl className="ciro-yan">
          <div>
            <dt>Ortalama adisyon</dt>
            <dd>{paraGoster(ozet.ortalama)}</dd>
          </div>
          <div>
            <dt>Misafir</dt>
            <dd>{ozet.misafir || "—"}</dd>
          </div>
          <div>
            <dt>Kişi başı</dt>
            <dd>{ozet.kisiBasi ? paraGoster(ozet.kisiBasi) : "—"}</dd>
          </div>
          <div>
            <dt>İndirim</dt>
            <dd className={ozet.indirim ? "azalan" : ""}>
              {ozet.indirim ? `−${paraGoster(ozet.indirim)}` : "—"}
            </dd>
          </div>
          <div>
            <dt>Gider</dt>
            <dd className={ozet.gider ? "azalan" : ""}>
              {ozet.gider ? `−${paraGoster(ozet.gider)}` : "—"}
            </dd>
          </div>
          <div className="ciro-net">
            <dt>Kasaya kalan</dt>
            <dd>{paraGoster(ozet.net)}</dd>
          </div>
        </dl>
      </section>

      {ozet.acik > 0 && (
        <Bilgi>
          Bu dönemde {ozet.acik} adisyon hâlâ açık ({paraGoster(ozet.acikTutar)}). Hesap
          kapanmadan ciroya yazılmıyor; kapandığında burada görünür.
        </Bilgi>
      )}

      <div className="analiz-ikili">
        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <Receipt size={17} /> Hesap dökümü
            </h2>
          </div>
          <dl className="kasa-dokum">
            <div>
              <dt>Ara toplam</dt>
              <dd>{paraGoster(ozet.araToplam)}</dd>
            </div>
            <div>
              <dt>İndirim</dt>
              <dd className={ozet.indirim ? "azalan" : ""}>
                {ozet.indirim ? `−${paraGoster(ozet.indirim)}` : paraGoster(0)}
              </dd>
            </div>
            <div>
              <dt>Brüt {kdvDahil ? "(KDV hariç)" : "(matrah)"}</dt>
              <dd>{paraGoster(ozet.matrah)}</dd>
            </div>
            <div>
              <dt>KDV</dt>
              <dd>{paraGoster(ozet.kdv)}</dd>
            </div>
            <div className="kasa-beklenen">
              <dt>Toplam</dt>
              <dd>{paraGoster(ozet.ciro)}</dd>
            </div>
            {ozet.ikram > 0 && (
              <div>
                <dt>İkram edilen</dt>
                <dd>{paraGoster(ozet.ikram)}</dd>
              </div>
            )}
            {ozet.bahsis > 0 && (
              <div>
                <dt>Bahşiş</dt>
                <dd className="artan">{paraGoster(ozet.bahsis)}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <CreditCard size={17} /> Ödeme dağılımı
            </h2>
          </div>
          {ozet.odemeler.length === 0 ? (
            <div className="ayar-bos">
              <CreditCard size={30} />
              <p>Bu dönemde tahsilat yok.</p>
            </div>
          ) : (
            <Dagilim satirlar={ozet.odemeler} toplam={ozet.ciro} />
          )}
        </section>
      </div>

      <div className="analiz-ikili">
        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <ClipboardList size={17} /> Sipariş tipi
            </h2>
          </div>
          {ozet.tipler.length === 0 ? (
            <div className="ayar-bos">
              <ClipboardList size={30} />
              <p>Bu dönemde kapanmış adisyon yok.</p>
            </div>
          ) : (
            <Dagilim satirlar={ozet.tipler} toplam={ozet.ciro} />
          )}
        </section>

        <section className="ayar-bolum">
          <div className="ayar-bolum-ust">
            <h2>
              <BarChart3 size={17} /> Saatlere göre
            </h2>
          </div>
          <Saatler saatler={ozet.saatler} />
        </section>
      </div>
    </div>
  );
}

/** Ödeme ve sipariş tipi aynı desende: ad, tutar ve payı gösteren şerit. */
function Dagilim({
  satirlar,
  toplam,
}: {
  satirlar: { ad: string; tutar: number; adet: number }[];
  toplam: number;
}) {
  return (
    <ul className="analiz-dagilim">
      {satirlar.map((s) => {
        const pay = toplam > 0 ? Math.round((s.tutar / toplam) * 100) : 0;
        return (
          <li key={s.ad}>
            <span className="dagilim-ad">
              {s.ad}
              <em>{s.adet} işlem</em>
            </span>
            <span className="dagilim-cubuk">
              <i style={{ width: `${Math.min(100, pay)}%` }} />
            </span>
            <span className="dagilim-tutar">
              {paraGoster(s.tutar)}
              <em>%{pay}</em>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Günün hangi saatinde ne kadar satıldığı. Boş saatler listeden düşüyor —
 * kapalıyken geçen sekiz saat grafiğin yarısını yutmasın.
 */
function Saatler({ saatler }: { saatler: { saat: number; tutar: number; adet: number }[] }) {
  const dolu = saatler.filter((s) => s.tutar > 0);
  if (dolu.length === 0) {
    return (
      <div className="ayar-bos">
        <BarChart3 size={30} />
        <p>Bu dönemde kapanmış adisyon yok.</p>
      </div>
    );
  }

  const enBuyuk = Math.max(...dolu.map((s) => s.tutar));
  return (
    <div className="analiz-saatler">
      {dolu.map((s) => (
        <div key={s.saat} className="analiz-saat" title={`${s.adet} adisyon`}>
          <span className="saat-tutar">{paraGoster(s.tutar)}</span>
          <i style={{ height: `${Math.max(6, (s.tutar / enBuyuk) * 100)}%` }} />
          <span className="saat-ad">{String(s.saat).padStart(2, "0")}</span>
        </div>
      ))}
    </div>
  );
}

// Sekme iskeleti duruyor ama içeriği henüz yok; boş ekran bırakmak yerine ne
// geleceği yazılıyor — kullanıcı yanlış yere geldiğini sanmasın.
const ACIKLAMALAR: Record<string, { ad: string; metin: string }> = {
  urunler: {
    ad: "Ürünler",
    metin:
      "Hangi ürün kaç adet satıldı, ne kadar ciro yaptı; kategori kırılımı ve iptal edilen ürünler.",
  },
  personel: {
    ad: "Personel",
    metin: "Kim kaç adisyon açtı, ne kadar ciro yaptı, kaç indirim ve iptal uyguladı.",
  },
  giderler: {
    ad: "Giderler",
    metin: "Dönemin giderleri türüne ve ödeme tipine göre; ciroyla karşılaştırmalı.",
  },
  denetim: {
    ad: "Denetim",
    metin:
      "Silinen ürünler, silinen tahsilatlar ve düzeltilen ödemeler — kim yaptı, ne zaman, neden.",
  },
};

function Yapiliyor({ bolum }: { bolum: string }) {
  const bilgi = ACIKLAMALAR[bolum];
  return (
    <section className="ayar-bolum">
      <div className="ayar-bos">
        <ClipboardList size={30} />
        <p>
          <strong>{bilgi?.ad ?? "Bu bölüm"}</strong> hazırlanıyor.
          {bilgi ? ` ${bilgi.metin}` : ""}
        </p>
      </div>
    </section>
  );
}
