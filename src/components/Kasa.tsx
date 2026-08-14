import { useEffect, useState } from "react";
import {
  AlarmClock,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  Inbox,
  Lock,
  LockOpen,
  Minus,
  Plus,
  X,
} from "lucide-react";
import OnayModal from "./OnayModal";
import { ayarlar } from "../isletmeAyarlari";
import { yetkiVar } from "../oturum";
import { paraGoster, paraSayi, paraYaz } from "../para";
import { kisaAd } from "../personel";
import { cekmeceyiAc } from "../yazicilar";
import {
  acikAdisyonSayisi,
  hareketEkle,
  kapanisGecikti,
  kasaAc,
  kasaDurumu,
  kasaKapat,
  type KasaDurumu,
} from "../kasa";

const BOS: KasaDurumu = {
  vardiya: null,
  hareketler: [],
  nakitSatis: 0,
  giris: 0,
  cikis: 0,
  nakitGider: 0,
  beklenen: 0,
};

function gecenSure(baslangic: string) {
  const dakika = Math.max(0, Math.floor((Date.now() - new Date(baslangic).getTime()) / 60000));
  const saat = Math.floor(dakika / 60);
  return saat > 0 ? `${saat} sa ${dakika % 60} dk` : `${dakika} dk`;
}

const saatMetni = (t: string) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

/**
 * Kasa, salondan çıkmadan açılıp kapanıyor: kasanın başındaki kişi işin
 * ortasında masayı kaybetmesin diye ayrı sayfa değil, pencere.
 */
export default function Kasa() {
  const [acik, setAcik] = useState(false);
  // Hatırlatmadan gelindiğinde pencere doğrudan sayım formunda açılıyor.
  const [kapanisla, setKapanisla] = useState(false);
  const [durum, setDurum] = useState<KasaDurumu>(BOS);
  const [, saatiIlerlet] = useState(0);
  // Hatırlatma ertelendiğinde bu ana kadar susuyor.
  const [ertelemeSonu, setErtelemeSonu] = useState(0);

  const yenile = () => kasaDurumu().then(setDurum);

  useEffect(() => {
    yenile();
  }, []);

  // Düğmedeki süre yazısı dursun diye değil, ilerlesin diye: yarım dakikada bir
  // kendini yeniliyor. Kapanış hatırlatması da bu sayaçla uyanıyor.
  useEffect(() => {
    if (!durum.vardiya) return;
    const zaman = setInterval(() => saatiIlerlet((n) => n + 1), 30000);
    return () => clearInterval(zaman);
  }, [durum.vardiya]);

  const vardiya = durum.vardiya;
  const { kasaKapanisUyari, kasaKapanisZorunlu } = ayarlar();
  const gecikti = !!vardiya && kapanisGecikti(vardiya.acilis, kasaKapanisUyari);

  // Kasa penceresi zaten açıkken hatırlatmayı üstüne bindirmek anlamsız.
  const hatirlat = gecikti && !acik && Date.now() >= ertelemeSonu;

  // Israrcı ayarında erteleme kısa: kasa kapatılana kadar peşini bırakmıyor.
  const ertele = () =>
    setErtelemeSonu(Date.now() + (kasaKapanisZorunlu ? 2 : 15) * 60000);

  return (
    <>
      <button
        className={
          gecikti ? "kasa-dugme gecikti" : vardiya ? "kasa-dugme acik" : "kasa-dugme"
        }
        onClick={() => {
          yenile();
          setKapanisla(false);
          setAcik(true);
        }}
      >
        {gecikti ? <AlarmClock size={16} /> : vardiya ? <LockOpen size={16} /> : <Lock size={16} />}
        <span>
          <strong>
            {gecikti ? "Kasa kapatılmalı" : vardiya ? "Kasa açık" : "Kasa kapalı"}
          </strong>
          {vardiya && <em>{gecenSure(vardiya.acilis)}</em>}
        </span>
      </button>

      {acik && (
        <KasaPenceresi
          durum={durum}
          kapanisla={kapanisla}
          onYenile={yenile}
          onKapat={() => setAcik(false)}
        />
      )}

      {hatirlat && (
        <OnayModal
          baslik="Kasa hâlâ açık"
          ikon={<AlarmClock size={20} />}
          mesaj={`Kapanış saati ${kasaKapanisUyari} geçti; kasa ${saatMetni(vardiya!.acilis)}'ten beri açık. Kapatınca sayılan para ile olması gereken tutar karşılaştırılır.`}
          onayMetni="Kasayı kapat"
          iptalMetni="Sonra"
          onOnay={() => {
            ertele();
            yenile();
            setKapanisla(true);
            setAcik(true);
          }}
          onKapat={ertele}
        />
      )}
    </>
  );
}

