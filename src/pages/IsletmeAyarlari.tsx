import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  LayoutGrid,
  List,
  Map,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Duzen from "../components/Duzen";
import Bildirim from "../components/Bildirim";
import Bilgi from "../components/Bilgi";
import Anahtar from "../components/Anahtar";
import OnayModal from "../components/OnayModal";
import MasaPlani, { otomatikDiz, yerlesimiVar } from "../components/MasaPlani";
import {
  acikAdisyonluMasalar,
  bolgeEkle,
  bolgeGuncelle,
  bolgeSil,
  bolgeleriGetir,
  masaEkle,
  masaGuncelle,
  masaSil,
  topluMasaEkle,
  yerlesimKaydet,
  yerlesimTopluKaydet,
} from "../masalar";
import type { Bolge, Masa } from "../types";

// Masa kartının şekli salon planında da kullanılacak; ayar ekranında da aynı
// görünsün ki işletmeci ne seçtiğini görsün.
function MasaKutusu({
  masa,
  planda,
  onDuzenle,
}: {
  masa: Masa;
  planda?: boolean;
  onDuzenle: () => void;
}) {
  const sinif = [
    "ayar-masa",
    masa.sekil === "daire" ? "daire" : "",
    planda ? "planda" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={sinif}>
      <button className="ayar-masa-duzenle" onClick={onDuzenle} title="Masayı düzenle">
        <Pencil size={14} />
      </button>
      <strong>{masa.ad}</strong>
      {masa.kapasite ? (
        <span className="ayar-masa-kapasite">
          <Users size={13} /> {masa.kapasite}
        </span>
      ) : null}
    </div>
  );
}

type MasaPaneliProps = {
  masa: Masa;
  onKapat: () => void;
  onKaydet: (alanlar: { ad: string; kapasite: number | null; sekil: string }) => void;
  onSil: () => void;
};

