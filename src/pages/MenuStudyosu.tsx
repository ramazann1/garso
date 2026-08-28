import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowUpDown, ChevronDown, Copy, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import Duzen from "../components/Duzen";
import Bilgi from "../components/Bilgi";
import UrunPaneli from "../components/UrunPaneli";
import OnayModal from "../components/OnayModal";
import Bildirim from "../components/Bildirim";
import SiralamaModal from "../components/SiralamaModal";
import TopluDuzenle from "../components/TopluDuzenle";
import KampanyaSekmesi from "../components/KampanyaSekmesi";
import AktarSekmesi from "../components/AktarSekmesi";
import Anahtar from "../components/Anahtar";
import RenkSecici, { renkler } from "../components/RenkSecici";
import {
  menuGetir,
  maliyetleriGetir,
  maliyetleriIsle,
  kategoriEkle,
  kategoriGuncelle,
  kategoriSil,
  kategoriSirala,
  kategoriUrunleri,
  altKategoriler,
  urunKaydet,
  urunKopyala,
  urunSil,
  urunSirala,
  grupKaydet,
  grupSil,
  birimleriKaydet,
  kdvKaydet,
  KDV_SINIRI,
  topluKaydet,
  porsiyonFiyat,
  urunGrupIdleri,
  bosMenuAlanlari,
} from "../menu";
import type { KategoriAlanlari, KdvSatiri, TopluPorsiyon, TopluUrun } from "../menu";
import { planHazirla, type AktarimPlani } from "../aktarim";
import { istasyonlariGetir, istasyonHaritasiniUnut } from "../yazicilar";
import type { Istasyon } from "../yazicilar";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import type { MenuBirim, MenuKategori, MenuKdv, MenuSecenekGrubu, MenuUrun } from "../types";

const adSiniri = 25;

function anaFiyat(u: MenuUrun) {
  const p = u.porsiyonlar.find((x) => x.varsayilan) ?? u.porsiyonlar[0];
  return p ? porsiyonFiyat(p) : 0;
}

