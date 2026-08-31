import { useRef, useState } from "react";
import AktarimOnayi from "./AktarimOnayi";
import { baglantiHatasi } from "../baglanti";
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
  // Yazma bitince pencere kapanmıyor: iki saniyelik bildirim uzun bir aktarımın
  // sonunda gözden kaçıyordu, sonucu kullanıcı kendi kapatıyor.
  const [bitti, setBitti] = useState(false);
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
    setBitti(false);
    if (dosyaSecici.current) dosyaSecici.current.value = "";
  };

  const uygula = async () => {
    if (!plan) return;
    setYapilan(0);

    // Yazma yüzlerce isteğe bölünüyor ve her isteğin kendi zaman aşımı var;
    // kesilen istek geriye mesaj döndürmüyor, hata fırlatıyor. Yakalanmadığında
    // pencere "Yazılıyor…" durumunda asılı kalıyor ve kullanıcı işin nerede
    // durduğunu göremiyordu.
    let hata: string | undefined;
    try {
      hata = await onKaydet(plan, setYapilan);
    } catch (e) {
      hata = baglantiHatasi(e)
        ? "Bağlantı koptu, yazma yarıda kaldı. Menüyü tazeleyip dosyayı yeniden yükle — yazılmış ürünler ikinci kez yazılmaz."
        : `Aktarım yarıda kaldı: ${e instanceof Error ? e.message : String(e)}`;
    }

    if (hata) {
      setYapilan(null);
      onUyari(hata);
    } else setBitti(true);
  };


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
        <AktarimOnayi
          dosyaAdi={dosyaAdi}
          plan={plan}
          yapilan={yapilan}
          bitti={bitti}
          onVazgec={vazgec}
          onUygula={uygula}
        />
      )}
    </div>
  );
}