function MasaPaneli({ masa, onKapat, onKaydet, onSil }: MasaPaneliProps) {
  const [ad, setAd] = useState(masa.ad);
  const [kapasite, setKapasite] = useState(masa.kapasite?.toString() ?? "");
  const [sekil, setSekil] = useState(masa.sekil);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>Masa düzenle</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>Masa adı</label>
            <input value={ad} onChange={(e) => setAd(e.target.value)} autoFocus />
          </div>

          <div className="alan">
            <label>Kişi kapasitesi</label>
            <input
              type="number"
              min={1}
              placeholder="Belirtilmedi"
              value={kapasite}
              onChange={(e) => setKapasite(e.target.value)}
            />
          </div>

          <div className="alan">
            <label>Masa şekli</label>
            <div className="mod-sec">
              <button className={sekil === "kare" ? "aktif" : ""} onClick={() => setSekil("kare")}>
                Kare
              </button>
              <button className={sekil === "daire" ? "aktif" : ""} onClick={() => setSekil("daire")}>
                Daire
              </button>
            </div>
          </div>
        </div>

        <footer className="modal-aksiyonlar">
          <button className="sil-buton" onClick={onSil}>
            <Trash2 size={15} /> Masayı sil
          </button>
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={!ad.trim()}
            onClick={() =>
              onKaydet({
                ad: ad.trim(),
                kapasite: kapasite ? Number(kapasite) : null,
                sekil,
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

function TopluEklePaneli({
  bolgeAd,
  onKapat,
  onEkle,
}: {
  bolgeAd: string;
  onKapat: () => void;
  onEkle: (onEk: string, adet: number, sekil: string) => void;
}) {
  const [onEk, setOnEk] = useState("Masa");
  const [adet, setAdet] = useState("10");
  const [sekil, setSekil] = useState("kare");
  const sayi = Number(adet);
  const gecerli = onEk.trim() !== "" && sayi >= 1 && sayi <= 100;

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{bolgeAd} bölgesine toplu masa</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>Masa adının başı</label>
            <input value={onEk} onChange={(e) => setOnEk(e.target.value)} autoFocus />
          </div>

          <div className="alan">
            <label>Kaç masa eklensin</label>
            <input
              type="number"
              min={1}
              max={100}
              value={adet}
              onChange={(e) => setAdet(e.target.value)}
            />
          </div>

          <div className="alan">
            <label>Masa şekli</label>
            <div className="mod-sec">
              <button className={sekil === "kare" ? "aktif" : ""} onClick={() => setSekil("kare")}>
                Kare
              </button>
              <button className={sekil === "daire" ? "aktif" : ""} onClick={() => setSekil("daire")}>
                Daire
              </button>
            </div>
          </div>

          {gecerli && (
            <p className="ayar-onizleme">
              Eklenecek: <strong>{onEk.trim()} 1</strong> … <strong>{onEk.trim()} {sayi}</strong>
            </p>
          )}
        </div>

        <footer className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!gecerli} onClick={() => onEkle(onEk.trim(), sayi, sekil)}>
            Ekle
          </button>
        </footer>
      </div>
    </div>
  );
}

function BolgePaneli({
  bolge,
  onKapat,
  onKaydet,
  onSil,
}: {
  bolge: Bolge | null;
  onKapat: () => void;
  onKaydet: (ad: string) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(bolge?.ad ?? "");

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{bolge ? "Bölgeyi düzenle" : "Yeni bölge"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>Bölge adı</label>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Bahçe, Salon, Teras…"
              autoFocus
            />
          </div>
        </div>

        <footer className="modal-aksiyonlar">
          {onSil && (
            <button className="sil-buton" onClick={onSil}>
              <Trash2 size={15} /> Bölgeyi sil
            </button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!ad.trim()} onClick={() => onKaydet(ad.trim())}>
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function IsletmeAyarlari() {
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);

  const [masaPaneli, setMasaPaneli] = useState<Masa | null>(null);
  const [bolgePaneli, setBolgePaneli] = useState<Bolge | null | undefined>(undefined);
  const [topluAcik, setTopluAcik] = useState(false);
  const [silinecekBolge, setSilinecekBolge] = useState<Bolge | null>(null);
  const [silinecekMasa, setSilinecekMasa] = useState<Masa | null>(null);
  const [gorunum, setGorunum] = useState<"liste" | "plan">("liste");

  const tazele = async (secilecekId?: number) => {
    const veri = await bolgeleriGetir();
    setBolgeler(veri);
    setSeciliId((eski) => {
      const hedef = secilecekId ?? eski;
      return veri.some((b) => b.id === hedef) ? hedef! : (veri[0]?.id ?? null);
    });
    return veri;
  };

  useEffect(() => {
    tazele().then(() => setYukleniyor(false));
  }, []);

  const secili = bolgeler.find((b) => b.id === seciliId) ?? bolgeler[0];
  const masalar = secili?.masalar ?? [];

  // Bölge sırasını komşusuyla takas eder; sıra numaraları listedeki yerden gelir.
  const bolgeTasi = async (bolge: Bolge, yon: -1 | 1) => {
    const i = bolgeler.indexOf(bolge);
    const komsu = bolgeler[i + yon];
    if (!komsu) return;
    await Promise.all([
      bolgeGuncelle(bolge.id, { sira: i + yon + 1 }),
      bolgeGuncelle(komsu.id, { sira: i + 1 }),
    ]);
    await tazele(bolge.id);
  };

  const bolgeyiSil = async (bolge: Bolge) => {
    const idler = bolge.masalar.map((m) => m.id);
    if ((await acikAdisyonluMasalar(idler)).size > 0) {
      setUyari(`${bolge.ad} bölgesinde açık adisyonlu masa var. Önce hesapları kapatın.`);
      return;
    }
    setBolgePaneli(undefined);
    setSilinecekBolge(bolge);
  };

  const masayiSil = async (masa: Masa) => {
    if ((await acikAdisyonluMasalar([masa.id])).has(masa.id)) {
      setUyari(`${masa.ad} masasında açık adisyon var. Önce hesabı kapatın.`);
      return;
    }
    setMasaPaneli(null);
    setSilinecekMasa(masa);
  };

  // Plana ilk geçişte konumu olmayan masalar sıraya göre diziliyor; işletmeci
  // boş tuvalle karşılaşıp "masalarım nerede" demesin.
  const planaGec = async () => {
    setGorunum("plan");
    const konumsuz = masalar.filter((m) => !yerlesimiVar(m));
    if (konumsuz.length === 0) return;
    await yerlesimTopluKaydet(otomatikDiz(masalar).filter((y) => konumsuz.some((m) => m.id === y.id)));
    await tazele(secili?.id);
  };

  const otomatikDizVeKaydet = async () => {
    await yerlesimTopluKaydet(otomatikDiz(masalar));
    await tazele(secili?.id);
    setBildirim("Masalar yeniden dizildi.");
  };

  const masaEklePanelsiz = async () => {
    if (!secili) return;
    const id = await masaEkle(secili.id, {
      ad: `Masa ${masalar.length + 1}`,
      sira: masalar.length + 1,
    });
    // Yeni masa eklenir eklenmez düzenleme paneli açılıyor; adı ve kapasitesi
    // hemen girilsin diye.
    const veri = await tazele(secili.id);
    const yeni = veri.find((b) => b.id === secili.id)?.masalar.find((m) => m.id === id);
    if (yeni) setMasaPaneli(yeni);
  };

  return (
    <Duzen>
      <div className="sayfa">
        <header className="ayar-baslik">
          <h1>İşletme Ayarları</h1>
          <Bilgi>Salonunuzdaki bölgeleri ve masaları buradan düzenlersiniz.</Bilgi>
        </header>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><LayoutGrid size={17} /> Bölgeler ve Masalar</h2>
              <button className="ayar-ekle" onClick={() => setBolgePaneli(null)}>
                <Plus size={15} /> Bölge ekle
              </button>
            </div>

            {bolgeler.length === 0 ? (
              <div className="ayar-bos">
                <LayoutGrid size={30} />
                <p>Henüz bölge yok. Bahçe, salon veya teras gibi bir bölge ekleyerek başlayın.</p>
              </div>
            ) : (
              <>
                <nav className="bolge-serit">
                  {bolgeler.map((b, i) => (
                    <div
                      key={b.id}
                      className={b.id === secili?.id ? "bolge-cip aktif" : "bolge-cip"}
                    >
                      <button className="bolge-cip-ad" onClick={() => setSeciliId(b.id)}>
                        {b.ad}
                        <em>{b.masalar.length}</em>
                      </button>
                      {b.id === secili?.id && (
                        <span className="bolge-cip-islem">
                          <button
                            disabled={i === 0}
                            onClick={() => bolgeTasi(b, -1)}
                            title="Sola al"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            disabled={i === bolgeler.length - 1}
                            onClick={() => bolgeTasi(b, 1)}
                            title="Sağa al"
                          >
                            <ChevronRight size={14} />
                          </button>
                          <button onClick={() => setBolgePaneli(b)} title="Bölgeyi düzenle">
                            <Pencil size={13} />
                          </button>
                        </span>
                      )}
                    </div>
                  ))}
                </nav>

                <div className="masa-islem-serit">
                  <button className="ayar-ekle" onClick={masaEklePanelsiz}>
                    <Plus size={15} /> Masa ekle
                  </button>
                  <button className="ayar-ekle ikincil" onClick={() => setTopluAcik(true)}>
                    <LayoutGrid size={15} /> Toplu masa ekle
                  </button>

                  <div className="gorunum-sec">
                    <button
                      className={gorunum === "liste" ? "aktif" : ""}
                      onClick={() => setGorunum("liste")}
                    >
                      <List size={15} /> Liste
                    </button>
                    <button
                      className={gorunum === "plan" ? "aktif" : ""}
                      onClick={planaGec}
                    >
                      <Map size={15} /> Plan
                    </button>
                  </div>

                  {gorunum === "plan" && masalar.length > 0 && (
                    <button className="ayar-ekle ikincil" onClick={otomatikDizVeKaydet}>
                      <Grid3x3 size={15} /> Otomatik diz
                    </button>
                  )}
                </div>

                {masalar.length === 0 ? (
                  <div className="ayar-bos">
                    <p>Bu bölgede masa yok. Tek tek ekleyebilir veya toplu masa oluşturabilirsiniz.</p>
                  </div>
                ) : gorunum === "liste" ? (
                  <div className="ayar-masa-grid">
                    {masalar.map((m) => (
                      <MasaKutusu key={m.id} masa={m} onDuzenle={() => setMasaPaneli(m)} />
                    ))}
                  </div>
                ) : (
                  <>
                    <Bilgi>
                      Masaları tutup sürükleyerek salonunuzdaki yerlerine taşıyın, sağ alt
                      köşesinden çekerek boyutlandırın. Çizdiğiniz düzenin satış ekranında
                      da görünmesi için aşağıdaki anahtarı açın.
                    </Bilgi>

                    <div className="plan-anahtar">
                      <Anahtar
                        etiket="Bu bölgeyi salon ekranında plan olarak göster"
                        ipucu="Kapalıyken masalar eskisi gibi sıralı kutular hâlinde görünür"
                        acik={secili?.planModu ?? false}
                        degistir={async (acik) => {
                          if (!secili) return;
                          await bolgeGuncelle(secili.id, { plan_modu: acik });
                          await tazele(secili.id);
                        }}
                      />
                    </div>
                    <MasaPlani
                      masalar={masalar}
                      duzenlenebilir
                      onYerlesim={async (id, y) => {
                        await yerlesimKaydet(id, y);
                        await tazele(secili?.id);
                      }}
                      icerik={(m) => (
                        <MasaKutusu masa={m} planda onDuzenle={() => setMasaPaneli(m)} />
                      )}
                    />
                  </>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {masaPaneli && (
        <MasaPaneli
          key={masaPaneli.id}
          masa={masaPaneli}
          onKapat={() => setMasaPaneli(null)}
          onSil={() => masayiSil(masaPaneli)}
          onKaydet={async (alanlar) => {
            await masaGuncelle(masaPaneli.id, alanlar);
            setMasaPaneli(null);
            await tazele(masaPaneli.bolgeId);
            setBildirim("Masa kaydedildi");
          }}
        />
      )}

      {topluAcik && secili && (
        <TopluEklePaneli
          bolgeAd={secili.ad}
          onKapat={() => setTopluAcik(false)}
          onEkle={async (onEk, adet, sekil) => {
            await topluMasaEkle(secili.id, onEk, adet, masalar.length + 1, sekil);
            setTopluAcik(false);
            await tazele(secili.id);
            setBildirim(`${adet} masa eklendi`);
          }}
        />
      )}

      {bolgePaneli !== undefined && (
        <BolgePaneli
          key={bolgePaneli?.id ?? "yeni"}
          bolge={bolgePaneli}
          onKapat={() => setBolgePaneli(undefined)}
          onSil={bolgePaneli ? () => bolgeyiSil(bolgePaneli) : undefined}
          onKaydet={async (ad) => {
            let hedefId = bolgePaneli?.id;
            if (bolgePaneli) await bolgeGuncelle(bolgePaneli.id, { ad });
            else hedefId = await bolgeEkle(ad, bolgeler.length + 1);
            setBolgePaneli(undefined);
            await tazele(hedefId);
            setBildirim("Bölge kaydedildi");
          }}
        />
      )}

      {silinecekBolge && (
        <OnayModal
          mesaj={`${silinecekBolge.ad} bölgesi ve içindeki ${silinecekBolge.masalar.length} masa silinsin mi?`}
          tehlikeli
          onOnay={async () => {
            await bolgeSil(silinecekBolge.id);
            setSilinecekBolge(null);
            await tazele();
            setBildirim("Bölge silindi");
          }}
          onKapat={() => setSilinecekBolge(null)}
        />
      )}

      {silinecekMasa && (
        <OnayModal
          mesaj={`${silinecekMasa.ad} masası silinsin mi?`}
          tehlikeli
          onOnay={async () => {
            await masaSil(silinecekMasa.id);
            setSilinecekMasa(null);
            await tazele();
            setBildirim("Masa silindi");
          }}
          onKapat={() => setSilinecekMasa(null)}
        />
      )}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim(null)} />}
    </Duzen>
  );
}
