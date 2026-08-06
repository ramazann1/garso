import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import MasaKarti from "../components/MasaKarti";
import Duzen from "../components/Duzen";
import { tumAdisyonlar } from "../adisyonlar";
import { bolgeleriGetir } from "../masalar";
import type { Bolge } from "../types";

type Acik = { tutar: number; adet: number; acilis?: string; garson?: string };

function sureFarki(acilis: string): string {
  const dk = Math.floor((Date.now() - new Date(acilis).getTime()) / 60000);
  if (dk < 1) return "şimdi";
  if (dk < 60) return `${dk} dk`;
  return `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
}

// Uzun süredir açık duran masa kartında saat işareti çıkıyor — garsonun gözü
// unutulmuş hesaba takılsın.
const UZUN_SURE_DK = 120;
const dakika = (acilis?: string) =>
  acilis ? Math.floor((Date.now() - new Date(acilis).getTime()) / 60000) : 0;

export default function Salon() {
  const navigate = useNavigate();
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [adisyonlar, setAdisyonlar] = useState<Record<number, Acik>>({});
  const [seciliId, setSeciliId] = useState<number | "tumu" | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  // Açık kalma süreleri kendiliğinden ilerlesin; garson ekranı yenilemek zorunda
  // kalmasın diye dakikada bir yeniden çiziliyor.
  const [, setTik] = useState(0);

  useEffect(() => {
    Promise.all([bolgeleriGetir(), tumAdisyonlar()]).then(([b, a]) => {
      setBolgeler(b);
      setAdisyonlar(a);
      setSeciliId((s) => s ?? b[0]?.id ?? "tumu");
      setYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    const zaman = setInterval(() => setTik((t) => t + 1), 60000);
    return () => clearInterval(zaman);
  }, []);

  const gosterilen = seciliId === "tumu" ? bolgeler : bolgeler.filter((b) => b.id === seciliId);
  const tumMasalar = bolgeler.flatMap((b) => b.masalar);
  const doluSayisi = tumMasalar.filter((m) => adisyonlar[m.id]).length;
  const doluluk = (bolge: Bolge) => bolge.masalar.filter((m) => adisyonlar[m.id]).length;

  return (
    <Duzen>
      <div className="sayfa">
        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : bolgeler.length === 0 ? (
          <div className="ayar-bos">
            <LayoutGrid size={30} />
            <p>
              Henüz masa tanımlanmamış. İşletme Ayarları ekranından bölge ve masalarınızı
              ekleyerek başlayın.
            </p>
            <button className="ayar-ekle" onClick={() => navigate("/ayarlar")}>
              İşletme Ayarları
            </button>
          </div>
        ) : (
          <>
            <nav className="salon-sekme">
              {bolgeler.map((b) => (
                <button
                  key={b.id}
                  className={seciliId === b.id ? "aktif" : ""}
                  onClick={() => setSeciliId(b.id)}
                >
                  {b.ad}
                  <em>{doluluk(b)}/{b.masalar.length}</em>
                </button>
              ))}

              <button
                className={seciliId === "tumu" ? "aktif" : ""}
                onClick={() => setSeciliId("tumu")}
              >
                Tümü <em>{doluSayisi}/{tumMasalar.length}</em>
              </button>
            </nav>

            {gosterilen.map((bolge) => (
              <section key={bolge.id} className="bolge">
                {seciliId === "tumu" && (
                  <h2>
                    {bolge.ad}
                    <span>{doluluk(bolge)}/{bolge.masalar.length}</span>
                  </h2>
                )}

                {bolge.masalar.length === 0 ? (
                  <p className="bolge-bos">Bu bölgede masa yok.</p>
                ) : (
                  <div className="masa-grid">
                    {bolge.masalar.map((masa) => {
                      const acik = adisyonlar[masa.id];
                      return (
                        <MasaKarti
                          key={masa.id}
                          masa={masa}
                          durum={
                            acik && {
                              tutar: acik.tutar,
                              sure: acik.acilis ? sureFarki(acik.acilis) : "şimdi",
                              garson: acik.garson,
                              gecikti: dakika(acik.acilis) >= UZUN_SURE_DK,
                            }
                          }
                          onClick={() => navigate(`/siparis/${masa.id}`)}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </Duzen>
  );
}
