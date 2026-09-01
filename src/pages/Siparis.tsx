import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronDown,
  CloudOff,
  LockKeyhole,
  Percent,
  Pencil,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  StickyNote,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { menuGetir, agacUrunleri, altKategoriler, porsiyonFiyat, urunKdv } from "../menu";
import {
  CEVRIMDISI_ADISYON,
  adisyonGetir,
  adisyonKaydet,
  kalemTasi,
  kalemTutari,
  masasizGetir,
  masasizKaydet,
  sepetiTazele,
  yeniKalemId,
  yeniTahsilat,
} from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { masaGetir } from "../masalar";
import UrunSecim from "../components/UrunSecim";
import KampanyaSecim from "../components/KampanyaSecim";
import TahsilatPanel from "../components/TahsilatPanel";
import HizliOde from "../components/HizliOde";
import IndirimModal from "../components/IndirimModal";
import { indirimYapabilir, yetkiVar } from "../oturum";
import { servisEtiketi, servisSatirlari, servisTutarlari, servisVar } from "../servis";
import KdvDokum from "../components/KdvDokum";
import OnayModal from "../components/OnayModal";
import KalemPaneli from "../components/KalemPaneli";
import AdisyonBilgi from "../components/AdisyonBilgi";
import MisafirSayisi from "../components/MisafirSayisi";
import type { AdisyonBilgisi } from "../components/AdisyonBilgi";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import { baglantiHatasi, baglantiVar, hataMesaji } from "../baglanti";
import { bekleyenKayit, kuyrugaEkle } from "../kuyruk";
import { hesapKopyasiOku, hesapKopyasiSil, kopyaSaati } from "../hesapKopyasi";
import type { KuyrukIsi } from "../kuyruk";
import { kdvDokumu } from "../kdv";
import { adetGoster, paraGoster } from "../para";
import { useMasayiTut } from "../mesguliyet";
import { useCanli } from "../canli";
import { ayarlar } from "../isletmeAyarlari";
import type { IndirimKaynagi } from "../indirimler";
import type {
  MenuKategori,
  MenuKdv,
  MenuSecenekGrubu,
  MenuUrun,
  SepetKalemi,
  SiparisTuru,
  Tahsilat,
} from "../types";

/** Kuver ve garsoniyenin bu adisyondaki durumu; ikisi birlikte taşınıyor. */
type ServisDurumu = { kuver?: boolean | null; garsoniye?: boolean | null };

// Adisyonun kaydedilmiş hâliyle karşılaştırmak için sadeleştirilmiş imzası.
function adisyonImzasi(
  sepet: SepetKalemi[],
  indirim: number,
  tahsilatlar: Tahsilat[],
  bilgi: AdisyonBilgisi = {},
  servis: ServisDurumu = {}
) {
  return JSON.stringify({
    sepet: sepet.map((k) => [k.id, k.adet, k.fiyat, k.durum ?? "normal", k.indirim ?? 0]),
    indirim,
    tahsilat: tahsilatlar.map((t) => [t.tip, t.tutar]),
    bilgi: [bilgi.ad ?? "", bilgi.kisiSayisi ?? 0, bilgi.not ?? "", bilgi.musteriAd ?? "", bilgi.musteriTelefon ?? ""],
    servis: [servis.kuver ?? null, servis.garsoniye ?? null],
  });
}

// Adisyon satırından ekranın kullandığı bilgi kutusu.
function adisyondanBilgi(veri: AdisyonVerisi): AdisyonBilgisi {
  return {
    ad: veri.ad,
    kisiSayisi: veri.kisiSayisi,
    not: veri.not,
    musteriAd: veri.musteri?.ad,
    musteriTelefon: veri.musteri?.telefon,
  };
}

const adisyondanServis = (veri: AdisyonVerisi): ServisDurumu => ({
  kuver: veri.kuverUygula ?? null,
  garsoniye: veri.garsoniyeUygula ?? null,
});

// Aynı ürünün aynı durumdaki satırları tek satırda toplanır — ikram veya iptal
// geri alınınca adisyon yeniden sadeleşsin. Ödemesi işlenmiş kalem birleşmez;
// birleşseydi ödenen adet başka kaleme yazılırdı.
function satirlariBirlestir(sepet: SepetKalemi[], odenmisIdler: Set<number>) {
  // Tur da anahtara giriyor: aynı ürün ikinci turda tekrar istendiyse iki satır
  // kalmalı, yoksa sepette hangi turda ne geldiği kaybolur.
  const anahtar = (k: SepetKalemi) =>
    [
      k.durum ?? "normal",
      k.turSira ?? "yeni",
      k.ad,
      k.porsiyon,
      k.fiyat,
      k.indirim ?? 0,
      k.not,
      ...(k.secimler ?? []),
    ].join("|");

  const sonuc: SepetKalemi[] = [];
  for (const k of sepet) {
    const es =
      !odenmisIdler.has(k.id ?? 0) &&
      sonuc.find((x) => anahtar(x) === anahtar(k) && !odenmisIdler.has(x.id ?? 0));
    if (es) es.adet += k.adet;
    else sonuc.push({ ...k });
  }
  return sonuc;
}

// Masa siparişi ekranı — fiyat kuralı tek yerden (porsiyonFiyat) geçiyor.
function anaFiyat(u: MenuUrun, tur: SiparisTuru = "masa") {
  const p = u.porsiyonlar.find((x) => x.varsayilan) ?? u.porsiyonlar[0];
  return p ? porsiyonFiyat(p, tur) : 0;
}

