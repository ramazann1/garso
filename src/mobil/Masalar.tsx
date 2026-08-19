import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudOff, Plus, RotateCw } from "lucide-react";
import { bolgeleriGetir } from "../masalar";
import { tumAdisyonlar, type MasaOzeti } from "../adisyonlar";
import { bekleyenMasalar, useKuyruk } from "../kuyruk";
import { baglantiVar, sureSinirli, useBaglanti } from "../baglanti";
import { paraGoster } from "../para";
import type { Bolge } from "../types";

function sure(acilis?: string) {
  if (!acilis) return "";
  const dk = Math.floor((Date.now() - new Date(acilis).getTime()) / 60000);
  if (dk < 1) return "şimdi";
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa`;
}

/**
 * Mobil Masalar ekranı. Salon'un dar hâli değil, garsonun ekranı: bölgeler
 * üstte tek satır, masalar parmakla basılacak büyüklükte, dolu masada tutar
 * ve süre kartın üstünde — hiçbir bilgi için ikinci dokunuş gerekmiyor.
 */
export default function MobilMasalar() {
  const git = useNavigate();
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [adisyonlar, setAdisyonlar] = useState<Record<number, MasaOzeti>>({});
  const [seciliBolge, setSeciliBolge] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [okunamadi, setOkunamadi] = useState(false);
  // Süre yazıları dakikada bir tazeleniyor.
  const [, setTik] = useState(0);

  const oku = async () => {
    setYukleniyor(true);
    setOkunamadi(false);

    // Masa tanımları cihazdaki kopyadan da gelebiliyor; adisyonlar gelemiyor
    // (bir dakika öncesinin dolu/boş bilgisi yanlış bilgidir). O yüzden ikisi
    // ayrı bekleniyor — adisyon düşerse masa planı yine çiziliyor.
    const dene = <T,>(is: Promise<T>) => sureSinirli(is.catch(() => undefined));
    const [b, a] = await Promise.all([
      dene(bolgeleriGetir()),
      baglantiVar() ? dene(tumAdisyonlar()) : Promise.resolve(undefined),
    ]);
    setYukleniyor(false);

    if (!b) {
      setOkunamadi(true);
      return;
    }

    setBolgeler(b);
    // Cihazda bekleyen siparişler sunucudakinin üstüne biniyor: masa dolu
    // görünsün, aynı masaya ikinci hesap açılmasın.
    setAdisyonlar({ ...(a ?? {}), ...bekleyenMasalar() });
    setSeciliBolge((s) => (b.some((x) => x.id === s) ? s : b[0]?.id ?? null));
  };

  useEffect(() => {
    oku();
    const zaman = setInterval(() => setTik((t) => t + 1), 60000);
    return () => clearInterval(zaman);
  }, []);

  // Kuyruk boşaldıkça ve bağlantı geri geldikçe ekran kendini tazeliyor;
  // garson "yenile"ye basmayı beklemesin.
  const { bekleyen } = useKuyruk();
  const oncekiBekleyen = useRef(bekleyen);
  useEffect(() => {
    if (bekleyen !== oncekiBekleyen.current) oku();
    oncekiBekleyen.current = bekleyen;
  }, [bekleyen]);

  const cevrimici = useBaglanti();
  const oncekiDurum = useRef(cevrimici);
  useEffect(() => {
    if (cevrimici && (okunamadi || !oncekiDurum.current)) oku();
    oncekiDurum.current = cevrimici;
  }, [cevrimici]);

  if (yukleniyor && bolgeler.length === 0) {
    return <div className="yukleniyor"><div className="cember" /></div>;
  }

  if (okunamadi) {
    return (
      <div className="m-bos">
        <p>Masalar yüklenemedi.</p>
        <button className="m-dugme" onClick={oku}>
          <RotateCw size={18} /> Yeniden dene
        </button>
      </div>
    );
  }

  const bolge = bolgeler.find((b) => b.id === seciliBolge);
  const masalar = (bolge?.masalar ?? []).filter((m) => m.aktif);

  return (
    <>
      <header className="m-baslik">
        <h1>Masalar</h1>
        <button className="m-ikon-dugme" onClick={oku} aria-label="Yenile">
          <RotateCw size={20} />
        </button>
      </header>

      <div className="m-bolgeler">
        {bolgeler.map((b) => {
          const dolu = b.masalar.filter((m) => adisyonlar[m.id]).length;
          return (
            <button
              key={b.id}
              className={b.id === seciliBolge ? "m-cip secili" : "m-cip"}
              onClick={() => setSeciliBolge(b.id)}
            >
              {b.ad}
              <span>{dolu}/{b.masalar.length}</span>
            </button>
          );
        })}
      </div>

      {masalar.length === 0 ? (
        <div className="m-bos"><p>Bu bölgede masa yok.</p></div>
      ) : (
        <div className="m-masalar">
          {masalar.map((m) => {
            const acik = adisyonlar[m.id];
            return (
              <button
                key={m.id}
                className={acik ? "m-masa dolu" : "m-masa"}
                onClick={() => git(`/mobil/siparis/${m.id}`)}
              >
                <span className="m-masa-ad">{m.ad}</span>
                {acik ? (
                  <>
                    <span className="m-masa-tutar">{paraGoster(acik.kalan || acik.tutar)}</span>
                    {acik.bekliyor ? (
                      <span className="m-masa-bekliyor">
                        <CloudOff size={13} /> Gönderilmedi
                      </span>
                    ) : (
                      <span className="m-masa-alt">{sure(acik.acilis)}</span>
                    )}
                  </>
                ) : (
                  <Plus size={20} className="m-masa-arti" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
