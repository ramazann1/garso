import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Grid3x3,
  LayoutGrid,
  List,
  Map,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import { acikAdisyonSayisi } from "../adisyonlar";
import { ayarlar, ayarlariKaydet } from "../isletmeAyarlari";
import type { IsletmeAyarlari as IsletmeAyarlariTipi } from "../isletmeAyarlari";
import {
  indirimTanimiEkle,
  indirimTanimiGuncelle,
  indirimTanimiSil,
  indirimTanimlariniGetir,
  tanimEtiketi,
  type IndirimAlanlari,
  type IndirimTanimi,
  type IndirimTipi,
} from "../indirimler";
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
import RenkSecici, { renkler } from "../components/RenkSecici";
import { OdemeIkon } from "../odemeIkon";
import { yaziRengi } from "../renk";
import {
  odemeTipiEkle,
  odemeTipiGuncelle,
  odemeTipiSil,
  odemeTipleriniGetir,
} from "../odemeTipleri";
import type { OdemeSinifi, OdemeTipi, OdemeTipiAlanlari } from "../odemeTipleri";
import type { Bolge, Masa } from "../types";

// Kilit süresi hem düğmede hem açıklamada geçiyor; dakikaya bölünmesi tek yerde.
const sureMetni = (saniye: number) =>
  saniye < 60 ? `${saniye} sn` : `${saniye / 60} dk`;

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