function KasaPenceresi({
  durum,
  kapanisla,
  onYenile,
  onKapat,
}: {
  durum: KasaDurumu;
  kapanisla?: boolean;
  onYenile: () => void;
  onKapat: () => void;
}) {
  const [kapaniyor, setKapaniyor] = useState(!!kapanisla);
  const [hareketTipi, setHareketTipi] = useState<"giris" | "cikis" | null>(null);
  const [uyari, setUyari] = useState("");
  const [hata, setHata] = useState("");

  const vardiya = durum.vardiya;
  const paraYetkisi = ayarlar().paraHareketiAcik && yetkiVar("kasa.para");

  // Çekmece açmak kasanın parasını değiştirmiyor, ekranın tazelenmesine gerek yok.
  const cekmeceAc = async () => {
    try {
      await cekmeceyiAc();
      setHata("");
    } catch (e) {
      setHata((e as Error).message);
    }
  };

  const isle = async (f: () => Promise<void>) => {
    try {
      await f();
      onYenile();
      setHata("");
    } catch (e) {
      setHata((e as Error).message);
    }
  };

  return (
    <div className="modal-fon" onClick={onKapat}>
      <div className="kasa-pencere" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3 className="modal-baslik">
            <Banknote size={18} />
            Kasa
          </h3>
          <button className="kasa-cik" onClick={onKapat}>
            <X size={18} />
          </button>
        </header>

        {!vardiya ? (
          <KasaAcma onAc={(tutar, not) => isle(() => kasaAc(tutar, not))} />
        ) : kapaniyor ? (
          <KasaKapatma
            beklenen={durum.beklenen}
            onVazgec={() => setKapaniyor(false)}
            onKapat={async (sayilan, not) => {
              const acikAdisyon = await acikAdisyonSayisi();
              if (acikAdisyon > 0) {
                setUyari(
                  `Açık ${acikAdisyon} adisyon var. Kasa kapatılmadan önce hepsinin ödemesi alınmalı.`
                );
                return;
              }
              await isle(() => kasaKapat(vardiya.id, sayilan, not));
              setKapaniyor(false);
            }}
          />
        ) : (
          <>
            <p className="kasa-kim">
              <strong>{kisaAd(vardiya.acan)}</strong> açtı · {saatMetni(vardiya.acilis)} ·{" "}
              {gecenSure(vardiya.acilis)} önce
            </p>

            <dl className="kasa-dokum">
              <div>
                <dt>Açılış tutarı</dt>
                <dd>{paraGoster(vardiya.acilisTutar)}</dd>
              </div>
              <div>
                <dt>Nakit satışlar</dt>
                <dd>{paraGoster(durum.nakitSatis)}</dd>
              </div>
              {durum.giris > 0 && (
                <div>
                  <dt>Kasaya eklenen</dt>
                  <dd className="artan">+{paraGoster(durum.giris)}</dd>
                </div>
              )}
              {durum.cikis > 0 && (
                <div>
                  <dt>Kasadan çıkan</dt>
                  <dd className="azalan">−{paraGoster(durum.cikis)}</dd>
                </div>
              )}
              {durum.nakitGider > 0 && (
                <div>
                  <dt>Nakit giderler</dt>
                  <dd className="azalan">−{paraGoster(durum.nakitGider)}</dd>
                </div>
              )}
              <div className="kasa-beklenen">
                <dt>Kasada olması gereken</dt>
                <dd>{paraGoster(durum.beklenen)}</dd>
              </div>
            </dl>

            {durum.hareketler.length > 0 && (
              <ul className="kasa-hareket">
                {durum.hareketler.map((h) => (
                  <li key={h.id}>
                    {h.tip === "giris" ? (
                      <ArrowDownLeft size={15} className="artan" />
                    ) : (
                      <ArrowUpRight size={15} className="azalan" />
                    )}
                    <span>
                      <strong>{h.aciklama || (h.tip === "giris" ? "Para eklendi" : "Para çıkarıldı")}</strong>
                      <em>
                        {kisaAd(h.kisi)} · {saatMetni(h.olusturma)}
                      </em>
                    </span>
                    <b className={h.tip === "giris" ? "artan" : "azalan"}>
                      {h.tip === "giris" ? "+" : "−"}
                      {paraGoster(h.tutar)}
                    </b>
                  </li>
                ))}
              </ul>
            )}

            {hareketTipi && (
              <HareketFormu
                tip={hareketTipi}
                onVazgec={() => setHareketTipi(null)}
                onKaydet={async (tutar, aciklama) => {
                  await isle(() => hareketEkle(vardiya.id, hareketTipi, tutar, aciklama));
                  setHareketTipi(null);
                }}
              />
            )}

            {!hareketTipi && (
              <div className="kasa-aksiyon">
                {paraYetkisi && (
                  <>
                    <button className="kasa-ikincil" onClick={() => setHareketTipi("giris")}>
                      <Plus size={16} />
                      Para ekle
                    </button>
                    <button className="kasa-ikincil" onClick={() => setHareketTipi("cikis")}>
                      <Minus size={16} />
                      Para çıkar
                    </button>
                  </>
                )}
                <button className="kasa-ikincil" onClick={cekmeceAc}>
                  <Inbox size={16} />
                  Çekmeceyi aç
                </button>
                <button className="kasa-birincil" onClick={() => setKapaniyor(true)}>
                  <Lock size={16} />
                  Kasayı kapat
                </button>
              </div>
            )}
          </>
        )}

        {hata && <p className="kasa-hata">{hata}</p>}
      </div>

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari("")} />}
    </div>
  );
}

