import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  ChevronRight,
  ChevronUp,
  CloudOff,
  EllipsisVertical,
  Merge,
  Minus,
  Printer,
  Plus,
  ReceiptText,
  Search,
  Send,
  Users,
  Wallet,
  X,
} from "lucide-react";
import UrunSecim from "../components/UrunSecim";
import KalemIslemleri, { kalemiUygula } from "./KalemIslemleri";
import OnayModal from "../components/OnayModal";
import { agacUrunleri, menuGetir, porsiyonFiyat, urunKdv } from "../menu";
import { bolgeleriGetir, masaGetir } from "../masalar";
import {
  adisyonGetir,
  adisyonIptal,
  adisyonKaydet,
  adisyonOzeti,
  kalemTasi,
  kalemTutari,
  masaBirlestir,
  masaTasi,
  servisGirdisi,
  tumAdisyonlar,
  yeniKalemId,
} from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { servisSatirlari } from "../servis";
import { adisyonFisiYaz } from "../yazicilar";
import { bekleyenKayit, kuyrugaEkle } from "../kuyruk";
import { baglantiHatasi, baglantiVar } from "../baglanti";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import { ayarlar } from "../isletmeAyarlari";
import { yetkiVar } from "../oturum";
import { paraGoster } from "../para";
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
 * hep görünüyor ve tek ana düğme var — Gönder. Ödeme burada değil, adisyonun
 * kendi ekranında; masada sipariş almakla hesap kapatmak ayrı anlar.
 */