function KategoriPenceresi({
  kategori,
  kategoriler,
  istasyonlar,
  onKapat,
  onKaydet,
}: {
  kategori?: MenuKategori;
  kategoriler: MenuKategori[];
  istasyonlar: Istasyon[];
  onKapat: () => void;
  onKaydet: (k: KategoriAlanlari) => void;
}) {
  const [istasyonId, setIstasyonId] = useState<number | undefined>(kategori?.istasyonId);
  const [ad, setAd] = useState(kategori?.ad ?? "");
  const [renk, setRenk] = useState(kategori?.renk ?? renkler[0]);
  const [ustId, setUstId] = useState<number | undefined>(kategori?.ustId);
  const [satistaGorunur, setSatistaGorunur] = useState(kategori?.satistaGorunur ?? true);
  const [mutfaktaGorunur, setMutfaktaGorunur] = useState(kategori?.mutfaktaGorunur ?? true);

  // Ağaç iki seviye: üst olabilecekler yalnızca ana kategoriler, kendisi hariç.
  // Altında kategori olan bir kategori kendisi alt kategori olamaz.
  const cocukluMu = kategori ? kategoriler.some((k) => k.ustId === kategori.id) : false;
  const ustAdaylari = kategoriler.filter((k) => !k.ustId && k.id !== kategori?.id);

  return (
    <div className="modal-fon" onClick={onKapat}>
      <div className="kategori-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{kategori ? "Kategoriyi düzenle" : "Yeni kategori"}</h3>

        <div className="alan">
          <span>
            Kategori adı
            <em className={ad.length >= adSiniri - 5 ? "sayac dolmak-uzere" : "sayac"}>
              {ad.length}/{adSiniri}
            </em>
          </span>
          <input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            maxLength={adSiniri}
            placeholder="Sıcak İçecekler"
            autoFocus
          />
        </div>

        <div className="alan">
          <span>Üst kategori</span>
          <select
            className="ust-secim"
            value={ustId ?? ""}
            disabled={cocukluMu}
            onChange={(e) => setUstId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">— Ana kategori —</option>
            {ustAdaylari.map((k) => (
              <option key={k.id} value={k.id}>{k.ad}</option>
            ))}
          </select>
          {cocukluMu && (
            <Bilgi>
              Bu kategorinin altında kategori var; kendisi alt kategori olamaz.
            </Bilgi>
          )}
        </div>

        {istasyonlar.length > 0 && (
          <div className="alan">
            <span>Hazırlandığı istasyon</span>
            <select
              value={istasyonId ?? ""}
              onChange={(e) => setIstasyonId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">— Seçilmedi —</option>
              {istasyonlar.map((i) => (
                <option key={i.id} value={i.id}>{i.ad}</option>
              ))}
            </select>
          </div>
        )}

        <div className="alan">
          <span>Renk</span>
          <RenkSecici renk={renk} degistir={(r) => setRenk(r ?? renkler[0])} />
        </div>

        <Anahtar
          etiket="Satış ekranında göster"
          ipucu="Kapalıysa sipariş ekranında çıkmaz"
          acik={satistaGorunur}
          degistir={setSatistaGorunur}
        />
        <Anahtar
          etiket="Mutfak ekranında göster"
          acik={mutfaktaGorunur}
          degistir={setMutfaktaGorunur}
        />

        <div className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={!ad.trim()}
            onClick={() =>
              onKaydet({
                ad: ad.trim(),
                renk,
                ustId,
                istasyonId,
                satistaGorunur,
                mutfaktaGorunur,
                // Tanıtım alanları bu pencerede düzenlenmiyor; olduğu gibi
                // taşınıyor ki kaydetmek onları silmesin.
                aciklama: kategori?.aciklama ?? "",
                gorsel: kategori?.gorsel,
              })
            }
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

type SecenekSatiri = { ad: string; ekFiyat: number; varsayilan?: boolean };

function GrupPaneli({
  grup,
  onKapat,
  onKaydet,
  onSil,
}: {
  grup?: MenuSecenekGrubu;
  onKapat: () => void;
  onKaydet: (
    ad: string,
    tekli: boolean,
    zorunlu: boolean,
    enAz: number,
    liste: SecenekSatiri[]
  ) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(grup?.ad ?? "");
  const [tekli, setTekli] = useState(grup?.tekli ?? true);
  const [zorunlu, setZorunlu] = useState(grup?.zorunlu ?? false);
  const [enAz, setEnAz] = useState(String(grup?.enAz || 1));
  const [liste, setListe] = useState<SecenekSatiri[]>(
    grup?.liste.length
      ? grup.liste.map((s) => ({ ad: s.ad, ekFiyat: s.ekFiyat, varsayilan: s.varsayilan }))
      : [{ ad: "", ekFiyat: 0 }]
  );
  const [siralama, setSiralama] = useState(false);

  const satirDegis = (i: number, alan: "ad" | "ekFiyat", deger: string) => {
    setListe((l) =>
      l.map((s, j) => (j === i ? { ...s, [alan]: alan === "ekFiyat" ? Number(deger) || 0 : deger } : s))
    );
  };

  const satirSil = (i: number) => {
    setListe((l) => l.filter((_, j) => j !== i));
  };

  // Tekli grupta önceden işaretli tek seçenek olur; yenisi eskisini söndürür.
  const varsayilanDegis = (i: number) => {
    setListe((l) =>
      l.map((s, j) => ({
        ...s,
        varsayilan: j === i ? !s.varsayilan : tekli ? false : s.varsayilan,
      }))
    );
  };

  const gecerli = ad.trim().length > 0 && liste.some((s) => s.ad.trim());

  // En az kaç seçim isteneceği yalnız çoklu ve zorunlu grupta sorulur; tekli
  // grupta zorunlu zaten "bir tane" demek.
  const enAzSorulur = zorunlu && !tekli;
  const enAzSayi = Math.max(1, Number(enAz) || 1);

  const kaydet = () => {
    const secenekler = liste.filter((s) => s.ad.trim());
    // Tekli grupta önceden işaretli tek seçenek olabilir.
    const temiz = tekli
      ? secenekler.map((s, i) => ({
          ...s,
          varsayilan: s.varsayilan && i === secenekler.findIndex((x) => x.varsayilan),
        }))
      : secenekler;
    onKaydet(ad.trim(), tekli, zorunlu, enAzSorulur ? enAzSayi : 0, temiz);
  };

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="urun-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{grup ? "Grubu düzenle" : "Yeni seçenek grubu"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <span>Grup adı</span>
            <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Şeker" autoFocus />
          </div>

          <div className="mod-sec">
            <button className={tekli ? "aktif" : ""} onClick={() => setTekli(true)}>Tekli seçim</button>
            <button className={!tekli ? "aktif" : ""} onClick={() => setTekli(false)}>Çoklu seçim</button>
          </div>

          <Anahtar
            etiket="Seçim zorunlu olsun"
            ipucu="Siparişte bu gruptan seçim yapılmadan ürün eklenemez"
            acik={zorunlu}
            degistir={setZorunlu}
          />

          {enAzSorulur && (
            <div className="alan">
              <span>En az kaç seçim yapılmalı</span>
              <input
                className="kisa"
                value={enAz}
                onChange={(e) => setEnAz(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="1"
              />
            </div>
          )}

          <div className="bolum">
            <div className="ekle-satir">
              <button
                disabled={liste.length < 2}
                onClick={() => setSiralama(true)}
              >
                <ArrowUpDown size={15} /> Sırala
              </button>
              <button onClick={() => setListe([...liste, { ad: "", ekFiyat: 0 }])}><Plus size={14} /> Seçenek</button>
            </div>
            <Bilgi>
              Ek fiyat boş bırakılırsa ücretsiz sayılır. Yıldızlı seçenekler ürün
              penceresi açılınca işaretli gelir.
            </Bilgi>
            {liste.map((s, i) => (
              <div key={i} className="satir-alan">
                <input value={s.ad} onChange={(e) => satirDegis(i, "ad", e.target.value)} placeholder="Sade" />
                <input
                  className="kisa"
                  value={s.ekFiyat || ""}
                  onChange={(e) => satirDegis(i, "ekFiyat", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="₺"
                  inputMode="decimal"
                />
                <button
                  className={s.varsayilan ? "satir-varsayilan aktif" : "satir-varsayilan"}
                  onClick={() => varsayilanDegis(i)}
                  title="Önceden işaretli gelsin"
                >
                  <Star size={15} />
                </button>
                <button className="satir-sil" onClick={() => satirSil(i)} disabled={liste.length === 1}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {siralama && (
          <SiralamaModal
            baslik="Seçenekleri sırala"
            satirlar={liste.map((s, i) => ({ id: i, ad: s.ad.trim() || "(adsız)" }))}
            onKapat={() => setSiralama(false)}
            onKaydet={(sira) => {
              setListe(sira.map((i) => liste[i]));
              setSiralama(false);
            }}
          />
        )}

        <footer className="modal-aksiyonlar">
          {grup && onSil && (
            <button className="sil-buton" onClick={onSil}>Grubu sil</button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!gecerli} onClick={kaydet}>Kaydet</button>
        </footer>
      </div>
    </div>
  );
}

function BirimlerSekmesi({
  birimler,
  kullanim,
  onKaydet,
  onUyari,
}: {
  birimler: MenuBirim[];
  kullanim: (id: number) => number;
  onKaydet: (
    liste: { id?: number; ad: string; varsayilan: boolean }[],
    silinenler: number[]
  ) => void;
  onUyari: (mesaj: string) => void;
}) {
  const [liste, setListe] = useState<{ id?: number; ad: string; varsayilan: boolean }[]>(
    birimler.map((b) => ({ id: b.id, ad: b.ad, varsayilan: b.varsayilan }))
  );
  const [silinenler, setSilinenler] = useState<number[]>([]);

  // Varsayılan tektir — birine basınca diğerleri iner; yıldızlıya tekrar
  // basmak işareti kaldırır (o zaman "Tam" kuralı devreye girer).
  const varsayilanSec = (i: number) =>
    setListe((l) => l.map((x, j) => ({ ...x, varsayilan: j === i && !x.varsayilan })));

  const satirSil = (i: number) => {
    const satir = liste[i];
    if (satir.id && kullanim(satir.id) > 0) {
      onUyari(`"${satir.ad}" birimi ${kullanim(satir.id)} porsiyonda kullanılıyor. Önce o porsiyonların birimini değiştir.`);
      return;
    }
    if (satir.id) setSilinenler((s) => [...s, satir.id!]);
    setListe((l) => l.filter((_, j) => j !== i));
  };

  const kaydet = () => {
    const dolu = liste.filter((b) => b.ad.trim()).map((b) => ({ ...b, ad: b.ad.trim() }));
    const adlar = dolu.map((b) => b.ad.toLocaleLowerCase("tr"));
    if (new Set(adlar).size !== adlar.length) {
      onUyari("Aynı isimde iki birim olamaz.");
      return;
    }
    onKaydet(dolu, silinenler);
  };

  return (
    <div className="ms-urunler">
      <div className="ms-urun-ust">
        <h2>Birimler</h2>
        <span>{liste.length} birim</span>
        <button
          className="ms-urun-ekle"
          onClick={() => setListe([...liste, { ad: "", varsayilan: false }])}
        >
          <Plus size={15} /> Birim
        </button>
      </div>

      <Bilgi>
        Porsiyon adları bu listeden seçilir — "Tam" ile "tam" karmaşası olmasın diye tek yerde
        tutuluyor. Yıldızlı birim, yeni ürünün ilk porsiyonunda hazır gelir.
      </Bilgi>

      <div className="birim-liste">
        {liste.map((b, i) => (
          <div key={b.id ?? `yeni-${i}`} className="satir-alan">
            <button
              className={b.varsayilan ? "varsayilan-tus aktif" : "varsayilan-tus"}
              onClick={() => varsayilanSec(i)}
              title="Yeni üründe hazır gelen birim"
            >
              {b.varsayilan ? "★" : "☆"}
            </button>
            <input
              value={b.ad}
              onChange={(e) =>
                setListe((l) => l.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))
              }
              placeholder="Tam"
            />
            <span className="birim-sayac">{b.id ? `${kullanim(b.id)} porsiyon` : "yeni"}</span>
            <button className="satir-sil" title="Sil" onClick={() => satirSil(i)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {liste.length === 0 && <p className="bos">Henüz birim yok</p>}

      <div className="birim-aksiyon">
        <button className="birim-kaydet" onClick={kaydet}>Kaydet</button>
      </div>
    </div>
  );
}

function KdvSekmesi({
  kdvler,
  kullanim,
  onKaydet,
  onUyari,
}: {
  kdvler: MenuKdv[];
  kullanim: (id: number) => number;
  onKaydet: (liste: KdvSatiri[], silinenler: number[]) => void;
  onUyari: (mesaj: string) => void;
}) {
  // Oran taslakta metin: kullanıcı silip yeniden yazarken alan boş kalabilmeli.
  const [liste, setListe] = useState<(KdvSatiri & { oranMetin: string })[]>(
    kdvler.map((k) => ({ ...k, oranMetin: String(k.oran) }))
  );
  const [silinenler, setSilinenler] = useState<number[]>([]);

  const degis = (i: number, degisim: Partial<KdvSatiri & { oranMetin: string }>) =>
    setListe((l) => l.map((x, j) => (j === i ? { ...x, ...degisim } : x)));

  const varsayilanSec = (i: number) =>
    setListe((l) => l.map((x, j) => ({ ...x, varsayilan: j === i && !x.varsayilan })));

  const satirSil = (i: number) => {
    const satir = liste[i];
    if (satir.id) setSilinenler((s) => [...s, satir.id!]);
    setListe((l) => l.filter((_, j) => j !== i));
  };

  const kaydet = () => {
    const dolu = liste.filter((k) => k.ad.trim()).map((k) => ({ ...k, ad: k.ad.trim() }));
    const adlar = dolu.map((k) => k.ad.toLocaleLowerCase("tr"));
    if (new Set(adlar).size !== adlar.length) {
      onUyari("Aynı isimde iki KDV grubu olamaz.");
      return;
    }
    if (dolu.some((k) => k.oran < 0 || k.oran > 100)) {
      onUyari("KDV oranı 0 ile 100 arasında olmalı.");
      return;
    }
    onKaydet(
      dolu.map(({ id, ad, oran, varsayilan }) => ({ id, ad, oran, varsayilan })),
      silinenler
    );
  };

  return (
    <div className="ms-urunler">
      <div className="ms-urun-ust">
        <h2>KDV Grupları</h2>
        <span>{liste.length} grup</span>
        <button
          className="ms-urun-ekle"
          disabled={liste.length >= KDV_SINIRI}
          onClick={() =>
            setListe([...liste, { ad: "", oran: 0, varsayilan: false, oranMetin: "" }])
          }
        >
          <Plus size={15} /> KDV Grubu
        </button>
      </div>

      <Bilgi>
        En fazla {KDV_SINIRI} grup tanımlanır. Yıldızlı grup, kendi KDV'si seçilmemiş
        ürünlerde geçerlidir. Silinen grubu kullanan ürünler varsayılana döner.
      </Bilgi>

      <div className="birim-liste">
        {liste.map((k, i) => (
          <div key={k.id ?? `yeni-${i}`} className="satir-alan">
            <button
              className={k.varsayilan ? "varsayilan-tus aktif" : "varsayilan-tus"}
              onClick={() => varsayilanSec(i)}
              title="Varsayılan KDV grubu"
            >
              {k.varsayilan ? "★" : "☆"}
            </button>
            <input
              value={k.ad}
              onChange={(e) => degis(i, { ad: e.target.value })}
              placeholder="Yiyecek"
            />
            <input
              className="kisa"
              value={k.oranMetin}
              onChange={(e) => {
                const metin = e.target.value.replace(/[^0-9]/g, "");
                degis(i, { oranMetin: metin, oran: Number(metin || 0) });
              }}
              placeholder="10"
            />
            <span className="birim-sayac">%{k.id ? ` · ${kullanim(k.id)} ürün` : " · yeni"}</span>
            <button className="satir-sil" title="Sil" onClick={() => satirSil(i)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {liste.length === 0 && <p className="bos">Henüz KDV grubu yok</p>}

      <div className="birim-aksiyon">
        <button className="birim-kaydet" onClick={kaydet}>Kaydet</button>
      </div>
    </div>
  );
}

export default function MenuStudyosu() {
  const [kategoriler, setKategoriler] = useState<MenuKategori[]>([]);
  const [urunler, setUrunler] = useState<MenuUrun[]>([]);
  const [gruplar, setGruplar] = useState<MenuSecenekGrubu[]>([]);
  const [birimler, setBirimler] = useState<MenuBirim[]>([]);
  const [kdvler, setKdvler] = useState<MenuKdv[]>([]);
  const [istasyonlar, setIstasyonlar] = useState<Istasyon[]>([]);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  // Alt kategoriler kendiliğinden açılmaz; satırdaki okla açılır, tek dal açık kalır.
  const [acikGrupId, setAcikGrupId] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [pencere, setPencere] = useState<{ kategori?: MenuKategori } | null>(null);
  const [panel, setPanel] = useState<MenuUrun | null>(null);
  // Görünüm adresten geliyor; sol menüdeki alt başlıklar da aynı yolları açıyor.
  const { bolum } = useParams();
  const navigate = useNavigate();
  const gorunum = (bolum ?? "kategoriler") as
    | "kategoriler" | "gruplar" | "birimler" | "kdv" | "toplu" | "kampanya" | "aktarim";
  const [topluDegisiklik, setTopluDegisiklik] = useState(0);
  const [grupPencere, setGrupPencere] = useState<{ grup?: MenuSecenekGrubu } | null>(null);
  const [arama, setArama] = useState("");
  const [kapsam, setKapsam] = useState<"kategori" | "tumu" | "kategorisiz">("kategori");
  const [siralama, setSiralama] = useState<"kategori" | "urun" | null>(null);
  const [vurgulu, setVurgulu] = useState<number | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [onaySor, setOnaySor] = useState<{ mesaj: string; devam: () => void } | null>(null);

  const yukle = async (ilk = false) => {
    // Ürün/kategori istasyonu değişmiş olabilir; fiş tarafındaki eşleme tazelensin.
    istasyonHaritasiniUnut();
    // Maliyet menüyle birlikte gelmiyor (kâr marjı satış ekranlarına
    // düşmesin); menü ekranı onu ayrıca isteyip ürünlere işliyor.
    const [veri, maliyetler] = await Promise.all([menuGetir(), maliyetleriGetir()]);
    setKategoriler(veri.kategoriler);
    setUrunler(maliyetleriIsle(veri.urunler, maliyetler));
    setGruplar(veri.gruplar);
    setBirimler(veri.birimler);
    setKdvler(veri.kdvler);
    if (ilk) setSeciliId(veri.kategoriler[0]?.id ?? null);
  };

  useEffect(() => {
    yukle(true).then(() => setYukleniyor(false));
    // İstasyonlar menüyle birlikte değişmiyor, bir kez okunuyor.
    istasyonlariGetir().then(setIstasyonlar);
  }, []);

  // Toplu düzenlemede kaydedilmemiş taslak varsa sol menüden çıkış da sorsun.
  useEffect(() => {
    kilitKur(() => topluDegisiklik > 0);
    return kilitKaldir;
  }, [topluDegisiklik]);

  // Listede ana kategoriler durur; alt kategoriler satırdaki okla açılır —
  // hepsi birden görünürse liste uzuyor ve ekran karışıyor.
  const anaKategoriler = kategoriler.filter((k) => !k.ustId);
  const secili = kategoriler.find((k) => k.id === seciliId) ?? anaKategoriler[0];

  // Arama ürün adına ve ürün koduna bakar; kapsam tüm menüye açılabilir.
  const aranan = arama.trim().toLocaleLowerCase("tr");
  const esler = (u: MenuUrun) =>
    !aranan ||
    u.ad.toLocaleLowerCase("tr").includes(aranan) ||
    (u.kod ?? "").toLocaleLowerCase("tr").includes(aranan);

  // Kategorisiz ürün sipariş ekranında hiçbir yerde çıkmaz; kaybolmasın diye
  // kapsam seçicide kendi seçeneği var — yalnızca öylesi varken görünüyor.
  const kategorisizler = urunler.filter((u) => !u.kategoriIdler.length);

  // Sonuncusu da silinince kapsam boş listede takılı kalmasın.
  useEffect(() => {
    if (kapsam === "kategorisiz" && !kategorisizler.length && !yukleniyor) setKapsam("kategori");
  }, [kapsam, kategorisizler.length, yukleniyor]);

  const listelenenUrunler =
    kapsam === "tumu"
      ? urunler.filter(esler).sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
      : kapsam === "kategorisiz"
        ? kategorisizler.filter(esler).sort((a, b) => a.ad.localeCompare(b.ad, "tr"))
        : secili
          ? kategoriUrunleri(urunler, secili.id).filter(esler)
          : [];
  // Her satır kendi ürünlerini listeler, yandaki sayı da kendi ürün sayısıdır —
  // alt kategorininki üstünkine karışmaz.
  const sayac = (id: number) => urunler.filter((u) => u.kategoriIdler.includes(id)).length;

  // Sıralama seçili kategorinin bulunduğu seviyede yapılır — kardeşler kendi arasında.
  const siralamaKardesleri = kategoriler.filter((k) => k.ustId === secili?.ustId);
  const siralamaBasligi = secili?.ustId
    ? `${kategoriler.find((k) => k.id === secili.ustId)?.ad} — alt kategori sırası`
    : "Kategorileri sırala";

  const kategoriKaydet = async (k: KategoriAlanlari) => {
    if (pencere?.kategori) await kategoriGuncelle(pencere.kategori.id, k);
    else await kategoriEkle(k);
    setPencere(null);
    yukle();
  };

  const kategoriyiSil = (k: MenuKategori) => {
    if (altKategoriler(kategoriler, k.id).length > 0) {
      setUyari("Bu kategorinin altında kategori var. Önce alt kategorileri taşı veya sil.");
      return;
    }
    if (sayac(k.id) > 0) {
      setUyari("Bu kategoride ürün var. Önce ürünleri başka kategoriye taşı veya sil.");
      return;
    }
    setOnaySor({
      mesaj: `"${k.ad}" kategorisi silinsin mi?`,
      devam: async () => {
        await kategoriSil(k.id);
        if (seciliId === k.id) setSeciliId(k.ustId ?? null);
        yukle();
      },
    });
  };

  const siralamaKaydet = async (idler: number[]) => {
    if (siralama === "kategori") await kategoriSirala(idler);
    else if (secili) await urunSirala(secili.id, idler);
    setSiralama(null);
    yukle();
  };

  const kaydet = async (u: MenuUrun) => {
    const hata = await urunKaydet(u);
    if (hata) {
      setUyari(hata);
      return;
    }
    setPanel(null);
    yukle();
  };

  // Kopya kaynağın altında beliriyor ve kısa süre vurgulanıyor — panel açılmıyor ki
  // arka arkaya birkaç kopya çıkarmak akışı kesmesin.
  const urunuKopyala = async (u: MenuUrun) => {
    const yeniId = await urunKopyala(u, urunler);
    await yukle();
    if (yeniId) {
      setVurgulu(yeniId);
      setTimeout(() => setVurgulu((v) => (v === yeniId ? null : v)), 2000);
    }
  };

  const urunuSil = (u: MenuUrun) => {
    if (!u.id) return;
    setOnaySor({
      mesaj: `"${u.ad}" silinsin mi?`,
      devam: async () => {
        await urunSil(u.id!);
        yukle();
        setPanel(null);
      },
    });
  };

  const grupSayaci = (id: number) =>
    urunler.filter((u) => u.porsiyonlar.some((p) => p.grupIdler.includes(id))).length;

  const grubuKaydet = async (
    ad: string,
    tekli: boolean,
    zorunlu: boolean,
    enAz: number,
    liste: SecenekSatiri[]
  ) => {
    await grupKaydet(grupPencere?.grup?.id, ad, tekli, zorunlu, enAz, liste);
    setGrupPencere(null);
    yukle();
  };

  const grubuSil = (g: MenuSecenekGrubu) => {
    if (grupSayaci(g.id) > 0) {
      setUyari("Bu grup bir ürüne bağlı. Önce üründen kaldır veya ürünü sil.");
      return;
    }
    setOnaySor({
      mesaj: `"${g.ad}" grubu silinsin mi?`,
      devam: async () => {
        await grupSil(g.id);
        yukle();
        setGrupPencere(null);
      },
    });
  };

  const birimKullanimi = (id: number) =>
    urunler.reduce((t, u) => t + u.porsiyonlar.filter((p) => p.birimId === id).length, 0);

  const birimleriYaz = async (
    liste: { id?: number; ad: string; varsayilan: boolean }[],
    silinenler: number[]
  ) => {
    await birimleriKaydet(liste, silinenler);
    await yukle();
    setBildirim("Birimler kaydedildi");
  };

  const kampanyaKaydet = async (u: MenuUrun) => {
    const hata = await urunKaydet(u);
    if (hata) {
      setUyari(hata);
      return;
    }
    await yukle();
    setBildirim("Kampanyalı menü kaydedildi");
  };

  const kdvKullanimi = (id: number) => urunler.filter((u) => u.kdvId === id).length;

  const kdvYaz = async (liste: KdvSatiri[], silinenler: number[]) => {
    await kdvKaydet(liste, silinenler);
    await yukle();
    setBildirim("KDV grupları kaydedildi");
  };

  // Önce dosyada geçen yeni kategoriler açılıyor, sonra ürünler yazılıyor —
  // ürünün bağlanacağı kategorinin id'si ancak açıldıktan sonra belli oluyor.
  // Ürünler tek tek gidiyor: urunKaydet porsiyon, kategori ve sıra işlerini
  // zaten hallediyor, aynı işi ikinci kez yazmaya gerek yok.
  const aktarimYaz = async (onizleme: AktarimPlani, ilerle: (yapilan: number) => void) => {
    let yapilan = 0;
    const adim = () => ilerle(++yapilan);

    // Önizleme dosya seçilirken kurulmuştu; o günden bu yana menü değişmiş
    // olabilir — aynı ekranda silinen bir ürün, başka bir cihazda eklenen bir
    // kategori. Eşleştirme yazmadan hemen önce menünün son hâliyle baştan
    // yapılıyor, yoksa program olmayan ürünü güncellemeye çalışır.
    const [taze, maliyetler] = await Promise.all([menuGetir(), maliyetleriGetir()]);
    const plan = planHazirla(onizleme.satirlar, {
      ...taze,
      urunler: maliyetleriIsle(taze.urunler, maliyetler),
    });

    if (plan.hatalar.length) {
      await yukle();
      return plan.hatalar[0].mesaj;
    }
    if (!plan.urunler.length) {
      await yukle();
      return "Menü bu arada değişmiş: dosyadaki bilgiler menüdekiyle aynı, yazılacak bir şey kalmadı.";
    }

    const yeniKategori = (ad: string, sira: number, ustId?: number) =>
      kategoriEkle({
        ad,
        renk: renkler[(kategoriler.length + sira) % renkler.length],
        ustId,
        satistaGorunur: true,
        mutfaktaGorunur: true,
        aciklama: "",
      });

    const yeniAnalar = plan.yeniKategoriler.filter((y) => !y.alt);
    const yeniAltlar = plan.yeniKategoriler.filter((y) => y.alt);

    for (const [i, y] of yeniAnalar.entries()) {
      await yeniKategori(y.ana, i);
      adim();
    }

    if (yeniAltlar.length) {
      const ara = await menuGetir();
      for (const [i, y] of yeniAltlar.entries()) {
        const ust = ara.kategoriler.find((k) => !k.ustId && k.ad === y.ana);
        await yeniKategori(y.alt, yeniAnalar.length + i, ust?.id);
        adim();
      }
    }

    const guncel = await menuGetir();
    const kategoriId = (ana: string, alt: string) => {
      const ust = guncel.kategoriler.find((k) => !k.ustId && k.ad === ana);
      if (!alt) return ust?.id;
      return guncel.kategoriler.find((k) => k.ustId === ust?.id && k.ad === alt)?.id;
    };

    for (const { urun, yerler } of plan.urunler) {
      const idler = yerler.map((y) => kategoriId(y.ana, y.alt)).filter((id) => id != null);
      const hata = await urunKaydet({ ...urun, kategoriIdler: idler });
      if (hata) {
        await yukle();
        return hata;
      }
      adim();
    }

    await yukle();
    const kategoriNotu = plan.yeniKategoriler.length
      ? `, ${plan.yeniKategoriler.length} kategori açıldı`
      : "";
    setBildirim(`${plan.urunler.length} ürün yazıldı${kategoriNotu}`);
  };

  const topluYaz = async (u: TopluUrun[], p: TopluPorsiyon[]) => {
    const hata = await topluKaydet(u, p);
    if (!hata) await yukle();
    return hata;
  };

  // Toplu düzenleme sekmesi kapanınca taslak kaybolur — önce sorulur.
  const gorunumDegis = (yeni: typeof gorunum) => {
    if (gorunum === "toplu" && topluDegisiklik > 0) {
      setOnaySor({
        mesaj: `${topluDegisiklik} üründe kaydedilmemiş değişiklik var. Vazgeçilsin mi?`,
        devam: () => {
          setTopluDegisiklik(0);
          navigate(`/menu/${yeni}`);
        },
      });
      return;
    }
    setTopluDegisiklik(0);
    navigate(`/menu/${yeni}`);
  };

  const yeniUrun = (): MenuUrun => ({
    ...bosMenuAlanlari(),
    ad: "",
    favori: false,
    satistaGorunur: true,
    mutfaktaGorunur: true,
    porsiyonlar: [],
    menuGruplari: [],
    kategoriIdler: secili ? [secili.id] : [],
    kategoriSira: {},
  });

  return (
    <Duzen>
      <div className="sayfa">
        <header className="menu-baslik">
          <h1>Menü Stüdyosu</h1>
          <div className="ms-sekmeler">
            <button className={gorunum === "kategoriler" ? "aktif" : ""} onClick={() => gorunumDegis("kategoriler")}>
              Kategori ve Ürünler
            </button>
            <button className={gorunum === "toplu" ? "aktif" : ""} onClick={() => gorunumDegis("toplu")}>
              Toplu Düzenle
            </button>
            <button className={gorunum === "kampanya" ? "aktif" : ""} onClick={() => gorunumDegis("kampanya")}>
              Kampanyalı Menü
            </button>
            <button className={gorunum === "gruplar" ? "aktif" : ""} onClick={() => gorunumDegis("gruplar")}>
              Seçenek Grupları
            </button>
            <button className={gorunum === "birimler" ? "aktif" : ""} onClick={() => gorunumDegis("birimler")}>
              Birimler
            </button>
            <button className={gorunum === "kdv" ? "aktif" : ""} onClick={() => gorunumDegis("kdv")}>
              KDV
            </button>
            <button className={gorunum === "aktarim" ? "aktif" : ""} onClick={() => gorunumDegis("aktarim")}>
              İçe/Dışa Aktar
            </button>
          </div>
        </header>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : gorunum === "toplu" ? (
          <TopluDuzenle
            urunler={urunler}
            kategoriler={kategoriler}
            birimler={birimler}
            kdvler={kdvler}
            onKaydet={topluYaz}
            onUyari={setUyari}
            onBildirim={setBildirim}
            onDegisiklik={setTopluDegisiklik}
          />
        ) : gorunum === "birimler" ? (
          <BirimlerSekmesi
            key={birimler.map((b) => `${b.id}:${b.ad}:${b.varsayilan}`).join("|")}
            birimler={birimler}
            kullanim={birimKullanimi}
            onKaydet={birimleriYaz}
            onUyari={setUyari}
          />
        ) : gorunum === "kampanya" ? (
          <KampanyaSekmesi
            key={urunler.map((u) => `${u.id}:${u.menuGruplari.length}`).join("|")}
            urunler={urunler}
            birimler={birimler}
            onKaydet={kampanyaKaydet}
            onSil={urunuSil}
            onUyari={setUyari}
          />
        ) : gorunum === "aktarim" ? (
          <AktarSekmesi
            urunler={urunler}
            kategoriler={kategoriler}
            birimler={birimler}
            kdvler={kdvler}
            onKaydet={aktarimYaz}
            onUyari={setUyari}
          />
        ) : gorunum === "kdv" ? (
          <KdvSekmesi
            key={kdvler.map((k) => `${k.id}:${k.ad}:${k.oran}:${k.varsayilan}`).join("|")}
            kdvler={kdvler}
            kullanim={kdvKullanimi}
            onKaydet={kdvYaz}
            onUyari={setUyari}
          />
        ) : gorunum === "gruplar" ? (
          <div className="ms-urunler">
            <div className="ms-urun-ust">
              <h2>Seçenek Grupları</h2>
              <span>{gruplar.length} grup</span>
              <button className="ms-urun-ekle" onClick={() => setGrupPencere({})}><Plus size={15} /> Seçenek Grubu</button>
            </div>

            <div className="menu-urunler">
              {gruplar.map((g) => (
                <div key={g.id} className="menu-urun tiklanir" onClick={() => setGrupPencere({ grup: g })}>
                  <div className="urun-bilgi">
                    <span>{g.ad}</span>
                    <small>
                      {[
                        g.tekli ? "tekli" : "çoklu",
                        g.zorunlu && (g.enAz > 1 ? `en az ${g.enAz}` : "zorunlu"),
                        g.liste.some((s) => s.varsayilan) && "önceden işaretli",
                        `${g.liste.length} seçenek`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                  <button className="menu-urun-sil" onClick={(e) => { e.stopPropagation(); grubuSil(g); }}>
                    <Trash2 size={14} /><span>Sil</span>
                  </button>
                </div>
              ))}
            </div>

            {gruplar.length === 0 && <p className="bos">Henüz seçenek grubu yok</p>}
          </div>
        ) : (
          <div className="ms-duzen">
            <div className="ms-kategoriler">
              <div className="ms-kat-ust">
                <button className="ms-ekle" onClick={() => setPencere({})}><Plus size={15} /> Kategori</button>
                <button
                  className="ms-sirala"
                  title={siralamaBasligi}
                  disabled={siralamaKardesleri.length < 2}
                  onClick={() => setSiralama("kategori")}
                >
                  <ArrowUpDown size={16} />
                </button>
              </div>

              {anaKategoriler.map((k) => {
                const altlar = altKategoriler(kategoriler, k.id);
                return (
                <div key={k.id} className="ms-dal-grup">
                  <div
                    className={k.id === secili?.id ? "ms-kategori aktif" : "ms-kategori"}
                    onClick={() => setSeciliId(k.id)}
                  >
                    <span className="renk-nokta" style={{ background: k.renk }} />
                    <span className="ms-ad">
                      {k.ad}
                      {!k.satistaGorunur && <em className="gizli-im" title="Satışta gizli">gizli</em>}
                    </span>
                    <button
                      className="ms-islem"
                      title="Düzenle"
                      onClick={(e) => { e.stopPropagation(); setPencere({ kategori: k }); }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="ms-islem"
                      title="Sil"
                      onClick={(e) => { e.stopPropagation(); kategoriyiSil(k); }}
                    >
                      <X size={15} />
                    </button>
                    {altlar.length > 0 && (
                      <span
                        className="alt-ac"
                        title={acikGrupId === k.id ? "Alt kategorileri kapat" : "Alt kategorileri aç"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAcikGrupId(acikGrupId === k.id ? null : k.id);
                        }}
                      >
                        <ChevronDown size={18} className={acikGrupId === k.id ? "donuk" : ""} />
                      </span>
                    )}
                  </div>

                  {k.id === acikGrupId &&
                    altlar.map((a) => (
                      <div
                        key={a.id}
                        className={a.id === secili?.id ? "ms-kategori alt aktif" : "ms-kategori alt"}
                        onClick={() => setSeciliId(a.id)}
                      >
                        <span className="ms-dal" />
                        <span className="renk-nokta" style={{ background: a.renk }} />
                        <span className="ms-ad">
                          {a.ad}
                          {!a.satistaGorunur && <em className="gizli-im" title="Satışta gizli">gizli</em>}
                        </span>
                        <button
                          className="ms-islem"
                          title="Düzenle"
                          onClick={(e) => { e.stopPropagation(); setPencere({ kategori: a }); }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="ms-islem"
                          title="Sil"
                          onClick={(e) => { e.stopPropagation(); kategoriyiSil(a); }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                </div>
                );
              })}

              {kategoriler.length === 0 && <p className="bos">Henüz kategori yok</p>}
            </div>

            <div className="ms-urunler">
              {secili || kapsam !== "kategori" ? (
                <>
                  <div className="ms-urun-ust">
                    <h2>{kapsam === "tumu" ? "Tüm ürünler" : kapsam === "kategorisiz" ? "Kategorisiz ürünler" : secili.ad}</h2>
                    <span>
                      {listelenenUrunler.length} {aranan ? "sonuç" : "ürün"}
                    </span>
                    <button
                      className="ms-sirala urun"
                      title={
                        kapsam !== "kategori" || aranan
                          ? "Sıralama tek kategoride ve arama kapalıyken yapılır"
                          : "Ürünleri sırala"
                      }
                      disabled={listelenenUrunler.length < 2 || kapsam !== "kategori" || !!aranan}
                      onClick={() => setSiralama("urun")}
                    >
                      <ArrowUpDown size={15} /> Sırala
                    </button>
                    <button className="ms-urun-ekle" onClick={() => setPanel(yeniUrun())}><Plus size={15} /> Ürün</button>
                  </div>

                  <div className="ms-arama">
                    <div className="arama-kutu">
                      <input
                        value={arama}
                        onChange={(e) => setArama(e.target.value)}
                        placeholder="Ürün adı veya kodu ara"
                      />
                      {arama && (
                        <button className="arama-temizle" onClick={() => setArama("")} title="Temizle">
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    <div className="mod-sec kapsam">
                      <button
                        className={kapsam === "kategori" ? "aktif" : ""}
                        onClick={() => setKapsam("kategori")}
                      >
                        Bu kategori
                      </button>
                      <button
                        className={kapsam === "tumu" ? "aktif" : ""}
                        onClick={() => setKapsam("tumu")}
                      >
                        Tüm kategoriler
                      </button>
                      {kategorisizler.length > 0 && (
                        <button
                          className={kapsam === "kategorisiz" ? "aktif" : ""}
                          onClick={() => setKapsam("kategorisiz")}
                          title="Hiçbir kategoriye bağlı olmayan ürünler — sipariş ekranında görünmezler"
                        >
                          Kategorisiz ({kategorisizler.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="menu-urunler">
                    {listelenenUrunler.map((u) => (
                      <div
                        key={u.id}
                        className={u.id === vurgulu ? "menu-urun tiklanir yeni" : "menu-urun tiklanir"}
                        style={u.renk ? { borderLeft: `4px solid ${u.renk}` } : undefined}
                        onClick={() => setPanel(u)}
                      >
                        <div className="urun-bilgi">
                          <span>
                            {u.favori && <em className="favori-im">★</em>}
                            {u.ad}
                          </span>
                          <small>
                            {[
                              !u.kategoriIdler.length && "kategorisiz",
                              !u.satistaGorunur && "satışta gizli",
                              u.menuGruplari.length > 0 && "menü",
                              u.porsiyonlar.length > 1 && `${u.porsiyonlar.length} porsiyon`,
                              urunGrupIdleri(u).length > 0 && `${urunGrupIdleri(u).length} seçenek`,
                              u.kategoriIdler.length > 1 && `${u.kategoriIdler.length} kategori`,
                            ].filter(Boolean).join(" · ")}
                          </small>
                        </div>
                        <strong>₺{anaFiyat(u)}</strong>
                        <button
                          className="menu-urun-kopya"
                          onClick={(e) => { e.stopPropagation(); urunuKopyala(u); }}
                        >
                          <Copy size={14} /><span>Kopyala</span>
                        </button>
                        <button className="menu-urun-sil" onClick={(e) => { e.stopPropagation(); urunuSil(u); }}>
                          <Trash2 size={14} /><span>Sil</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {listelenenUrunler.length === 0 && (
                    <p className="bos">
                      {aranan ? "Eşleşen ürün yok" : "Bu kategoride ürün yok"}
                    </p>
                  )}
                </>
              ) : (
                <p className="bos">Soldan bir kategori seç</p>
              )}
            </div>
          </div>
        )}
      </div>

      {panel && (
        <UrunPaneli
          urun={panel}
          kategoriler={kategoriler}
          gruplar={gruplar}
          birimler={birimler}
          kdvler={kdvler}
          istasyonlar={istasyonlar}
          onKapat={() => setPanel(null)}
          onKaydet={kaydet}
          onSil={() => urunuSil(panel)}
          onUyari={setUyari}
        />
      )}

      {pencere && (
        <KategoriPenceresi
          kategori={pencere.kategori}
          kategoriler={kategoriler}
          istasyonlar={istasyonlar}
          onKapat={() => setPencere(null)}
          onKaydet={kategoriKaydet}
        />
      )}

      {grupPencere && (
        <GrupPaneli
          grup={grupPencere.grup}
          onKapat={() => setGrupPencere(null)}
          onKaydet={grubuKaydet}
          onSil={grupPencere.grup ? () => grubuSil(grupPencere.grup!) : undefined}
        />
      )}

      {siralama && (
        <SiralamaModal
          baslik={siralama === "kategori" ? siralamaBasligi : `${secili?.ad} — ürün sırası`}
          satirlar={
            siralama === "kategori"
              ? siralamaKardesleri.map((k) => ({ id: k.id, ad: k.ad }))
              : listelenenUrunler.map((u) => ({ id: u.id!, ad: u.ad }))
          }
          onKapat={() => setSiralama(null)}
          onKaydet={siralamaKaydet}
        />
      )}

      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim(null)} />}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}

      {onaySor && (
        <OnayModal
          mesaj={onaySor.mesaj}
          tehlikeli
          onOnay={() => { onaySor.devam(); setOnaySor(null); }}
          onKapat={() => setOnaySor(null)}
        />
      )}
    </Duzen>
  );
}