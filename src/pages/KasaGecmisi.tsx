import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  History,
  LockOpen,
  X,
} from "lucide-react";
import Duzen from "../components/Duzen";
import KasaBasligi from "../components/KasaBasligi";
import Bilgi from "../components/Bilgi";
import { eslesiyor } from "../arama";
import { paraGoster } from "../para";
import { kisaAd } from "../personel";
import { vardiyaGecmisi, vardiyaHareketleri, type Hareket, type VardiyaOzeti } from "../kasa";
import { SAKIN, useCanli } from "../canli";

const gunMetni = (t: string) =>
  new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });

const saatMetni = (t: string) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const tamMetin = (t: string) => `${gunMetni(t)} ${saatMetni(t)}`;

/** Fark yazısı listede de detayda da aynı: eksik/fazla/tutuyor. */
function Fark({ fark }: { fark: number | null }) {
  if (fark === null) return <span className="kasa-gecmis-acik">Devam ediyor</span>;
  if (fark === 0)
    return (
      <span className="kasa-fark tutuyor">
        <Check size={15} /> Tutuyor
      </span>
    );
  return (
    <span className={fark < 0 ? "kasa-fark eksik" : "kasa-fark fazla"}>
      {fark < 0 ? `${paraGoster(-fark)} eksik` : `${paraGoster(fark)} fazla`}
    </span>
  );
}

export default function KasaGecmisi() {
  const [liste, setListe] = useState<VardiyaOzeti[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ara, setAra] = useState("");
  const [secili, setSecili] = useState<VardiyaOzeti | null>(null);

  const oku = () =>
    vardiyaGecmisi().then((v) => {
      setListe(v);
      setYukleniyor(false);
    });

  useEffect(() => {
    oku();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kasa başka bir cihazdan açılıp kapatılabiliyor; liste kendiliğinden
  // güncelleniyor. Bakma ekranı olduğu için sakin hızda.
  useCanli(["kasa_vardiyalari", "kasa_hareketleri"], oku, SAKIN);

  const gorunen = liste.filter((v) =>
    eslesiyor(`${v.acan} ${v.kapatan} ${tamMetin(v.acilis)}`, ara)
  );

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <KasaBasligi ara={ara} araDegistir={setAra} araYer="Kişi veya tarih ara" />

        <Bilgi>
          Kasanın her açılıp kapanışı bir vardiyadır. Burada kimin açtığını, kimin
          kapattığını ve sayılan paranın kasada olması gereken tutarı tutup
          tutmadığını görürsünüz.
        </Bilgi>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><History size={17} /> Vardiyalar</h2>
            </div>

            {liste.length === 0 ? (
              <div className="ayar-bos">
                <History size={30} />
                <p>Henüz kasa açılmamış. İlk vardiya kasayı açtığınızda burada listelenir.</p>
              </div>
            ) : gorunen.length === 0 ? (
              <div className="ayar-bos">
                <History size={30} />
                <p>"{ara}" ile eşleşen vardiya yok.</p>
              </div>
            ) : (
              <div className="kasa-gecmis-liste">
                {gorunen.map((v) => (
                  <button
                    key={v.id}
                    className={v.kapanis ? "kasa-gecmis-satir" : "kasa-gecmis-satir suruyor"}
                    onClick={() => setSecili(v)}
                  >
                    <span className="kasa-gecmis-zaman">
                      {tamMetin(v.acilis)}
                      <small>
                        {v.kapanis ? `${saatMetni(v.kapanis)} kapandı` : "Kasa açık"}
                      </small>
                    </span>
                    <span className="kasa-gecmis-kisi">
                      {kisaAd(v.acan) || "—"}
                      <small>{v.kapanis ? `${kisaAd(v.kapatan) || "—"} kapattı` : "Açan"}</small>
                    </span>
                    <span className="kasa-gecmis-tutar">
                      {paraGoster(v.beklenen)}
                      <small>Olması gereken</small>
                    </span>
                    <Fark fark={v.fark} />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {secili && <VardiyaDetay vardiya={secili} onKapat={() => setSecili(null)} />}
    </Duzen>
  );
}

function VardiyaDetay({ vardiya, onKapat }: { vardiya: VardiyaOzeti; onKapat: () => void }) {
  const [hareketler, setHareketler] = useState<Hareket[]>([]);

  const oku = () => vardiyaHareketleri(vardiya.id).then(setHareketler);

  useEffect(() => {
    oku();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vardiya.id]);

  // Panel açıkken kasaya para girip çıkabiliyor; hareketler listesi de canlı.
  useCanli(["kasa_hareketleri"], oku, SAKIN);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>Vardiya detayı</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <p className="kasa-kim">
            <strong>{kisaAd(vardiya.acan) || "—"}</strong> açtı · {tamMetin(vardiya.acilis)}
          </p>
          <p className="kasa-kim">
            {vardiya.kapanis ? (
              <>
                <strong>{kisaAd(vardiya.kapatan) || "—"}</strong> kapattı ·{" "}
                {tamMetin(vardiya.kapanis)}
              </>
            ) : (
              <>
                <LockOpen size={15} /> Vardiya sürüyor
              </>
            )}
          </p>

          <dl className="kasa-dokum">
            <div>
              <dt>Açılış tutarı</dt>
              <dd>{paraGoster(vardiya.acilisTutar)}</dd>
            </div>
            <div>
              <dt>Nakit satışlar</dt>
              <dd>{paraGoster(vardiya.nakitSatis)}</dd>
            </div>
            {vardiya.giris > 0 && (
              <div>
                <dt>Kasaya eklenen</dt>
                <dd className="artan">+{paraGoster(vardiya.giris)}</dd>
              </div>
            )}
            {vardiya.cikis > 0 && (
              <div>
                <dt>Kasadan çıkan</dt>
                <dd className="azalan">−{paraGoster(vardiya.cikis)}</dd>
              </div>
            )}
            {vardiya.nakitGider > 0 && (
              <div>
                <dt>Nakit giderler</dt>
                <dd className="azalan">−{paraGoster(vardiya.nakitGider)}</dd>
              </div>
            )}
            <div className="kasa-beklenen">
              <dt>Kasada olması gereken</dt>
              <dd>{paraGoster(vardiya.beklenen)}</dd>
            </div>
            {vardiya.sayilanTutar != null && (
              <div>
                <dt>Sayılan</dt>
                <dd>{paraGoster(vardiya.sayilanTutar)}</dd>
              </div>
            )}
          </dl>

          <p className="kasa-detay-fark">
            <Fark fark={vardiya.fark} />
          </p>

          {(vardiya.acilisNot || vardiya.kapanisNot) && (
            <div className="kasa-notlar">
              {vardiya.acilisNot && (
                <p>
                  <strong>Açılış notu:</strong> {vardiya.acilisNot}
                </p>
              )}
              {vardiya.kapanisNot && (
                <p>
                  <strong>Kapanış notu:</strong> {vardiya.kapanisNot}
                </p>
              )}
            </div>
          )}

          {hareketler.length > 0 && (
            <ul className="kasa-hareket">
              {hareketler.map((h) => (
                <li key={h.id}>
                  {h.tip === "giris" ? (
                    <ArrowDownLeft size={15} className="artan" />
                  ) : (
                    <ArrowUpRight size={15} className="azalan" />
                  )}
                  <span>
                    <strong>
                      {h.aciklama || (h.tip === "giris" ? "Para eklendi" : "Para çıkarıldı")}
                    </strong>
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
        </div>
      </div>
    </div>
  );
}
