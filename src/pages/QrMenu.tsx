import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Clock, Flame, MapPin, Scale, UtensilsCrossed } from "lucide-react";
import { supabase } from "../supabase";
import { medyaAdresi } from "../medya";
import { paraGoster } from "../para";
import { ETIKETLER } from "../components/MenuGorunumu";
import type { UrunEtiketi } from "../types";
import "./qrMenu.css";

type Porsiyon = { ad: string; fiyat: number };
type Medya = { yol: string; tur: "foto" | "video" };
type Urun = {
  ad: string;
  aciklama?: string | null;
  hazirlanmaDk?: number | null;
  kalori?: number | null;
  gramaj?: number | null;
  alerjenler?: string[] | null;
  etiket?: UrunEtiketi | null;
  tukendi?: boolean;
  porsiyonlar: Porsiyon[];
  medya: Medya[];
};
type Kategori = { ad: string; aciklama?: string | null; gorsel?: string | null; urunler: Urun[] };
type Menu = {
  acik: boolean;
  isletme?: string;
  adres?: string;
  kapaklar?: string[];
  kategoriler?: Kategori[];
};

/**
 * Müşterinin karekodu okutunca gördüğü sayfa. Giriş kapısının dışında duruyor:
 * ziyaretçinin hesabı yok, veriyi `qr_menu` işlevi veriyor.
 *
 * Sayfanın asıl fikri kademeli zenginlik. İşletme fotoğraf girmek zorunda
 * değil: bir kategoride hiç görsel yoksa bölüm tipografiye dayanan zarif bir
 * liste, bazı ürünlerde varsa onlar öne çıkıp kalanı liste olarak sürüyor,
 * hepsinde varsa bölüm tam vitrine dönüyor. Tek sayfa, tek kod — hiçbir yerde
 * boş fotoğraf kutusu görünmüyor.
 */
