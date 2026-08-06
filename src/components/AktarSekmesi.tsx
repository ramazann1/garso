import { useRef, useState } from "react";
import { X } from "lucide-react";
import { SUTUN_GENISLIKLERI, planHazirla, satirlariOku, tabloUret } from "../aktarim";
import type { AktarimPlani } from "../aktarim";
import type { MenuBirim, MenuKategori, MenuKdv, MenuUrun } from "../types";

const bugun = () => {
  const t = new Date();
  const iki = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${iki(t.getMonth() + 1)}-${iki(t.getDate())}`;
};

export default function AktarSekmesi({
  urunler,
  kategoriler,
  birimler,
  kdvler,
  onKaydet,
  onUyari,
}: {
  urunler: MenuUrun[];
  kategoriler: MenuKategori[];
  birimler: MenuBirim[];
  kdvler: MenuKdv[];
  onKaydet: (
    plan: AktarimPlani,
    ilerle: (yapilan: number) => void
  ) => Promise<string | undefined>;
  onUyari: (mesaj: string) => void;
}) {
  const [plan, setPlan] = useState<AktarimPlani | null>(null);
  const [dosyaAdi, setDosyaAdi] = useState("");
  // null = yazma başlamadı; sayı = kaç adım bitti.
  const [yapilan, setYapilan] = useState<number | null>(null);
  const dosyaSecici = useRef<HTMLInputElement>(null);

  // Excel kütüphaneleri ancak bu sekmede lazım; program açılışına yük olmasın
  // diye düğmeye basıldığında yükleniyorlar.
  const disariAktar = async () => {
    const { default: excelYaz } = await import("write-excel-file/browser");
    await excelYaz(tabloUret(urunler, kategoriler, kdvler), {
      sheet: "Ürünler",
      columns: SUTUN_GENISLIKLERI.map((width) => ({ width })),
      stickyRowsCount: 1,
    }).toFile(`garso-menu-${bugun()}.xlsx`);
  };

  const dosyaSecildi = async (dosya?: File) => {
    if (!dosya) return;

    let tablo: unknown[][];
    try {
      const { readSheet } = await import("read-excel-file/browser");
      tablo = await readSheet(dosya);
    } catch {
      onUyari("Dosya okunamadı. Excel dosyası (.xlsx) olduğundan emin ol.");
      return;
    }

    const satirlar = satirlariOku(tablo);
    if (!satirlar.length) {
      onUyari("Dosyada ürün satırı bulunamadı. Menüyü indirip o dosyayı düzenle.");
      return;
    }

    setDosyaAdi(dosya.name);
    setPlan(planHazirla(satirlar, { urunler, kategoriler, birimler, kdvler }));
  };

  const vazgec = () => {
    setPlan(null);
    setDosyaAdi("");
    setYapilan(null);
    if (dosyaSecici.current) dosyaSecici.current.value = "";
  };

  const uygula = async () => {
    if (!plan) return;
    setYapilan(0);
    const hata = await onKaydet(plan, setYapilan);
    if (hata) {
      setYapilan(null);
      onUyari(hata);
    } else vazgec();
  };

  const yeniUrunler = plan?.urunler.filter((u) => u.yeni) ?? [];
  const yazilacak = plan?.urunler.length ?? 0;
  // Kategoriler de ayrı birer adım; çubuk gerçek işi göstersin.
  const toplamAdim = yazilacak + (plan?.yeniKategoriler.length ?? 0);
  const yaziliyor = yapilan !== null;

  return (
    <div className="ms-aktarim">
      <section className="aktarim-kart">
        <h2>Menüyü indir</h2>
        <p>
          Menüdeki bütün ürünler Excel dosyası olarak iner. Fiyat, kategori, ürün adı ve maliyet
          tabloda düzenlenir, aynı dosya aşağıdan geri yüklenir.
        </p>
        <button className="aktarim-buton" onClick={disariAktar}>
          Menüyü indir
        </button>
        <small>
          <strong>Ürün No</strong> sütunu programın kullandığı numaradır, değiştirmeyin — bir ürünün
          adı değiştiğinde onun hâlâ aynı ürün olduğu bu numaradan anlaşılır. Kampanyalı menüler
          tabloya girmez, kendi sekmesinden düzenlenir.
        </small>
      </section>

      <section className="aktarim-kart">
        <h2>Dosyadan yükle</h2>
        <p>
          Düzenlenen dosyayı seçin. Menüye kaydedilmeden önce ne olacağı özetlenir; onaylanmadıkça
          hiçbir değişiklik yazılmaz.
        </p>
        <input
          ref={dosyaSecici}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => dosyaSecildi(e.target.files?.[0])}
        />
        <button className="aktarim-buton ikincil" onClick={() => dosyaSecici.current?.click()}>
          Dosya seç
        </button>
        <small>
          Dosyada değişmemiş ürünler atlanır, yalnızca değişenler yazılır. Yeni ürünler satışta ve
          mutfakta görünür olarak açılır.
        </small>
      </section>

      {plan && (
        <section className="aktarim-ozet">
          <div className="ozet-ust">
            <h2>{dosyaAdi}</h2>
            <button className="arama-temizle" onClick={vazgec} title="Vazgeç">
              <X size={15} />
            </button>
          </div>

          <div className="ozet-sayilar">
            <div>
              <strong>{yeniUrunler.length}</strong>
              <span>yeni ürün</span>
            </div>
            <div>
              <strong>{yazilacak - yeniUrunler.length}</strong>
              <span>güncellenecek ürün</span>
            </div>
            <div>
              <strong>{plan.degismeyen}</strong>
              <span>değişmemiş, atlanacak</span>
            </div>
            <div className={plan.hatalar.length ? "hatali" : ""}>
              <strong>{plan.hatalar.length}</strong>
              <span>atlanan satır</span>
            </div>
          </div>

          {plan.yeniKategoriler.length > 0 && (
            <div className="ozet-kategoriler">
              <h3>
                Menünde olmayan {plan.yeniKategoriler.length} kategori var, yazarsan açılacak
              </h3>
              <ul>
                {plan.yeniKategoriler.map((y) => (
                  <li key={`${y.ana}-${y.alt}`}>
                    <strong>{y.alt || y.ana}</strong>
                    <span>
                      {y.alt ? `yeni alt kategori — "${y.ana}" altına girecek` : "yeni ana kategori"}
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                Bu adları Excel'de sen yazdın. Aradığın kategori zaten menünde varsa adını yanlış
                yazmışsın demektir — Vazgeç deyip dosyayı düzelt, yoksa aynı işin ikinci bir
                kategorisi açılır.
              </p>
            </div>
          )}

          {plan.hatalar.length > 0 && (
            <div className="ozet-hatalar">
              <h3>Atlanan satırlar</h3>
              <ul>
                {plan.hatalar.map((h) => (
                  <li key={`${h.satir}-${h.mesaj}`}>
                    <em>{h.satir}. satır</em> {h.mesaj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {yaziliyor && (
            <div className="ozet-ilerleme">
              <div className="ilerleme-cubuk">
                <span style={{ width: `${Math.round((yapilan / toplamAdim) * 100)}%` }} />
              </div>
              <small>
                Yazılıyor — {yapilan} / {toplamAdim}. Sekmeyi kapatma.
              </small>
            </div>
          )}

          <div className="ozet-alt">
            <small>
              Dosyadan satır silmek ürünü menüden silmez. Ürün ve porsiyon silme işlemi Menü
              Stüdyosu'ndan yapılır.
            </small>
            <div>
              <button className="iptal" disabled={yaziliyor} onClick={vazgec}>
                Vazgeç
              </button>
              <button className="uygula" disabled={!yazilacak || yaziliyor} onClick={uygula}>
                {yaziliyor
                  ? "Yazılıyor…"
                  : yazilacak
                    ? `${yazilacak} ürünü yaz`
                    : "Yazılacak değişiklik yok"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
