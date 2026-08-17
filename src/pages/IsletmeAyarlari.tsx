import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Grid3x3,
  LayoutGrid,
  List,
  Lock,
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
import AyarSatiri from "../components/AyarSatiri";
import AramaKutusu from "../components/AramaKutusu";
import { acikAdisyonSayisi } from "../adisyonlar";
import { ayarlar, ayarlariKaydet, isletmeAdi, isletmeKodu } from "../isletmeAyarlari";
import { eslesiyor } from "../arama";
import { servisEtiketi } from "../servis";
import type {
  IsletmeAyarlari as IsletmeAyarlariTipi,
  ServisTanimi,
  ServisTipi,
} from "../isletmeAyarlari";
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

// Açık/kapalı ayarlar. İki düğmelik "Açık | Kapalı" segmenti her satırı
// şişiriyordu; tek anahtar hem daha az yer kaplıyor hem durumu bir bakışta veriyor.
function AyarAnahtari({
  acik,
  degistir,
}: {
  acik: boolean;
  degistir: (deger: boolean) => void;
}) {
  return (
    <label className={acik ? "ayar-anahtar acik" : "ayar-anahtar"}>
      <input type="checkbox" checked={acik} onChange={(e) => degistir(e.target.checked)} />
      <em className="anahtar" />
    </label>
  );
}

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
  const [kasayaGirer, setKasayaGirer] = useState(tip?.kasayaGirer ?? false);

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
            etiket="Kasadaki paraya eklensin"
            ipucu="Nakit gibi elden alınan ödemeler için; kasa sayımında bu tipler toplanır"
            acik={kasayaGirer}
            degistir={setKasayaGirer}
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
            onClick={() => onKaydet({ ad: ad.trim(), renk, sinif, acikHesap, aktif, kasayaGirer })}
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

/**
 * Kuver ya da garsoniyenin tanımı. İkisi de aynı dört alandan oluşuyor; panel
 * tek, hangisinin düzenlendiğini başlık söylüyor.
 */
