import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Receipt, Tags, Trash2, X } from "lucide-react";
import Duzen from "../components/Duzen";
import KasaBasligi from "../components/KasaBasligi";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import OnayModal from "../components/OnayModal";
import { kasaGunuBasi } from "../analiz";
import { eslesiyor } from "../arama";
import { paraGoster, paraSayi, paraYaz } from "../para";
import { kisaAd } from "../personel";
import { SAKIN, useCanli } from "../canli";
import {
  HAZIR_TIPLER,
  ODEME_TIPLERI,
  hazirTipleriEkle,
  masrafEkle,
  masrafGuncelle,
  masrafSil,
  masrafTipiEkle,
  masrafTipiGuncelle,
  masrafTipiSil,
  masrafTipleriniGetir,
  masraflariGetir,
  odemeAdi,
  type Masraf,
  type MasrafAlanlari,
  type MasrafTipi,
  type OdemeKodu,
} from "../masraflar";

// Tarih kutuları yerel saatle çalışıyor; kayıt ISO olarak saklanıyor.
const yerelTarih = (t: Date) =>
  `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

const yerelSaat = (t: Date) =>
  `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;

const gunMetni = (t: string) =>
  new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });

const saatMetni = (t: string) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

/** Listenin üstündeki dönem seçimi; hepsi kasa gününün başlangıcına göre. */
const DONEMLER = [
  { kod: "bugun", ad: "Bugün", gun: 0 },
  { kod: "hafta", ad: "Son 7 gün", gun: 6 },
  { kod: "ay", ad: "Son 30 gün", gun: 29 },
  { kod: "tumu", ad: "Tümü", gun: null },
] as const;

/**
 * "Bugün" takvim günü değil kasa günü: gece 01:00'de girilen gider işletme için
 * hâlâ dünün gideri. Analiz ekranı da aynı aralığı kullanıyor — ikisi farklı
 * saydığı için aynı gider bir ekranda görünüp diğerinde kaybolabiliyordu.
 */
function donemBaslangici(gun: number | null) {
  if (gun === null) return undefined;
  const t = kasaGunuBasi(new Date());
  t.setDate(t.getDate() - gun);
  return t.toISOString();
}

