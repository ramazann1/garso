import { useRef, useState } from "react";
import { ImagePlus, Loader2, Play, X } from "lucide-react";
import Bilgi from "./Bilgi";
import { medyaAdresi, medyaSil, medyaYukle } from "../medya";
import type { UrunEtiketi, UrunMedya } from "../types";

/** Etiketin kodu ile müşteriye görünen adı. Tek seçim: iki rozet kalabalık. */
export const ETIKETLER: { kod: UrunEtiketi; ad: string }[] = [
  { kod: "yeni", ad: "Yeni" },
  { kod: "populer", ad: "Popüler" },
  { kod: "sef", ad: "Şefin önerisi" },
  { kod: "aci", ad: "Acı" },
];

/** Yaygın alerjenler. Serbest metin değil liste: menüde rozet olarak çiziliyor. */
const ALERJENLER = [
  "Gluten",
  "Süt",
  "Yumurta",
  "Fındık / ceviz",
  "Yer fıstığı",
  "Soya",
  "Balık",
  "Kabuklu deniz ürünü",
  "Susam",
  "Hardal",
];

export type MenuAlanlari = {
  aciklama: string;
  hazirlanmaDk: number;
  kalori: number;
  gramaj: number;
  alerjenler: string[];
  etiket?: UrunEtiketi;
  tukendi: boolean;
  medya: UrunMedya[];
};

/**
 * Ürünün QR menüde görünen yüzü. Hiçbir alan zorunlu değil — boş bırakılan
 * müşteri sayfasında hiç çizilmiyor, menü eksik görünmüyor. Bu yüzden bölüm
 * kapalı gelir ve doldurmadan da ürün kaydedilir.
 */
export default function MenuGorunumu({
  deger,
  degistir,
  onUyari,
}: {
  deger: MenuAlanlari;
  degistir: (degisim: Partial<MenuAlanlari>) => void;
  onUyari: (mesaj: string) => void;
}) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const dosyaSecici = useRef<HTMLInputElement>(null);

  const sayi = (v: string) => Math.max(0, Number(v.replace(/\D/g, "") || 0));

  const dosyaSecildi = async (dosyalar: FileList | null) => {
    if (!dosyalar?.length) return;
    const yer = 3 - deger.medya.length;
    if (yer <= 0) return onUyari("Bir ürüne en fazla 3 görsel eklenebilir.");

    setYukleniyor(true);
    try {
      const yeniler: UrunMedya[] = [];
      for (const d of Array.from(dosyalar).slice(0, yer)) {
        yeniler.push(await medyaYukle(d));
      }
      degistir({ medya: [...deger.medya, ...yeniler] });
    } catch (e) {
      onUyari(e instanceof Error ? e.message : "Görsel yüklenemedi.");
    } finally {
      setYukleniyor(false);
      if (dosyaSecici.current) dosyaSecici.current.value = "";
    }
  };

  // Listeden çıkarılan görsel depodan da siliniyor; kalması işletmenin alanını
  // boşuna doldururdu. Kaydet'e basılmasa bile dosya gitmiş oluyor — geri
  // almanın yolu yeniden yüklemek.
  const medyaCikar = (m: UrunMedya) => {
    degistir({ medya: deger.medya.filter((x) => x !== m) });
    medyaSil(m.yol);
  };

  const alerjenDegis = (a: string) =>
    degistir({
      alerjenler: deger.alerjenler.includes(a)
        ? deger.alerjenler.filter((x) => x !== a)
        : [...deger.alerjenler, a],
    });

  return (
    <>
      <Bilgi>
        Buradaki alanlar yalnız QR menüde görünür, hiçbiri zorunlu değil.
        Doldurmadığınız alan müşterinin sayfasında hiç çıkmaz — fotoğraf
        koymadan da menünüz düzgün görünür.
      </Bilgi>

      <div className="medya-serit">
        {deger.medya.map((m, i) => (
          <div key={i} className="medya-kutu">
            {m.tur === "video" ? (
              <>
                <video src={medyaAdresi(m.yol)} muted playsInline preload="metadata" />
                <Play size={18} className="medya-video-im" />
              </>
            ) : (
              <img src={medyaAdresi(m.yol)} alt="" />
            )}
            <button className="medya-cikar" onClick={() => medyaCikar(m)} title="Kaldır">
              <X size={14} />
            </button>
          </div>
        ))}

        {deger.medya.length < 3 && (
          <button
            className="medya-ekle"
            onClick={() => dosyaSecici.current?.click()}
            disabled={yukleniyor}
          >
            {yukleniyor ? <Loader2 size={20} className="doner" /> : <ImagePlus size={20} />}
            <span>{yukleniyor ? "Yükleniyor" : "Görsel ekle"}</span>
          </button>
        )}

        <input
          ref={dosyaSecici}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => dosyaSecildi(e.target.files)}
        />
      </div>

      <div className="alan">
        <span>Tanıtım yazısı</span>
        <textarea
          className="menu-aciklama"
          value={deger.aciklama}
          maxLength={240}
          rows={3}
          placeholder="Günlük kavrulmuş çekirdekten, bakır cezvede pişirilir."
          onChange={(e) => degistir({ aciklama: e.target.value })}
        />
      </div>

      <div className="alan">
        <span>Rozet</span>
        <div className="etiket-secim">
          <button
            className={!deger.etiket ? "secili" : ""}
            onClick={() => degistir({ etiket: undefined })}
          >
            Yok
          </button>
          {ETIKETLER.map((e) => (
            <button
              key={e.kod}
              className={deger.etiket === e.kod ? "secili" : ""}
              onClick={() => degistir({ etiket: e.kod })}
            >
              {e.ad}
            </button>
          ))}
        </div>
      </div>

      <div className="alan">
        <span>Künye</span>
        <div className="kunye-satir">
          <label>
            <input
              value={deger.hazirlanmaDk || ""}
              onChange={(e) => degistir({ hazirlanmaDk: sayi(e.target.value) })}
              placeholder="—"
              inputMode="numeric"
            />
            <em>dakika</em>
          </label>
          <label>
            <input
              value={deger.kalori || ""}
              onChange={(e) => degistir({ kalori: sayi(e.target.value) })}
              placeholder="—"
              inputMode="numeric"
            />
            <em>kalori</em>
          </label>
          <label>
            <input
              value={deger.gramaj || ""}
              onChange={(e) => degistir({ gramaj: sayi(e.target.value) })}
              placeholder="—"
              inputMode="numeric"
            />
            <em>gram</em>
          </label>
        </div>
      </div>

      <div className="alan">
        <span>Alerjenler</span>
        <div className="alerjen-secim">
          {ALERJENLER.map((a) => (
            <button
              key={a}
              className={deger.alerjenler.includes(a) ? "secili" : ""}
              onClick={() => alerjenDegis(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