export default function MobilSiparis() {
  const { masaId: param } = useParams();
  const masaId = Number(param);
  const git = useNavigate();

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
  // Kuver ve garsoniye bu hesapta elle eklenmiş ya da kaldırılmış olabilir.
  // Okunup geri yazılmazsa her kayıt kararı siliyor: kasiyerin kaldırdığı kuver
  // garson mobilden ürün ekleyince geri geliyordu.
  const [servis, setServis] = useState<{
    kuverUygula?: boolean | null;
    garsoniyeUygula?: boolean | null;
  }>({});
  const [yukleniyor, setYukleniyor] = useState(true);

  const [secimUrunu, setSecimUrunu] = useState<MenuUrun | null>(null);
  const [sepetAcik, setSepetAcik] = useState(false);
  const [islemlerAcik, setIslemlerAcik] = useState(false);
  const [kalemIslem, setKalemIslem] = useState<SepetKalemi | null>(null);
  const [hedefSecim, setHedefSecim] = useState<"tasi" | "birlestir" | null>(null);
  const [iptalSorusu, setIptalSorusu] = useState(false);
  const [kisiSorusu, setKisiSorusu] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Sunucuya yazılmamış kalem var mı — Gönder düğmesi ve çıkış uyarısı buna bakıyor.
  const baslangicImza = useRef("");
  const kirli = JSON.stringify(sepet) !== baslangicImza.current;

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
      if (!baglantiVar()) return { sepet: [], indirim: 0, tahsilatlar: [] };
      return adisyonGetir(masaId);
    };

    oku().then((veri) => {
      setSepet(veri.sepet);
      setIndirim(veri.indirim);
      setTahsilatlar(veri.tahsilatlar);
      setKisiSayisi(veri.kisiSayisi);
      setServis({ kuverUygula: veri.kuverUygula, garsoniyeUygula: veri.garsoniyeUygula });
      baslangicImza.current = JSON.stringify(veri.sepet);
      if (ayarlar().kisiSayisiZorunlu && !veri.kisiSayisi) setKisiSorusu(true);
      setYukleniyor(false);
    });
  }, [masaId]);

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

  // Uzun basış porsiyon ve seçenek penceresini açıyor; adet için ayrı pencere
  // yok, kısa dokunuş zaten birer birer ekliyor.
  const basisZamani = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const uzunBasildi = useRef(false);
  const basisBasla = (u: MenuUrun) => {
    uzunBasildi.current = false;
    basisZamani.current = setTimeout(() => {
      uzunBasildi.current = true;
      setSecimUrunu(u);
    }, 450);
  };
  const basisBitir = (u: MenuUrun) => {
    clearTimeout(basisZamani.current);
    if (!uzunBasildi.current) urunEkle(u);
  };

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

  // Kart rozeti: o üründen adisyonda kaç adet var (porsiyonlar toplanıyor).
  const kartAdetleri = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of sepet) {
      if (k.durum === "iptal") continue;
      m[k.ad] = (m[k.ad] ?? 0) + k.adet;
    }
    return m;
  }, [sepet]);

  const adisyon: AdisyonVerisi = { sepet, indirim, tahsilatlar, kisiSayisi, tip: "masa", ...servis };
  const ozet = adisyonOzeti(adisyon);
  // Kuver ve garsoniye ürün değil, hesabın kendi bedeli; toplamda görünüp
  // dökümde görünmezse garson farkı nereden çıktı diye kalıyor.
  const servisler = servisSatirlari(servisGirdisi(adisyon, Math.max(0, ozet.araToplam - indirim)));
  const sonKalem = [...sepet].reverse().find((k) => k.turSira == null);

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
    return liste;
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
    <div className="m-siparis">
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
          <h1>{masaAdi}</h1>
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

      {/* Kategoriler kendi renkleriyle kart: garson adı okumadan renkten
          tanıyor, yoğun saatte aradığı grubu tek bakışta buluyor. */}
      {!aramaAcik && (
        <div className="m-kategoriler">
          {kategoriler
            .filter((k) => !k.ustId)
            .map((k) => (
              <button
                key={k.id}
                className={k.id === seciliKategori ? "m-kategori secili" : "m-kategori"}
                style={{ background: k.renk, color: yaziRengi(k.renk) }}
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
              onPointerDown={() => basisBasla(u)}
              onPointerUp={() => basisBitir(u)}
              onPointerLeave={() => clearTimeout(basisZamani.current)}
              onContextMenu={(e) => e.preventDefault()}
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
      <div className="m-serit">
        <button className="m-serit-ozet" onClick={() => setSepetAcik(true)}>
          <ChevronUp size={18} />
          <span className="m-serit-son">
            {sonKalem ? sonKalem.adet + "× " + sonKalem.ad : sepet.length + " kalem"}
          </span>
          <span className="m-serit-tutar">{paraGoster(ozet.toplam)}</span>
        </button>
        <button className="m-gonder" disabled={!kirli || gonderiliyor} onClick={gonder}>
          {baglantiVar() ? <Send size={18} /> : <CloudOff size={18} />}
          Gönder
        </button>
      </div>

      {sepetAcik && (
        <div className="m-perde" onClick={() => setSepetAcik(false)}>
          <div className="m-sayfa" onClick={(e) => e.stopPropagation()}>
            <header className="m-sayfa-ust">
              <h2>Adisyon</h2>
              <button
                className="m-ikon-dugme"
                onClick={() => setSepetAcik(false)}
                aria-label="Kapat"
              >
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
                  <div className="m-tur-baslik">{tur.baslik}</div>
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
                      <span className="m-kalem-adet">{k.adet}</span>
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
              {(servisler.length > 0 || indirim > 0 || ozet.kdv > 0) && (
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
                  {servisler.map((sat) => (
                    <div key={sat.ad} className="m-dokum-satir">
                      <span>{sat.ad}</span>
                      <span>{paraGoster(sat.tutar)}</span>
                    </div>
                  ))}
                  {ozet.kdv > 0 && (
                    <div className="m-dokum-satir">
                      <span>KDV</span>
                      <span>{paraGoster(ozet.kdv)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="m-sayfa-alt">
              <span>Toplam</span>
              <strong>{paraGoster(ozet.toplam)}</strong>
              {/* Ödeme burada yapılmıyor, hesabın kendi ekranına geçiliyor.
                  Gönderilmemiş kalem varken geçilmiyor: kaydedilmemiş sipariş
                  ödeme ekranında hiç görünmez, garson eksik tutar tahsil eder. */}
              {sepet.length > 0 && (
                <button
                  className="m-dugme"
                  onClick={() => {
                    if (kirli) {
                      setUyari("Önce siparişi gönder, sonra hesabı kapat.");
                      return;
                    }
                    git(`/mobil/adisyon/${masaId}`);
                  }}
                >
                  <Wallet size={18} />
                  {yetkiVar("odeme.al") ? "Öde" : "Hesap"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Siparişin kendi işlemleri: masaya girdikten sonra da misafir sayısı
          değişebiliyor, hesap fişi istenebiliyor. */}
      {islemlerAcik && (
        <div className="m-perde" onClick={() => setIslemlerAcik(false)}>
          <div className="m-sayfa kisa" onClick={(e) => e.stopPropagation()}>
            <header className="m-sayfa-ust">
              <h2>{masaAdi}</h2>
              <button
                className="m-ikon-dugme"
                onClick={() => setIslemlerAcik(false)}
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </header>
            <div className="m-islemler">
              <button
                className="m-islem"
                onClick={() => {
                  setIslemlerAcik(false);
                  setKisiSorusu(true);
                }}
              >
                <Users size={19} />
                Misafir sayısı{kisiSayisi ? ` · ${kisiSayisi}` : ""}
              </button>
              <button
                className="m-islem"
                onClick={() => {
                  setIslemlerAcik(false);
                  setSepetAcik(true);
                }}
              >
                <ReceiptText size={19} />
                Adisyonu gör
              </button>
              <button
                className="m-islem"
                onClick={() => {
                  if (kirli) {
                    setIslemlerAcik(false);
                    setUyari("Önce siparişi gönder, sonra hesabı kapat.");
                    return;
                  }
                  git(`/mobil/adisyon/${masaId}`);
                }}
              >
                <Wallet size={19} />
                {yetkiVar("odeme.al") ? "Öde" : "Hesap"}
              </button>

              <button className="m-islem" onClick={fisYazdir}>
                <Printer size={19} />
                Hesap fişi yazdır
              </button>

              {/* Taşıma ve birleştirme sunucu işi: ekranda bekleyen sipariş
                  varsa önce o gitmeli, yoksa taşınan masada görünmez. */}
              {yetkiVar("siparis.tasi") && (
                <>
                  <button className="m-islem" onClick={() => masaIslemi("tasi")}>
                    <ArrowRightLeft size={19} />
                    Masayı taşı
                  </button>
                  <button className="m-islem" onClick={() => masaIslemi("birlestir")}>
                    <Merge size={19} />
                    Masaları birleştir
                  </button>
                </>
              )}

              {yetkiVar("siparis.iptal") && sepet.some((k) => k.turSira != null) && (
                <button className="m-islem tehlikeli" onClick={() => setIptalSorusu(true)}>
                  <Ban size={19} />
                  Adisyonu iptal et
                </button>
              )}
            </div>
          </div>
        </div>
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
          deger={kisiSayisi ?? 2}
          onKaydet={(sayi) => {
            setKisiSayisi(sayi);
            setKisiSorusu(false);
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
 */
function MisafirSorusu({ deger, onKaydet }: { deger: number; onKaydet: (sayi: number) => void }) {
  const [sayi, setSayi] = useState(deger);
  return (
    <div className="m-perde">
      <div className="m-sayfa kisa">
        <header className="m-sayfa-ust">
          <h2>Kaç kişi?</h2>
        </header>
        <div className="m-sayac">
          <button onClick={() => setSayi((s) => Math.max(1, s - 1))} aria-label="Azalt">
            <Minus size={22} />
          </button>
          <span>{sayi}</span>
          <button onClick={() => setSayi((s) => s + 1)} aria-label="Artır">
            <Plus size={22} />
          </button>
        </div>
        <div className="m-sayfa-alt">
          <button className="m-dugme genis" onClick={() => onKaydet(sayi)}>
            Tamam
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
