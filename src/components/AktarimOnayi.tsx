import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, FilePlus2, FolderPlus, Pencil, X } from "lucide-react";
import Bilgi from "./Bilgi";
import type { AktarimPlani, AktarimUrunu, KategoriYeri } from "../aktarim";

/**
 * Excel dosyası seçildikten sonra açılan onay penceresi.
 *
 * Özet önceden sayfanın altında duruyordu ve yalnız sayı veriyordu: "5 ürün
 * güncellenecek". Hangi ürünün neresine dokunulduğu görünmediği için kullanıcı
 * yeni ürün eklediğini sanıp menüsünün üstüne yazabiliyordu — ve yazılan menü
 * geri alınamıyor. Pencere ekranın ortasında açılıyor, listeler kendi kutusunda
 * kayıyor, yazma ilerlemesi de burada görünüyor.
 */
export default function AktarimOnayi({
  dosyaAdi,
  plan,
  yapilan,
  bitti,
  onVazgec,
  onUygula,
}: {
  dosyaAdi: string;
  plan: AktarimPlani;
  /** null = yazma başlamadı; sayı = kaç adım bitti. */
  yapilan: number | null;
  bitti: boolean;
  onVazgec: () => void;
  onUygula: () => void;
}) {
  const yeniler = plan.urunler.filter((u) => u.yeni);
  const guncellenenler = plan.urunler.filter((u) => !u.yeni);
  const yazilacak = plan.urunler.length;
  // Kategoriler de ayrı birer adım; çubuk gerçek işi göstersin.
  const toplamAdim = yazilacak + plan.yeniKategoriler.length;
  const yaziliyor = yapilan !== null;

  const [acik, setAcik] = useState<"guncellenen" | "yeni" | "kategori" | "atlanan" | null>(
    guncellenenler.length ? "guncellenen" : null
  );
  const gecis = (hangi: typeof acik) => setAcik((a) => (a === hangi ? null : hangi));

  const { gecen, bekleyen } = sureSayaci(yapilan, bitti);

  if (bitti) {
    return (
      <div className="modal-fon">
        <div className="aktarim-modal bitti">
          <div className="aktarim-sonuc">
            <span className="sonuc-im">
              <Check size={26} />
            </span>
            <h3>Menüye yazıldı</h3>
            <p>
              {guncellenenler.length} ürün güncellendi, {yeniler.length} yeni ürün açıldı
              {plan.yeniKategoriler.length > 0
                ? `, ${plan.yeniKategoriler.length} kategori eklendi`
                : ""}
              . Toplam süre {sureMetni(gecen)}.
            </p>
            <button className="uygula" onClick={onVazgec}>
              Tamam
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-fon">
      <div className="aktarim-modal">
        <header>
          <div>
            <h3>Menüye yazılacaklar</h3>
            <span>{dosyaAdi}</span>
          </div>
          <button className="arama-temizle" onClick={onVazgec} disabled={yaziliyor} title="Vazgeç">
            <X size={16} />
          </button>
        </header>

        <div className="aktarim-sayilar">
          <div>
            <strong>{yeniler.length}</strong>
            <span>yeni ürün</span>
          </div>
          <div>
            <strong>{guncellenenler.length}</strong>
            <span>güncellenecek</span>
          </div>
          <div>
            <strong>{plan.degismeyen}</strong>
            <span>değişmemiş</span>
          </div>
          <div className={plan.hatalar.length ? "hatali" : ""}>
            <strong>{plan.hatalar.length}</strong>
            <span>atlanan satır</span>
          </div>
        </div>

        <div className="aktarim-bolumler">
          {guncellenenler.length > 0 && (
            <Bolum
              ikon={<Pencil size={16} />}
              baslik={`${guncellenenler.length} ürünün üstüne yazılacak`}
              acik={acik === "guncellenen"}
              onGecis={() => gecis("guncellenen")}
            >
              <Bilgi>
                Bu ürünler menünde zaten var; dosyadaki değerler eskisinin yerine geçecek. Yeni
                ürün eklediğini sanıyorsan listede adını ara — buradaysa üstüne yazılıyor demektir.
              </Bilgi>
              <ul className="aktarim-liste">
                {guncellenenler.map((u) => (
                  <li key={u.urun.id ?? u.urun.ad}>
                    <strong>{u.urun.ad}</strong>
                    <div className="aktarim-farklar">
                      {u.degisiklikler.map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Bolum>
          )}

          {yeniler.length > 0 && (
            <Bolum
              ikon={<FilePlus2 size={16} />}
              baslik={`${yeniler.length} yeni ürün açılacak`}
              acik={acik === "yeni"}
              onGecis={() => gecis("yeni")}
            >
              <ul className="aktarim-liste">
                {yeniler.map((u) => (
                  <li key={u.urun.ad}>
                    <strong>{u.urun.ad}</strong>
                    <div className="aktarim-farklar">
                      <span>{yerleriYaz(u)}</span>
                      <span>{fiyatlariYaz(u)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Bolum>
          )}

          {plan.yeniKategoriler.length > 0 && (
            <Bolum
              ikon={<FolderPlus size={16} />}
              baslik={`${plan.yeniKategoriler.length} kategori açılacak`}
              acik={acik === "kategori"}
              onGecis={() => gecis("kategori")}
            >
              <Bilgi>
                Bu adları Excel'de sen yazdın. Aradığın kategori zaten menünde varsa adını yanlış
                yazmışsın demektir — Vazgeç deyip dosyayı düzelt, yoksa aynı işin ikinci bir
                kategorisi açılır.
              </Bilgi>
              <ul className="aktarim-liste">
                {plan.yeniKategoriler.map((y) => (
                  <li key={`${y.ana}-${y.alt}`}>
                    <strong>{y.alt || y.ana}</strong>
                    <div className="aktarim-farklar">
                      <span>
                        {y.alt ? `Yeni alt kategori — "${y.ana}" altına girecek` : "Yeni ana kategori"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Bolum>
          )}

          {plan.hatalar.length > 0 && (
            <Bolum
              ikon={<AlertTriangle size={16} />}
              baslik={`${plan.hatalar.length} satır atlanacak`}
              acik={acik === "atlanan"}
              onGecis={() => gecis("atlanan")}
              uyari
            >
              <ul className="aktarim-liste">
                {plan.hatalar.map((h) => (
                  <li key={`${h.satir}-${h.mesaj}`}>
                    <strong>{h.satir}. satır</strong>
                    <div className="aktarim-farklar">
                      <span>{h.mesaj}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Bolum>
          )}
        </div>

        <footer>
          {yaziliyor ? (
            <div className="aktarim-ilerleme">
              <div className="ilerleme-cubuk">
                <span style={{ width: `${Math.round((yapilan / toplamAdim) * 100)}%` }} />
              </div>
              <small>
                Yazılıyor — {yapilan} / {toplamAdim} · {sureMetni(gecen)}
                {bekleyen >= 8 ? " · sunucudan cevap bekleniyor" : ""}. Pencereyi kapatma.
              </small>
            </div>
          ) : (
            <small>
              Dosyadan satır silmek ürünü menüden silmez. Ürün ve porsiyon silme işlemi Menü
              Stüdyosu'ndan yapılır.
            </small>
          )}

          <div className="modal-aksiyonlar">
            <button className="iptal" disabled={yaziliyor} onClick={onVazgec}>
              Vazgeç
            </button>
            <button className="uygula" disabled={!yazilacak || yaziliyor} onClick={onUygula}>
              {yaziliyor
                ? "Yazılıyor…"
                : yazilacak
                  ? `${yazilacak} ürünü yaz`
                  : "Yazılacak değişiklik yok"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Yazma süresi. Çubuk ürün başına bir kez ilerlediği için ağır menüde ekran
 * donmuş gibi duruyordu; saniye saydıkça işin sürdüğü görünüyor. İkinci sayı
 * son adımdan bu yana geçen süre: uzarsa "cevap bekleniyor" yazısı çıkıyor,
 * kullanıcı beklemenin bizden mi sunucudan mı olduğunu biliyor.
 */
function sureSayaci(yapilan: number | null, bitti: boolean) {
  const [gecen, setGecen] = useState(0);
  const [bekleyen, setBekleyen] = useState(0);
  const basi = useRef(0);
  const sonAdim = useRef(0);

  useEffect(() => {
    sonAdim.current = Date.now();
    if (yapilan === null || bitti) return; // biten işte süre olduğu yerde donuyor
    if (yapilan === 0) basi.current = Date.now();

    const sayac = setInterval(() => {
      setGecen(Math.floor((Date.now() - basi.current) / 1000));
      setBekleyen(Math.floor((Date.now() - sonAdim.current) / 1000));
    }, 1000);
    return () => clearInterval(sayac);
  }, [yapilan, bitti]);

  return yapilan === null ? { gecen: 0, bekleyen: 0 } : { gecen, bekleyen };
}

const sureMetni = (sn: number) =>
  sn < 60 ? `${sn} sn` : `${Math.floor(sn / 60)} dk ${String(sn % 60).padStart(2, "0")} sn`;

/**
 * Açılıp kapanan başlık. Dört bölüm de aynı kalıpta: uzun liste pencereyi
 * uzatmasın diye yalnız biri açık duruyor, açılan bölüm kendi içinde kayıyor.
 */
function Bolum({
  ikon,
  baslik,
  acik,
  uyari,
  onGecis,
  children,
}: {
  ikon: React.ReactNode;
  baslik: string;
  acik: boolean;
  uyari?: boolean;
  onGecis: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`aktarim-bolum${acik ? " acik" : ""}${uyari ? " uyari" : ""}`}>
      <button onClick={onGecis}>
        {ikon}
        <span>{baslik}</span>
      </button>
      {acik && <div className="aktarim-govde">{children}</div>}
    </section>
  );
}

const yerAdi = (y: KategoriYeri) => (y.alt ? `${y.ana} › ${y.alt}` : y.ana);

const yerleriYaz = (u: AktarimUrunu) =>
  u.yerler.length ? u.yerler.map(yerAdi).join(", ") : "Kategorisiz";

const fiyatlariYaz = (u: AktarimUrunu) =>
  u.urun.porsiyonlar
    .map((p) => `${p.ad || "Porsiyon"} · ${p.fiyat.toFixed(2).replace(".", ",")} ₺`)
    .join(" · ");
