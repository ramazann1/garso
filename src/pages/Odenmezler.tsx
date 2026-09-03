import { useEffect, useRef, useState } from "react";
import {
  Download,
  Gift,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Anahtar from "../components/Anahtar";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import OnayModal from "../components/OnayModal";
import { eslesiyor } from "../arama";
import {
  ODENMEZ_SUTUNLARI,
  odenmezKaydet,
  odenmezPlaniHazirla,
  odenmezPlaniYaz,
  odenmezSil,
  odenmezTablosu,
  odenmezleriGetir,
  personeldenAktar,
  type Odenmez,
  type OdenmezPlani,
} from "../odenmezler";

const bugun = () => {
  const t = new Date();
  const iki = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${iki(t.getMonth() + 1)}-${iki(t.getDate())}`;
};

function OdenmezPaneli({
  kayit,
  onKapat,
  onKaydet,
  onSil,
}: {
  kayit: Odenmez | null;
  onKapat: () => void;
  onKaydet: (alanlar: { ad: string; unvan: string; aktif: boolean }) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(kayit?.ad ?? "");
  const [unvan, setUnvan] = useState(kayit?.unvan ?? "");
  const [aktif, setAktif] = useState(kayit?.aktif ?? true);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel dar" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{kayit ? kayit.ad : "Yeni ödenmez"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde musteri-form">
          <div className="alan">
            <label>Ad soyad</label>
            <input value={ad} onChange={(e) => setAd(e.target.value)} autoFocus />
          </div>

          <div className="alan">
            <label>Unvan</label>
            <input
              value={unvan}
              onChange={(e) => setUnvan(e.target.value)}
              placeholder="Garson, Müdür, Ev sahibi…"
            />
          </div>

          <div className="alan-anahtarlar">
            <Anahtar etiket="Listede görünsün" acik={aktif} degistir={setAktif} />
          </div>
        </div>

        <footer className="modal-aksiyonlar">
          {onSil && (
            <button className="sil-buton" onClick={onSil}>
              <Trash2 size={15} /> Sil
            </button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={!ad.trim()}
            onClick={() => onKaydet({ ad, unvan, aktif })}
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function Odenmezler() {
  const [liste, setListe] = useState<Odenmez[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [panel, setPanel] = useState<Odenmez | null | undefined>(undefined);
  const [silinecek, setSilinecek] = useState<Odenmez | null>(null);
  const [bildirim, setBildirim] = useState("");
  const [hata, setHata] = useState("");
  const [ara, setAra] = useState("");
  const [plan, setPlan] = useState<OdenmezPlani | null>(null);
  const [yaziliyor, setYaziliyor] = useState(false);
  const dosyaSecici = useRef<HTMLInputElement>(null);

  const tazele = async () => setListe(await odenmezleriGetir(true));

  useEffect(() => {
    (async () => {
      await tazele();
      setYukleniyor(false);
    })();
  }, []);

  const kaydet = async (alanlar: { ad: string; unvan: string; aktif: boolean }) => {
    try {
      await odenmezKaydet(panel?.id ?? null, alanlar, liste.length + 1);
      setPanel(undefined);
      await tazele();
      setBildirim("Kaydedildi");
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
    }
  };

  const sil = async () => {
    if (!silinecek) return;
    try {
      const sonuc = await odenmezSil(silinecek.id);
      setSilinecek(null);
      setPanel(undefined);
      await tazele();
      setBildirim(sonuc === "pasif" ? "Pasife alındı" : "Silindi");
    } catch (e) {
      setSilinecek(null);
      setHata(e instanceof Error ? e.message : "Silinemedi.");
    }
  };

  const aktar = async () => {
    try {
      const adet = await personeldenAktar();
      await tazele();
      setBildirim(
        adet > 0 ? `${adet} kişi listeye eklendi` : "Eklenecek yeni kişi yok"
      );
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Personel aktarılamadı.");
    }
  };

  // Excel kütüphaneleri düğmeye basılınca yükleniyor; program açılışına binmesin.
  const indir = async () => {
    const { default: excelYaz } = await import("write-excel-file/browser");
    await excelYaz(odenmezTablosu(liste), {
      sheet: "Ödenmezler",
      columns: ODENMEZ_SUTUNLARI.map((width) => ({ width })),
      stickyRowsCount: 1,
    }).toFile(`garso-odenmezler-${bugun()}.xlsx`);
  };

  const dosyaSecildi = async (dosya?: File) => {
    if (dosyaSecici.current) dosyaSecici.current.value = "";
    if (!dosya) return;

    let tablo: unknown[][];
    try {
      const { readSheet } = await import("read-excel-file/browser");
      tablo = await readSheet(dosya);
    } catch {
      setHata("Dosya okunamadı. Excel dosyası (.xlsx) olduğundan emin ol.");
      return;
    }

    const hazir = odenmezPlaniHazirla(tablo, liste);
    if (!hazir.yeniler.length && !hazir.guncellenecekler.length && !hazir.hatalar.length) {
      setBildirim(
        hazir.degismeyen ? "Dosyada değişen bir şey yok" : "Dosyada kayıt satırı bulunamadı"
      );
      return;
    }
    setPlan(hazir);
  };

  const planiYaz = async () => {
    if (!plan) return;
    setYaziliyor(true);
    try {
      await odenmezPlaniYaz(plan, Math.max(0, ...liste.map((o) => o.sira)));
      const adet = plan.yeniler.length + plan.guncellenecekler.length;
      setPlan(null);
      await tazele();
      setBildirim(`${adet} kayıt yazıldı`);
    } catch (e) {
      setPlan(null);
      setHata(e instanceof Error ? e.message : "Dosya yazılamadı.");
    } finally {
      setYaziliyor(false);
    }
  };

  // Özet tek metin olarak veriliyor; satır sonları modalda korunuyor.
  const planOzeti = (p: OdenmezPlani) => {
    const satirlar = [
      `${p.yeniler.length} yeni kayıt eklenecek`,
      `${p.guncellenecekler.length} kayıt güncellenecek`,
      `${p.degismeyen} kayıt değişmemiş, atlanacak`,
    ];
    if (p.hatalar.length) {
      satirlar.push(
        "",
        `${p.hatalar.length} satır atlanacak:`,
        ...p.hatalar.slice(0, 8).map((h) => `• ${h.satir}. satır — ${h.mesaj}`)
      );
      if (p.hatalar.length > 8) satirlar.push(`• …ve ${p.hatalar.length - 8} satır daha`);
    }
    return satirlar.join("\n");
  };

  const gorunen = liste.filter((o) => eslesiyor(`${o.ad} ${o.unvan}`, ara));

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <AyarBasligi ara={ara} araDegistir={setAra} araYer="Ad veya unvan ara" />

        <Bilgi>
          İkram ve personel yemeği kimin adına yazılıyorsa o kişi burada
          tanımlıdır. Ay sonunda ikramların kime gittiği Analiz'den bu listeye
          göre okunur.
        </Bilgi>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><Gift size={17} /> Ödenmezler</h2>
              <button className="satir-tus" onClick={aktar}>
                <Users size={15} /> Personelden aktar
              </button>
              <button className="satir-tus" onClick={indir} disabled={!liste.length}>
                <Download size={15} /> Excel indir
              </button>
              <input
                ref={dosyaSecici}
                type="file"
                accept=".xlsx"
                hidden
                onChange={(e) => dosyaSecildi(e.target.files?.[0])}
              />
              <button className="satir-tus" onClick={() => dosyaSecici.current?.click()}>
                <Upload size={15} /> Excel'den yükle
              </button>
              <button className="ayar-ekle" onClick={() => setPanel(null)}>
                <Plus size={15} /> Ödenmez ekle
              </button>
            </div>

            {liste.length === 0 ? (
              <div className="ayar-bos">
                <Gift size={30} />
                <p>
                  Henüz kayıt yok. "Personelden aktar" ile çalışanlarınızı tek
                  seferde ekleyebilirsiniz.
                </p>
              </div>
            ) : gorunen.length === 0 ? (
              <div className="ayar-bos">
                <Gift size={30} />
                <p>"{ara}" ile eşleşen kayıt yok.</p>
              </div>
            ) : (
              <div className="musteri-liste">
                {gorunen.map((o) => (
                  <div
                    key={o.id}
                    className={o.aktif ? "odenmez-satir" : "odenmez-satir kapali"}
                  >
                    <UserRound size={16} />
                    <span className="musteri-ad">
                      {o.ad}
                      <small>{o.unvan || "Unvan yok"}</small>
                    </span>
                    <span className="musteri-etiket">{o.aktif ? "" : "Pasif"}</span>
                    <button onClick={() => setPanel(o)} title="Düzenle">
                      <Pencil size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {panel !== undefined && (
        <OdenmezPaneli
          key={panel?.id ?? "yeni"}
          kayit={panel}
          onKapat={() => setPanel(undefined)}
          onKaydet={kaydet}
          onSil={panel ? () => setSilinecek(panel) : undefined}
        />
      )}

      {silinecek && (
        <OnayModal
          mesaj={`${silinecek.ad} silinsin mi? Adına yazılmış ikram varsa kaydı silinmez, listeden gizlenir.`}
          tehlikeli
          onOnay={sil}
          onKapat={() => setSilinecek(null)}
        />
      )}

      {plan && (
        <OnayModal
          baslik="Dosyadan yüklenecekler"
          ikon={<Upload size={17} />}
          mesaj={planOzeti(plan)}
          onayMetni={yaziliyor ? "Yazılıyor…" : "Yaz"}
          onOnay={planiYaz}
          onKapat={() => !yaziliyor && setPlan(null)}
        />
      )}

      {hata && <OnayModal mesaj={hata} tekTus onKapat={() => setHata("")} />}
      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