export default function Siparis() {
  // Ekran iki yoldan açılıyor: masadan (/siparis/:masaId) ve masasız gel al /
  // paket adisyonundan (/adisyon/:adisyonId). Okuma-yazma bu ayrımdan geçiyor,
  // gerisi aynı ekran.
  const { masaId: masaIdParam, adisyonId: adisyonIdParam } = useParams();
  const masasiz = adisyonIdParam != null;
  const masaId = Number(masaIdParam);
  const adisyonId = Number(adisyonIdParam);
  const [masaAdi, setMasaAdi] = useState("");
  const [masasizBilgi, setMasasizBilgi] = useState<AdisyonVerisi | null>(null);

  // Ürünün gel al / paket fiyatı tanımlıysa o kullanılıyor; tanımlı değilse
  // porsiyonFiyat zaten tek fiyata düşüyor.
  const siparisTuru: SiparisTuru = masasiz
    ? masasizBilgi?.tip === "paket"
      ? "paket"
      : "gelal"
    : "masa";

  // Kuyrukta bekleyen kayıt varsa ekran onu gösteriyor: o sepet sunucudakinden
  // yeni, sunucu henüz görmedi bile. Gönderilince kuyruktan düşüyor ve okuma
  // yeniden sunucuya dönüyor.
  const hedef = masasiz
    ? ({ tip: "masasiz", adisyonId } as const)
    : ({ tip: "masa", masaId } as const);

  const adisyonuOku = async (): Promise<AdisyonVerisi> => {
    const bekleyen = bekleyenKayit(hedef);
    if (bekleyen) return bekleyen;
    // Bağlantı yoksa istek atılmıyor: cevapsız isteği beklemek ekranı
    // saniyelerce halkada tutuyordu. Cihazda hesabın kopyası varsa açılıyor —
    // ödeme alınabilmesi buna bağlı; yoksa masa boş sayfa gibi açılıyor ve
    // girilen sipariş kuyruğa yazılıyor.
    if (!baglantiVar()) {
      const kopya = hesapKopyasiOku(hedef);
      setKopyaZamani(kopya?.zaman ?? null);
      return kopya?.veri ?? CEVRIMDISI_ADISYON;
    }
    setKopyaZamani(null);
    return masasiz ? masasizGetir(adisyonId) : adisyonGetir(masaId);
  };
  const navigate = useNavigate();
  const [kategoriler, setKategoriler] = useState<MenuKategori[]>([]);
  const [urunler, setUrunler] = useState<MenuUrun[]>([]);
  // Menü içeriğindeki ürünler satışta gizli olabilir; adları yine de gösterilmeli.
  const [tumUrunler, setTumUrunler] = useState<MenuUrun[]>([]);
  const [gruplar, setGruplar] = useState<MenuSecenekGrubu[]>([]);
  const [kdvler, setKdvler] = useState<MenuKdv[]>([]);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [menuYukleniyor, setMenuYukleniyor] = useState(true);
  const [sepet, setSepet] = useState<SepetKalemi[]>([]);
  const [indirim, setIndirim] = useState(0);
  // İndirim ön tanımlıysa kaynağı da taşınıyor; rapor hangi indirim olduğunu görecek.
  const [indirimTanim, setIndirimTanim] = useState<IndirimKaynagi | undefined>();
  const [kayitliTahsilatlar, setKayitliTahsilatlar] = useState<Tahsilat[]>([]);
  // Ekran çevrimdışı açıldıysa hesap cihazdaki kopyadan geliyor; kopyanın
  // saati şeritte yazıyor, ödeme alan kişi bayatlığı bilerek alsın.
  const [kopyaZamani, setKopyaZamani] = useState<number | null>(null);
  // Ekrandan kaldırılan ama henüz kaydedilmemiş tahsilatların sebepleri;
  // ilk kayıtta denetim defterine gidiyorlar.
  const silinenTahsilatlar = useRef<{ id: number; sebep?: string }[]>([]);
  const [secimUrunu, setSecimUrunu] = useState<MenuUrun | null>(null);
  const [kampanyaUrunu, setKampanyaUrunu] = useState<MenuUrun | null>(null);
  // Şeridin üstündeki kategori dışı listeler; ikisi de kategoriyle aynı anda açık olmaz.
  const [ozelListe, setOzelListe] = useState<"kampanya" | "favori" | null>(null);
  // Alt kategoriler kendiliğinden açılmaz; oktan açılır ve aynı anda tek dal açık kalır.
  const [acikGrupId, setAcikGrupId] = useState<number | null>(null);
  const [arama, setArama] = useState("");
  const [tahsilatAcik, setTahsilatAcik] = useState(false);
  const [hizliAcik, setHizliAcik] = useState(false);
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  // Kaydedilmiş hâlin imzası; değişince çıkışta uyarı çıkıyor.
  const [kayitliImza, setKayitliImza] = useState("");
  const [cikisSorusu, setCikisSorusu] = useState(false);
  const [seciliKalem, setSeciliKalem] = useState<SepetKalemi | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);

  // Masalı hesapta ekran açık kaldığı sürece masa bu kişide görünüyor. Masasız
  // (gel al / paket) siparişte meşguliyet yok: o hesap zaten kasada, tek yerde.
  // Başkası devraldıysa ekranda kalmanın anlamı yok, salona dönülüyor.
  const devralan = useMasayiTut(masasiz ? null : masaId);
  const [devralindi, setDevralindi] = useState<string | null>(null);
  useEffect(() => {
    if (devralan) setDevralindi(devralan);
  }, [devralan]);
  // Adisyonun kendi bilgileri: ad, kişi sayısı, not ve müşteri. Sepetle birlikte
  // kaydediliyor — masalı adisyon ilk ürün girilene kadar diskte yok.
  const [bilgi, setBilgi] = useState<AdisyonBilgisi>({});
  // Servis bedelinin bu hesaptaki durumu: boş = ayarın dediği, true = elle
  // eklendi, false = kaldırıldı.
  const [servis, setServis] = useState<ServisDurumu>({});
  const [bilgiAcik, setBilgiAcik] = useState(false);
  const [kisiSorusu, setKisiSorusu] = useState(false);
  const [adisyonNo, setAdisyonNo] = useState<number | undefined>();

  // Kayıt bağlantı yüzünden düşerse kuyruğa ekrandaki sepetin değil, kayda
  // gidecek tamamlanmış hâlin kopyası giriyor.
  const sonYazilan = useRef<AdisyonVerisi | null>(null);

  // Kayda gidecek tam hâl: ekrandaki sepetin üstüne adisyonun kendi
  // bilgileri ve servis kuralları biniyor. Kuyruğa da bu hâl giriyor.
  const tamVeri = (veri: AdisyonVerisi): AdisyonVerisi => {
    return {
      ...veri,
      // Silinen tahsilatların sebebi kayıtla birlikte deftere geçiyor;
      // yazıldıktan sonra liste boşalıyor ki ikinci kayıtta tekrarlanmasın.
      silinenTahsilatlar: silinenTahsilatlar.current.splice(0),
      ad: bilgi.ad ?? "",
      kisiSayisi: bilgi.kisiSayisi ?? 0,
      not: bilgi.not ?? "",
      musteri: { ad: bilgi.musteriAd ?? "", telefon: bilgi.musteriTelefon ?? "" },
      // Servis bedeli kişi sayısına ve sipariş tipine bağlı; ikisi de kayda
      // buradan giriyor ki hangi yoldan kaydedilirse kaydedilsin aynı çıksın.
      tip: masasiz ? masasizBilgi?.tip ?? "gelal" : "masa",
      kuverUygula: servis.kuver ?? null,
      garsoniyeUygula: servis.garsoniye ?? null,
    };
  };

  /** Kuyruğa girecek işin künyesi: masalı ve masasız adisyon aynı kuyrukta. */
  const kuyrukIsi = (tam: AdisyonVerisi): KuyrukIsi =>
    masasiz ? { tip: "masasiz", adisyonId, veri: tam } : { tip: "masa", masaId, masaAdi, veri: tam };

  // Kaydetme çağrılarının hepsi buradan geçiyor ki adisyon bilgisi hiçbir
  // yoldan düşmesin.
  const adisyonuYaz = async (veri: AdisyonVerisi, kapat = false): Promise<AdisyonVerisi> => {
    const tam = tamVeri(veri);
    sonYazilan.current = tam;

    // Bağlantı yoksa kayıt kuyruğa giriyor — tahsilat ve hesap kapatma dahil.
    // Aynı ödemenin iki kez yazılmasını istemci kimliği durduruyor.
    const kuyruga = () => {
      kuyrugaEkle({ ...kuyrukIsi(tam), kapat });
      if (kapat) hesapKopyasiSil(hedef);
      setKayitliTahsilatlar(tam.tahsilatlar);
      return tam;
    };

    if (!baglantiVar()) return kuyruga();

    try {
      const kayitli = masasiz
        ? await masasizKaydet(adisyonId, tam, kapat)
        : await adisyonKaydet(masaId, tam, kapat);
      // Yeni alınan ödemeler kayıtta kimlik kazanıyor; ekran bu kimlikleri geri
      // almazsa aynı sayfada yapılan ikinci kayıt onları bir daha yazardı.
      setKayitliTahsilatlar(kayitli.tahsilatlar);
      return kayitli;
    } catch (e) {
      // Sebep bağlantıysa para da sipariş de kaybolmuyor, kuyrukta bekliyor.
      if (baglantiHatasi(e) || !baglantiVar()) return kuyruga();
      throw e;
    }
  };

  useEffect(() => {
    menuGetir().then((veri) => {
      // Satışta gizlenen kategori ve ürünler sipariş ekranına hiç girmiyor.
      const acikKategoriler = veri.kategoriler.filter((k) => k.satistaGorunur);
      setKategoriler(acikKategoriler);
      setUrunler(veri.urunler.filter((u) => u.satistaGorunur));
      setTumUrunler(veri.urunler);
      setGruplar(veri.gruplar);
      setKdvler(veri.kdvler);
      setSeciliId(acikKategoriler.find((k) => !k.ustId)?.id ?? acikKategoriler[0]?.id ?? null);
      setMenuYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    if (masasiz) return;
    masaGetir(masaId).then((m) => setMasaAdi(m?.ad ?? ""));
  }, [masaId, masasiz]);

  useEffect(() => {
    setYukleniyor(true);
    adisyonuOku().then((veri) => {
      setSepet(veri.sepet);
      setIndirim(veri.indirim);
      setIndirimTanim(veri.indirimTanim);
      setKayitliTahsilatlar(veri.tahsilatlar);
      setKayitliImza(
        adisyonImzasi(
          veri.sepet,
          veri.indirim,
          veri.tahsilatlar,
          adisyondanBilgi(veri),
          adisyondanServis(veri)
        )
      );
      setAdisyonNo(veri.no);
      setBilgi(adisyondanBilgi(veri));
      setServis(adisyondanServis(veri));
      if (masasiz) setMasasizBilgi(veri);
      // Misafir sayısı zorunluysa soru masaya girer girmez çıkıyor. Masasız
      // siparişte (gel al / paket) kişi kavramı yok.
      if (!masasiz && ayarlar().kisiSayisiZorunlu && !veri.kisiSayisi) setKisiSorusu(true);
      setYukleniyor(false);
    });
  }, [masaId, adisyonId, masasiz]);

  // Hesabın içi de salon gibi canlı: garson telefondan aynı masaya ürün
  // eklerse kasiyer görüyor, eksik tutar tahsil etmiyor. Ekranda kaydedilmemiş
  // değişiklik varsa yereldeki hâl korunuyor, sunucudan yalnız yeni kalemler
  // biniyor. Kuyrukta bekleyen kayıt varsa hiç dokunulmuyor: o sepet
  // sunucudakinden yeni.
  useCanli(["adisyonlar", "adisyon_kalemleri", "tahsilatlar"], () => {
    if (!baglantiVar() || bekleyenKayit(hedef)) return;
    (masasiz ? masasizGetir(adisyonId) : adisyonGetir(masaId)).then((veri) => {
      setSepet((s) => {
        const yerelDegisiklik =
          adisyonImzasi(s, indirim, kayitliTahsilatlar, bilgi, servis) !== kayitliImza;
        if (!yerelDegisiklik) {
          setKayitliTahsilatlar(veri.tahsilatlar);
          setKayitliImza(
            adisyonImzasi(
              veri.sepet,
              veri.indirim,
              veri.tahsilatlar,
              adisyondanBilgi(veri),
              adisyondanServis(veri)
            )
          );
          setIndirim(veri.indirim);
          setIndirimTanim(veri.indirimTanim);
          setBilgi(adisyondanBilgi(veri));
          setServis(adisyondanServis(veri));
        }
        return sepetiTazele(veri.sepet, s, yerelDegisiklik);
      });
    });
  });

  // Şeritte ana kategoriler durur; alt kategoriler satırdaki okla açılır.
  // Üstü satışta gizliyse alt kategori şeride ana kategori gibi girer.
  const anaKategoriler = kategoriler.filter(
    (k) => !k.ustId || !kategoriler.some((x) => x.id === k.ustId)
  );
  const secili = kategoriler.find((k) => k.id === seciliId) ?? anaKategoriler[0];

  // Kampanyalı menüler şeridin en üstünde kendi maddesinde toplanır; hiç yoksa
  // madde de görünmez.
  const kampanyalar = urunler.filter((u) => u.menuGruplari.length > 0);

  // Favoriler de aynı yerde kendi maddesinde; hiç favori yoksa madde görünmez.
  const favoriler = urunler.filter((u) => u.favori);

  // Üst kategoriye basınca altındakilerin ürünleri de geliyor — garson tek dokunuşta
  // hepsini görsün; alt kategoriye basınca liste ona daralıyor.
  // Arama açıkken kategori sınırı kalkar: garson ürünün hangi kategoride
  // olduğunu düşünmeden adını yazsın.
  const aranan = arama.trim().toLocaleLowerCase("tr");
  const listelenen = aranan
    ? urunler.filter(
        (u) =>
          u.ad.toLocaleLowerCase("tr").includes(aranan) ||
          (u.kod ?? "").toLocaleLowerCase("tr").includes(aranan)
      )
    : ozelListe === "kampanya"
      ? kampanyalar
      : ozelListe === "favori"
        ? favoriler
        : secili
          ? agacUrunleri(urunler, kategoriler, secili.id).filter((u) => !u.menuGruplari.length)
          : [];

  // KDV oranı satış anında kaleme yazılır — sonradan ürünün grubu değişse bile
  // kesilmiş adisyonun dökümü oynamasın.
  const sepeteEkle = (
    urun: MenuUrun,
    fiyat: number,
    porsiyon?: string,
    secimler?: string[]
  ) => {
    const ad = urun.ad;
    const kdvOran = urunKdv(urun, kdvler)?.oran;
    const anahtar = [ad, porsiyon, ...(secimler ?? [])].join("|");
    setSepet((s) => {
      // Yeni ürün yalnızca bu turun normal satırıyla birleşir: kaydedilmiş bir
      // tura eklenirse o ürünün sonradan istendiği kaybolur. İkram/iptal satırı
      // da ayrı durur.
      const var_mi = s.find(
        (k) =>
          k.turSira == null &&
          (k.durum ?? "normal") === "normal" &&
          [k.ad, k.porsiyon, ...(k.secimler ?? [])].join("|") === anahtar
      );
      if (var_mi) return s.map((k) => (k === var_mi ? { ...k, adet: k.adet + 1 } : k));
      return [
        ...s,
        { id: yeniKalemId(), urunId: urun.id, ad, fiyat, adet: 1, porsiyon, secimler, kdvOran },
      ];
    });
  };

  // Çıkarma kalem kimliğiyle yapılır: aynı ürünün iki porsiyonu ayrı satırdır.
  const sepettenCikar = (id?: number) => {
    setSepet((s) => s.map((k) => (k.id === id ? { ...k, adet: k.adet - 1 } : k)).filter((k) => k.adet > 0));
  };

  // Ödemesi işlenmiş kalemler: birleştirmede bunlara dokunulmuyor.
  const odenmisIdler = new Set<number>(
    kayitliTahsilatlar.flatMap((t) => Object.keys(t.kalemler ?? {}).map(Number))
  );

  // İkram ve iptal edilen kalemler adisyonda görünür ama hesaba girmez.
  const hesaba = (k: SepetKalemi) => (k.durum ?? "normal") === "normal";
  const odenecekler = sepet.filter(hesaba);

  // Ürün kartındaki rozet: o üründen adisyonda kaç adet var (porsiyonlar toplanır).
  const kartAdetleri = sepet.reduce<Record<string, number>>((m, k) => {
    if (k.durum === "iptal") return m;
    m[k.ad] = (m[k.ad] ?? 0) + k.adet;
    return m;
  }, {});

  // Henüz kaydedilmemiş kalemler listenin başında durur — garson yazdığı şeyi
  // aramasın. Kaydedince kendi turuna, yani listenin sonuna geçiyorlar.
  const gosterilen = [
    ...sepet.filter((k) => k.turSira == null),
    ...sepet.filter((k) => k.turSira != null),
  ];
  const turEtiketi = (k: SepetKalemi) => {
    if (k.turSira == null) return "Yeni";
    const saat = k.turSaat
      ? new Date(k.turSaat).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      : null;
    return [`${k.turSira}. tur`, saat, k.turGarson].filter(Boolean).join(" · ");
  };

  const araToplam = odenecekler.reduce((t, k) => t + kalemTutari(k), 0);
  const kdvSatirlari = kdvDokumu(odenecekler, indirim, kdvler.find((k) => k.varsayilan)?.oran);
  // Fiyatlar KDV hariçse vergi toplamın üstüne ekleniyor.
  const eklenenKdv = ayarlar().kdvDahil
    ? 0
    : kdvSatirlari.reduce((t, s) => t + s.kdv, 0);
  const matrah = Math.max(0, araToplam - indirim);
  // Kuver ve garsoniye ürün değil, hesabın kendi bedeli: indirimden sonra
  // ekleniyor. Kişi sayısı ekranda değişince tutar da anında değişiyor.
  const servisGirdi = {
    matrah,
    kisiSayisi: bilgi.kisiSayisi,
    tip: masasiz ? masasizBilgi?.tip ?? "gelal" : ("masa" as const),
    kuverUygula: servis.kuver,
    garsoniyeUygula: servis.garsoniye,
  };
  const servisTutar = servisTutarlari(servisGirdi);
  const servisListesi = servisSatirlari(servisGirdi);
  // Servis bedelini kaldırmak parayı azaltıyor; her garsona açık değil.
  const servisYetkisi = yetkiVar("siparis.servis");
  const odemeAlabilir = yetkiVar("odeme.al");
  const toplam = matrah + servisTutar.toplam + eklenenKdv;
  const odenen = kayitliTahsilatlar.reduce((t, o) => t + o.tutar, 0);
  const kalan = Math.max(0, toplam - odenen);

  const kirli =
    !yukleniyor &&
    adisyonImzasi(sepet, indirim, kayitliTahsilatlar, bilgi, servis) !== kayitliImza;

  // Sol menü de aynı kilide bakıyor; sipariş ekranı bugün menüsüz açılıyor ama
  // kural tek yerden işlesin.
  useEffect(() => {
    kilitKur(() => kirli);
    return kilitKaldir;
  }, [kirli]);

  // Adisyonu tazeleyip kirli imzayı da sıfırlar; taşıma gibi doğrudan diske
  // yazan işlemlerden sonra ekran veritabanıyla aynı hizaya geliyor.
  const adisyonuTazele = async () => {
    const veri = await adisyonuOku();
    setSepet(veri.sepet);
    setIndirim(veri.indirim);
    setKayitliTahsilatlar(veri.tahsilatlar);
    setBilgi(adisyondanBilgi(veri));
    setServis(adisyondanServis(veri));
    setKayitliImza(
      adisyonImzasi(
        veri.sepet,
        veri.indirim,
        veri.tahsilatlar,
        adisyondanBilgi(veri),
        adisyondanServis(veri)
      )
    );
  };

  // Taşıma veritabanı üstünde çalışıyor: ekrandaki henüz kaydedilmemiş kalemin
  // karşılığı diskte olmadığı için önce adisyon yazılıyor.
  const kalemiTasi = async (kalem: SepetKalemi, hedefMasaId: number, adet: number) => {
    setSeciliKalem(null);
    try {
      const kayitli = await adisyonuYaz({ sepet, indirim, indirimTanim, tahsilatlar: kayitliTahsilatlar });
      const guncel = kayitli.sepet.find(
        (k) => k.id === kalem.id || (kalem.id && kalem.id < 0 && k.ad === kalem.ad)
      );
      if (!guncel?.id) throw new Error("Kalem kaydedilemedi, taşıma yapılmadı.");

      await kalemTasi(masaId, hedefMasaId, guncel.id, adet);
      await adisyonuTazele();
    } catch (e) {
      await adisyonuTazele();
      setUyari(e instanceof Error ? e.message : "Kalem taşınamadı.");
    }
  };

  const kaydet = async () => {
    // Soru masaya girerken zaten çıkıyor; buradaki emniyet kemeri, sayı
    // sonradan silinmişse kayıt yine de sayısız geçmesin.
    if (!masasiz && ayarlar().kisiSayisiZorunlu && !bilgi.kisiSayisi) {
      setKisiSorusu(true);
      return;
    }
    // Kayıt düşerse salona dönülmüyor: ekrandaki sipariş garsonun elinde
    // kalsın, bağlantı gelince aynı tuşla yeniden gönderebilsin.
    const veri = { sepet, indirim, indirimTanim, tahsilatlar: kayitliTahsilatlar };

    // Bağlantının olmadığı biliniyorsa sunucu hiç denenmiyor: kayıt doğrudan
    // kuyruğa giriyor ve garson beklemeden salona dönüyor. Yoğun saatte her
    // siparişte cevapsız isteği beklemek kasayı kilitliyordu.
    if (!baglantiVar()) {
      kuyrugaEkle(kuyrukIsi(tamVeri(veri)));
      kilitKaldir();
      navigate("/");
      return;
    }

    try {
      await adisyonuYaz(veri);
    } catch (e) {
      // Sebep bağlantıysa sipariş kaybolmuyor: cihazda kuyruğa giriyor,
      // bağlantı gelince kendiliğinden sunucuya yazılıyor. Garson masayı
      // bırakıp diğerine gidebilsin — kasa internetsiz diye satış durmasın.
      if (!baglantiHatasi(e) && baglantiVar()) {
        setUyari(hataMesaji(e, "Adisyon kaydedilemedi."));
        return;
      }
      kuyrugaEkle(kuyrukIsi(sonYazilan.current ?? veri));
    }
    kilitKaldir();
    navigate("/");
  };

  const salonaDon = () => {
    if (kirli) setCikisSorusu(true);
    else navigate("/");
  };

  return (
    <div className="siparis-sayfa">
      <header className="siparis-ust">
        <button className="geri" onClick={salonaDon}>
          <ArrowLeft size={17} />
          Salon
        </button>
        <h1>
          {masasiz ? (
            <>
              {masasizBilgi?.tip === "paket" ? <Bike size={19} /> : <ShoppingBag size={19} />}
              {masasizBilgi?.tip === "paket" ? "Paket" : "Gel Al"}
              {adisyonNo ? ` #${adisyonNo}` : ""}
              {bilgi.musteriAd ? ` · ${bilgi.musteriAd}` : ""}
            </>
          ) : (
            <>
              {masaAdi}
              {adisyonNo ? <em className="adisyon-no">#{adisyonNo}</em> : null}
            </>
          )}
        </h1>

        {/* Adisyonun kendi bilgileri başlığın altında duruyor: girilmişse
            görünür, girilmemişse düğme onları eklemeye çağırıyor. */}
        <button className="adisyon-bilgi-tus" onClick={() => setBilgiAcik(true)}>
          {bilgi.ad && <span className="bilgi-oge">{bilgi.ad}</span>}
          {!!bilgi.kisiSayisi && (
            <span className="bilgi-oge">
              <Users size={14} />
              {bilgi.kisiSayisi} kişi
            </span>
          )}
          {bilgi.musteriAd && !masasiz && <span className="bilgi-oge">{bilgi.musteriAd}</span>}
          {bilgi.not && (
            <span className="bilgi-oge">
              <StickyNote size={14} />
              {bilgi.not}
            </span>
          )}
          <span className="bilgi-duzenle">
            <Pencil size={14} />
            {bilgi.ad || bilgi.kisiSayisi || bilgi.not || bilgi.musteriAd
              ? "Düzenle"
              : "Adisyon bilgisi ekle"}
          </span>
        </button>
      </header>

      <div className="siparis-govde">
        <nav className="kategori-serit">
          {kampanyalar.length > 0 && (
            <button
              className={ozelListe === "kampanya" ? "kategori kampanya aktif" : "kategori kampanya"}
              onClick={() => setOzelListe("kampanya")}
            >
              Kampanyalı Menüler
            </button>
          )}

          {favoriler.length > 0 && (
            <button
              className={ozelListe === "favori" ? "kategori favori aktif" : "kategori favori"}
              onClick={() => setOzelListe("favori")}
            >
              <Star size={15} strokeWidth={2} fill="currentColor" />
              Favoriler
            </button>
          )}

          {anaKategoriler.map((k) => {
            const altlar = altKategoriler(kategoriler, k.id);
            return (
            <div key={k.id} className="kategori-grup">
              <button
                className={!ozelListe && k.id === secili?.id ? "kategori aktif" : "kategori"}
                style={{ borderColor: !ozelListe && k.id === secili?.id ? "transparent" : k.renk }}
                onClick={() => { setOzelListe(null); setSeciliId(k.id); }}
              >
                {k.ad}

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
              </button>

              {k.id === acikGrupId &&
                altlar.map((a) => (
                  <button
                    key={a.id}
                    className={
                      !ozelListe && a.id === secili?.id ? "kategori alt aktif" : "kategori alt"
                    }
                    style={{ borderColor: !ozelListe && a.id === secili?.id ? "transparent" : a.renk }}
                    onClick={() => { setOzelListe(null); setSeciliId(a.id); }}
                  >
                    <em className="dal" />
                    {a.ad}
                  </button>
                ))}
            </div>
            );
          })}
        </nav>

        <main className="urun-alani">
          <div className="urun-arama">
            <input
              placeholder="Ürün ara"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
            />
            {arama && (
              <button className="arama-temizle" onClick={() => setArama("")}><X size={15} /></button>
            )}
          </div>

          {menuYukleniyor && <div className="yukleniyor"><div className="cember" /></div>}

          {!menuYukleniyor && aranan && listelenen.length === 0 && (
            <p className="bos">“{arama}” için ürün bulunamadı</p>
          )}

          {!menuYukleniyor && (
            <div className="urun-grid">
              {listelenen.map((u) => (
                <button
                  key={u.id}
                  className={u.menuGruplari.length ? "urun-kart kampanya" : "urun-kart"}
                  onClick={() =>
                    u.menuGruplari.length
                      ? setKampanyaUrunu(u)
                      : u.porsiyonlar.length > 1 || u.porsiyonlar.some((p) => p.grupIdler.length > 0)
                        ? setSecimUrunu(u)
                        : sepeteEkle(u, anaFiyat(u, siparisTuru))
                  }
                >
                  {kartAdetleri[u.ad] > 0 && (
                    <em className="kart-rozet">{kartAdetleri[u.ad]}</em>
                  )}
                  <span>{u.ad}</span>
                  <strong>₺{anaFiyat(u, siparisTuru)}</strong>
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className="sepet">
          <h2>Adisyon</h2>
          {/* Kopyadan çalışıldığı gizlenmiyor: hesap o saatten sonra değişmiş
              olabilir, ödemeyi alan kişi bilerek alsın. */}
          {kopyaZamani && (
            <div className="m-kopya-serit">
              <CloudOff size={17} />
              Bağlantı yok — hesabın {kopyaSaati(kopyaZamani)} itibarıyla bilinen hâli. Alınan
              ödeme bağlantı gelince kasaya yazılacak.
            </div>
          )}
          <div className="sepet-liste">
            {yukleniyor && <div className="yukleniyor"><div className="cember" /></div>}
            {!yukleniyor && sepet.length === 0 && <p className="bos">Henüz ürün yok</p>}
            {gosterilen.map((k, sira) => {
              // Kalemler tur tur girildi; sepette araya turun başlığı konuyor.
              // Tek turluk adisyonda da yazılıyor: siparişin saati ve kimin
              // aldığı ilk turdan itibaren görünsün.
              const oncekiTur = sira > 0 ? gosterilen[sira - 1].turSira : undefined;
              const turBasligi =
                sira === 0 || k.turSira !== oncekiTur ? turEtiketi(k) : null;
              const detay = [
                k.porsiyon,
                ...(k.secimler ?? []),
                k.not,
                k.durum === "ikram" ? "ikram" : k.durum === "iptal" ? "iptal" : null,
              ].filter(Boolean);
              return (
              <Fragment key={k.id}>
              {turBasligi && <div className="tur-basligi">{turBasligi}</div>}
              <div
                className={k.durum && k.durum !== "normal" ? `sepet-satir ${k.durum}` : "sepet-satir"}
                onClick={() => setSeciliKalem(k)}
              >
                <span className="adet">{adetGoster(k.adet)}</span>
                <span className="ad">
                  {k.ad}
                  {detay.length > 0 && (
                    <small className="kalem-detay">{detay.join(" · ")}</small>
                  )}
                </span>
                <span className="tutar">
                  {hesaba(k) && k.indirim ? (
                    <>
                      <s className="eski-tutar">{paraGoster(k.fiyat * k.adet)}</s> {paraGoster(kalemTutari(k))}
                    </>
                  ) : (
                    paraGoster(hesaba(k) ? kalemTutari(k) : 0)
                  )}
                </span>
                <span className="kalem-duzenle" title="Kalem işlemleri">
                  <SlidersHorizontal size={16} />
                </span>
                <button
                  className="cikar"
                  onClick={(e) => { e.stopPropagation(); sepettenCikar(k.id); }}
                >
                  −
                </button>
              </div>
              </Fragment>
              );
            })}
          </div>
          <footer>
            <div className="sepet-ozet">
              <KdvDokum satirlar={kdvSatirlari} araToplam={araToplam} />
              {indirim > 0 && (
                <div className="ozet-satir indirim">
                  <span>İndirim</span>
                  <span>−{paraGoster(indirim)}</span>
                </div>
              )}
              {servisVar() &&
                (["kuver", "garsoniye"] as const).map((hangi) => {
                  const tanim = ayarlar()[hangi];
                  if (tanim.deger <= 0) return null;

                  // Hesapta duruyor mu: kararı verilmişse o, verilmemişse ayarın
                  // dediği. Gel al ve pakette servis kendiliğinden girmiyor.
                  const acik = servis[hangi] ?? (tanim.otomatik && !masasiz);
                  const tutar = hangi === "kuver" ? servisTutar.kuver : servisTutar.garsoniye;
                  const kisiBasi = hangi === "kuver" && tanim.tip === "tutar";

                  if (!acik) {
                    return servisYetkisi ? (
                      <button
                        key={hangi}
                        className="ozet-satir servis-ekle"
                        onClick={() => setServis((s) => ({ ...s, [hangi]: true }))}
                      >
                        <span>+ {tanim.ad} ekle</span>
                        <span>{servisEtiketi(tanim)}</span>
                      </button>
                    ) : null;
                  }

                  return (
                    <div key={hangi} className="ozet-satir servis">
                      <span>
                        {tanim.ad}
                        {kisiBasi && (
                          <em className="servis-not">
                            {bilgi.kisiSayisi
                              ? ` · ${bilgi.kisiSayisi} kişi`
                              : " · misafir sayısı girilmedi"}
                          </em>
                        )}
                      </span>
                      <span>
                        {paraGoster(tutar)}
                        {servisYetkisi && (
                          <button
                            className="servis-cikar"
                            title={`${tanim.ad} kaldır`}
                            onClick={() => setServis((s) => ({ ...s, [hangi]: false }))}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              {kayitliTahsilatlar.length > 0 && (
                <>
                  <div className="ozet-satir odendi">
                    <span>Ödenen</span>
                    <span>{paraGoster(odenen)}</span>
                  </div>
                  <div className="ozet-satir kalan">
                    <span>Kalan</span>
                    <span>{paraGoster(kalan)}</span>
                  </div>
                </>
              )}
              <div className="ozet-satir toplam-satir">
                <span>Toplam</span>
                <strong>{paraGoster(toplam)}</strong>
              </div>
            </div>
            <div className="sepet-aksiyonlar">
              {indirimYapabilir() && (
                <button
                  className="indirim-btn"
                  disabled={sepet.length === 0}
                  onClick={() => setIndirimAcik(true)}
                >
                  <Percent size={15} />
                  İndirim
                </button>
              )}
              {/* Ödeme alma yetkisi olmayan kişi siparişi girer, hesabı görür
                  ama parayı almaz: iki düğme de ona hiç çıkmıyor. */}
              {odemeAlabilir && (
                <>
                  <button
                    className="ode"
                    disabled={sepet.length === 0}
                    onClick={() => setTahsilatAcik(true)}
                  >
                    <Wallet size={15} />
                    Öde
                  </button>
                  <button
                    className="hizli-ode-btn"
                    disabled={sepet.length === 0 || kalan <= 0}
                    onClick={() => setHizliAcik(true)}
                  >
                    <Zap size={15} />
                    Hızlı Öde
                  </button>
                </>
              )}
            </div>
            <button className="kaydet" onClick={kaydet}>
              <Check size={16} />
              Kaydet
            </button>
          </footer>
        </aside>
      </div>

      {tahsilatAcik && (
        <TahsilatPanel
          kalemler={sepet}
          toplam={toplam}
          araToplam={araToplam}
          indirim={indirim}
          servis={servisListesi}
          kdvSatirlari={kdvSatirlari}
          kayitliTahsilatlar={kayitliTahsilatlar}
          onKaydet={(t) => setKayitliTahsilatlar(t)}
          onSil={(id, sebep) => silinenTahsilatlar.current.push({ id, sebep })}
          onIndirimDegis={(tutar, kaynak) => { setIndirim(tutar); setIndirimTanim(kaynak); }}
          onKalemIndirim={(paylar, kaynak) =>
            setSepet((s) =>
              s.map((k) =>
                k.id != null && paylar[k.id] != null
                  ? { ...k, indirim: paylar[k.id], indirimTanimId: kaynak?.id, indirimAd: kaynak?.ad }
                  : k
              )
            )
          }
          onKapat={() => setTahsilatAcik(false)}
          musteri={bilgi.musteriAd || bilgi.ad}
          onOdendi={async (tahsilatlar, eksik) => {
            // Kapanan adisyon silinmiyor, kapalıya çekiliyor — gün sonu raporu ona bakacak.
            try {
              await adisyonuYaz({ sepet, indirim, indirimTanim, tahsilatlar, eksik }, true);
            } catch (e) {
              // Ödeme paneli açık kalıyor: tahsilat ekranda duruyor, bağlantı
              // gelince aynı yerden kapatılabilsin.
              setUyari(hataMesaji(e, "Adisyon kapatılamadı."));
              return;
            }
            kilitKaldir();
            navigate("/");
          }}
        />
      )}

      {hizliAcik && (
        <HizliOde
          baslik={masaAdi}
          araToplam={araToplam}
          indirim={indirim}
          servis={servisListesi}
          toplam={toplam}
          odenen={odenen}
          kalan={kalan}
          onIndirimDegis={(tutar, kaynak) => { setIndirim(tutar); setIndirimTanim(kaynak); }}
          onKapat={() => setHizliAcik(false)}
          onSec={async (tip, tutar, kapat, bahsis, musteriId) => {
            const tahsilatlar = [...kayitliTahsilatlar, yeniTahsilat({ tip, tutar, bahsis, musteriId })];
            try {
              await adisyonuYaz({ sepet, indirim, indirimTanim, tahsilatlar }, kapat);
            } catch (e) {
              setUyari(hataMesaji(e, "Ödeme kaydedilemedi."));
              return;
            }
            if (kapat) {
              kilitKaldir();
              navigate("/");
              return;
            }
            // Adisyon açık kaldı: ekran diskteki hâliyle aynı hizaya geliyor,
            // kaydedilmemiş değişiklik uyarısı boşuna çıkmasın.
            await adisyonuTazele();
            setHizliAcik(false);
          }}
        />
      )}

      {indirimAcik && (
        <IndirimModal
          araToplam={araToplam}
          mevcutIndirim={indirim}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar, kaynak) => { setIndirim(tutar); setIndirimTanim(kaynak); setIndirimAcik(false); }}
        />
      )}

      {kampanyaUrunu && (
        <KampanyaSecim
          tur={siparisTuru}
          urun={kampanyaUrunu}
          urunler={tumUrunler}
          onKapat={() => setKampanyaUrunu(null)}
          onEkle={(fiyat, secimler) => {
            sepeteEkle(kampanyaUrunu, fiyat, undefined, secimler);
            setKampanyaUrunu(null);
          }}
        />
      )}

      {secimUrunu && (
        <UrunSecim
          tur={siparisTuru}
          urun={secimUrunu}
          gruplar={gruplar}
          onKapat={() => setSecimUrunu(null)}
          onEkle={(porsiyon, fiyat, secimler) => {
            sepeteEkle(secimUrunu, fiyat, porsiyon, secimler);
            setSecimUrunu(null);
          }}
        />
      )}

      {seciliKalem && (
        <KalemPaneli
          kalem={seciliKalem}
          urun={tumUrunler.find((u) => u.id === seciliKalem.urunId || u.ad === seciliKalem.ad)}
          masaId={masaId}
          odenmis={odenmisIdler.has(seciliKalem.id ?? 0)}
          tasinabilir={!masasiz}
          onTasi={(hedefMasaId, adet) => kalemiTasi(seciliKalem, hedefMasaId, adet)}
          onKapat={() => setSeciliKalem(null)}
          onUygula={(yeniler) => {
            // Satır bölündüyse eskisinin yerine birden fazla satır geçer; aynı
            // duruma dönen satırlar tekrar birleşir.
            setSepet((s) =>
              satirlariBirlestir(
                s.flatMap((k) => (k.id === yeniler[0].id ? yeniler : [k])).filter((k) => k.adet > 0),
                odenmisIdler
              )
            );
            setSeciliKalem(null);
          }}
        />
      )}

      {bilgiAcik && (
        <AdisyonBilgi
          baslik={masasiz ? (masasizBilgi?.tip === "paket" ? "Paket" : "Gel Al") : masaAdi}
          no={adisyonNo}
          bilgi={bilgi}
          onKapat={() => setBilgiAcik(false)}
          onKaydet={(yeni) => { setBilgi(yeni); setBilgiAcik(false); }}
        />
      )}

      {devralindi && (
        <OnayModal
          tekTus
          baslik="Masa devralındı"
          ikon={<LockKeyhole size={20} />}
          mesaj={`${devralindi} bu masayı devraldı, masadan çıkılıyor.${
            kirli ? " Kaydedilmemiş değişikliklerin yazılmadı." : ""
          }`}
          onayMetni="Tamam"
          onKapat={() => {
            // Çıkış kilidi kaydedilmemiş kalem için soru soruyor; karar zaten
            // verilmiş, ikinci pencere gereksiz.
            kilitKaldir();
            navigate("/salon");
          }}
        />
      )}

      {uyari && (
        <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />
      )}

      {kisiSorusu && (
        <MisafirSayisi
          onSec={(kisi) => {
            setBilgi((b) => ({ ...b, kisiSayisi: kisi }));
            setKisiSorusu(false);
          }}
          onVazgec={() => navigate("/")}
        />
      )}

      {cikisSorusu && (
        <OnayModal
          mesaj="Adisyonda kaydedilmemiş değişiklik var. Kaydetmeden çıkılsın mı?"
          tehlikeli
          onayMetni="Kaydetmeden çık"
          onOnay={() => { kilitKaldir(); navigate("/"); }}
          onKapat={() => setCikisSorusu(false)}
        />
      )}
    </div>
  );
}