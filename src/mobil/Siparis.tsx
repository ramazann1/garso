import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CloudOff,
  EllipsisVertical,
  LockKeyhole,
  Merge,
  Minus,
  Printer,
  Plus,
  ReceiptText,
  Search,
  Send,
  StickyNote,
  Users,
  Wallet,
  X,
} from "lucide-react";
import UrunSecim from "../components/UrunSecim";
import TahsilatPanel from "../components/TahsilatPanel";
import KalemIslemleri, { kalemiUygula } from "./KalemIslemleri";
import OnayModal from "../components/OnayModal";
import AltSayfa from "./AltSayfa";
import { agacUrunleri, menuGetir, porsiyonFiyat, urunKdv } from "../menu";
import { bolgeleriGetir, masaGetir } from "../masalar";
import {
  CEVRIMDISI_ADISYON,
  adisyonGetir,
  adisyonIptal,
  adisyonKaydet,
  adisyonOzeti,
  kalemTasi,
  kalemTutari,
  masaBirlestir,
  masaTasi,
  sepetiTazele,
  servisGirdisi,
  tumAdisyonlar,
  yeniKalemId,
} from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { servisEtiketi, servisSatirlari, servisTutarlari, servisVar } from "../servis";
import { kdvDokumu } from "../kdv";
import { adisyonFisiYaz } from "../yazicilar";
import { bekleyenKayit, kuyrugaEkle } from "../kuyruk";
import { useMasayiTut } from "../mesguliyet";
import { useCanli } from "../canli";
import { baglantiHatasi, baglantiVar } from "../baglanti";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import { ayarlar } from "../isletmeAyarlari";
import { yetkiVar } from "../oturum";
import { adetGoster, paraGoster } from "../para";
import { yaziRengi } from "../renk";
import type {
  Bolge,
  MenuKategori,
  MenuKdv,
  MenuSecenekGrubu,
  MenuUrun,
  SepetKalemi,
  Tahsilat,
} from "../types";

// Adisyonun tamamının iptal sebepleri; kasadaki listeyle aynı.
const ADISYON_IPTAL_SEBEPLERI = [
  "Müşteri vazgeçti",
  "Yanlış masaya girildi",
  "Sipariş verilmedi",
  "Deneme kaydı",
];

function anaPorsiyon(u: MenuUrun) {
  return u.porsiyonlar.find((p) => p.varsayilan) ?? u.porsiyonlar[0];
}

/** Ürün tek dokunuşla eklenebiliyor mu — porsiyonu tek ve seçeneği yoksa evet. */
function tekDokunus(u: MenuUrun, gruplar: MenuSecenekGrubu[]) {
  if (u.porsiyonlar.length > 1) return false;
  const p = anaPorsiyon(u);
  return !gruplar.some((g) => p?.grupIdler.includes(g.id));
}

/**
 * Mobil sipariş ekranı.
 *
 * Masaüstü Siparis.tsx'in dar hâli değil, garsonun akışı: ürüne dokunmak
 * doğrudan ekliyor (aynı ürüne tekrar dokunmak adedi artırıyor), sepet altta
 * hep görünüyor ve tek ana düğme var — Gönder. Ödeme kendi penceresinde
 * açılıyor: bilgisayardaki tahsilat penceresinin aynısı.
 */