export default function QrMenu({ kod }: { kod: string }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [hata, setHata] = useState(false);
  const [acikKategori, setAcikKategori] = useState(0);
  const [acikUrun, setAcikUrun] = useState<string | null>(null);
  const bolumler = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    supabase
      .rpc("qr_menu", { p_kod: kod })
      .then(({ data, error }) => (error ? setHata(true) : setMenu(data as Menu)));
  }, [kod]);

  // Sayfa kaydıkça üstteki şeritte o an bakılan kategori işaretleniyor;
  // müşteri uzun menüde nerede olduğunu kaybetmesin.
  useEffect(() => {
    const bak = () => {
      let yer = 0;
      bolumler.current.forEach((b, i) => {
        if (b && b.getBoundingClientRect().top <= 110) yer = i;
      });
      setAcikKategori(yer);
    };
    window.addEventListener("scroll", bak, { passive: true });
    return () => window.removeEventListener("scroll", bak);
  }, [menu]);

  const kategoriler = useMemo(
    () => (menu?.kategoriler ?? []).filter((k) => (k.urunler?.length ?? 0) > 0),
    [menu]
  );

  if (hata)
    return <MenuMesaj baslik="Menü açılamadı" alt="Bağlantıyı kontrol edip sayfayı yenileyin." />;
  if (!menu)
    return (
      <div className="qr-sayfa">
        <div className="qr-yukleniyor">
          <div className="cember" />
        </div>
      </div>
    );
  if (!menu.acik)
    return <MenuMesaj baslik="Menü şu an kapalı" alt="Bu karekod artık kullanılmıyor olabilir." />;

  const kapak = menu.kapaklar?.[0];

  return (
    <div className="qr-sayfa">
      <header className={kapak ? "qr-tepe kapakli" : "qr-tepe"}>
        {kapak && <img className="qr-kapak" src={medyaAdresi(kapak)} alt="" />}
        <div className="qr-tepe-yazi">
          <span className="qr-tepe-etiket">Menü</span>
          <h1>{menu.isletme}</h1>
          <span className="qr-tepe-suslu" />
          {menu.adres && (
            <p className="qr-adres">
              <MapPin size={14} /> {menu.adres}
            </p>
          )}
        </div>
      </header>

      {kategoriler.length > 1 && (
        <nav className="qr-serit">
          <div className="qr-serit-ic">
            {kategoriler.map((k, i) => (
              <button
                key={k.ad}
                className={i === acikKategori ? "acik" : ""}
                onClick={() =>
                  bolumler.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {k.ad}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="qr-govde">
        {kategoriler.map((k, i) => (
          <Bolum
            key={k.ad}
            kategori={k}
            dis={(e) => {
              bolumler.current[i] = e;
            }}
            acikUrun={acikUrun}
            ac={setAcikUrun}
          />
        ))}
        {kategoriler.length === 0 && <p className="qr-bos">Menü henüz hazırlanıyor.</p>}
      </main>

      <footer className="qr-dip">
        <UtensilsCrossed size={15} /> Garso
      </footer>
    </div>
  );
}

/** Üründe gösterilecek bir fotoğraf ya da video var mı. */
const gorselliMi = (u: Urun) => (u.medya?.length ?? 0) > 0;

/** Satır açıldığında gösterilecek bir şey var mı — yoksa satır tıklanmıyor. */
const detayliMi = (u: Urun) =>
  !!u.aciklama ||
  !!u.hazirlanmaDk ||
  !!u.kalori ||
  !!u.gramaj ||
  (u.alerjenler?.length ?? 0) > 0 ||
  (u.medya?.length ?? 0) > 1;

/**
 * Bir kategorinin görünümü içine girilen kadarına göre seçiliyor: hiç görsel
 * yoksa liste, hepsinde varsa vitrin, arada kalıyorsa görselliler öne çıkıp
 * kalanı liste olarak sürüyor.
 */
function Bolum({
  kategori,
  dis,
  acikUrun,
  ac,
}: {
  kategori: Kategori;
  dis: (e: HTMLElement | null) => void;
  acikUrun: string | null;
  ac: (k: string | null) => void;
}) {
  const gorselliler = kategori.urunler.filter(gorselliMi);
  const digerleri = kategori.urunler.filter((u) => !gorselliMi(u));
  const hal = gorselliler.length === 0 ? "liste" : digerleri.length === 0 ? "vitrin" : "karma";

  const anahtar = (u: Urun) => `${kategori.ad}|${u.ad}`;
  const ozellikler = (u: Urun) => ({
    urun: u,
    acik: acikUrun === anahtar(u),
    ac: () => ac(acikUrun === anahtar(u) ? null : anahtar(u)),
  });

  return (
    <section className="qr-bolum" ref={dis}>
      <div className="qr-bolum-basi">
        <h2>{kategori.ad}</h2>
        <span className="qr-cizik" />
      </div>
      {kategori.aciklama && <p className="qr-bolum-not">{kategori.aciklama}</p>}

      {hal === "vitrin" && (
        <div className="qr-vitrin">
          {kategori.urunler.map((u) => (
            <Kart key={u.ad} {...ozellikler(u)} />
          ))}
        </div>
      )}

      {hal === "karma" && (
        <>
          <div className="qr-one-cikan">
            {gorselliler.map((u) => (
              <Kart key={u.ad} {...ozellikler(u)} dar />
            ))}
          </div>
          <div className="qr-liste">
            {digerleri.map((u) => (
              <Satir key={u.ad} {...ozellikler(u)} />
            ))}
          </div>
        </>
      )}

      {hal === "liste" && (
        <div className="qr-liste">
          {kategori.urunler.map((u) => (
            <Satir key={u.ad} {...ozellikler(u)} />
          ))}
        </div>
      )}
    </section>
  );
}

type UrunOzellikleri = { urun: Urun; acik: boolean; ac: () => void };

/** Görselli ürün. Vitrinde ızgaraya, karma bölümde yatay şeride giriyor. */
function Kart({ urun, acik, ac, dar }: UrunOzellikleri & { dar?: boolean }) {
  const acilir = detayliMi(urun);
  const siniflar = ["qr-kart", dar && "dar", urun.tukendi && "tukendi", acik && "acik"];
  return (
    <article className={siniflar.filter(Boolean).join(" ")}>
      <button className="qr-kart-ust" onClick={ac} disabled={!acilir}>
        <Gorsel urun={urun} />
        <div className="qr-kart-yazi">
          <Ad urun={urun} />
          {urun.aciklama && !acik && <p className="qr-tanitim">{urun.aciklama}</p>}
          <div className="qr-kart-alt">
            <Fiyatlar porsiyonlar={urun.porsiyonlar} />
            {acilir && <ChevronDown className="qr-ok" size={18} />}
          </div>
        </div>
      </button>
      {acik && <Detay urun={urun} />}
    </article>
  );
}

/** Görselsiz ürün. Taşıyıcı unsur tipografi: ad, tanıtım yazısı ve fiyat. */
function Satir({ urun, acik, ac }: UrunOzellikleri) {
  const acilir = detayliMi(urun);
  const siniflar = ["qr-satir", urun.tukendi && "tukendi", acik && "acik"];
  return (
    <article className={siniflar.filter(Boolean).join(" ")}>
      <button className="qr-satir-ust" onClick={ac} disabled={!acilir}>
        <span className="qr-satir-yazi">
          <Ad urun={urun} />
          {urun.aciklama && !acik && <p className="qr-tanitim">{urun.aciklama}</p>}
        </span>
        <Fiyatlar porsiyonlar={urun.porsiyonlar} />
        {acilir && <ChevronDown className="qr-ok" size={18} />}
      </button>
      {acik && <Detay urun={urun} />}
    </article>
  );
}

/** Ürün adı, yanında etiket rozeti ve tükendiyse uyarısı. */
function Ad({ urun }: { urun: Urun }) {
  const etiket = ETIKETLER.find((e) => e.kod === urun.etiket);
  return (
    <h3 className="qr-ad">
      {urun.ad}
      {etiket && <span className={`qr-rozet ${etiket.kod}`}>{etiket.ad}</span>}
      {urun.tukendi && <span className="qr-rozet bitti">Bugün yok</span>}
    </h3>
  );
}

/**
 * Ürünün ilk görseli. Video girilmişse duran kare yerine sessiz döngü
 * oynuyor — videonun ilk karesi çoğu zaman boş bir kutu gibi duruyor.
 */
function Gorsel({ urun }: { urun: Urun }) {
  const ilk = urun.medya[0];
  if (!ilk) return null;
  return (
    <div className="qr-gorsel">
      {ilk.tur === "video" ? (
        <video src={medyaAdresi(ilk.yol)} muted loop playsInline autoPlay />
      ) : (
        <img src={medyaAdresi(ilk.yol)} alt={urun.ad} loading="lazy" />
      )}
    </div>
  );
}

/** Porsiyon fiyatları. Tek fiyatta sadece rakam, birden çoğunda üstünde adı. */
function Fiyatlar({ porsiyonlar }: { porsiyonlar: Porsiyon[] }) {
  return (
    <span className="qr-fiyatlar">
      {porsiyonlar.map((p, i) => (
        <span key={i} className="qr-fiyat">
          {porsiyonlar.length > 1 && p.ad && <em>{p.ad}</em>}
          {paraGoster(p.fiyat)}
        </span>
      ))}
    </span>
  );
}

/**
 * Satırın içinde açılan detay. Ayrı bir pencere açılmıyor: müşteri menüdeki
 * yerini kaybetmiyor, kapatınca kaldığı yerde kalıyor.
 */
function Detay({ urun }: { urun: Urun }) {
  const kunye: { ikon: ReactNode; yazi: string }[] = [];
  if (urun.hazirlanmaDk) kunye.push({ ikon: <Clock size={14} />, yazi: `${urun.hazirlanmaDk} dk` });
  if (urun.kalori) kunye.push({ ikon: <Flame size={14} />, yazi: `${urun.kalori} kcal` });
  if (urun.gramaj) kunye.push({ ikon: <Scale size={14} />, yazi: `${urun.gramaj} gr` });

  // İlk görsel kartın üstünde zaten duruyor; detayda kalanlar gösteriliyor.
  const kalanMedya = urun.medya.slice(1);

  return (
    <div className="qr-detay">
      {kalanMedya.length > 0 && (
        <div className="qr-medya-serit">
          {kalanMedya.map((m, i) =>
            m.tur === "video" ? (
              <video key={i} src={medyaAdresi(m.yol)} controls playsInline />
            ) : (
              <img key={i} src={medyaAdresi(m.yol)} alt="" loading="lazy" />
            )
          )}
        </div>
      )}

      {urun.aciklama && <p className="qr-detay-yazi">{urun.aciklama}</p>}

      {kunye.length > 0 && (
        <div className="qr-kunye">
          {kunye.map((k, i) => (
            <span key={i}>
              {k.ikon} {k.yazi}
            </span>
          ))}
        </div>
      )}

      {(urun.alerjenler?.length ?? 0) > 0 && (
        <div className="qr-alerjen">
          <span className="qr-alerjen-baslik">İçeriğinde</span>
          {urun.alerjenler!.map((a) => (
            <span key={a} className="qr-alerjen-rozet">
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuMesaj({ baslik, alt }: { baslik: string; alt: string }) {
  return (
    <div className="qr-sayfa">
      <div className="qr-mesaj">
        <h1>{baslik}</h1>
        <p>{alt}</p>
      </div>
    </div>
  );
}