function OdemeTipiPaneli({
  tip,
  onKapat,
  onKaydet,
  onSil,
}: {
  tip: OdemeTipi | null;
  onKapat: () => void;
  onKaydet: (alanlar: OdemeTipiAlanlari) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(tip?.ad ?? "");
  const [renk, setRenk] = useState(tip?.renk ?? renkler[2]);
  const [sinif, setSinif] = useState<OdemeSinifi>(tip?.sinif ?? "klasik");
  const [acikHesap, setAcikHesap] = useState(tip?.acikHesap ?? false);
  const [aktif, setAktif] = useState(tip?.aktif ?? true);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{tip ? "Ödeme tipini düzenle" : "Yeni ödeme tipi"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>Ödeme tipinin adı</label>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Nakit, Kredi Kartı, Multinet…"
              autoFocus
            />
          </div>

          <div className="alan">
            <label>Düğme rengi</label>
            <RenkSecici renk={renk} degistir={(r) => setRenk(r ?? renkler[2])} />
          </div>

          <div className="alan">
            <label>Ödeme sınıfı</label>
            <div className="mod-sec">
              <button className={sinif === "klasik" ? "aktif" : ""} onClick={() => setSinif("klasik")}>
                Klasik
              </button>
              <button className={sinif === "okc" ? "aktif" : ""} onClick={() => setSinif("okc")}>
                Yazarkasa (ÖKC)
              </button>
            </div>
            <Bilgi>
              Yazarkasa seçilen ödemeler ÖKC cihazına iletilecek şekilde kaydedilir;
              klasik ödemeler yalnızca Garso'da tutulur.
            </Bilgi>
          </div>

          <Anahtar
            etiket="Cari hesaba yazılsın"
            ipucu="Açık hesap ödemelerinde kasaya para girmez, tutar müşterinin borcuna eklenir"
            acik={acikHesap}
            degistir={setAcikHesap}
          />

          <Anahtar
            etiket="Satış ekranında görünsün"
            ipucu="Kapatırsanız tip silinmez, sadece ödeme ekranında listelenmez"
            acik={aktif}
            degistir={setAktif}
          />
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
            onClick={() => onKaydet({ ad: ad.trim(), renk, sinif, acikHesap, aktif })}
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Ön tanımlı indirim ekleme/düzenleme penceresi. */
function IndirimPaneli({
  tanim,
  onKapat,
  onSil,
  onKaydet,
}: {
  tanim: IndirimTanimi | null;
  onKapat: () => void;
  onSil?: () => void;
  onKaydet: (alanlar: IndirimAlanlari) => void;
}) {
  const [ad, setAd] = useState(tanim?.ad ?? "");
  const [tip, setTip] = useState<IndirimTipi>(tanim?.tip ?? "yuzde");
  const [deger, setDeger] = useState(tanim ? String(tanim.deger) : "");
  const [aktif, setAktif] = useState(tanim?.aktif ?? true);

  const sayi = Number(deger.replace(",", "."));
  const gecerli = ad.trim().length > 0 && sayi > 0 && (tip !== "yuzde" || sayi <= 100);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{tanim ? "İndirimi düzenle" : "Yeni indirim"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>İndirimin adı</label>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Personel, Öğrenci, Kampanya…"
              autoFocus
            />
          </div>

          <div className="alan">
            <label>İndirim türü</label>
            <div className="mod-sec">
              <button className={tip === "yuzde" ? "aktif" : ""} onClick={() => setTip("yuzde")}>
                Yüzde
              </button>
              <button className={tip === "tutar" ? "aktif" : ""} onClick={() => setTip("tutar")}>
                Tutar
              </button>
            </div>
          </div>

          <div className="alan">
            <label>{tip === "yuzde" ? "Oran (%)" : "Tutar (₺)"}</label>
            <input
              value={deger}
              onChange={(e) => setDeger(e.target.value)}
              placeholder={tip === "yuzde" ? "25" : "50"}
              inputMode="decimal"
            />
          </div>

          <Anahtar
            etiket="Satış ekranında görünsün"
            ipucu="Kapatırsanız tanım silinmez, indirim penceresinde listelenmez"
            acik={aktif}
            degistir={setAktif}
          />
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
            onClick={() => onKaydet({ ad: ad.trim(), tip, deger: sayi, sira: tanim?.sira ?? 0, aktif })}
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function IsletmeAyarlari() {
  const { bolum } = useParams();
  const odemeBolumu = bolum === "odeme-tipleri";
  const satisBolumu = bolum === "satis";
  const genelBolumu = bolum === "genel";
  const masalarBolumu = !odemeBolumu && !satisBolumu && !genelBolumu;

  const [kdvDahil, setKdvDahil] = useState(ayarlar().kdvDahil);
  // Genel parametreler tek tek kaydediliyor; her satır kendi başına anlamlı,
  // altta "Kaydet" bekleyen bir şerit olmasın.
  const [genel, setGenel] = useState(ayarlar());
  const [indirimler, setIndirimler] = useState<IndirimTanimi[]>([]);
  const [indirimPaneli, setIndirimPaneli] = useState<IndirimTanimi | null | undefined>(undefined);
  const [silinecekIndirim, setSilinecekIndirim] = useState<IndirimTanimi | null>(null);

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

  const [odemeTipleri, setOdemeTipleri] = useState<OdemeTipi[]>([]);
  const [odemePaneli, setOdemePaneli] = useState<OdemeTipi | null | undefined>(undefined);
  const [silinecekOdeme, setSilinecekOdeme] = useState<OdemeTipi | null>(null);

  const odemeleriTazele = async () => setOdemeTipleri(await odemeTipleriniGetir(true));
  const indirimleriTazele = async () => setIndirimler(await indirimTanimlariniGetir(true));

  // Ayar açık adisyonların toplamını değiştireceği için önce salon boş mu bakılıyor.
  const kdvAyariDegistir = async (yeni: boolean) => {
    if (yeni === kdvDahil) return;
    if ((await acikAdisyonSayisi()) > 0) {
      setUyari("Açık adisyon varken bu ayar değiştirilemez. Önce tüm adisyonları kapatın.");
      return;
    }
    try {
      await ayarlariKaydet({ kdvDahil: yeni });
      setKdvDahil(yeni);
      setBildirim(yeni ? "Fiyatlar KDV dahil" : "Fiyatlar KDV hariç");
    } catch (e) {
      setUyari(e instanceof Error ? e.message : "Ayar kaydedilemedi.");
    }
  };

  // Genel parametrelerin ortak kaydedicisi: ekranı hemen güncelliyor, yazma
  // başarısızsa eski değere dönüyor ki ekran veriyle uyumsuz kalmasın.
  const genelDegistir = async (degisen: Partial<IsletmeAyarlariTipi>, mesaj?: string) => {
    const oncesi = genel;
    setGenel({ ...genel, ...degisen });
    try {
      await ayarlariKaydet(degisen);
      setBildirim(mesaj ?? "Ayar kaydedildi");
    } catch (e) {
      setGenel(oncesi);
      setUyari(e instanceof Error ? e.message : "Ayar kaydedilemedi.");
    }
  };

  // Sıra numaraları listedeki yerden geliyor; komşuyla takas edilir.
  const odemeTasi = async (tip: OdemeTipi, yon: -1 | 1) => {
    const ayniSinif = odemeTipleri.filter((t) => t.sinif === tip.sinif);
    const i = ayniSinif.indexOf(tip);
    const komsu = ayniSinif[i + yon];
    if (!komsu) return;
    await Promise.all([
      odemeTipiGuncelle(tip.id, { sira: komsu.sira }),
      odemeTipiGuncelle(komsu.id, { sira: tip.sira }),
    ]);
    await odemeleriTazele();
  };

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
    Promise.all([tazele(), odemeleriTazele(), indirimleriTazele()]).then(() =>
      setYukleniyor(false)
    );
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
        <AyarBasligi />

        <Bilgi>
          {masalarBolumu
            ? "Salonunuzdaki bölgeleri ve masaları buradan düzenlersiniz."
            : odemeBolumu
              ? "Kasada hangi ödeme düğmelerinin çıkacağını buradan belirlersiniz."
              : "Satışın genel kurallarını buradan belirlersiniz."}
        </Bilgi>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <>
          {masalarBolumu && (
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

          {genelBolumu && (
          <section className="ayar-bolum ayar-liste">
            <div className="ayar-satir">
              <div className="ayar-satir-yazi">
                <strong>Kasa günü</strong>
                <span>
                  Gün {genel.kasaGunuBaslangic}'de başlar, ertesi gün{" "}
                  {genel.kasaGunuBitis}'de biter. Gece yarısından sonraki satışlar
                  aynı günün hesabına yazılır.
                </span>
              </div>
              <div className="ayar-saatler">
                <input
                  type="time"
                  value={genel.kasaGunuBaslangic}
                  onChange={(e) => genelDegistir({ kasaGunuBaslangic: e.target.value }, "Kasa günü güncellendi")}
                />
                <em>—</em>
                <input
                  type="time"
                  value={genel.kasaGunuBitis}
                  onChange={(e) => genelDegistir({ kasaGunuBitis: e.target.value }, "Kasa günü güncellendi")}
                />
              </div>
            </div>

            <div className="ayar-satir">
              <div className="ayar-satir-yazi">
                <strong>Ekran kilit süresi</strong>
                <span>
                  {genel.kilitSuresi === 0
                    ? "Kapalı — kilit yalnızca elle açılır."
                    : `Kasaya ${sureMetni(genel.kilitSuresi)} dokunulmazsa kilit ekranı gelir.`}
                </span>
              </div>
              <div className="mod-sec kompakt dar">
                {[0, 15, 30, 60, 300].map((s) => (
                  <button
                    key={s}
                    className={genel.kilitSuresi === s ? "aktif" : ""}
                    onClick={() =>
                      genelDegistir(
                        { kilitSuresi: s },
                        s === 0
                          ? "Otomatik kilit kapalı"
                          : `Ekran ${sureMetni(s)} sonra kilitlenecek`
                      )
                    }
                  >
                    {s === 0 ? "Kapalı" : sureMetni(s)}
                  </button>
                ))}
              </div>
            </div>

            <div className="ayar-satir">
              <div className="ayar-satir-yazi">
                <strong>Çalışma tipleri</strong>
                <span>
                  Yapmadığınız iş arayüzde durmasın. Masa servisi kapatılamaz.
                </span>
              </div>
              <div className="mod-sec kompakt dar">
                <button className="aktif kilitli" disabled>
                  Masa
                </button>
                <button
                  className={genel.gelalAcik ? "aktif" : ""}
                  onClick={() => genelDegistir({ gelalAcik: !genel.gelalAcik }, genel.gelalAcik ? "Gel Al kapatıldı" : "Gel Al açıldı")}
                >
                  Gel Al
                </button>
                <button
                  className={genel.paketAcik ? "aktif" : ""}
                  onClick={() => genelDegistir({ paketAcik: !genel.paketAcik }, genel.paketAcik ? "Paket kapatıldı" : "Paket açıldı")}
                >
                  Paket
                </button>
              </div>
            </div>
          </section>
          )}

          {satisBolumu && (
          <section className="ayar-bolum ayar-liste">
            <div className="ayar-satir">
              <div className="ayar-satir-yazi">
                <strong>Menü fiyatları</strong>
                <span>
                  {kdvDahil
                    ? "Vergi fiyatın içinde; ₺100 ürünün ₺9,09'u KDV (%10)."
                    : "Vergi toplama eklenir; ₺100 ürün kasada ₺110 (%10)."}
                </span>
              </div>
              <div className="mod-sec kompakt">
                <button className={kdvDahil ? "aktif" : ""} onClick={() => kdvAyariDegistir(true)}>
                  KDV dahil
                </button>
                <button className={!kdvDahil ? "aktif" : ""} onClick={() => kdvAyariDegistir(false)}>
                  KDV hariç
                </button>
              </div>
            </div>

            <div className="ayar-satir">
              <div className="ayar-satir-yazi">
                <strong>Misafir sayısı</strong>
                <span>
                  {genel.kisiSayisiZorunlu
                    ? "Adisyon kaydedilirken kişi sayısı boş bırakılamaz."
                    : "İsteğe bağlı; kişi başı ciro raporu için doldurulması gerekir."}
                </span>
              </div>
              <div className="mod-sec kompakt">
                <button
                  className={genel.kisiSayisiZorunlu ? "aktif" : ""}
                  onClick={() => genelDegistir({ kisiSayisiZorunlu: true }, "Misafir sayısı artık zorunlu")}
                >
                  Zorunlu
                </button>
                <button
                  className={!genel.kisiSayisiZorunlu ? "aktif" : ""}
                  onClick={() => genelDegistir({ kisiSayisiZorunlu: false }, "Misafir sayısı isteğe bağlı")}
                >
                  İsteğe bağlı
                </button>
              </div>
            </div>

            <div className="ayar-satir">
              <div className="ayar-satir-yazi">
                <strong>Para üstü</strong>
                <span>
                  Hızlı Öde'de müşterinin verdiği tutar yazılınca para üstü
                  hesaplanıp gösterilsin.
                </span>
              </div>
              <div className="mod-sec kompakt">
                <button
                  className={genel.paraUstu ? "aktif" : ""}
                  onClick={() => genelDegistir({ paraUstu: true }, "Para üstü gösterilecek")}
                >
                  Açık
                </button>
                <button
                  className={!genel.paraUstu ? "aktif" : ""}
                  onClick={() => genelDegistir({ paraUstu: false }, "Para üstü kapatıldı")}
                >
                  Kapalı
                </button>
              </div>
            </div>

            <div className="ayar-satir">
              <div className="ayar-satir-yazi">
                <strong>İndirim tanımları</strong>
                <span>
                  {indirimler.length === 0
                    ? "Satışta listeden seçilecek hazır indirimler."
                    : `${indirimler.length} tanım · satışta listeden seçilir`}
                </span>
              </div>
              <button className="ayar-satir-ekle" onClick={() => setIndirimPaneli(null)}>
                <Plus size={15} /> Ekle
              </button>
            </div>

            {indirimler.length > 0 && (
              <ul className="indirim-liste">
                {indirimler.map((t) => (
                  <li key={t.id} className={t.aktif ? undefined : "kapali"}>
                    <span className="indirim-ad">{t.ad}</span>
                    <span className="indirim-deger">{tanimEtiketi(t)}</span>
                    {!t.aktif && <span className="indirim-gizli">Gizli</span>}
                    <button onClick={() => setIndirimPaneli(t)} title="Düzenle">
                      <Pencil size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}

          {odemeBolumu && (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><Wallet size={17} /> Ödeme Tipleri</h2>
              <button className="ayar-ekle" onClick={() => setOdemePaneli(null)}>
                <Plus size={15} /> Ödeme tipi ekle
              </button>
            </div>

            <Bilgi>
              Yazarkasa (ÖKC) tipleri ödeme ekranında ayrı başlık altında listelenir.
              Kullanmadığınız tipi silmeden gizleyebilirsiniz.
            </Bilgi>

            {odemeTipleri.length === 0 ? (
              <div className="ayar-bos">
                <Wallet size={30} />
                <p>Henüz ödeme tipi yok. Nakit ve kredi kartı ekleyerek başlayın.</p>
              </div>
            ) : (
              <div className="odeme-tip-liste">
                {odemeTipleri.map((t, i) => (
                  <div key={t.id} className={t.aktif ? "odeme-tip-satir" : "odeme-tip-satir kapali"}>
                    <span
                      className="odeme-tip-ornek"
                      style={{ background: t.renk, color: yaziRengi(t.renk) }}
                    >
                      <OdemeIkon ad={t.ad} size={16} />
                      {t.ad}
                    </span>
                    <span className="odeme-tip-etiket">
                      {t.sinif === "okc" ? "Yazarkasa (ÖKC)" : "Klasik"}
                      {t.acikHesap && " · Cari hesap"}
                      {!t.aktif && " · Gizli"}
                    </span>
                    <span className="odeme-tip-islem">
                      <button
                        disabled={i === 0 || odemeTipleri[i - 1].sinif !== t.sinif}
                        onClick={() => odemeTasi(t, -1)}
                        title="Yukarı al"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        disabled={
                          i === odemeTipleri.length - 1 || odemeTipleri[i + 1].sinif !== t.sinif
                        }
                        onClick={() => odemeTasi(t, 1)}
                        title="Aşağı al"
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button onClick={() => setOdemePaneli(t)} title="Düzenle">
                        <Pencil size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}
          </>
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

      {indirimPaneli !== undefined && (
        <IndirimPaneli
          key={indirimPaneli?.id ?? "yeni"}
          tanim={indirimPaneli}
          onKapat={() => setIndirimPaneli(undefined)}
          onSil={
            indirimPaneli
              ? () => {
                  const hedef = indirimPaneli;
                  setIndirimPaneli(undefined);
                  setSilinecekIndirim(hedef);
                }
              : undefined
          }
          onKaydet={async (alanlar) => {
            try {
              if (indirimPaneli) await indirimTanimiGuncelle(indirimPaneli.id, alanlar);
              else await indirimTanimiEkle({ ...alanlar, sira: indirimler.length });
              setIndirimPaneli(undefined);
              await indirimleriTazele();
              setBildirim(indirimPaneli ? "İndirim güncellendi" : "İndirim eklendi");
            } catch (e) {
              setIndirimPaneli(undefined);
              setUyari(e instanceof Error ? e.message : "İndirim kaydedilemedi.");
            }
          }}
        />
      )}

      {silinecekIndirim && (
        <OnayModal
          mesaj={`${silinecekIndirim.ad} indirimi silinsin mi?`}
          tehlikeli
          onOnay={async () => {
            await indirimTanimiSil(silinecekIndirim.id);
            setSilinecekIndirim(null);
            await indirimleriTazele();
            setBildirim("İndirim silindi");
          }}
          onKapat={() => setSilinecekIndirim(null)}
        />
      )}

      {odemePaneli !== undefined && (
        <OdemeTipiPaneli
          key={odemePaneli?.id ?? "yeni"}
          tip={odemePaneli}
          onKapat={() => setOdemePaneli(undefined)}
          onSil={
            odemePaneli
              ? () => {
                  const hedef = odemePaneli;
                  setOdemePaneli(undefined);
                  setSilinecekOdeme(hedef);
                }
              : undefined
          }
          onKaydet={async (alanlar) => {
            if (odemePaneli) await odemeTipiGuncelle(odemePaneli.id, alanlar);
            else {
              const sonSira = odemeTipleri
                .filter((t) => t.sinif === alanlar.sinif)
                .reduce((e, t) => Math.max(e, t.sira), 0);
              await odemeTipiEkle(alanlar, sonSira + 1);
            }
            setOdemePaneli(undefined);
            await odemeleriTazele();
            setBildirim("Ödeme tipi kaydedildi");
          }}
        />
      )}

      {silinecekOdeme && (
        <OnayModal
          mesaj={`${silinecekOdeme.ad} ödeme tipi silinsin mi? Geçmiş tahsilat kayıtları etkilenmez.`}
          tehlikeli
          onOnay={async () => {
            await odemeTipiSil(silinecekOdeme.id);
            setSilinecekOdeme(null);
            await odemeleriTazele();
            setBildirim("Ödeme tipi silindi");
          }}
          onKapat={() => setSilinecekOdeme(null)}
        />
      )}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim(null)} />}
    </Duzen>
  );
}
