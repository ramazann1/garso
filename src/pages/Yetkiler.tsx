import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, KeyRound, Lock, ShieldCheck, UserRound, X } from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Bildirim from "../components/Bildirim";
import Bilgi from "../components/Bilgi";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import { personeliGetir, rolleriGetir, type Personel, type Rol } from "../personel";
import {
  gruplara,
  istisnaSayilari,
  kisiYetkileriniGetir,
  kisiYetkileriniKaydet,
  rolYetkileriniGetir,
  rolYetkileriniKaydet,
  yetkileriGetir,
  type KisiDurumu,
  type Yetki,
} from "../yetkiler";

const DURUMLAR: { deger: KisiDurumu; ad: string }[] = [
  { deger: "rolden", ad: "Rolden" },
  { deger: "verildi", ad: "Verildi" },
  { deger: "kaldirildi", ad: "Kaldırıldı" },
];

/** Kişiye özel istisnaların düzenlendiği pencere. */
function KisiYetkiPaneli({
  kisi,
  yetkiler,
  rolKumesi,
  onKapat,
  onKaydet,
}: {
  kisi: Personel;
  yetkiler: Yetki[];
  rolKumesi: Set<string>;
  onKapat: () => void;
  onKaydet: (durumlar: Map<number, KisiDurumu>) => void;
}) {
  const [durumlar, setDurumlar] = useState<Map<number, KisiDurumu> | null>(null);

  useEffect(() => {
    kisiYetkileriniGetir(kisi.id).then(setDurumlar);
  }, [kisi.id]);

  const degistir = (yetkiId: number, durum: KisiDurumu) =>
    setDurumlar((eski) => new Map(eski).set(yetkiId, durum));

  const rolVeriyor = (yetkiId: number) =>
    kisi.rolId !== null && rolKumesi.has(`${kisi.rolId}-${yetkiId}`);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel genis" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{kisi.ad} · kişiye özel yetkiler</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <Bilgi>
            Temel yetkiler {kisi.rolAd || "rol"} görevinden gelir. Yalnızca bu kişide
            farklı olmasını istediğiniz satırları değiştirin.
          </Bilgi>

          {durumlar === null ? (
            <div className="yukleniyor"><div className="cember" /></div>
          ) : (
            gruplara(yetkiler).map((grup) => (
              <div key={grup.ad} className="yetki-grup">
                <h4>{grup.ad}</h4>
                {grup.yetkiler.map((y) => {
                  const durum = durumlar.get(y.id) ?? "rolden";
                  return (
                    <div key={y.id} className="kisi-yetki-satir">
                      <span>
                        {y.ad}
                        <small>{rolVeriyor(y.id) ? "Rolde açık" : "Rolde kapalı"}</small>
                      </span>
                      <div className="mod-sec kompakt">
                        {DURUMLAR.map((d) => (
                          <button
                            key={d.deger}
                            className={durum === d.deger ? "aktif" : ""}
                            onClick={() => degistir(y.id, d.deger)}
                          >
                            {d.ad}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={durumlar === null}
            onClick={() => durumlar && onKaydet(durumlar)}
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function YetkilerEkrani() {
  const { pathname } = useLocation();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [yetkiler, setYetkiler] = useState<Yetki[]>([]);
  const [roller, setRoller] = useState<Rol[]>([]);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [rolKumesi, setRolKumesi] = useState<Set<string>>(new Set());
  // Son kaydedilen hâl; "Geri al" buna dönüyor.
  const kayitliKume = useRef<Set<string>>(new Set());
  const [istisnalar, setIstisnalar] = useState<Map<number, number>>(new Map());
  const [degisti, setDegisti] = useState(false);
  const [kisiPaneli, setKisiPaneli] = useState<Personel | null>(null);
  const [bildirim, setBildirim] = useState("");

  // İki bölüm aynı veriyi kullanıyor; ayrı sayfa yapmak yerine yol hangisiyse
  // o bölüm çiziliyor.
  const genelBolum = pathname === "/ayarlar/yetkiler";

  useEffect(() => {
    (async () => {
      const [y, r, p, kume, sayilar] = await Promise.all([
        yetkileriGetir(),
        rolleriGetir(),
        personeliGetir(),
        rolYetkileriniGetir(),
        istisnaSayilari(),
      ]);
      setYetkiler(y);
      setRoller(r);
      setPersonel(p);
      setRolKumesi(kume);
      kayitliKume.current = new Set(kume);
      setIstisnalar(sayilar);
      setYukleniyor(false);
    })();
  }, []);

  // Matris kaydedilmeden sayfadan çıkılırsa sol menü uyarsın.
  useEffect(() => {
    kilitKur(() => degisti);
    return kilitKaldir;
  }, [degisti]);

  // Yönetici sütunu kilitli: tüm yetkiler hep açık kalır, yoksa işletmeci
  // kendi erişimini kapatıp ayar ekranına giremez hâle gelebilir.
  const yoneticiId = roller.find((r) => r.ad === "Yönetici")?.id ?? null;

  const kutuDegis = (rolId: number, yetkiId: number) => {
    const anahtar = `${rolId}-${yetkiId}`;
    setRolKumesi((eski) => {
      const yeni = new Set(eski);
      if (yeni.has(anahtar)) yeni.delete(anahtar);
      else yeni.add(anahtar);
      return yeni;
    });
    setDegisti(true);
  };

  const matrisiKaydet = async () => {
    await rolYetkileriniKaydet(rolKumesi);
    kayitliKume.current = new Set(rolKumesi);
    setDegisti(false);
    setBildirim("Yetkiler kaydedildi");
  };

  // Yanlış tıklanan kutucuk için: en son kaydedilen hâle dönülüyor.
  const geriAl = () => {
    setRolKumesi(new Set(kayitliKume.current));
    setDegisti(false);
  };

  const kisiKaydet = async (durumlar: Map<number, KisiDurumu>) => {
    if (!kisiPaneli) return;
    await kisiYetkileriniKaydet(kisiPaneli.id, durumlar);
    setKisiPaneli(null);
    setIstisnalar(await istisnaSayilari());
    setBildirim("Kişiye özel yetkiler kaydedildi");
  };

  return (
    <Duzen>
      <div className="sayfa">
        <AyarBasligi />

        <Bilgi>
          {genelBolum
            ? "Yetki kişiye değil göreve verilir: her görev hazır bir yetki listesiyle gelir, gerekmeyenin tikini kaldırırsınız. Aynı göreve atanan her personel bu kurala uyar."
            : "Tek bir çalışan için kural dışına çıkmanız gerekiyorsa buradan istisna tanımlarsınız; diğer herkes görevinin yetkileriyle çalışmaya devam eder."}
        </Bilgi>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <>
            {genelBolum && (
            <section className="ayar-bolum">
              <div className="ayar-bolum-ust">
                <h2><ShieldCheck size={17} /> Genel Yetkiler</h2>
              </div>

              <div className="yetki-tablo-sar">
                <table className="yetki-tablo">
                  <thead>
                    <tr>
                      <th>İşlem</th>
                      {roller.map((r) => (
                        <th key={r.id}>
                          <span>{r.ad}</span>
                          {r.id === yoneticiId && <Lock size={12} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gruplara(yetkiler).map((grup) => (
                      <Fragment key={grup.ad}>
                        <tr className="yetki-grup-satir">
                          <td colSpan={roller.length + 1}>
                            <span>{grup.ad}</span>
                          </td>
                        </tr>
                        {grup.yetkiler.map((y) => (
                          <tr key={y.id}>
                            <td>{y.ad}</td>
                            {roller.map((r) => {
                              const kilitli = r.id === yoneticiId;
                              const acikMi = kilitli || rolKumesi.has(`${r.id}-${y.id}`);
                              return (
                                <td key={r.id}>
                                  <button
                                    className={acikMi ? "yetki-kutu acik" : "yetki-kutu"}
                                    disabled={kilitli}
                                    title={
                                      kilitli
                                        ? "Yönetici her işlemi yapabilir"
                                        : `${r.ad}: ${y.ad}`
                                    }
                                    onClick={() => kutuDegis(r.id, y.id)}
                                  >
                                    {kilitli ? <Lock size={12} /> : acikMi && <Check size={15} />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            )}

            {!genelBolum && (
            <section className="ayar-bolum">
              <div className="ayar-bolum-ust">
                <h2><KeyRound size={17} /> Kişiye Özel Yetkiler</h2>
              </div>

              {personel.length === 0 ? (
                <div className="ayar-bos">
                  <UserRound size={30} />
                  <p>Henüz personel yok. Personel ekranından çalışanlarınızı tanımlayın.</p>
                </div>
              ) : (
                <div className="personel-liste">
                  {personel.map((k) => {
                    const sayi = istisnalar.get(k.id) ?? 0;
                    return (
                      <div key={k.id} className="personel-satir">
                        <span className="personel-ad">{k.ad}</span>
                        <span className="personel-rol">{k.rolAd || "Görev yok"}</span>
                        <span className="personel-bilgi">
                          {sayi === 0 ? "Rolündeki yetkiler geçerli" : `${sayi} istisna tanımlı`}
                        </span>
                        <button className="ayar-ekle" onClick={() => setKisiPaneli(k)}>
                          Düzenle
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            )}
          </>
        )}
      </div>

      {genelBolum && degisti && (
        <div className="kaydet-serit">
          <span>Kaydedilmemiş yetki değişikliği var.</span>
          <button className="iptal" onClick={geriAl}>Geri al</button>
          <button className="uygula" onClick={matrisiKaydet}>Kaydet</button>
        </div>
      )}

      {kisiPaneli && (
        <KisiYetkiPaneli
          key={kisiPaneli.id}
          kisi={kisiPaneli}
          yetkiler={yetkiler}
          rolKumesi={rolKumesi}
          onKapat={() => setKisiPaneli(null)}
          onKaydet={kisiKaydet}
        />
      )}

      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