function ServisPaneli({
  baslik,
  tanim,
  kisiBasi,
  onKapat,
  onKaydet,
}: {
  baslik: string;
  tanim: ServisTanimi;
  /** Kuverde tutar kişi sayısıyla çarpılıyor; panelde bunun yazması gerekiyor. */
  kisiBasi?: boolean;
  onKapat: () => void;
  onKaydet: (yeni: ServisTanimi) => void;
}) {
  const [ad, setAd] = useState(tanim.ad);
  const [tip, setTip] = useState<ServisTipi>(tanim.tip);
  const [deger, setDeger] = useState(tanim.deger ? String(tanim.deger) : "");
  const [otomatik, setOtomatik] = useState(tanim.otomatik);

  const sayi = Number(deger.replace(",", "."));
  const gecerli = ad.trim().length > 0 && sayi >= 0 && (tip !== "yuzde" || sayi <= 100);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{baslik}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>Hesapta yazacak ad</label>
            <input value={ad} onChange={(e) => setAd(e.target.value)} autoFocus />
          </div>

          <div className="alan">
            <label>Hesaplama türü</label>
            <div className="mod-sec">
              <button className={tip === "tutar" ? "aktif" : ""} onClick={() => setTip("tutar")}>
                Tutar
              </button>
              <button className={tip === "yuzde" ? "aktif" : ""} onClick={() => setTip("yuzde")}>
                Yüzde
              </button>
            </div>
          </div>

          <div className="alan">
            <label>{tip === "yuzde" ? "Oran (%)" : kisiBasi ? "Kişi başı tutar (₺)" : "Tutar (₺)"}</label>
            <input
              value={deger}
              onChange={(e) => setDeger(e.target.value)}
              placeholder={tip === "yuzde" ? "10" : "25"}
              inputMode="decimal"
            />
          </div>

          <Anahtar
            etiket="Siparişe kendiliğinden eklensin"
            ipucu="Kapatırsanız tanım durur ama hesaba girmez; yetkisi olan personel masada elle ekler"
            acik={otomatik}
            degistir={setOtomatik}
          />

          <Bilgi>
            {kisiBasi && tip === "tutar"
              ? "Kuver misafir sayısıyla çarpılır. Misafir sayısı girilmemiş adisyona kuver yazılmaz — kuver kullanacaksanız \"Misafir sayısı zorunlu\" ayarını da açın."
              : tip === "yuzde"
                ? "Yüzde, indirim düşüldükten sonraki hesap tutarı üzerinden alınır."
                : "Hesabın tamamına bir kez eklenir."}
          </Bilgi>
        </div>

        <footer className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={!gecerli}
            onClick={() => onKaydet({ ad: ad.trim(), tip, deger: sayi, otomatik })}
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
  const [kodKopyalandi, setKodKopyalandi] = useState(false);
  const [ara, setAra] = useState("");
  const [indirimler, setIndirimler] = useState<IndirimTanimi[]>([]);
  const [indirimPaneli, setIndirimPaneli] = useState<IndirimTanimi | null | undefined>(undefined);
  const [silinecekIndirim, setSilinecekIndirim] = useState<IndirimTanimi | null>(null);
  // Açık olan servis tanımı: "kuver" ya da "garsoniye".
  const [servisPaneli, setServisPaneli] = useState<"kuver" | "garsoniye" | null>(null);

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
  const isletmeBasHarfi = (isletmeAdi() || "?").trim().charAt(0).toLocaleUpperCase("tr");
  // Ayar arandığında kart da diğer satırlar gibi süzülüyor.
  const isletmeKartiGorunur = !ara || eslesiyor("İşletme adı kodu ünvan isim", ara);

  // Destek görüşmelerinde kod okunup yazılıyor; elle not almak yerine tek
  // dokunuşla panoya gitsin.
  const kodKopyala = async () => {
    if (!isletmeKodu()) return;
    try {
      await navigator.clipboard.writeText(String(isletmeKodu()));
      setKodKopyalandi(true);
      setTimeout(() => setKodKopyalandi(false), 1800);
    } catch {
      setUyari("Kod kopyalanamadı. Elle not alabilirsiniz.");
    }
  };

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

  // Servis ana anahtarı açık hesapların toplamını değiştiriyor: masalar doluyken
  // açılırsa oturan müşterinin hesabına sonradan kuver biner.
  const servisAnahtari = async (yeni: boolean) => {
    if ((await acikAdisyonSayisi()) > 0) {
      setUyari("Açık adisyon varken bu ayar değiştirilemez. Önce tüm hesapları kapatın.");
      return;
    }
    await genelDegistir(
      { servisAcik: yeni },
      yeni ? "Kuver ve garsoniye açıldı" : "Kuver ve garsoniye kapatıldı"
    );
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
      <div className="sayfa ayar-sayfa">
        <AyarBasligi />

        {/* Arama kutusu açıklama şeridinin karşı ucunda: iki uç da aynı
            yükseklikte, sayfanın üstü simetrik duruyor. */}
        <div className="bilgi-serit">
          <Bilgi>
            {masalarBolumu
              ? "Salonunuzdaki bölgeleri ve masaları buradan düzenlersiniz."
              : odemeBolumu
                ? "Kasada hangi ödeme düğmelerinin çıkacağını buradan belirlersiniz."
                : genelBolumu
                  ? "İşletmenin çalışma düzenini buradan kurarsınız."
                  : "Satışın genel kurallarını buradan belirlersiniz."}
          </Bilgi>
          {(genelBolumu || satisBolumu) && (
            <AramaKutusu deger={ara} degistir={setAra} yer="Ayar ara" />
          )}
        </div>

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

          {genelBolumu && isletmeKartiGorunur && (
            <section className="isletme-karti">
              <div className="isletme-amblem">{isletmeBasHarfi}</div>
              <div className="isletme-alan">
                <label>İşletme</label>
                <strong>{isletmeAdi() || "—"}</strong>
                <p>
                  <Lock size={13} /> İşletme adı ve kodu kayıt sırasında
                  belirlenir, sonradan değiştirilemez.
                </p>
              </div>
              <button
                className="isletme-kod"
                title="Kodu kopyala"
                onClick={kodKopyala}
              >
                <span>İŞLETME KODU</span>
                <strong>{isletmeKodu() || "—"}</strong>
                {kodKopyalandi ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </section>
          )}

          {genelBolumu && (
          <section className="ayar-bolum ayar-liste">
            <AyarSatiri
              ad="Kasa günü"
              ara={ara}
              ipucu="Takvim günü yerine işletmenin kendi günü. Gece yarısını geçtikten sonra yapılan satışlar, bitiş saatine kadar hâlâ aynı günün hesabına yazılır. Gün sonu ve raporlar bu aralığı kullanır."
            >
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
            </AyarSatiri>

            <AyarSatiri
              ad="Kasa takibi"
              ara={ara}
              ipucu="Açıkken salon ekranına kasa düğmesi gelir: gün başında kasadaki para girilir, gün sonunda sayılır ve olması gerekenle farkı görünür. Kapalıyken o düğme ve kasa ekranları hiç çıkmaz, satış normal işler."
            >
              <AyarAnahtari
                acik={genel.kasaTakibi}
                degistir={(v) =>
                  genelDegistir({ kasaTakibi: v }, v ? "Kasa takibi açıldı" : "Kasa takibi kapatıldı")
                }
              />
            </AyarSatiri>

            {/* Kasa kapalıyken alt ayarlarını göstermek boşuna yer kaplıyor. */}
            {genel.kasaTakibi && (
              <AyarSatiri
                ad="Kasa kapanış saati"
                ara={ara}
                ipucu="Bu saat geçtiği hâlde kasa hâlâ açıksa kapatma hatırlatması çıkar. Boş bırakılırsa hatırlatma yapılmaz. Gecenin ilerleyen saatinde kapanan işletmede kapanış saatini kasa gününün bitişine yakın seçin."
              >
                <div className="ayar-saatler">
                  <input
                    type="time"
                    value={genel.kasaKapanisUyari}
                    onChange={(e) =>
                      genelDegistir(
                        { kasaKapanisUyari: e.target.value },
                        e.target.value ? "Kapanış saati güncellendi" : "Kapanış hatırlatması kapatıldı"
                      )
                    }
                  />
                </div>
              </AyarSatiri>
            )}

            {genel.kasaTakibi && (
              <AyarSatiri
                ad="Kapanış hatırlatması ısrarcı olsun"
                ara={ara}
                ipucu="Açıkken hatırlatma ertelense bile iki dakika sonra yeniden çıkar, kasa kapatılana kadar peşini bırakmaz. Kapalıyken erteleme on beş dakika sürer. Satışı hiçbir durumda durdurmaz."
              >
                <AyarAnahtari
                  acik={genel.kasaKapanisZorunlu}
                  degistir={(v) => {
                    // Saat yoksa hatırlatma hiç çıkmıyor; ısrarı açmak boş düğme olurdu.
                    if (v && !genel.kasaKapanisUyari) {
                      setUyari("Önce kasa kapanış saatini seçin; hatırlatma o saate göre çıkıyor.");
                      return;
                    }
                    genelDegistir(
                      { kasaKapanisZorunlu: v },
                      v ? "Hatırlatma ısrarcı olacak" : "Hatırlatma ertelenebilir"
                    );
                  }}
                />
              </AyarSatiri>
            )}

            {genel.kasaTakibi && (
              <AyarSatiri
                ad="Kasadan para alma"
                ara={ara}
                ipucu="Açıkken kasa penceresine para ekleme ve çıkarma düğmeleri gelir (bozukluk getirme, bankaya götürme). Kapalıyken kasadaki para yalnızca satışla değişir. Gider girişinden ayrıdır: bu para işletmeden çıkmaz, yalnızca kasadan çıkar."
              >
                <AyarAnahtari
                  acik={genel.paraHareketiAcik}
                  degistir={(v) =>
                    genelDegistir(
                      { paraHareketiAcik: v },
                      v ? "Para hareketi açıldı" : "Para hareketi kapatıldı"
                    )
                  }
                />
              </AyarSatiri>
            )}

            <AyarSatiri
              ad="Nakit alınca çekmece açılsın"
              ara={ara}
              ipucu="Kasaya para giren bir ödeme alındığında para çekmecesi kendiliğinden açılır; kasiyerin ayrıca düğmeye basması gerekmez. Kartlı ödemede açılmaz. Çekmecenin hangi yazıcıya bağlı olduğu Ayarlar › Yazıcılar'da işaretlenir; çekmece kasa penceresinden her zaman elle de açılabilir."
            >
              <AyarAnahtari
                acik={genel.cekmeceNakitteAcilsin}
                degistir={(v) =>
                  genelDegistir(
                    { cekmeceNakitteAcilsin: v },
                    v ? "Çekmece nakitte açılacak" : "Çekmece yalnızca elle açılacak"
                  )
                }
              />
            </AyarSatiri>

            <AyarSatiri
              ad="Ekran kilidi"
              ara={ara}
              ipucu="Kasaya seçilen süre boyunca dokunulmazsa kilit ekranı kendiliğinden gelir; tezgâhtan ayrılan kişinin oturumuyla başkası işlem yapamaz. Kapalı seçilirse ekran yalnızca elle kilitlenir. Oturum kapanmaz, açık adisyonlar yerinde durur."
            >
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
            </AyarSatiri>

            <AyarSatiri
              ad="Çalışma tipleri"
              ara={ara}
              ipucu="Yapmadığınız iş arayüzde durmasın. Masa servisi kapatılamaz — kapanırsa satış yapacak ekran kalmaz."
            >
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
            </AyarSatiri>
          </section>
          )}

          {satisBolumu && (
          <section className="ayar-bolum ayar-liste">
            <AyarSatiri
              ad="Menü fiyatları"
              ara={ara}
              ipucu="Menüye yazdığınız fiyatın vergiyi içerip içermediği. Dahil: müşteri menüdeki fiyatı öder, vergi o fiyatın içinden hesaplanır. Hariç: menüdeki fiyata vergi eklenir, müşteri daha fazlasını öder. Oran ürünün KDV grubundan gelir."
            >
              <div className="mod-sec kompakt">
                <button className={kdvDahil ? "aktif" : ""} onClick={() => kdvAyariDegistir(true)}>
                  KDV dahil
                </button>
                <button className={!kdvDahil ? "aktif" : ""} onClick={() => kdvAyariDegistir(false)}>
                  KDV hariç
                </button>
              </div>
            </AyarSatiri>

            <AyarSatiri
              ad="Misafir sayısı zorunlu"
              ara={ara}
              ipucu="Açıkken masaya girer girmez kaç kişi olduğu sorulur ve boş geçilemez. Kapalıyken sorulur ama boş bırakılabilir. Kişi başı ciro raporu bu bilgiye dayandığı için boş kalan adisyonlar rapora girmez."
            >
              <AyarAnahtari
                acik={genel.kisiSayisiZorunlu}
                degistir={(v) =>
                  genelDegistir(
                    { kisiSayisiZorunlu: v },
                    v ? "Misafir sayısı artık zorunlu" : "Misafir sayısı isteğe bağlı"
                  )
                }
              />
            </AyarSatiri>

            <AyarSatiri
              ad="Para üstü"
              ara={ara}
              ipucu="Açıkken Hızlı Öde'de müşterinin verdiği tutar için ayrı bir alan çıkar ve para üstü hesaplanır. Kapalıyken o alan hiç görünmez, yalnızca hesap tutarı tahsil edilir."
            >
              <AyarAnahtari
                acik={genel.paraUstu}
                degistir={(v) =>
                  genelDegistir({ paraUstu: v }, v ? "Para üstü gösterilecek" : "Para üstü kapatıldı")
                }
              />
            </AyarSatiri>

            <AyarSatiri
              ad="Kuver ve garsoniye"
              ara={ara}
              ipucu="Adisyona kendiliğinden eklenen servis bedelleri. Kuver misafir başına alınır (ekmek, çerez, servis takımı), garsoniye hesabın yüzdesi ya da sabit tutarıdır. Açık adisyon varken açılıp kapatılamaz. Otomatik ekleme yalnız masalarda çalışır; gel al ve pakette elle eklenir."
            >
              <AyarAnahtari acik={genel.servisAcik} degistir={servisAnahtari} />
            </AyarSatiri>

            {genel.servisAcik && !ara && (
              <ul className="indirim-liste">
                {(["kuver", "garsoniye"] as const).map((hangi) => {
                  const tanim = genel[hangi];
                  return (
                    <li key={hangi} className={tanim.deger > 0 ? undefined : "kapali"}>
                      <span className="indirim-ad">{tanim.ad}</span>
                      <span className="indirim-deger">
                        {tanim.deger > 0 ? servisEtiketi(tanim) : "Tanımsız"}
                        {hangi === "kuver" && tanim.tip === "tutar" && tanim.deger > 0
                          ? " · kişi başı"
                          : ""}
                      </span>
                      {!tanim.otomatik && <span className="indirim-gizli">Elle</span>}
                      <button onClick={() => setServisPaneli(hangi)} title="Düzenle">
                        <Pencil size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <AyarSatiri
              ad="İndirim tanımları"
              ara={ara}
              ipucu="Satışta hazır listeden seçilen indirimler. Serbest indirim yetkisi olmayan personel yalnızca buradaki tanımları uygulayabilir; tanım yoksa indirim yapamaz."
            >
              <span className="ayar-satir-sag">
                {indirimler.length > 0 && <i className="ayar-sayi">{indirimler.length}</i>}
                <button className="ayar-satir-ekle" onClick={() => setIndirimPaneli(null)}>
                  <Plus size={15} /> Ekle
                </button>
              </span>
            </AyarSatiri>

            {indirimler.length > 0 && !ara && (
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

      {servisPaneli && (
        <ServisPaneli
          key={servisPaneli}
          baslik={servisPaneli === "kuver" ? "Kuver" : "Garsoniye"}
          tanim={genel[servisPaneli]}
          kisiBasi={servisPaneli === "kuver"}
          onKapat={() => setServisPaneli(null)}
          onKaydet={async (yeni) => {
            const hangi = servisPaneli;
            setServisPaneli(null);
            await genelDegistir({ [hangi]: yeni }, `${yeni.ad} kaydedildi`);
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