export default function Giderler() {
  const [tipler, setTipler] = useState<MasrafTipi[]>([]);
  const [liste, setListe] = useState<Masraf[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [donem, setDonem] = useState<string>("ay");
  const [ara, setAra] = useState("");
  const [panel, setPanel] = useState<Masraf | null | undefined>(undefined);
  const [tipPenceresi, setTipPenceresi] = useState(false);
  const [silinecek, setSilinecek] = useState<Masraf | null>(null);
  const [bildirim, setBildirim] = useState("");

  const gun = DONEMLER.find((d) => d.kod === donem)?.gun ?? null;

  const tazele = async () => {
    const [t, m] = await Promise.all([
      masrafTipleriniGetir(),
      masraflariGetir(donemBaslangici(gun)),
    ]);
    setTipler(t);
    setListe(m);
  };

  useEffect(() => {
    tazele().then(() => setYukleniyor(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donem]);

  // Gider mobilden ya da başka bir kasadan da girilebiliyor; liste sakin
  // hızda kendiliğinden tazeleniyor.
  useCanli(["masraflar"], tazele, SAKIN);

  const kaydet = async (alanlar: MasrafAlanlari) => {
    if (panel) await masrafGuncelle(panel.id, alanlar);
    else await masrafEkle(alanlar);
    setPanel(undefined);
    await tazele();
    setBildirim("Gider kaydedildi");
  };

  const sil = async () => {
    if (!silinecek) return;
    await masrafSil(silinecek.id);
    setSilinecek(null);
    setPanel(undefined);
    await tazele();
    setBildirim("Gider silindi");
  };

  const gorunen = liste.filter((m) =>
    eslesiyor(`${m.tipAd} ${m.aciklama} ${odemeAdi(m.odemeTipi)} ${gunMetni(m.zaman)}`, ara)
  );
  const toplam = gorunen.reduce((t, m) => t + m.tutar, 0);
  const nakitToplam = gorunen
    .filter((m) => m.odemeTipi === "nakit")
    .reduce((t, m) => t + m.tutar, 0);

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <KasaBasligi ara={ara} araDegistir={setAra} araYer="Gider ara" />

        <Bilgi>
          İşletmenin harcamaları buraya girilir. Nakit ödenen giderler açık
          vardiyanın kasasından düşer; kart, havale ve çekle ödenenler kasayı
          etkilemez.
        </Bilgi>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : tipler.length === 0 ? (
          <section className="ayar-bolum">
            <div className="ayar-bos">
              <Tags size={30} />
              <p>
                Gider girmeden önce gider türlerini tanımlayın. Hazır listeyle
                başlayıp sonra kendinize göre düzenleyebilirsiniz.
              </p>
              <div className="gider-bos-aksiyon">
                <button
                  className="ayar-ekle"
                  onClick={async () => {
                    await hazirTipleriEkle([]);
                    await tazele();
                    setBildirim("Hazır gider türleri eklendi");
                  }}
                >
                  <Plus size={15} /> Hazır türleri ekle
                </button>
                <button className="gider-tur-dugme" onClick={() => setTipPenceresi(true)}>
                  <Tags size={15} /> Kendim tanımlayayım
                </button>
              </div>
              <p className="gider-hazir-liste">{HAZIR_TIPLER.join(" · ")}</p>
            </div>
          </section>
        ) : (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><Receipt size={17} /> Giderler</h2>
              <div className="cip-secim gider-donem">
                {DONEMLER.map((d) => (
                  <button
                    key={d.kod}
                    className={donem === d.kod ? "aktif" : ""}
                    onClick={() => setDonem(d.kod)}
                  >
                    {d.ad}
                  </button>
                ))}
              </div>
              <button className="gider-tur-dugme" onClick={() => setTipPenceresi(true)}>
                <Tags size={15} /> Gider türleri
              </button>
              <button className="ayar-ekle" onClick={() => setPanel(null)}>
                <Plus size={15} /> Gider ekle
              </button>
            </div>

            {gorunen.length === 0 ? (
              <div className="ayar-bos">
                <Receipt size={30} />
                <p>
                  {ara
                    ? `"${ara}" ile eşleşen gider yok.`
                    : "Bu dönemde gider girilmemiş."}
                </p>
              </div>
            ) : (
              <>
                <div className="gider-liste">
                  {gorunen.map((m) => (
                    <div key={m.id} className="gider-satir">
                      <span className="gider-zaman">
                        {gunMetni(m.zaman)}
                        <small>{saatMetni(m.zaman)}</small>
                      </span>
                      <span className="gider-tur">
                        {m.tipAd}
                        <small>{m.aciklama || (kisaAd(m.kisi) ? `${kisaAd(m.kisi)} girdi` : "—")}</small>
                      </span>
                      <span className="gider-odeme">{odemeAdi(m.odemeTipi)}</span>
                      <span className="gider-tutar">{paraGoster(m.tutar)}</span>
                      <button onClick={() => setPanel(m)} title="Düzenle">
                        <Pencil size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <dl className="kasa-dokum gider-toplam">
                  <div>
                    <dt>Nakit ödenen</dt>
                    <dd>{paraGoster(nakitToplam)}</dd>
                  </div>
                  <div className="kasa-beklenen">
                    <dt>Dönem toplamı</dt>
                    <dd>{paraGoster(toplam)}</dd>
                  </div>
                </dl>
              </>
            )}
          </section>
        )}
      </div>

      {panel !== undefined && (
        <GiderPaneli
          masraf={panel}
          tipler={tipler}
          onKapat={() => setPanel(undefined)}
          onKaydet={kaydet}
          onSil={panel ? () => setSilinecek(panel) : undefined}
          onTurler={() => setTipPenceresi(true)}
        />
      )}

      {tipPenceresi && (
        <TurPenceresi
          tipler={tipler}
          onKapat={() => setTipPenceresi(false)}
          onDegisti={tazele}
        />
      )}

      {silinecek && (
        <OnayModal
          mesaj={`${silinecek.tipAd} · ${paraGoster(silinecek.tutar)} tutarındaki gider silinsin mi?`}
          tehlikeli
          onOnay={sil}
          onKapat={() => setSilinecek(null)}
        />
      )}

      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}

function GiderPaneli({
  masraf,
  tipler,
  onKapat,
  onKaydet,
  onSil,
  onTurler,
}: {
  masraf: Masraf | null;
  tipler: MasrafTipi[];
  onKapat: () => void;
  onKaydet: (alanlar: MasrafAlanlari) => void;
  onSil?: () => void;
  onTurler: () => void;
}) {
  const simdi = masraf ? new Date(masraf.zaman) : new Date();
  const [tipId, setTipId] = useState<number | null>(masraf?.tipId ?? tipler[0]?.id ?? null);
  const [odemeTipi, setOdemeTipi] = useState<OdemeKodu>(masraf?.odemeTipi ?? "nakit");
  const [tarih, setTarih] = useState(yerelTarih(simdi));
  const [saat, setSaat] = useState(yerelSaat(simdi));
  const [tutar, setTutar] = useState(masraf ? String(masraf.tutar).replace(".", ",") : "");
  const [aciklama, setAciklama] = useState(masraf?.aciklama ?? "");

  const sayi = paraSayi(tutar) ?? 0;
  const gecerli = tipId !== null && sayi > 0 && tarih !== "" && saat !== "";

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{masraf ? "Gideri düzenle" : "Yeni gider"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde personel-form">
          <div className="alan">
            <label>Gider türü</label>
            <div className="cip-secim">
              {tipler.filter((t) => t.aktif || t.id === tipId).map((t) => (
                <button
                  key={t.id}
                  className={tipId === t.id ? "aktif" : ""}
                  onClick={() => setTipId(t.id)}
                >
                  {t.ad}
                </button>
              ))}
              <button className="gider-tur-ekle" onClick={onTurler}>
                <Plus size={14} /> Tür ekle
              </button>
            </div>
          </div>

          <div className="alan">
            <label>Ödeme şekli</label>
            <div className="cip-secim">
              {ODEME_TIPLERI.map((o) => (
                <button
                  key={o.kod}
                  className={odemeTipi === o.kod ? "aktif" : ""}
                  onClick={() => setOdemeTipi(o.kod)}
                >
                  {o.ad}
                </button>
              ))}
            </div>
          </div>

          <div className="gider-ikili">
            <div className="alan">
              <label>Tarih</label>
              <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
            </div>
            <div className="alan">
              <label>Saat</label>
              <input type="time" value={saat} onChange={(e) => setSaat(e.target.value)} />
            </div>
          </div>

          <div className="alan">
            <label>Tutar</label>
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0,00"
              value={tutar}
              onChange={(e) => setTutar(paraYaz(e.target.value))}
            />
          </div>

          <div className="alan">
            <label>Açıklama</label>
            <input
              placeholder="Fatura no, satıcı, not"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
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
                tipId,
                tipAd: tipler.find((t) => t.id === tipId)?.ad ?? "",
                odemeTipi,
                zaman: new Date(`${tarih}T${saat}`).toISOString(),
                tutar: sayi,
                aciklama,
              })
            }
          >
            <Check size={16} /> Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Gider türleri ayrı bir ekran değil, küçük bir pencere: tek seviyeli düz liste. */
function TurPenceresi({
  tipler,
  onKapat,
  onDegisti,
}: {
  tipler: MasrafTipi[];
  onKapat: () => void;
  onDegisti: () => Promise<void>;
}) {
  const [yeni, setYeni] = useState("");
  const [duzenlenen, setDuzenlenen] = useState<number | null>(null);
  const [ad, setAd] = useState("");
  const [hata, setHata] = useState("");

  const isle = async (f: () => Promise<void>) => {
    try {
      await f();
      await onDegisti();
      setHata("");
    } catch (e) {
      setHata((e as Error).message);
    }
  };

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>Gider türleri</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="gider-tur-ekleme">
            <input
              placeholder="Yeni tür adı"
              value={yeni}
              onChange={(e) => setYeni(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && yeni.trim()) {
                  isle(async () => {
                    await masrafTipiEkle(yeni, tipler.length);
                  });
                  setYeni("");
                }
              }}
            />
            <button
              className="ayar-ekle"
              disabled={!yeni.trim()}
              onClick={() => {
                isle(async () => {
                  await masrafTipiEkle(yeni, tipler.length);
                });
                setYeni("");
              }}
            >
              <Plus size={15} /> Ekle
            </button>
          </div>

          <div className="gider-tur-liste">
            {tipler.map((t) => (
              <div key={t.id} className="gider-tur-satir">
                {duzenlenen === t.id ? (
                  <>
                    <input value={ad} autoFocus onChange={(e) => setAd(e.target.value)} />
                    <button
                      title="Kaydet"
                      onClick={async () => {
                        await isle(() => masrafTipiGuncelle(t.id, ad));
                        setDuzenlenen(null);
                      }}
                    >
                      <Check size={15} />
                    </button>
                    <button title="Vazgeç" onClick={() => setDuzenlenen(null)}>
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span>{t.ad}</span>
                    <button
                      title="Adını değiştir"
                      onClick={() => {
                        setDuzenlenen(t.id);
                        setAd(t.ad);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button title="Sil" onClick={() => isle(() => masrafTipiSil(t.id))}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <button
            className="gider-tur-dugme"
            onClick={() => isle(() => hazirTipleriEkle(tipler))}
          >
            <Plus size={15} /> Hazır türlerden eksikleri ekle
          </button>

          {hata && <p className="kasa-hata">{hata}</p>}
        </div>
      </div>
    </div>
  );
}