function KasaAcma({ onAc }: { onAc: (tutar: number, not: string) => void }) {
  const [tutar, setTutar] = useState("");
  const [not, setNot] = useState("");

  return (
    <div className="kasa-form">
      <p className="kasa-bos">
        Kasa kapalı. Gün başındaki para sayılıp girildikten sonra satışlar kasaya işlenir.
      </p>

      <label>
        Kasadaki para
        <input
          autoFocus
          inputMode="decimal"
          placeholder="0,00"
          value={tutar}
          onChange={(e) => setTutar(paraYaz(e.target.value))}
        />
      </label>

      <label>
        Not
        <input
          placeholder="İsteğe bağlı"
          value={not}
          onChange={(e) => setNot(e.target.value)}
        />
      </label>

      <button className="kasa-birincil" onClick={() => onAc(paraSayi(tutar) ?? 0, not)}>
        <LockOpen size={16} />
        Kasayı aç
      </button>
    </div>
  );
}

function KasaKapatma({
  beklenen,
  onKapat,
  onVazgec,
}: {
  beklenen: number;
  onKapat: (sayilan: number, not: string) => void;
  onVazgec: () => void;
}) {
  const [sayilan, setSayilan] = useState("");
  const [not, setNot] = useState("");

  // Fark kaydetmeden önce görünüyor: kasiyer yanlış saydıysa daha kapatmadan
  // fark eder, sayımı düzeltir.
  const girildi = sayilan.trim() !== "";
  const fark = (paraSayi(sayilan) ?? 0) - beklenen;

  return (
    <div className="kasa-form">
      <label>
        Sayılan para
        <input
          autoFocus
          inputMode="decimal"
          placeholder="0,00"
          value={sayilan}
          onChange={(e) => setSayilan(paraYaz(e.target.value))}
        />
      </label>

      <dl className="kasa-dokum">
        <div>
          <dt>Kasada olması gereken</dt>
          <dd>{paraGoster(beklenen)}</dd>
        </div>
      </dl>

      {girildi && (
        <p className={fark === 0 ? "kasa-fark tutuyor" : fark < 0 ? "kasa-fark eksik" : "kasa-fark fazla"}>
          {fark === 0 ? (
            <>
              <Check size={16} />
              Sayım tutuyor
            </>
          ) : fark < 0 ? (
            <>Kasada {paraGoster(-fark)} eksik</>
          ) : (
            <>Kasada {paraGoster(fark)} fazla</>
          )}
        </p>
      )}

      <label>
        Not
        <input
          placeholder={fark !== 0 && girildi ? "Farkın sebebi" : "İsteğe bağlı"}
          value={not}
          onChange={(e) => setNot(e.target.value)}
        />
      </label>

      <div className="kasa-aksiyon">
        <button className="kasa-ikincil" onClick={onVazgec}>
          Vazgeç
        </button>
        <button
          className="kasa-birincil"
          disabled={!girildi}
          onClick={() => onKapat(paraSayi(sayilan) ?? 0, not)}
        >
          <Lock size={16} />
          Kasayı kapat
        </button>
      </div>
    </div>
  );
}

function HareketFormu({
  tip,
  onKaydet,
  onVazgec,
}: {
  tip: "giris" | "cikis";
  onKaydet: (tutar: number, aciklama: string) => void;
  onVazgec: () => void;
}) {
  const [tutar, setTutar] = useState("");
  const [aciklama, setAciklama] = useState("");
  const sayi = paraSayi(tutar) ?? 0;

  return (
    <div className="kasa-form">
      <label>
        {tip === "giris" ? "Kasaya eklenen" : "Kasadan çıkan"}
        <input
          autoFocus
          inputMode="decimal"
          placeholder="0,00"
          value={tutar}
          onChange={(e) => setTutar(paraYaz(e.target.value))}
        />
      </label>

      <label>
        Sebep
        <input
          placeholder={tip === "giris" ? "Bozukluk getirildi" : "Bankaya yatırıldı"}
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
        />
      </label>

      <div className="kasa-aksiyon">
        <button className="kasa-ikincil" onClick={onVazgec}>
          Vazgeç
        </button>
        <button className="kasa-birincil" disabled={sayi <= 0} onClick={() => onKaydet(sayi, aciklama)}>
          <Check size={16} />
          Kaydet
        </button>
      </div>
    </div>
  );
}
