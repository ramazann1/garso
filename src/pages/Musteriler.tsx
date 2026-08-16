import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2, UsersRound, X } from "lucide-react";
import Duzen from "../components/Duzen";
import AramaKutusu from "../components/AramaKutusu";
import Anahtar from "../components/Anahtar";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import OnayModal from "../components/OnayModal";
import MusteriDetay from "../components/MusteriDetay";
import { eslesiyor } from "../arama";
import { paraGoster, paraSayi, paraYaz } from "../para";
import { yetkiVar } from "../oturum";
import {
  adresKaydet,
  adresSil,
  adresleriGetir,
  musteriKaydet,
  musteriSil,
  musterileriGetir,
  tamAd,
  type Adres,
  type Musteri,
  type MusteriAlanlari,
} from "../cari";

const ADRES_BASLIKLARI = ["Ev", "İşyeri", "Diğer"];

/** Müşterinin adresleri müşteri panelinin içinde düzenleniyor: ayrı bir ekrana
 *  gitmek, tek satır adres eklemek için fazla yol. */
function AdresBolumu({ musteriId }: { musteriId: number }) {
  const [liste, setListe] = useState<Adres[]>([]);
  const [acik, setAcik] = useState<Adres | null | undefined>(undefined);
  const [baslik, setBaslik] = useState("Ev");
  const [adres, setAdres] = useState("");
  const [tarif, setTarif] = useState("");
  const [varsayilan, setVarsayilan] = useState(false);

  const tazele = async () => setListe(await adresleriGetir(musteriId));

  useEffect(() => {
    tazele();
  }, [musteriId]);

  const formaAl = (a: Adres | null) => {
    setAcik(a);
    setBaslik(a?.baslik ?? "Ev");
    setAdres(a?.adres ?? "");
    setTarif(a?.tarif ?? "");
    setVarsayilan(a?.varsayilan ?? liste.length === 0);
  };

  const kaydet = async () => {
    await adresKaydet(acik?.id ?? null, musteriId, { baslik, adres, tarif, varsayilan });
    setAcik(undefined);
    await tazele();
  };

  const sil = async (id: number) => {
    await adresSil(id);
    await tazele();
  };

  return (
    <div className="alan">
      <div className="adres-liste">
        {liste.map((a) => (
          <div key={a.id} className="adres-satir">
            <MapPin size={15} />
            <span className="adres-metin">
              <strong>
                {a.baslik}
                {a.varsayilan && <em>varsayılan</em>}
              </strong>
              <small>{a.adres}</small>
            </span>
            <button onClick={() => formaAl(a)} title="Düzenle">
              <Pencil size={14} />
            </button>
            <button onClick={() => sil(a.id)} title="Sil">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {acik === undefined ? (
        <button className="satir-tus" onClick={() => formaAl(null)}>
          <Plus size={15} /> Adres ekle
        </button>
      ) : (
        <div className="adres-form">
          <div className="cip-secim">
            {ADRES_BASLIKLARI.map((b) => (
              <button
                key={b}
                className={baslik === b ? "aktif" : ""}
                onClick={() => setBaslik(b)}
              >
                {b}
              </button>
            ))}
          </div>
          <input
            value={adres}
            onChange={(e) => setAdres(e.target.value)}
            placeholder="Adres"
            autoFocus
          />
          <input
            value={tarif}
            onChange={(e) => setTarif(e.target.value)}
            placeholder="Tarif (kapı, kat, işaret)"
          />
          <Anahtar etiket="Varsayılan adres" acik={varsayilan} degistir={setVarsayilan} />
          <div className="adres-form-aksiyon">
            <button className="iptal" onClick={() => setAcik(undefined)}>Vazgeç</button>
            <button className="uygula" disabled={!adres.trim()} onClick={kaydet}>
              Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MusteriPaneli({
  musteri,
  onKapat,
  onKaydet,
  onSil,
}: {
  musteri: Musteri | null;
  onKapat: () => void;
  onKaydet: (alanlar: MusteriAlanlari) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(musteri?.ad ?? "");
  const [soyad, setSoyad] = useState(musteri?.soyad ?? "");
  const [telefon, setTelefon] = useState(musteri?.telefon ?? "");
  const [telefon2, setTelefon2] = useState(musteri?.telefon2 ?? "");
  const [acikHesap, setAcikHesap] = useState(musteri?.acikHesap ?? false);
  const [notlar, setNotlar] = useState(musteri?.notlar ?? "");
  const [aktif, setAktif] = useState(musteri?.aktif ?? true);
  const [acilis, setAcilis] = useState("");

  const gecerli = ad.trim().length > 0;

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{musteri ? `${tamAd(musteri)} · #${musteri.no}` : "Yeni müşteri"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde musteri-form">
          <p className="form-baslik">Kimlik</p>

          <div className="alan-ikili">
            <div className="alan">
              <label>Ad</label>
              <input value={ad} onChange={(e) => setAd(e.target.value)} autoFocus />
            </div>
            <div className="alan">
              <label>Soyad</label>
              <input value={soyad} onChange={(e) => setSoyad(e.target.value)} />
            </div>
          </div>

          <div className="alan-ikili">
            <div className="alan">
              <label>Telefon</label>
              <input
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                inputMode="tel"
              />
            </div>
            <div className="alan">
              <label>İkinci telefon</label>
              <input
                value={telefon2}
                onChange={(e) => setTelefon2(e.target.value)}
                inputMode="tel"
              />
            </div>
          </div>

          <p className="form-baslik">Hesap</p>

          {/* Devreden bakiye yalnız yeni kayıtta soruluyor: sonrasında bakiye
              hareketlerden geliyor, elle yazılan bir alan olarak durmamalı. */}
          {!musteri && (
            <div className="alan">
              <label>Devreden bakiye</label>
              <input
                value={acilis}
                onChange={(e) => setAcilis(paraYaz(e.target.value))}
                inputMode="decimal"
                placeholder="0,00"
              />
              <small className="alan-ipucu">
                Bu müşterinin önceden kalan borcu varsa yazın; hesap ekstresine
                açılış olarak düşer.
              </small>
            </div>
          )}

          <div className="alan-anahtarlar">
            <Anahtar
              etiket="Açık hesap müşterisi"
              ipucu="Hesabını sonra ödeyebilir; borcu carisine yazılır."
              acik={acikHesap}
              degistir={setAcikHesap}
            />
            <Anahtar
              etiket="Müşteri listesinde görünsün"
              acik={aktif}
              degistir={setAktif}
            />
          </div>

          {musteri && (
            <>
              <p className="form-baslik">Adresler</p>
              <AdresBolumu musteriId={musteri.id} />
            </>
          )}

          <p className="form-baslik">Not</p>

          <div className="alan">
            <input
              value={notlar}
              onChange={(e) => setNotlar(e.target.value)}
              placeholder="Müşteriyle ilgili serbest not"
            />
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
            disabled={!gecerli}
            onClick={() =>
              onKaydet({
                ad,
                soyad,
                telefon,
                telefon2,
                acikHesap,
                notlar,
                aktif,
                acilisBakiye: paraSayi(acilis) ?? 0,
              })
            }
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function Musteriler() {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [liste, setListe] = useState<Musteri[]>([]);
  const [panel, setPanel] = useState<Musteri | null | undefined>(undefined);
  const [detay, setDetay] = useState<Musteri | null>(null);
  const [silinecek, setSilinecek] = useState<Musteri | null>(null);
  const [bildirim, setBildirim] = useState("");
  const [ara, setAra] = useState("");
  const [yalnizAcikHesap, setYalnizAcikHesap] = useState(false);
  const [yalnizBorclu, setYalnizBorclu] = useState(false);

  const duzenleyebilir = yetkiVar("cari.duzenle");

  const tazele = async () => setListe(await musterileriGetir());

  useEffect(() => {
    (async () => {
      await tazele();
      setYukleniyor(false);
    })();
  }, []);

  const kaydet = async (alanlar: MusteriAlanlari) => {
    await musteriKaydet(panel?.id ?? null, alanlar);
    setPanel(undefined);
    await tazele();
    setBildirim("Müşteri kaydedildi");
  };

  const sil = async () => {
    if (!silinecek) return;
    const sonuc = await musteriSil(silinecek.id);
    setSilinecek(null);
    setPanel(undefined);
    await tazele();
    setBildirim(sonuc === "pasif" ? "Müşteri pasife alındı" : "Müşteri silindi");
  };

  const gorunen = liste.filter((m) => {
    if (yalnizAcikHesap && !m.acikHesap) return false;
    if (yalnizBorclu && m.bakiye <= 0) return false;
    return eslesiyor(`${tamAd(m)} ${m.telefon} ${m.telefon2} ${m.no}`, ara);
  });

  // Üstteki toplam listenin süzülmüş hâlini değil işletmenin gerçek alacağını
  // gösteriyor: süzgeç değiştikçe oynayan bir "toplam borç" yanıltıcı olurdu.
  const toplamBakiye = liste.reduce((t, m) => t + m.bakiye, 0);
  const borcluSayisi = liste.filter((m) => m.bakiye > 0).length;

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <header className="menu-baslik">
          <div className="ayar-baslik-ust">
            <h1>Müşteriler</h1>
            <AramaKutusu deger={ara} degistir={setAra} yer="Ad veya telefon ara" />
          </div>
        </header>

        <Bilgi>
          Tanıdığınız müşterileri buraya kaydedersiniz. Açık hesap açtığınız
          müşterinin borcu hesabına yazılır, ödediğinde düşer.
        </Bilgi>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><UsersRound size={17} /> Müşteriler</h2>
              <div className="cip-secim">
                <button
                  className={yalnizAcikHesap ? "aktif" : ""}
                  onClick={() => setYalnizAcikHesap((e) => !e)}
                >
                  Açık hesaplılar
                </button>
                <button
                  className={yalnizBorclu ? "aktif" : ""}
                  onClick={() => setYalnizBorclu((e) => !e)}
                >
                  Borcu olanlar
                </button>
              </div>
              {duzenleyebilir && (
                <button className="ayar-ekle" onClick={() => setPanel(null)}>
                  <Plus size={15} /> Müşteri ekle
                </button>
              )}
            </div>

            <div className="musteri-ozet">
              <span>
                <small>Müşteri</small>
                {liste.length}
              </span>
              <span>
                <small>Borçlu müşteri</small>
                {borcluSayisi}
              </span>
              <span className={toplamBakiye > 0 ? "borclu" : ""}>
                <small>Toplam alacak</small>
                {paraGoster(toplamBakiye)}
              </span>
            </div>

            {liste.length === 0 ? (
              <div className="ayar-bos">
                <UsersRound size={30} />
                <p>Henüz müşteri yok. Sık gelen misafirlerinizi ekleyerek başlayın.</p>
              </div>
            ) : gorunen.length === 0 ? (
              <div className="ayar-bos">
                <UsersRound size={30} />
                <p>Süzgece uyan müşteri yok.</p>
              </div>
            ) : (
              <div className="musteri-liste">
                {gorunen.map((m) => (
                  <div
                    key={m.id}
                    className={m.aktif ? "musteri-satir" : "musteri-satir kapali"}
                    onClick={() => setDetay(m)}
                  >
                    <span className="musteri-no">#{m.no}</span>
                    <span className="musteri-ad">
                      {tamAd(m)}
                      <small>{m.telefon || "Telefon yok"}</small>
                    </span>
                    <span className="musteri-etiket">
                      {m.acikHesap ? "Açık hesap" : ""}
                      {!m.aktif && " · Pasif"}
                    </span>
                    <span
                      className={
                        m.bakiye > 0
                          ? "musteri-bakiye borclu"
                          : m.bakiye < 0
                            ? "musteri-bakiye alacakli"
                            : "musteri-bakiye"
                      }
                    >
                      {paraGoster(m.bakiye)}
                    </span>
                    {duzenleyebilir && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPanel(m);
                        }}
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {detay && (
        <MusteriDetay
          key={detay.id}
          musteri={detay}
          onKapat={() => setDetay(null)}
          onDegisti={tazele}
          onDuzenle={() => {
            setPanel(detay);
            setDetay(null);
          }}
        />
      )}

      {panel !== undefined && (
        <MusteriPaneli
          key={panel?.id ?? "yeni"}
          musteri={panel}
          onKapat={() => setPanel(undefined)}
          onKaydet={kaydet}
          onSil={panel ? () => setSilinecek(panel) : undefined}
        />
      )}

      {silinecek && (
        <OnayModal
          mesaj={`${tamAd(silinecek)} silinsin mi? Hesap hareketi varsa kaydı silinmez, listeden gizlenir.`}
          tehlikeli
          onOnay={sil}
          onKapat={() => setSilinecek(null)}
        />
      )}

      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