export default function MobilSiparis() {
  const { masaId: param } = useParams();
  const masaId = Number(param);
  const git = useNavigate();
  const [adres] = useSearchParams();

  const [masaAdi, setMasaAdi] = useState("");
  const [kategoriler, setKategoriler] = useState<MenuKategori[]>([]);
  const [urunler, setUrunler] = useState<MenuUrun[]>([]);
  const [gruplar, setGruplar] = useState<MenuSecenekGrubu[]>([]);
  const [kdvler, setKdvler] = useState<MenuKdv[]>([]);
  const [seciliKategori, setSeciliKategori] = useState<number | null>(null);
  const [arama, setArama] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);

  const [sepet, setSepet] = useState<SepetKalemi[]>([]);
  const [indirim, setIndirim] = useState(0);
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([]);
  const [kisiSayisi, setKisiSayisi] = useState<number | undefined>();
  // Adisyonun kendi bilgileri: adı, notu ve müşterisi. Ürünlerden bağımsız,
  // hesabın kime ait olduğunu anlatıyor; hepsi isteğe bağlı.
  const [bilgi, setBilgi] = useState({ ad: "", not: "", musteriAd: "", musteriTelefon: "" });
  const [bilgiAcik, setBilgiAcik] = useState(false);
  // Kuver ve garsoniye bu hesapta elle eklenmiş ya da kaldırılmış olabilir.
  // Okunup geri yazılmazsa her kayıt kararı siliyor: kasiyerin kaldırdığı kuver
  // garson mobilden ürün ekleyince geri geliyordu.
  const [servis, setServis] = useState<{
    kuverUygula?: boolean | null;
    garsoniyeUygula?: boolean | null;
  }>({});
  const [yukleniyor, setYukleniyor] = useState(true);

  // Tahsilat bilgisayardakiyle aynı pencerede alınıyor. Masalar ekranından
  // "Öde" denince adres ?tahsilat=1 ile geliyor, pencere kendiliğinden açılıyor.
  const [tahsilatAcik, setTahsilatAcik] = useState(false);
  // Pencerede silinen tahsilatların sebebi burada birikip kaydetmeyle gidiyor.
  const silinenTahsilatlar = useRef<{ id: number; sebep?: string }[]>([]);

  const [secimUrunu, setSecimUrunu] = useState<MenuUrun | null>(null);
  const [sepetAcik, setSepetAcik] = useState(false);
  const [islemlerAcik, setIslemlerAcik] = useState(false);
  const [kalemIslem, setKalemIslem] = useState<SepetKalemi | null>(null);
  const [hedefSecim, setHedefSecim] = useState<"tasi" | "birlestir" | null>(null);
  const [iptalSorusu, setIptalSorusu] = useState(false);
  const [kisiSorusu, setKisiSorusu] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Ekran açık kaldığı sürece masa bu kişide görünüyor. Başkası devraldıysa
  // masada kalmanın anlamı yok: pencere kapanınca masalara dönülüyor.
  const devralan = useMasayiTut(masaId);
  const [devralindi, setDevralindi] = useState<string | null>(null);
  useEffect(() => {
    if (devralan) setDevralindi(devralan);
  }, [devralan]);

  // Bekleyen kalemler alt alta sıralandığı için şeridin boyu değişken. Ürün
  // ızgarası altında ne kadar boşluk bırakacağını sabit sayıdan bilemez;
  // şeridin gerçek yüksekliği ölçülüp ekrana yazılıyor.
  const ekran = useRef<HTMLDivElement>(null);
  const serit = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = serit.current;
    if (!el) return;
    const olc = () => ekran.current?.style.setProperty("--serit-boy", el.offsetHeight + "px");
    olc();
    const gozcu = new ResizeObserver(olc);
    gozcu.observe(el);
    return () => gozcu.disconnect();
  });

  // Sunucuya yazılmamış kalem var mı — Gönder düğmesi ve çıkış uyarısı buna bakıyor.
  const baslangicImza = useRef("");
  const bilgiImza = useRef("");
  const kirli =
    JSON.stringify(sepet) !== baslangicImza.current ||
    JSON.stringify(bilgi) !== bilgiImza.current;

  useEffect(() => {
    kilitKur(() => kirli);
    return kilitKaldir;
  }, [kirli]);

  useEffect(() => {
    menuGetir().then((veri) => {
      // Satışta gizlenen kategori ve ürünler sipariş ekranına hiç girmiyor.
      const acik = veri.kategoriler.filter((k) => k.satistaGorunur);
      setKategoriler(acik);
      setUrunler(veri.urunler.filter((u) => u.satistaGorunur));
      setGruplar(veri.gruplar);
      setKdvler(veri.kdvler);
      setSeciliKategori(acik.find((k) => !k.ustId)?.id ?? acik[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    masaGetir(masaId).then((m) => setMasaAdi(m?.ad ?? ""));
  }, [masaId]);

  useEffect(() => {
    const oku = async (): Promise<AdisyonVerisi> => {
      // Kuyrukta bekleyen kayıt sunucudakinden yeni: sunucu onu henüz görmedi.
      const bekleyen = bekleyenKayit({ tip: "masa", masaId });
      if (bekleyen) return bekleyen;
      // Bağlantı yoksa istek atılmıyor; masa boş sayfa gibi açılıyor, girilen
      // sipariş kuyruğa yazılıyor.
      if (!baglantiVar()) return CEVRIMDISI_ADISYON;
      return adisyonGetir(masaId);
    };

    oku().then((veri) => {
      setSepet(veri.sepet);
      setIndirim(veri.indirim);
      setTahsilatlar(veri.tahsilatlar);
      setKisiSayisi(veri.kisiSayisi);
      const okunan = {
        ad: veri.ad ?? "",
        not: veri.not ?? "",
        musteriAd: veri.musteri?.ad ?? "",
        musteriTelefon: veri.musteri?.telefon ?? "",
      };
      setBilgi(okunan);
      bilgiImza.current = JSON.stringify(okunan);
      setServis({ kuverUygula: veri.kuverUygula, garsoniyeUygula: veri.garsoniyeUygula });
      baslangicImza.current = JSON.stringify(veri.sepet);
      if (ayarlar().kisiSayisiZorunlu && !veri.kisiSayisi) setKisiSorusu(true);
      // Masalar ekranından "Öde" ile gelindiyse hesap okunur okunmaz pencere
      // açılıyor: masaya basıp bir de düğmeye basmak gereksiz bir durak.
      if (adres.get("tahsilat") === "1" && yetkiVar("odeme.al")) setTahsilatAcik(true);
      setYukleniyor(false);
    });
  }, [masaId]);

  // Masanın içi de ızgarası gibi canlı: kasadan aynı hesaba ürün eklenirse
  // garson görüyor. Kaydedilmemiş kalemler korunuyor (sepetiTazele), çevrimdışı
  // ya da kuyrukta bekleyen kayıt varsa hiç dokunulmuyor — o sepet sunucununkinden
  // yeni, üstüne bayat veri binmemeli.
  useCanli(["adisyonlar", "adisyon_kalemleri", "tahsilatlar"], () => {
    if (!baglantiVar() || bekleyenKayit({ tip: "masa", masaId })) return;
    adisyonGetir(masaId).then((veri) => {
      setSepet((s) => {
        const yerelDegisiklik = JSON.stringify(s) !== baslangicImza.current;
        // Ekranda bekleyen bir şey yoksa sunucudaki hesap aynen geçerli; imza
        // da onunla güncelleniyor, yoksa dışarıdan gelen kalem "gönderilmemiş"
        // sanılıp Gönder düğmesi boşuna yanıyordu.
        if (!yerelDegisiklik) baslangicImza.current = JSON.stringify(veri.sepet);
        return sepetiTazele(veri.sepet, s, yerelDegisiklik);
      });
      setTahsilatlar(veri.tahsilatlar);
      setIndirim(veri.indirim);
      setServis({ kuverUygula: veri.kuverUygula, garsoniyeUygula: veri.garsoniyeUygula });
    });
  });

  // KDV oranı satış anında kaleme yazılıyor: ürünün grubu sonradan değişse bile
  // kesilmiş adisyonun dökümü oynamasın.
  const ekle = (urun: MenuUrun, fiyat: number, porsiyon?: string, secimler?: string[]) => {
    const anahtar = [urun.ad, porsiyon, ...(secimler ?? [])].join("|");
    const kdvOran = urunKdv(urun, kdvler)?.oran;
    setSepet((s) => {
      // Yalnız bu turun normal satırıyla birleşiyor; kaydedilmiş tura eklenirse
      // ürünün sonradan istendiği kaybolurdu.
      const mevcut = s.find(
        (k) =>
          k.turSira == null &&
          (k.durum ?? "normal") === "normal" &&
          [k.ad, k.porsiyon, ...(k.secimler ?? [])].join("|") === anahtar
      );
      if (mevcut) return s.map((k) => (k === mevcut ? { ...k, adet: k.adet + 1 } : k));
      return [
        ...s,
        {
          id: yeniKalemId(),
          urunId: urun.id,
          ad: urun.ad,
          fiyat,
          adet: 1,
          porsiyon,
          secimler,
          kdvOran,
        },
      ];
    });
  };

  const urunEkle = (u: MenuUrun) => {
    if (!tekDokunus(u, gruplar)) {
      setSecimUrunu(u);
      return;
    }
    const p = anaPorsiyon(u);
    ekle(u, p ? porsiyonFiyat(p, "masa") : 0);
  };

  const adetDegistir = (kalem: SepetKalemi, fark: number) => {
    setSepet((s) =>
      s.map((k) => (k === kalem ? { ...k, adet: k.adet + fark } : k)).filter((k) => k.adet > 0)
    );
  };

  // Masa adı yalnız sayıysa başlıkta tek başına duruyordu — "5" yazan bir
  // ekranda garson nerede olduğunu okumuyor. Adı zaten yazılı olan masalar
  // ("Bahçe 3", "Teras A") olduğu gibi kalıyor.
  const masaBasligi = /^\d+$/.test(masaAdi.trim()) ? `Masa ${masaAdi.trim()}` : masaAdi;

  // Kartın sol kenarındaki şerit: ürünün kendi rengi varsa o, yoksa bağlı
  // olduğu kategorininki. İkisi de yoksa şerit çıkmıyor — boş renk, rastgele
  // renk atamaktan iyi.
  const urunRengi = (u: MenuUrun) =>
    u.renk ??
    kategoriler.find((k) => u.kategoriIdler.includes(k.id) && k.renk)?.renk ??
    "transparent";

  // Şeritte ana kategoriler durur. Üstü satışta gizliyse alt kategori şeride
  // ana kategori gibi girer — kasadaki kural aynen geçerli.
  const anaKategoriler = kategoriler.filter(
    (k) => !k.ustId || !kategoriler.some((x) => x.id === k.ustId)
  );
  const seciliKat = kategoriler.find((k) => k.id === seciliKategori);
  // Alt kategori seçiliyken üst sıradaki vurgu babasında kalıyor: garson hangi
  // ana gruptayım sorusunu kaybetmiyor.
  const acikAna = seciliKat
    ? (anaKategoriler.find((k) => k.id === seciliKat.id) ??
      anaKategoriler.find((k) => k.id === seciliKat.ustId))
    : undefined;
  const altKategoriler = acikAna ? kategoriler.filter((k) => k.ustId === acikAna.id) : [];

  const aranan = arama.trim().toLocaleLowerCase("tr");
  const gosterilen = aranan
    ? urunler.filter(
        (u) =>
          u.ad.toLocaleLowerCase("tr").includes(aranan) ||
          (u.kod ?? "").toLocaleLowerCase("tr").includes(aranan)
      )
    : seciliKategori
      ? agacUrunleri(urunler, kategoriler, seciliKategori).filter((u) => !u.menuGruplari.length)
      : [];

  // Kart rozeti yalnız bu turda girilenleri sayıyor: garson kaç kez bastığını
  // görüyor, gönderince sıfırlanıyor. Saat önce gönderilmiş çay buraya
  // karışırsa rozet "şu an ne giriyorum" sorusuna cevap vermiyor.
  const kartAdetleri = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of sepet) {
      if (k.turSira != null || k.durum === "iptal") continue;
      m[k.ad] = (m[k.ad] ?? 0) + k.adet;
    }
    return m;
  }, [sepet]);

  const adisyon: AdisyonVerisi = {
    sepet,
    indirim,
    tahsilatlar,
    kisiSayisi,
    tip: "masa",
    ad: bilgi.ad,
    not: bilgi.not,
    musteri: { ad: bilgi.musteriAd, telefon: bilgi.musteriTelefon },
    ...servis,
  };
  const ozet = adisyonOzeti(adisyon);
  // Kuver ve garsoniye ürün değil, hesabın kendi bedeli; toplamda görünüp
  // dökümde görünmezse garson farkı nereden çıktı diye kalıyor.
  const servisTutar = servisTutarlari(servisGirdisi(adisyon, Math.max(0, ozet.araToplam - indirim)));
  // Servis bedelini kaldırmak parayı azaltıyor; her garsona açık değil.
  const servisYetkisi = yetkiVar("siparis.servis");
  // Hesabı görmek ayrı, para almak ayrı: yetkisi olmayana ödeme düğmesi hiç
  // çıkmıyor, hesap dökümünü sepet sayfasından okuyor.
  const odemeAlabilir = yetkiVar("odeme.al");
  const servisListesi = servisSatirlari(servisGirdisi(adisyon, Math.max(0, ozet.araToplam - indirim)));
  const kdvSatirlari = kdvDokumu(
    sepet.filter((k) => (k.durum ?? "normal") === "normal"),
    indirim
  );
  // Şeritte gönderilmemiş kalemlerin tamamı duruyor; garson o tura ne girdiğini
  // pencere açmadan görüyor.
  const bekleyenler = sepet.filter((k) => k.turSira == null && k.durum !== "iptal");

  // Kalemler turlara ayrılıyor: hangi ürünün ne zaman istendiği sepette
  // görünsün. Yeni girilenler henüz turu olmayanlar, en altta duruyor.
  const turlar = useMemo(() => {
    const liste: { baslik: string; kalemler: SepetKalemi[] }[] = [];
    for (const k of sepet) {
      const saat = k.turSaat
        ? new Date(k.turSaat).toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit" })
        : "Önceki";
      const baslik =
        k.turSira == null ? "Yeni" : saat + (k.turGarson ? " · " + k.turGarson : "");
      const son = liste[liste.length - 1];
      if (son && son.baslik === baslik) son.kalemler.push(k);
      else liste.push({ baslik, kalemler: [k] });
    }
    // Yeni tur en üstte: garson az önce girdiğini görmek için uzun adisyonu
    // sonuna kadar kaydırmak zorunda kalmasın.
    return liste.sort((a, b) => Number(b.baslik === "Yeni") - Number(a.baslik === "Yeni"));
  }, [sepet]);

  const fisYazdir = async () => {
    setIslemlerAcik(false);
    try {
      const okunan = await adisyonGetir(masaId);
      const adet = await adisyonFisiYaz({ ...okunan, ad: okunan.ad || masaAdi });
      setUyari(
        adet > 0 ? "Fiş yazdırmaya gönderildi." : "Hesap fişi basacak açık bir yazıcı tanımlı değil."
      );
    } catch {
      setUyari("Fiş yazdırmaya gönderilemedi.");
    }
  };

  // Taşıma ve birleştirmede ekranda bekleyen sipariş varsa önce o yazılıyor:
  // yoksa kaydedilmemiş kalemler eski masada kalırdı.
  const masaIslemi = (tip: "tasi" | "birlestir") => {
    setIslemlerAcik(false);
    if (kirli) {
      setUyari("Önce siparişi gönder, sonra masayı taşı.");
      return;
    }
    setHedefSecim(tip);
  };

  const hedefeUygula = async (hedefMasaId: number) => {
    const tip = hedefSecim;
    setHedefSecim(null);
    try {
      if (tip === "tasi") await masaTasi(masaId, hedefMasaId);
      else await masaBirlestir(masaId, hedefMasaId);
      kilitKaldir();
      git("/mobil/masalar");
    } catch (e) {
      setUyari(e instanceof Error ? e.message : "İşlem yapılamadı.");
    }
  };

  /**
   * Tahsilat penceresinden gelen kaydı diske yazar. Sipariş göndermekten farkı
   * ekranda kalması: hesabın parçası alınıp pencere açık kalabiliyor. Bağlantı
   * yoksa kayıt kuyruğa giriyor, para kaybolmuyor.
   */
  const tahsilatYaz = async (
    yeniTahsilatlar: Tahsilat[],
    kapat = false,
    eksik?: AdisyonVerisi["eksik"]
  ) => {
    const silinenler = silinenTahsilatlar.current;
    silinenTahsilatlar.current = [];
    const veri: AdisyonVerisi = {
      ...adisyon,
      tahsilatlar: yeniTahsilatlar,
      eksik,
      ...(silinenler.length ? { silinenTahsilatlar: silinenler } : {}),
    };

    const kuyruga = () => {
      kuyrugaEkle({ tip: "masa", masaId, masaAdi, veri, kapat });
      setTahsilatlar(yeniTahsilatlar);
    };

    if (!baglantiVar()) {
      kuyruga();
      return true;
    }

    try {
      const kayitli = await adisyonKaydet(masaId, veri, kapat);
      // Yeni ödemeler kayıtta kimlik kazanıyor; ekran onları geri almazsa aynı
      // pencereden alınan ikinci ödeme birincisini bir daha yazardı.
      if (!kapat) setTahsilatlar(kayitli.tahsilatlar);
      return true;
    } catch (e) {
      if (baglantiHatasi(e) || !baglantiVar()) {
        kuyruga();
        return true;
      }
      setUyari(e instanceof Error ? e.message : "Kaydedilemedi.");
      return false;
    }
  };

  const gonder = async () => {
    if (ayarlar().kisiSayisiZorunlu && !kisiSayisi) {
      setKisiSorusu(true);
      return;
    }

    setGonderiliyor(true);
    const veri: AdisyonVerisi = { ...adisyon, ...(kisiSayisi ? { kisiSayisi } : {}) };

    // Bağlantının olmadığı biliniyorsa sunucu hiç denenmiyor: kayıt doğrudan
    // kuyruğa giriyor, garson beklemeden diğer masaya geçiyor.
    if (!baglantiVar()) {
      kuyrugaEkle({ tip: "masa", masaId, masaAdi, veri });
      kilitKaldir();
      git("/mobil/masalar");
      return;
    }

    try {
      await adisyonKaydet(masaId, veri);
    } catch (e) {
      // Sebep bağlantıysa sipariş kaybolmuyor, kuyruğa giriyor. Başka bir hata
      // ise garson görsün — sessizce düşmesin.
      if (!baglantiHatasi(e) && baglantiVar()) {
        setGonderiliyor(false);
        setUyari(e instanceof Error ? e.message : "Sipariş gönderilemedi.");
        return;
      }
      kuyrugaEkle({ tip: "masa", masaId, masaAdi, veri });
    }
    kilitKaldir();
    git("/mobil/masalar");
  };

  if (yukleniyor) {
    return (
      <div className="yukleniyor">
        <div className="cember" />
      </div>
    );
  }

  return (
    <div className="m-siparis" ref={ekran}>
      <header className="m-siparis-ust">
        <button className="m-ikon-dugme" onClick={() => git("/mobil/masalar")} aria-label="Geri">
          <ArrowLeft size={20} />
        </button>
        {aramaAcik ? (
          <input
            className="m-arama"
            autoFocus
            value={arama}
            placeholder="Ürün ara"
            onChange={(e) => setArama(e.target.value)}
          />
        ) : (
          <h1>{masaBasligi}</h1>
        )}
        <button
          className="m-ikon-dugme"
          onClick={() => {
            setAramaAcik((a) => !a);
            setArama("");
          }}
          aria-label={aramaAcik ? "Aramayı kapat" : "Ara"}
        >
          {aramaAcik ? <X size={20} /> : <Search size={20} />}
        </button>
        <button
          className="m-ikon-dugme"
          onClick={() => setIslemlerAcik(true)}
          aria-label="Sipariş işlemleri"
        >
          <EllipsisVertical size={20} />
        </button>
      </header>

      {/* Kategoriler kendi renkleriyle tek sırada, yana kayıyor: ızgara ekranın
          üçte birini yiyordu, ürünlere yer kalmıyordu. Alt kategorisi olanın
          yanında ok var; o kategori seçilince altında ikinci sıra açılıyor. */}
      {!aramaAcik && (
        <div className="m-kategoriler">
          {anaKategoriler.map((k) => (
            <button
              key={k.id}
              className={k.id === acikAna?.id ? "m-kategori secili" : "m-kategori"}
              style={{ background: k.renk, color: yaziRengi(k.renk) }}
              onClick={() => setSeciliKategori(k.id)}
            >
              {k.ad}
              {kategoriler.some((x) => x.ustId === k.id) && <ChevronDown size={14} />}
            </button>
          ))}
        </div>
      )}

      {!aramaAcik && altKategoriler.length > 0 && (
        <div className="m-alt-kategoriler">
          {/* Ana kategoriye dönüş: altındakilerin hepsi tek listede görünüyor. */}
          <button
            className={acikAna?.id === seciliKategori ? "m-alt-kategori secili" : "m-alt-kategori"}
            onClick={() => acikAna && setSeciliKategori(acikAna.id)}
          >
            Tümü
          </button>
          {altKategoriler.map((k) => (
            <button
              key={k.id}
              className={k.id === seciliKategori ? "m-alt-kategori secili" : "m-alt-kategori"}
              onClick={() => setSeciliKategori(k.id)}
            >
              {k.ad}
            </button>
          ))}
        </div>
      )}

      <div className="m-urunler">
        {gosterilen.map((u) => {
          const p = anaPorsiyon(u);
          const adet = kartAdetleri[u.ad];
          return (
            <button
              key={u.id}
              className="m-urun"
              style={{ "--urun-renk": urunRengi(u) } as CSSProperties}
              onClick={() => urunEkle(u)}
            >
              <span className="m-urun-ad">{u.ad}</span>
              <span className="m-urun-fiyat">{paraGoster(p ? porsiyonFiyat(p, "masa") : 0)}</span>
              {adet ? <span className="m-urun-rozet">{adet}</span> : null}
            </button>
          );
        })}
        {gosterilen.length === 0 && (
          <div className="m-bos">
            <p>{aranan ? "Ürün bulunamadı." : "Bu kategoride ürün yok."}</p>
          </div>
        )}
      </div>

      {/* Sepet şeridi hep ekranda: garson ne girdiğini görmek için hiçbir yere
          dokunmak zorunda kalmıyor. Şeride dokunmak tam listeyi açıyor. */}
      <div className="m-serit" ref={serit}>
        {/* Gönderilmeyi bekleyen kalemler burada geziniyor: garson pencere
            açmadan o tura ne girdiğini görüyor, sığmayanı parmakla kaydırıyor. */}
        {bekleyenler.length > 0 && (
          <div className="m-serit-bekleyen">
            {bekleyenler.map((k) => (
              <span key={k.id} className="m-bekleyen-cip">
                <b>{adetGoster(k.adet)}×</b> {k.ad}
              </span>
            ))}
          </div>
        )}

        <div className="m-serit-alt">
          <button className="m-serit-ozet" onClick={() => setSepetAcik(true)}>
            <ReceiptText size={18} />
            <span className="m-serit-son">
              {sepet.length > 0 ? sepet.length + " kalem" : "Adisyon boş"}
            </span>
            <span className="m-serit-tutar">{paraGoster(ozet.toplam)}</span>
            <ChevronUp size={16} />
          </button>
          {/* Gönderilecek bir şey yokken düğme sönük durup yer kaplıyordu.
              O hâlde garsonun sıradaki işi hesap: düğme adisyon ekranına
              geçiyor, yeni ürün girilince tekrar Gönder oluyor. */}
          {kirli ? (
            <button className="m-gonder" disabled={gonderiliyor} onClick={gonder}>
              {baglantiVar() ? <Send size={18} /> : <CloudOff size={18} />}
              Gönder
            </button>
          ) : (
            sepet.length > 0 && odemeAlabilir && (
              <button className="m-gonder" onClick={() => setTahsilatAcik(true)}>
                <Wallet size={18} />
                Öde
              </button>
            )
          )}
        </div>
      </div>

      {sepetAcik && (
        <AltSayfa ek="m-adisyon-sayfa" onKapat={() => setSepetAcik(false)}>
          {(kapat) => (
            <>
              <header className="m-sayfa-ust">
                <h2>
                  <ReceiptText size={18} /> Adisyon
                </h2>
                <button className="m-ikon-dugme" onClick={kapat} aria-label="Kapat">
                  <X size={20} />
                </button>
              </header>

              <div className="m-sayfa-icerik">
                {sepet.length === 0 && (
                  <div className="m-bos">
                    <p>Sepet boş.</p>
                  </div>
                )}
                {turlar.map((tur, i) => (
                  <div key={i} className="m-tur">
                    <div className={tur.baslik === "Yeni" ? "m-tur-baslik yeni" : "m-tur-baslik"}>
                      <span>{tur.baslik}</span>
                    </div>
                    {tur.kalemler.map((k) => (
                      // Kaleme dokunmak işlem sayfasını açıyor: adet, not, ikram,
                      // indirim, iptal ve taşıma orada. Yanındaki artı/eksi yeni
                      // girilen satırın adedini hızlı değiştirmek için duruyor.
                      <div
                        key={k.id}
                        className={
                          (k.durum ?? "normal") === "normal" ? "m-kalem" : `m-kalem ${k.durum}`
                        }
                        onClick={() => setKalemIslem(k)}
                      >
                        <span className="m-kalem-adet">{adetGoster(k.adet)}</span>
                        <span className="m-kalem-ad">
                          {k.ad}
                          {!!(k.porsiyon || k.secimler?.length || k.not) && (
                            <small>
                              {[k.porsiyon, ...(k.secimler ?? []), k.not].filter(Boolean).join(" · ")}
                            </small>
                          )}
                        </span>
                        <span className="m-kalem-tutar">
                          {(k.durum ?? "normal") !== "normal"
                            ? k.durum === "ikram" ? "İkram" : "İptal"
                            : paraGoster(kalemTutari(k))}
                        </span>
                        {k.turSira == null && (
                          <div className="m-adet" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => adetDegistir(k, -1)} aria-label="Azalt">
                              <Minus size={16} />
                            </button>
                            <button onClick={() => adetDegistir(k, 1)} aria-label="Artır">
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="m-dokum">
                {/* Ara toplam yalnız üstüne bir şey binmişse yazılıyor; hiçbiri
                    yoksa tek satırlık toplam zaten yeterli. */}
                {(servisTutar.toplam > 0 ||
                  (servisVar() && servisYetkisi) ||
                  indirim > 0 ||
                  ozet.kdv > 0) && (
                  <>
                    <div className="m-dokum-satir">
                      <span>Ara toplam</span>
                      <span>{paraGoster(ozet.araToplam)}</span>
                    </div>
                    {indirim > 0 && (
                      <div className="m-dokum-satir">
                        <span>İndirim</span>
                        <span>-{paraGoster(indirim)}</span>
                      </div>
                    )}
                    {servisVar() &&
                      (["kuver", "garsoniye"] as const).map((hangi) => {
                        const tanim = ayarlar()[hangi];
                        if (tanim.deger <= 0) return null;

                        // Hesapta duruyor mu: kararı verilmişse o, verilmemişse
                        // ayarın dediği. Mobilde sipariş her zaman masaya girilir.
                        const alan = hangi === "kuver" ? "kuverUygula" : "garsoniyeUygula";
                        const acik = servis[alan] ?? tanim.otomatik;
                        const tutar =
                          hangi === "kuver" ? servisTutar.kuver : servisTutar.garsoniye;

                        if (!acik) {
                          return servisYetkisi ? (
                            <button
                              key={hangi}
                              className="m-dokum-satir m-servis-ekle"
                              onClick={() => setServis((s) => ({ ...s, [alan]: true }))}
                            >
                              <span>
                                <Plus size={15} /> {tanim.ad} ekle
                              </span>
                              <span>{servisEtiketi(tanim)}</span>
                            </button>
                          ) : null;
                        }

                        return (
                          <div key={hangi} className="m-dokum-satir">
                            <span>
                              {tanim.ad}
                              {hangi === "kuver" && tanim.tip === "tutar" && (
                                <em className="m-servis-not">
                                  {kisiSayisi
                                    ? ` · ${kisiSayisi} kişi`
                                    : " · misafir sayısı girilmedi"}
                                </em>
                              )}
                            </span>
                            <span className="m-servis-tutar">
                              {paraGoster(tutar)}
                              {servisYetkisi && (
                                <button
                                  className="m-servis-cikar"
                                  title={`${tanim.ad} kaldır`}
                                  onClick={() => setServis((s) => ({ ...s, [alan]: false }))}
                                >
                                  <X size={15} />
                                </button>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    {ozet.kdv > 0 && (
                      <div className="m-dokum-satir">
                        <span>KDV</span>
                        <span>{paraGoster(ozet.kdv)}</span>
                      </div>
                    )}
                    {/* Bu hesaptan alınmış ödemeler: "ne kadar tahsil edilmiş"
                        sorusu için tahsilat penceresini açmak gerekmiyor. */}
                    {tahsilatlar.length > 0 && (
                      <>
                        {tahsilatlar.map((o, i) => (
                          <div key={i} className="m-dokum-satir odendi">
                            <span>{o.tip}</span>
                            <span>
                              {paraGoster(o.tutar)}
                              {o.bahsis ? <em> +{paraGoster(o.bahsis)} bahşiş</em> : null}
                            </span>
                          </div>
                        ))}
                        <div className="m-dokum-satir kalan">
                          <span>Kalan</span>
                          <span>{paraGoster(Math.max(0, ozet.kalan))}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="m-sayfa-alt m-toplam-alt">
                <div className="m-toplam">
                  <span>Toplam</span>
                  <strong>{paraGoster(ozet.toplam)}</strong>
                </div>
                {/* Gönderilmemiş kalem varken düğme Gönder: o hâlde ödemeye
                    geçilemiyordu zaten, garsona uyarı verip geri çevirmek yerine
                    yapması gereken işi doğrudan sunuyor. Kaydedilmemiş sipariş
                    ödeme ekranında görünmez, eksik tutar tahsil edilirdi.

                    Sepet boşken ikisi de yok: gönderilecek ya da ödenecek bir şey
                    olmadan düğme yer kaplıyordu. */}
                {kirli ? (
                  <button className="m-dugme" disabled={gonderiliyor} onClick={gonder}>
                    {baglantiVar() ? <Send size={18} /> : <CloudOff size={18} />}
                    Gönder
                  </button>
                ) : (
                  sepet.length > 0 && odemeAlabilir && (
                    <button className="m-dugme" onClick={() => setTahsilatAcik(true)}>
                      <Wallet size={18} />
                      Öde
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </AltSayfa>
      )}

      {/* Siparişin kendi işlemleri: masaya girdikten sonra da misafir sayısı
          değişebiliyor, hesap fişi istenebiliyor. */}
      {islemlerAcik && (
        <AltSayfa kisa onKapat={() => setIslemlerAcik(false)}>
          {(kapat) => (
            <>
              <span className="m-tutamak" />

              <header className="m-islem-ust">
                <span>
                  <strong className="m-islem-masa">{masaAdi}</strong>
                  <span className="m-islem-ozet">
                    <strong>{paraGoster(ozet.toplam)}</strong>
                    {!!kisiSayisi && (
                      <>
                        ·
                        <Users size={13} />
                        {kisiSayisi}
                      </>
                  )}
                    {sepet.length > 0 && <>· {sepet.length} kalem</>}
                  </span>
                </span>
                <button className="m-islem-kapat" onClick={kapat} aria-label="Kapat">
                  <X size={19} />
                </button>
              </header>

              <div className="m-islemler">
                <button
                  className="m-islem m-islem-kisi"
                  onClick={() => {
                    setIslemlerAcik(false);
                    setKisiSorusu(true);
                  }}
                >
                  <span className="m-islem-ikon">
                    <Users size={19} />
                  </span>
                  Misafir sayısı{kisiSayisi ? ` · ${kisiSayisi}` : ""}
                </button>
                <button
                  className="m-islem m-islem-not"
                  onClick={() => {
                    setIslemlerAcik(false);
                    setBilgiAcik(true);
                  }}
                >
                  <span className="m-islem-ikon">
                    <StickyNote size={19} />
                  </span>
                  Adisyon bilgileri
                  {bilgi.ad || bilgi.musteriAd ? <em>{bilgi.ad || bilgi.musteriAd}</em> : null}
                </button>
                <button
                  className="m-islem m-islem-not"
                  onClick={() => {
                    setIslemlerAcik(false);
                    setSepetAcik(true);
                  }}
                >
                  <span className="m-islem-ikon">
                    <ReceiptText size={19} />
                  </span>
                  Adisyonu gör
                </button>
                {odemeAlabilir && (
                <button
                  className="m-islem m-islem-ode"
                  onClick={() => {
                    if (kirli) {
                      setIslemlerAcik(false);
                      setUyari("Önce siparişi gönder, sonra hesabı kapat.");
                      return;
                    }
                    setIslemlerAcik(false);
                    setTahsilatAcik(true);
                  }}
                >
                  <span className="m-islem-ikon">
                    <Wallet size={19} />
                  </span>
                  Öde
                </button>
                )}

                {yetkiVar("siparis.fis_yazdir") && (
                  <button className="m-islem m-islem-yazdir" onClick={fisYazdir}>
                    <span className="m-islem-ikon">
                      <Printer size={19} />
                    </span>
                    Hesap fişi yazdır
                  </button>
                )}

                {/* Taşıma ve birleştirme sunucu işi: ekranda bekleyen sipariş
                    varsa önce o gitmeli, yoksa taşınan masada görünmez. */}
                {yetkiVar("siparis.tasi") && (
                  <>
                    <button
                      className="m-islem m-islem-tasi"
                      onClick={() => masaIslemi("tasi")}
                    >
                      <span className="m-islem-ikon">
                        <ArrowRightLeft size={19} />
                      </span>
                      Masayı taşı
                    </button>
                    <button
                      className="m-islem m-islem-tasi"
                      onClick={() => masaIslemi("birlestir")}
                    >
                      <span className="m-islem-ikon">
                        <Merge size={19} />
                      </span>
                      Masaları birleştir
                    </button>
                  </>
              )}

                {yetkiVar("siparis.iptal") && sepet.some((k) => k.turSira != null) && (
                  <>
                    <span className="m-islem-ayirici" />
                    <button
                      className="m-islem m-islem-iptal"
                      onClick={() => setIptalSorusu(true)}
                    >
                      <span className="m-islem-ikon">
                        <Ban size={19} />
                      </span>
                      Adisyonu iptal et
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </AltSayfa>
      )}

      {/* Adisyonun kendi bilgileri. Kaydedilen değer ekranda duruyor, diske
          Gönder ile gidiyor — bu ekranda sepet de öyle çalışıyor. */}
      {bilgiAcik && (
        <AdisyonBilgiSayfasi
          bilgi={bilgi}
          masaBasligi={masaBasligi}
          onKapat={() => setBilgiAcik(false)}
          onKaydet={(yeni) => {
            setBilgi(yeni);
            setBilgiAcik(false);
          }}
        />
      )}

      {hedefSecim && (
        <MasaHedefi
          tip={hedefSecim}
          masaId={masaId}
          onKapat={() => setHedefSecim(null)}
          onSec={hedefeUygula}
        />
      )}

      {iptalSorusu && (
        <OnayModal
          baslik="Adisyonu iptal et"
          ikon={<Ban size={20} />}
          mesaj={`${masaAdi} masasının hesabı iptal edilecek. Ciroya yazılmaz; kayıt silinmez, iptal olarak durur. Sebebi nedir?`}
          tehlikeli
          sebepler={ADISYON_IPTAL_SEBEPLERI}
          onayMetni="Evet, iptal et"
          onOnay={async (sebep) => {
            setIptalSorusu(false);
            try {
              const acik = await adisyonGetir(masaId);
              if (!acik.id) throw new Error("Bu masada açık adisyon yok.");
              await adisyonIptal(acik.id, sebep ?? "");
              kilitKaldir();
              git("/mobil/masalar");
            } catch (e) {
              setUyari(e instanceof Error ? e.message : "Adisyon iptal edilemedi.");
            }
          }}
          onKapat={() => setIptalSorusu(false)}
        />
      )}

      {/* Sepetteki kalemin işlemleri. Değişiklik ekrandaki sepete uygulanıyor,
          diske Gönder ile gidiyor — bu ekranın kuralı bu. */}
      {kalemIslem && (
        <KalemIslemleri
          kalem={kalemIslem}
          tasinabilir={!!kalemIslem.id && kalemIslem.id > 0}
          onKapat={() => setKalemIslem(null)}
          onUygula={(yeni) => {
            setKalemIslem(null);
            setSepet((s) => kalemiUygula(s, kalemIslem, yeni));
          }}
          onTasi={async (hedefMasaId, adet) => {
            const kalemId = kalemIslem.id!;
            setKalemIslem(null);
            try {
              // Taşıma sunucu işi: önce ekrandaki sipariş yazılıyor, sonra
              // kalem gidiyor, sonra masa yeniden okunuyor.
              await adisyonKaydet(masaId, adisyon);
              await kalemTasi(masaId, hedefMasaId, kalemId, adet);
              const guncel = await adisyonGetir(masaId);
              setSepet(guncel.sepet);
              baslangicImza.current = JSON.stringify(guncel.sepet);
            } catch (e) {
              setUyari(e instanceof Error ? e.message : "Kalem taşınamadı.");
            }
          }}
        />
      )}

      {tahsilatAcik && (
        <TahsilatPanel
          kalemler={sepet}
          toplam={ozet.toplam}
          araToplam={ozet.araToplam}
          indirim={indirim}
          servis={servisListesi}
          kdvSatirlari={kdvSatirlari}
          kayitliTahsilatlar={tahsilatlar}
          musteri={bilgi.musteriAd || bilgi.ad}
          onKapat={() => setTahsilatAcik(false)}
          onKaydet={(t) => tahsilatYaz(t)}
          onSil={(id, sebep) => silinenTahsilatlar.current.push({ id, sebep })}
          onIndirimDegis={(tutar) => setIndirim(tutar)}
          onKalemIndirim={(paylar, kaynak) =>
            setSepet((s) =>
              s.map((k) =>
                k.id != null && paylar[k.id] != null
                  ? { ...k, indirim: paylar[k.id], indirimTanimId: kaynak?.id, indirimAd: kaynak?.ad }
                  : k
              )
            )
          }
          onOdendi={async (t, eksik) => {
            setTahsilatAcik(false);
            if (await tahsilatYaz(t, true, eksik)) {
              kilitKaldir();
              git("/mobil/masalar");
            }
          }}
        />
      )}

      {secimUrunu && (
        <UrunSecim
          urun={secimUrunu}
          gruplar={gruplar}
          onEkle={(porsiyon, fiyat, secimler) => {
            ekle(secimUrunu, fiyat, porsiyon, secimler.length ? secimler : undefined);
            setSecimUrunu(null);
          }}
          onKapat={() => setSecimUrunu(null)}
        />
      )}

      {kisiSorusu && (
        <MisafirSorusu
          onKaydet={(sayi) => {
            setKisiSayisi(sayi);
            setKisiSorusu(false);
          }}
          onVazgec={() => {
            kilitKaldir();
            git("/mobil/masalar");
          }}
        />
      )}

      {devralindi && (
        <OnayModal
          tekTus
          baslik="Masa devralındı"
          ikon={<LockKeyhole size={20} />}
          mesaj={`${devralindi} bu masayı devraldı, masadan çıkılıyor.${
            kirli ? " Gönderilmemiş ürünlerin kaydedilmedi." : ""
          }`}
          onayMetni="Tamam"
          onKapat={() => {
            // Çıkış kilidi kaydedilmemiş kalem için soru soruyor; burada karar
            // zaten verilmiş, ikinci pencere gereksiz.
            kilitKaldir();
            git("/mobil/masalar");
          }}
        />
      )}

      {uyari && <OnayModal tekTus mesaj={uyari} onKapat={() => setUyari(null)} />}
    </div>
  );
}

/**
 * Misafir sayısı zorunluysa masaya girer girmez soruluyor. Kuver hesabı buna
 * bağlı; sonradan sorulursa tutar bir süre yanlış görünüyor.
 *
 * Kasadaki `MisafirSayisi` ile aynı desen: kalabalık masa nadir olduğu için
 * hazır rakamlar tek dokunuşa yetiyor, daha fazlası alttaki kutuya yazılıyor.
 * Sayaçtan vazgeçildi — altı kişilik masada altı kez bastırıyordu.
 *
 * Sağ üstteki çarpı salona döndürüyor: sayı verilmeden bu masada satış
 * yapılamadığı için garsonun tek çıkışı buydu, yoksa pencerede kilitli kalıyor.
 */
function MisafirSorusu({
  onKaydet,
  onVazgec,
}: {
  onKaydet: (sayi: number) => void;
  onVazgec: () => void;
}) {
  const [digeri, setDigeri] = useState("");
  const sayi = Number(digeri);

  return (
    <div className="m-perde">
      <div className="m-sayfa kisa m-misafir">
        <header className="m-sayfa-ust">
          <h2>
            <Users size={18} /> Misafir Sayısı ?
          </h2>
          <button className="m-ikon-dugme" onClick={onVazgec} aria-label="Salona dön">
            <X size={20} />
          </button>
        </header>

        <div className="m-misafir-tuslar">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button key={n} onClick={() => onKaydet(n)}>
              {n}
            </button>
          ))}
        </div>

        <div className="m-misafir-diger">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Daha kalabalık"
            value={digeri}
            onChange={(e) => setDigeri(e.target.value)}
          />
          <button disabled={!(sayi >= 1)} onClick={() => onKaydet(sayi)} aria-label="Onayla">
            <Check size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Taşıma ve birleştirme için hedef masa seçimi. Taşımada boş, birleştirmede
 * dolu masalar listeleniyor — yanlış hedefi baştan eliyor.
 */
function MasaHedefi({
  tip,
  masaId,
  onKapat,
  onSec,
}: {
  tip: "tasi" | "birlestir";
  masaId: number;
  onKapat: () => void;
  onSec: (hedefMasaId: number) => void;
}) {
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [dolular, setDolular] = useState<Set<number>>(new Set());
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    Promise.all([bolgeleriGetir(), tumAdisyonlar()]).then(([b, a]) => {
      setBolgeler(b);
      setDolular(new Set(Object.keys(a).map(Number)));
      setYukleniyor(false);
    });
  }, []);

  const secilebilirler = bolgeler.flatMap((b) =>
    b.masalar
      .filter((m) => m.aktif && m.id !== masaId && (tip === "tasi" ? !dolular.has(m.id) : dolular.has(m.id)))
      .map((m) => ({ masa: m, bolge: b.ad }))
  );

  return (
    <div className="m-perde" onClick={onKapat}>
      <div className="m-sayfa" onClick={(e) => e.stopPropagation()}>
        <header className="m-sayfa-ust">
          <h2>{tip === "tasi" ? "Hangi masaya taşınsın?" : "Hangi masayla birleşsin?"}</h2>
          <button className="m-ikon-dugme" onClick={onKapat} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>
        <div className="m-sayfa-icerik">
          {yukleniyor ? (
            <div className="yukleniyor"><div className="cember" /></div>
          ) : secilebilirler.length === 0 ? (
            <div className="m-bos">
              <p>{tip === "tasi" ? "Boş masa yok." : "Birleştirilecek dolu masa yok."}</p>
            </div>
          ) : (
            <div className="m-liste">
              {secilebilirler.map(({ masa, bolge }) => (
                <button key={masa.id} className="m-satir" onClick={() => onSec(masa.id)}>
                  <span>
                    {masa.ad}
                    <small>{bolge}</small>
                  </span>
                  <ChevronRight size={18} className="m-satir-ok" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type AdisyonBilgisi = { ad: string; not: string; musteriAd: string; musteriTelefon: string };

/**
 * Adisyonun kendi bilgileri — kasadaki AdisyonBilgi panelinin mobil karşılığı.
 * Ürünlerden bağımsız: hesabın adı, mutfağa değil hesaba yazılan notu ve
 * müşterisi. Hepsi isteğe bağlı, sade satışta hiçbiri doldurulmuyor.
 */
function AdisyonBilgiSayfasi({
  bilgi,
  masaBasligi,
  onKapat,
  onKaydet,
}: {
  bilgi: AdisyonBilgisi;
  masaBasligi: string;
  onKapat: () => void;
  onKaydet: (bilgi: AdisyonBilgisi) => void;
}) {
  const [ad, setAd] = useState(bilgi.ad);
  const [not, setNot] = useState(bilgi.not);
  const [musteriAd, setMusteriAd] = useState(bilgi.musteriAd);
  const [musteriTelefon, setMusteriTelefon] = useState(bilgi.musteriTelefon);

  return (
    <div className="m-perde" onClick={onKapat}>
      <div className="m-sayfa" onClick={(e) => e.stopPropagation()}>
        <header className="m-sayfa-ust">
          <h2>
            <StickyNote size={18} /> {masaBasligi}
          </h2>
          <button className="m-ikon-dugme" onClick={onKapat} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>

        <div className="m-sayfa-icerik m-bilgi-form">
          <label className="m-alan">
            <span>Adisyon adı</span>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Örn. Doğum günü"
            />
          </label>

          <label className="m-alan">
            <span>Hesap notu</span>
            <textarea
              rows={3}
              value={not}
              onChange={(e) => setNot(e.target.value)}
              placeholder="Fişe ve rapora yazılır"
            />
          </label>

          <label className="m-alan">
            <span>Müşteri adı</span>
            <input value={musteriAd} onChange={(e) => setMusteriAd(e.target.value)} />
          </label>

          <label className="m-alan">
            <span>Telefon</span>
            <input
              inputMode="tel"
              value={musteriTelefon}
              onChange={(e) => setMusteriTelefon(e.target.value)}
            />
          </label>
        </div>

        <div className="m-sayfa-alt">
          <button
            className="m-ode-btn"
            onClick={() => onKaydet({ ad, not, musteriAd, musteriTelefon })}
          >
            <Check size={18} />
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
