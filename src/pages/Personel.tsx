import { useEffect, useState } from "react";
import { Check, Circle, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Bildirim from "../components/Bildirim";
import Bilgi from "../components/Bilgi";
import Anahtar from "../components/Anahtar";
import OnayModal from "../components/OnayModal";
import { bolgeleriGetir } from "../masalar";
import {
  personelEkle,
  personelGuncelle,
  personelSil,
  personeliGetir,
  pinKullanimda,
  rolleriGetir,
  sifreKurallari,
  telefonKullanimda,
  type Personel,
  type PersonelAlanlari,
  type Rol,
} from "../personel";
import type { Bolge } from "../types";

function PersonelPaneli({
  kisi,
  roller,
  bolgeler,
  onKapat,
  onKaydet,
  onSil,
}: {
  kisi: Personel | null;
  roller: Rol[];
  bolgeler: Bolge[];
  onKapat: () => void;
  onKaydet: (alanlar: PersonelAlanlari) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(kisi?.ad ?? "");
  const [telefon, setTelefon] = useState(kisi?.telefon ?? "");
  const [eposta, setEposta] = useState(kisi?.eposta ?? "");
  const [sifre, setSifre] = useState("");
  const [rolId, setRolId] = useState<number | null>(kisi?.rolId ?? roller[0]?.id ?? null);
  const [seciliBolgeler, setSeciliBolgeler] = useState<number[]>(kisi?.bolgeIdler ?? []);
  const [pinAcik, setPinAcik] = useState(kisi?.pinVar ?? false);
  const [pin, setPin] = useState("");
  const [girisEngelli, setGirisEngelli] = useState(kisi?.girisEngelli ?? false);
  const [aktif, setAktif] = useState(kisi?.aktif ?? true);
  const [hata, setHata] = useState("");

  const bolgeDegis = (id: number) =>
    setSeciliBolgeler((eski) =>
      eski.includes(id) ? eski.filter((b) => b !== id) : [...eski, id]
    );

  // Kayıtlı PIN'i olan kişide alan boş bırakılabilir, eskisi korunur.
  const pinGerekli = pinAcik && !(kisi?.pinVar && pin === "");
  const pinGecerli = !pinGerekli || (/^\d{4}$/.test(pin) && !pin.startsWith("0"));

  // Telefon ve şifre her personelde zorunlu. Kayıtlı kişide şifre alanı boş
  // bırakılabilir — o zaman eski şifre korunuyor, yenisi istenmiyor demektir.
  const kurallar = sifreKurallari(sifre);
  const sifreTamam =
    sifre === "" ? (kisi?.sifreVar ?? false) : kurallar.every((k) => k.tamam);
  const telefonTamam = telefon.replace(/\D/g, "").length >= 10;

  const gecerli =
    ad.trim().length > 0 && rolId !== null && telefonTamam && sifreTamam && pinGecerli;

  const kaydet = async () => {
    if (await telefonKullanimda(telefon, kisi?.id)) {
      setHata("Bu telefon numarası başka bir personelde kayıtlı.");
      return;
    }
    if (pinAcik && pin && (await pinKullanimda(pin, kisi?.id))) {
      setHata("Bu PIN başka bir personelde kullanılıyor.");
      return;
    }
    onKaydet({
      ad: ad.trim(),
      telefon: telefon.trim(),
      eposta: eposta.trim(),
      rolId,
      girisEngelli,
      aktif,
      bolgeIdler: seciliBolgeler,
      sifre: sifre || undefined,
      pin: pinAcik ? (pin || undefined) : null,
    });
  };

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{kisi ? "Personeli düzenle" : "Yeni personel"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde personel-form">
          <div className="alan">
            <label>Ad soyad</label>
            <input value={ad} onChange={(e) => setAd(e.target.value)} autoFocus />
          </div>

          <div className="alan">
            <label>Görev</label>
            <div className="cip-secim">
              {roller.map((r) => (
                <button
                  key={r.id}
                  className={rolId === r.id ? "aktif" : ""}
                  onClick={() => setRolId(r.id)}
                >
                  {r.ad}
                </button>
              ))}
            </div>
          </div>

          <div className="alan-ikili">
            <div className="alan">
              <label>Telefon</label>
              <input
                value={telefon}
                onChange={(e) => {
                  setTelefon(e.target.value);
                  setHata("");
                }}
                inputMode="tel"
                placeholder="0555 000 00 00"
              />
            </div>
            <div className="alan">
              <label>E-posta <em>isteğe bağlı</em></label>
              <input
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
                inputMode="email"
              />
            </div>
          </div>

          <div className="alan">
            <label>
              Şifre
              {kisi?.sifreVar && <em>boş bırakırsanız değişmez</em>}
            </label>
            <input
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="En az 6 karakter, harf ve rakam"
            />
            {sifre !== "" && (
              <ul className="sifre-kurallar">
                {kurallar.map((k) => (
                  <li key={k.metin} className={k.tamam ? "tamam" : undefined}>
                    {k.tamam ? <Check size={13} /> : <Circle size={13} />}
                    {k.metin}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {bolgeler.length > 0 && (
            <div className="alan">
              <label>Bakacağı bölgeler <em>boş = tümü</em></label>
              <div className="cip-secim">
                {bolgeler.map((b) => (
                  <button
                    key={b.id}
                    className={seciliBolgeler.includes(b.id) ? "aktif" : ""}
                    onClick={() => bolgeDegis(b.id)}
                  >
                    {b.ad}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="alan-anahtarlar">
            <Anahtar
              etiket="PIN ile hızlı geçiş"
              acik={pinAcik}
              degistir={(a) => {
                setPinAcik(a);
                if (!a) setPin("");
              }}
            />

            {pinAcik && (
              <div className="pin-alan">
                <input
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setHata("");
                  }}
                  inputMode="numeric"
                  placeholder={kisi?.pinVar ? "••••" : "4 hane"}
                />
                <span>
                  {pin !== "" && !pinGecerli
                    ? "4 haneli olmalı, 0 ile başlayamaz"
                    : "Ortak ekranda şifre yerine bu PIN girilir"}
                </span>
              </div>
            )}

            <Anahtar
              etiket="Girişi engellensin"
              acik={girisEngelli}
              degistir={setGirisEngelli}
            />

            <Anahtar
              etiket="Personel listesinde görünsün"
              acik={aktif}
              degistir={setAktif}
            />
          </div>

          {hata && <small className="alan-uyari">{hata}</small>}
        </div>

        <footer className="modal-aksiyonlar">
          {onSil && (
            <button className="sil-buton" onClick={onSil}>
              <Trash2 size={15} /> Sil
            </button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!gecerli} onClick={kaydet}>Kaydet</button>
        </footer>
      </div>
    </div>
  );
}

export default function PersonelEkrani() {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [liste, setListe] = useState<Personel[]>([]);
  const [roller, setRoller] = useState<Rol[]>([]);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [panel, setPanel] = useState<Personel | null | undefined>(undefined);
  const [silinecek, setSilinecek] = useState<Personel | null>(null);
  const [bildirim, setBildirim] = useState("");

  const tazele = async () => setListe(await personeliGetir(true));

  useEffect(() => {
    (async () => {
      const [kisiler, rol, bolge] = await Promise.all([
        personeliGetir(true),
        rolleriGetir(),
        bolgeleriGetir(),
      ]);
      setListe(kisiler);
      setRoller(rol);
      setBolgeler(bolge);
      setYukleniyor(false);
    })();
  }, []);

  const kaydet = async (alanlar: PersonelAlanlari) => {
    if (panel) await personelGuncelle(panel.id, alanlar);
    else await personelEkle(alanlar, liste.length + 1);
    setPanel(undefined);
    await tazele();
    setBildirim("Personel kaydedildi");
  };

  const sil = async () => {
    if (!silinecek) return;
    await personelSil(silinecek.id);
    setSilinecek(null);
    setPanel(undefined);
    await tazele();
    setBildirim("Personel silindi");
  };

  const bolgeOzeti = (kisi: Personel) => {
    if (kisi.bolgeIdler.length === 0) return "Tüm bölgeler";
    return bolgeler
      .filter((b) => kisi.bolgeIdler.includes(b.id))
      .map((b) => b.ad)
      .join(", ");
  };

  return (
    <Duzen>
      <div className="sayfa">
        <AyarBasligi />

        <Bilgi>
          Çalışanlarınızı buradan tanımlarsınız. Görev, kimin neyi yapabileceğini
          belirler; hangi görevin hangi işlemi yapacağı Yetkiler ekranından ayarlanır.
        </Bilgi>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><UserRound size={17} /> Personel</h2>
              <button className="ayar-ekle" onClick={() => setPanel(null)}>
                <Plus size={15} /> Personel ekle
              </button>
            </div>

            {liste.length === 0 ? (
              <div className="ayar-bos">
                <UserRound size={30} />
                <p>Henüz personel yok. Kendinizi ekleyerek başlayın.</p>
              </div>
            ) : (
              <div className="personel-liste">
                {liste.map((k) => (
                  <div key={k.id} className={k.aktif ? "personel-satir" : "personel-satir kapali"}>
                    <span className="personel-ad">
                      {k.ad}
                      <small>{bolgeOzeti(k)}</small>
                    </span>
                    <span className="personel-rol">{k.rolAd || "Görev yok"}</span>
                    <span className="personel-bilgi">
                      {k.telefon || "—"}
                      {k.pinVar && " · PIN"}
                      {k.girisEngelli && " · Giriş kapalı"}
                      {!k.aktif && " · Ayrıldı"}
                    </span>
                    <button onClick={() => setPanel(k)} title="Düzenle">
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
        <PersonelPaneli
          key={panel?.id ?? "yeni"}
          kisi={panel}
          roller={roller}
          bolgeler={bolgeler}
          onKapat={() => setPanel(undefined)}
          onKaydet={kaydet}
          onSil={panel ? () => setSilinecek(panel) : undefined}
        />
      )}

      {silinecek && (
        <OnayModal
          mesaj={`${silinecek.ad} silinsin mi? İşten ayrıldıysa silmek yerine "Personel listesinde görünsün" anahtarını kapatın; kaydı ve geçmiş işlemleri durur.`}
          tehlikeli
          onOnay={sil}
          onKapat={() => setSilinecek(null)}
        />
      )}

      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
