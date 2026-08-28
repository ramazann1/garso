import { useEffect, useRef, useState } from "react";
import { MapPin, UtensilsCrossed } from "lucide-react";
import { supabase } from "../supabase";
import { paraGoster } from "../para";
import "./qrMenu.css";

type Porsiyon = { ad: string; fiyat: number };
type Urun = { ad: string; porsiyonlar: Porsiyon[] };
type Kategori = { ad: string; urunler: Urun[] };
type Menu = { acik: boolean; isletme?: string; adres?: string; kategoriler?: Kategori[] };

/**
 * Müşterinin karekodu okutunca gördüğü sayfa. Giriş kapısının dışında duruyor:
 * ziyaretçinin hesabı yok, veriyi `qr_menu` işlevi veriyor.
 *
 * Görünüm bilerek Garso'nun kendi ekranlarına benzemiyor. Kasa ekranları bir
 * araç — sıkı yerleşim, hızlı dokunuş. Burası vitrin: müşterinin acelesi yok,
 * bol boşluk ve iri başlıkla okunuyor.
 */
export default function QrMenu({ kod }: { kod: string }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [hata, setHata] = useState(false);
  const [acikKategori, setAcikKategori] = useState(0);
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
      // Şeridin altında kalan son başlık, o an bakılan kategoridir.
      let yer = 0;
      bolumler.current.forEach((b, i) => {
        if (b && b.getBoundingClientRect().top <= 120) yer = i;
      });
      setAcikKategori(yer);
    };
    window.addEventListener("scroll", bak, { passive: true });
    return () => window.removeEventListener("scroll", bak);
  }, [menu]);

  if (hata) return <MenuMesaj baslik="Menü açılamadı" alt="Bağlantıyı kontrol edip sayfayı yenileyin." />;
  if (!menu) return <div className="qr-yukleniyor"><div className="cember" /></div>;
  if (!menu.acik)
    return <MenuMesaj baslik="Menü şu an kapalı" alt="Bu karekod artık kullanılmıyor olabilir." />;

  const kategoriler = (menu.kategoriler ?? []).filter((k) => k.urunler.length > 0);

  return (
    <div className="qr">
      <header className="qr-tepe">
        <h1>{menu.isletme}</h1>
        {menu.adres && (
          <p className="qr-adres">
            <MapPin size={16} /> {menu.adres}
          </p>
        )}
      </header>

      {kategoriler.length > 1 && (
        <nav className="qr-serit">
          {kategoriler.map((k, i) => (
            <button
              key={k.ad}
              className={i === acikKategori ? "acik" : ""}
              onClick={() => bolumler.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {k.ad}
            </button>
          ))}
        </nav>
      )}

      <main className="qr-govde">
        {kategoriler.map((k, i) => (
          <section key={k.ad} ref={(e) => { bolumler.current[i] = e; }}>
            <h2>{k.ad}</h2>
            {k.urunler.map((u) => (
              <article key={u.ad} className="qr-urun">
                <span className="qr-urun-ad">{u.ad}</span>
                <span className="qr-fiyatlar">
                  {u.porsiyonlar.map((p, j) => (
                    <span key={j} className="qr-fiyat">
                      {u.porsiyonlar.length > 1 && p.ad && <em>{p.ad}</em>}
                      {paraGoster(p.fiyat)}
                    </span>
                  ))}
                </span>
              </article>
            ))}
          </section>
        ))}
        {kategoriler.length === 0 && (
          <p className="qr-bos">Menü henüz hazırlanıyor.</p>
        )}
      </main>

      <footer className="qr-dip">
        <UtensilsCrossed size={15} /> Garso
      </footer>
    </div>
  );
}

function MenuMesaj({ baslik, alt }: { baslik: string; alt: string }) {
  return (
    <div className="qr-mesaj">
      <h1>{baslik}</h1>
      <p>{alt}</p>
    </div>
  );
}
