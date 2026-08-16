import { useEffect, useState } from "react";
import { Gift, Pencil, Plus, Trash2, UserRound, Users, X } from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Anahtar from "../components/Anahtar";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import OnayModal from "../components/OnayModal";
import { eslesiyor } from "../arama";
import {
  odenmezKaydet,
  odenmezSil,
  odenmezleriGetir,
  personeldenAktar,
  type Odenmez,
} from "../odenmezler";

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
    const sonuc = await odenmezSil(silinecek.id);
    setSilinecek(null);
    setPanel(undefined);
    await tazele();
    setBildirim(sonuc === "pasif" ? "Pasife alındı" : "Silindi");
  };

  const aktar = async () => {
    const adet = await personeldenAktar();
    await tazele();
    setBildirim(
      adet > 0 ? `${adet} kişi listeye eklendi` : "Eklenecek yeni kişi yok"
    );
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

      {hata && <OnayModal mesaj={hata} tekTus onKapat={() => setHata("")} />}
      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
