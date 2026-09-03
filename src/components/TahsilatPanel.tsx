import { useEffect, useState } from "react";
import { Check, CircleCheckBig, Delete, HandCoins, Percent, Save, Split, X } from "lucide-react";
import { OdemeIkon } from "../odemeIkon";
import IndirimModal from "./IndirimModal";
import type { IndirimKaynagi } from "../indirimler";
import OnayModal from "./OnayModal";
import EksikKapat from "./EksikKapat";
import KdvDokum from "./KdvDokum";
import OdemeTipDugmeleri from "./OdemeTipDugmeleri";
import MusteriSecici from "./MusteriSecici";
import { adetGoster } from "../para";
import { kalemTutari, yeniTahsilat } from "../adisyonlar";
import { indirimYapabilir, yetkiVar } from "../oturum";
import { odemeTipleriniGetir } from "../odemeTipleri";
import type { OdemeTipi } from "../odemeTipleri";
import type { KdvSatiri } from "../kdv";
import type { SepetKalemi, Tahsilat } from "../types";

// Bölünen üründe pay tam sayı olmuyor; "0,5 ödendi" yerine "yarısı ödendi"
// okunuyor. Tanıdık kesirler ada dönüyor, gerisi virgüllü yazılıyor.
const KESIRLER: [number, string][] = [
  [0.5, "yarısı"],
  [1 / 3, "üçte biri"],
  [2 / 3, "üçte ikisi"],
  [0.25, "çeyreği"],
  [0.75, "dörtte üçü"],
];

function payYazi(pay: number) {
  if (Math.abs(pay - Math.round(pay)) < 0.005) return String(Math.round(pay));
  const tam = Math.floor(pay);
  const kesir = pay - tam;
  const es = KESIRLER.find(([deger]) => Math.abs(kesir - deger) < 0.01);
  if (!es) return pay.toFixed(2).replace(".", ",");
  return tam > 0 ? `${tam} + ${es[1]}` : es[1];
}

// Alınmış bir ödemeyi geri almanın gündelik sebepleri; denetim defterine yazılıyor.
const SILME_SEBEPLERI = [
  "Yanlış tutar girildi",
  "Yanlış ödeme tipi",
  "Müşteri başka türlü ödedi",
  "Ödeme iptal edildi",
];

type Props = {
  kalemler: SepetKalemi[];
  toplam: number;
  araToplam: number;
  indirim: number;
  /** Hesaba giren kuver/garsoniye satırları; yoksa boş geliyor. */
  servis?: { ad: string; tutar: number }[];
  kdvSatirlari: KdvSatiri[];
  kayitliTahsilatlar: Tahsilat[];
  onKaydet: (tahsilatlar: Tahsilat[]) => void;
  /** Kayıtlı bir tahsilat silindiğinde sebebiyle birlikte haber verilir. */
  onSil: (id: number, sebep?: string) => void;
  onIndirimDegis: (tutar: number, kaynak?: IndirimKaynagi) => void;
  onKalemIndirim: (paylar: Record<number, number>, kaynak?: IndirimKaynagi) => void;
  onKapat: () => void;
  /** Adisyonu kapatır; parası eksik kalıyorsa borcun kime yazıldığıyla birlikte. */
  onOdendi: (tahsilatlar: Tahsilat[], eksik?: { kisi: string; sebep: string; tutar: number }) => void;
  /** Adisyondaki müşteri adı; eksik kapatmada borç alanı bununla açılıyor. */
  musteri?: string;
};

export default function TahsilatPanel({ kalemler, toplam, araToplam, indirim, servis, kdvSatirlari, kayitliTahsilatlar, musteri, onKaydet, onSil, onIndirimDegis, onKalemIndirim, onKapat, onOdendi }: Props) {
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>(kayitliTahsilatlar ?? []);
  const [girilen, setGirilen] = useState("");
  const [secilen, setSecilen] = useState<Record<number, number>>({});
  const [odemeTipleri, setOdemeTipleri] = useState<OdemeTipi[]>([]);
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  // Bahşiş ödeme tipleriyle aynı sütunda, ikinci sekmede duruyor. Alınacak
  // bahşiş burada bekletilir, tahsilat kaydedilirken üstüne yazılır.
  const [sekme, setSekme] = useState<"odeme" | "bahsis">("odeme");
  const [bahsis, setBahsis] = useState(0);
  const [bahsisGirdi, setBahsisGirdi] = useState("");
  // Kalandan fazla girilip ödeme tipine basıldıysa o tip burada bekler:
  // bahşiş onaylandığı anda tahsilat aynı tiple kapanıyor.
  const [bekleyenTip, setBekleyenTip] = useState<string | null>(null);
  // Açık hesap tipinde borcun kime yazılacağı soruluyor; tahsilat seçim
  // penceresi kapanana kadar bekliyor.
  const [cariSorusu, setCariSorusu] = useState<{ tip: string; tutar: number } | null>(null);
  // Kaydedilmiş tahsilatın silinmesi sebep soruyor; sıradaki satırın yeri.
  const [silmeSorusu, setSilmeSorusu] = useState<number | null>(null);
  const [eksikAcik, setEksikAcik] = useState(false);
  // Hesabı kaça böleceği numpadin yanında açılan küçük listeden seçiliyor.
  const [boleAcik, setBoleAcik] = useState(false);
  // Telefonda üç sütun alt alta inince şerit uzuyordu: dar ekranda pencere iki
  // sekmeye ayrılıyor. Olağan akış (tutar gir, tipe bas) "Ödeme" sekmesinde
  // birlikte duruyor, ürün seçerek parçalı ödeme ayrı sekmede.
  const [mobilSekme, setMobilSekme] = useState<"odeme" | "urunler">("odeme");

  const tahsilatiCikar = (i: number, sebep?: string) => {
    const silinen = tahsilatlar[i];
    const yeni = tahsilatlar.filter((_, j) => j !== i);
    setTahsilatlar(yeni);
    if (silinen?.id) onSil(silinen.id, sebep);
    onKaydet(yeni);
  };

  useEffect(() => {
    odemeTipleriniGetir().then(setOdemeTipleri);
  }, []);

  const odenen = (tahsilatlar ?? []).reduce((t, o) => t + o.tutar, 0);
  const bahsisToplam = (tahsilatlar ?? []).reduce((t, o) => t + (o.bahsis ?? 0), 0);

  const kalan = toplam - odenen;

  // Ödenen adetler kalem kimliğine göre tutulur; sepetten satır silinse bile
  // "ödendi" işareti başka ürüne kaymaz.
  const odenmisMap = (() => {
    const map: Record<number, number> = {};
    for (const o of tahsilatlar ?? []) {
      for (const [id, adet] of Object.entries(o.kalemler ?? {})) {
        map[Number(id)] = (map[Number(id)] ?? 0) + adet;
      }
    }
    return map;
  })();

  const numpadTus = (v: string) => {
    if (v === "⌫") { setGirilen((g) => g.slice(0, -1)); return; }
    if (v === "Tümü") { setGirilen(String(alinacak)); return; }
    setGirilen((g) => g + v);
  };

  // İkram ve iptal edilen kalemler listede durur ama ödemeye girmez.
  const odenebilir = (k: SepetKalemi) => (k.durum ?? "normal") === "normal";

  const kurus = (t: number) => Math.round(t * 100) / 100;

  // Bahşiş sekmesinde yazılan tutar onay beklemeden dökümde ve sekme rozetinde
  // görünüyor; kullanıcı ne yazdığını anında görsün diye.
  const bekleyenBahsis = sekme === "bahsis" ? kurus(Number(bahsisGirdi) || 0) : bahsis;

  // Bahşiş adisyonun borcu değil: kalan olduğu gibi duruyor, kasadan alınacak
  // para ayrı satırda yazıyor.
  const alinacak = kurus(kalan + bekleyenBahsis);

  const secimVar = Object.keys(secilen).length > 0;

  /**
   * Ürün bazlı indirim: girilen tutar seçili satırlara tutarları oranında
   * dağıtılır. Kuruş artığı en büyük satıra yazılıyor ki indirimin toplamı
   * girilenle birebir tutsun.
   */
  const kalemIndirimiDagit = (tutar: number, kaynak?: IndirimKaynagi) => {
    const secililer = Object.keys(secilen)
      .map((id) => kalemler.find((k) => k.id === Number(id)))
      .filter((k): k is SepetKalemi => !!k);
    const toplamSecim = secililer.reduce((t, k) => t + kalemTutari(k), 0);
    if (toplamSecim <= 0) return;

    const paylar: Record<number, number> = {};
    let dagitilan = 0;
    secililer.forEach((k) => {
      const pay = kurus((kalemTutari(k) / toplamSecim) * tutar);
      paylar[k.id!] = kurus((k.indirim ?? 0) + pay);
      dagitilan = kurus(dagitilan + pay);
    });

    const fark = kurus(tutar - dagitilan);
    if (fark !== 0) {
      const en = secililer.reduce((a, b) => (kalemTutari(b) > kalemTutari(a) ? b : a));
      paylar[en.id!] = kurus(paylar[en.id!] + fark);
    }
    onKalemIndirim(paylar, kaynak);
    setSecilen({});
    setGirilen("");
  };

  // Bir adetin indirim düşülmüş birim tutarı.
  const birimTutar = (k: SepetKalemi) => (k.adet > 0 ? kalemTutari(k) / k.adet : 0);

  // Seçimin tahsil edilecek tutarı (kısmi paylar dâhil).
  const seciliTutar = (secim: Record<number, number>) =>
    kurus(
      Object.entries(secim).reduce((t, [id, adet]) => {
        const k = kalemler.find((y) => y.id === Number(id));
        return t + (k ? birimTutar(k) * adet : 0);
      }, 0)
    );

  // Ürünün bölünmemiş tam tutarı — 1/n hesabı buna göre yapılır ki üç kişilik
  // bölmede ikinci ödeme de birincisiyle aynı çıksın.
  const seciliTamTutar = (secim: Record<number, number>) =>
    kurus(
      Object.keys(secim).reduce((t, id) => {
        const k = kalemler.find((y) => y.id === Number(id));
        return t + (k ? kalemTutari(k) : 0);
      }, 0)
    );

  /**
   * 1/n kısayolu. Ürün seçiliyse seçilen ürünün tutarını böler (ürün bazlı 1/n),
   * seçim yoksa hesabın kalanını. Kuruş artığı son ödeyene kalıyor: pay yukarı
   * yuvarlanıyor ama seçimin kalanını hiçbir zaman aşmıyor.
   */
  const boleSec = (n: number) => {
    if (!secimVar) {
      setGirilen(String(kurus(Math.ceil((kalan / n) * 100) / 100)));
      return;
    }
    const pay = Math.ceil((seciliTamTutar(secilen) / n) * 100) / 100;
    setGirilen(String(kurus(Math.min(pay, seciliTutar(secilen)))));
  };

  const kalemSec = (kalem: SepetKalemi) => {
    if (!odenebilir(kalem)) return;
    const id = kalem.id!;
    const odenmisAdet = odenmisMap[id] ?? 0;
    const kalanAdet = kalem.adet - odenmisAdet;
    if (kalanAdet <= 0) return;
    setSecilen((s) => {
      const su = s[id] ?? 0;
      // Kalem kısmen ödenmişse (ürün bazlı 1/n) kalanı tam adet değil, kesir
      // olabilir; seçim o kesri geçmiyor.
      const yeniAdet = su >= kalanAdet ? 0 : Math.min(su + 1, kalanAdet);
      const yeni = { ...s, [id]: yeniAdet };
      if (yeniAdet === 0) delete yeni[id];
      const tutar = seciliTutar(yeni);
      setGirilen(tutar > 0 ? String(tutar) : "");
      return yeni;
    });
  };

  /**
   * Seçili kalemlerin bu ödemeyle kapanan payı. Ödenen tutar seçimin tamamını
   * karşılamıyorsa (ürünü ikiye bölmek gibi) pay kesirli yazılır; kuruş
   * yuvarlamasından artan ufak fark yüzünden ürün açık kalmasın diye sona
   * yaklaşan pay tam adete oturtulur.
   */
  const kalemPaylari = (tutar: number) => {
    const toplamSecim = seciliTutar(secilen);
    const oran = toplamSecim > 0 ? Math.min(1, tutar / toplamSecim) : 1;
    const paylar: Record<number, number> = {};
    for (const [id, adet] of Object.entries(secilen)) {
      const kalem = kalemler.find((k) => k.id === Number(id));
      const kalanAdet = kalem ? kalem.adet - (odenmisMap[Number(id)] ?? 0) : adet;
      const pay = adet * oran;
      paylar[Number(id)] = pay >= kalanAdet - 0.005 ? kalanAdet : Math.round(pay * 1000) / 1000;
    }
    return paylar;
  };

  const odemeAl = (tip: string) => {
    // Boş bırakılırsa bahşiş dahil tamamı alınıyor; girilen tutar zaten bahşişi
    // içerdiği için "kalandan fazla" akışı burada tetiklenmiyor.
    const tutar = girilen ? Number(girilen) : alinacak;
    if (tutar <= 0) return;
    // Kalandan fazlası bahşiş sekmesine düşüyor: üstü ne kadar, tipi hazır.
    if (tutar > alinacak) {
      setBekleyenTip(tip);
      setBahsisGirdi(String(kurus(tutar - kalan)));
      setSekme("bahsis");
      return;
    }
    // Girilen tutarın bahşiş payı adisyona yazılmıyor: hesaba borcu kadarı,
    // üstü bahşiş alanına gidiyor.
    const hesaba = kurus(tutar - bahsis);
    // Açık hesap kasaya para getirmiyor, birinin borcuna yazılıyor: kime
    // yazıldığı sorulmadan tahsilat işlenmiyor.
    if (odemeTipleri.find((t) => t.ad === tip)?.acikHesap) {
      setCariSorusu({ tip, tutar: hesaba });
      return;
    }
    tahsilatIsle(tip, hesaba, bahsis || undefined);
  };

  // Bahşiş kalanı azaltmaz; tahsilata kalanın kendisi yazılır, üstü ayrı alanda
  // durur. Yoksa hesap eksi kalana düşer.
  const tahsilatIsle = (tip: string, tutar: number, bahsis?: number, musteriId?: number) => {
    const secilenKalemler = Object.keys(secilen).length > 0 ? kalemPaylari(tutar) : undefined;
    const yeni = [
      ...(tahsilatlar ?? []),
      yeniTahsilat({ tip, tutar, bahsis, musteriId, kalemler: secilenKalemler }),
    ];
    setTahsilatlar(yeni);
    setSecilen({});
    setGirilen("");
    setBahsis(0);
    setBahsisGirdi("");
    setBekleyenTip(null);
    setSekme("odeme");
    onKaydet(yeni);
  };

  /**
   * Bahşiş sekmesindeki onay. Bir ödeme tipi bekliyorsa (kalandan fazla
   * girilmişti) tahsilat aynı anda kapanıyor; beklemiyorsa bahşiş kenarda
   * duruyor, sıradaki ödeme tipine basıldığında üstüne yazılıyor.
   */
  const bahsisOnayla = () => {
    const tutar = kurus(Number(bahsisGirdi) || 0);
    if (tutar < 0) return;
    if (bekleyenTip) {
      const tip = bekleyenTip;
      if (odemeTipleri.find((t) => t.ad === tip)?.acikHesap) {
        setBekleyenTip(null);
        setSekme("odeme");
        setCariSorusu({ tip, tutar: kalan });
        return;
      }
      tahsilatIsle(tip, kalan, tutar || undefined);
      return;
    }
    setBahsis(tutar);
    setSekme("odeme");
  };

  // Kalan sıfırlansa bile adisyon kendi kendine kapanmaz; kapatma kararı
  // kullanıcınındır, panel açık kalır.
  const odemeBitti = kalan <= 0;

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal tam th-modal" onClick={(e) => e.stopPropagation()}>
        <header className="th-ust">
          <div className="th-kimlik">
            <h2>Tahsilat</h2>
            <p>
              Toplam <strong>₺{toplam}</strong>
              <span className="th-ayrac">·</span>
              Kalan <strong className={kalan <= 0 ? "th-kalan bitti" : "th-kalan"}>₺{kalan}</strong>
            </p>
          </div>

          {/* Hesap kapansa bile masa oturmaya devam ediyor olabilir; kapatmak
              zorunlu değil, ödeme kaydedilip adisyon açık bırakılabiliyor. */}
          <div className="th-eylemler">
            <button className="th-eylem" onClick={() => { onKaydet(tahsilatlar); onKapat(); }}>
              <Save size={17} />
              Kaydet
            </button>
            {odemeBitti ? (
              <button className="th-eylem birincil" onClick={() => onOdendi(tahsilatlar)}>
                <CircleCheckBig size={17} />
                Adisyonu Kapat
              </button>
            ) : (
              // Parası eksik kalan hesap da kapatılabiliyor ama bu ayrı bir
              // karar: borç birine yazılıyor, kayıt düşüyor, yetki istiyor.
              yetkiVar("odeme.eksik_kapat") && (
                <button className="th-eylem" onClick={() => setEksikAcik(true)}>
                  <HandCoins size={17} />
                  Eksik Kapat
                </button>
              )
            )}
            <button className="th-kapat" aria-label="Kapat" onClick={onKapat}>
              <X size={19} />
            </button>
          </div>
        </header>

        {/* Yalnız dar ekranda görünüyor; masaüstünde üç sütun yan yana duruyor. */}
        <div className="th-sekmeler th-mob-sekmeler">
          <button
            className={mobilSekme === "odeme" ? "th-sekme acik" : "th-sekme"}
            onClick={() => setMobilSekme("odeme")}
          >
            Ödeme
          </button>
          <button
            className={mobilSekme === "urunler" ? "th-sekme acik" : "th-sekme"}
            onClick={() => setMobilSekme("urunler")}
          >
            Ürünler
            {secimVar && <em className="th-sekme-rozet">{Object.keys(secilen).length}</em>}
          </button>
        </div>

        <div className={`th-sutunlar mob-${mobilSekme}`}>
          <section className="th-sutun th-urunler">
            <p className="th-sutun-baslik">Ürünler</p>
            <div className="kalem-sec-liste">
              {kalemler.map((k) => {
                const pasif = !odenebilir(k);
                const odenmisAdet = odenmisMap[k.id!] ?? 0;
                const seciliAdet = secilen[k.id!] ?? 0;
                const bitti = !pasif && odenmisAdet >= k.adet - 0.005;
                return (
                  <button
                    key={k.id}
                    className={
                      pasif
                        ? `kalem-sec pasif ${k.durum}`
                        : bitti
                          ? "kalem-sec odendi"
                          : seciliAdet > 0
                            ? "kalem-sec aktif"
                            : "kalem-sec"
                    }
                    disabled={bitti || pasif}
                    onClick={() => kalemSec(k)}
                  >
                    <span>
                      {adetGoster(k.adet)}× {k.ad}
                      {odenmisAdet > 0 && !bitti && !pasif && (
                        <em className="odendi-rozet">{payYazi(odenmisAdet)} ödendi</em>
                      )}
                    </span>
                    <span>
                      {pasif
                        ? k.durum === "ikram" ? "İkram" : "İptal"
                        : bitti ? <Check size={17} /> : seciliAdet > 0
                          ? `${payYazi(seciliAdet)} seçili · ₺${kurus(birimTutar(k) * seciliAdet)}`
                          : k.indirim
                            ? <><s className="eski-tutar">₺{kurus(k.fiyat * k.adet)}</s> ₺{kalemTutari(k)}</>
                            : `₺${kalemTutari(k)}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ürün seçiliyken sıradaki adım ödeme tipine basmak; bunu ayrı bir
                uyarı penceresiyle değil, listenin altındaki şeritle söylüyoruz. */}
            {secimVar && (
              <div className="th-yonlendirme">
                <span>{payYazi(Object.values(secilen).reduce((t, a) => t + a, 0))} ürün seçili · ₺{seciliTutar(secilen)}</span>
                <button onClick={() => { setSecilen({}); setGirilen(""); }}>
                  <X size={15} />
                  Seçimi bırak
                </button>
              </div>
            )}
          </section>

          <section className="th-sutun th-orta">
            {(tahsilatlar ?? []).length > 0 && (
              <div className="tahsilat-gecmis">
                <p className="th-sutun-baslik">Alınan Ödemeler</p>
                {tahsilatlar.map((o, i) => (
                  <div key={i} className="gecmis-satir">
                    <span className="gecmis-tip">
                      <OdemeIkon ad={o.tip} size={16} />
                      {o.tip}
                    </span>
                    <span className="gecmis-tutar">
                      ₺{o.tutar}
                      {o.bahsis ? <em className="bahsis-rozet">+₺{o.bahsis} bahşiş</em> : null}
                    </span>
                    {/* Kaydedilmiş para hareketini geri almak iade yetkisi
                        istiyor; kaydedilmemiş satır yanlış dokunuşun kendisi,
                        onu herkes kaldırabiliyor. */}
                    {(!o.id || yetkiVar("odeme.iade")) && (
                      <button
                        className="gecmis-sil"
                        aria-label="Tahsilatı sil"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (o.id) setSilmeSorusu(i);
                          else tahsilatiCikar(i);
                        }}
                      ><X size={15} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="tahsilat-tutarlar">
              {indirim > 0 && (
                <div className="tutar-satir indirim">
                  <span>İndirim</span><span>−₺{indirim}</span>
                </div>
              )}
              {(servis ?? []).map((s) => (
                <div key={s.ad} className="tutar-satir">
                  <span>{s.ad}</span><span>₺{s.tutar}</span>
                </div>
              ))}
              <KdvDokum satirlar={kdvSatirlari} />
              {odenen > 0 && (
                <div className="tutar-satir odendi">
                  <span>Ödenen</span><span>₺{odenen}</span>
                </div>
              )}
              {bahsisToplam + bekleyenBahsis > 0 && (
                <div className="tutar-satir bahsis">
                  <span>Bahşiş</span><span>₺{bahsisToplam + bekleyenBahsis}</span>
                </div>
              )}
              <div className="tutar-satir kalan-satir">
                <span>Kalan</span><strong>₺{kalan}</strong>
              </div>
              {bekleyenBahsis > 0 && (
                <div className="tutar-satir alinacak">
                  <span>Alınacak</span><strong>₺{alinacak}</strong>
                </div>
              )}
            </div>

            <div className="odeme-numpad">
              <input
                className="numpad-ekran"
                type="number"
                placeholder={`₺${alinacak}`}
                value={girilen}
                onChange={(e) => { setSecilen({}); setGirilen(e.target.value); }}
              />
              {/* Rakamlar solda üç sütun, hesabı yöneten tuşlar sağda kendi
                  kolonunda: bölme ve indirim artık ayrı başlık istemiyor. */}
              <div className="numpad-grid">
                <div className="numpad-rakamlar">
                  {["7","8","9","4","5","6","1","2","3",".","0"].map((t) => (
                    <button key={t} className="numpad-tus" onClick={() => numpadTus(t)}>
                      {t}
                    </button>
                  ))}
                  <button className="numpad-tus" aria-label="Sil" onClick={() => numpadTus("⌫")}>
                    <Delete size={20} />
                  </button>
                </div>

                <div className="numpad-eylem">
                  <button className="numpad-tus eylem" onClick={() => numpadTus("Tümü")}>
                    Tümü
                  </button>

                  <div className="th-bolme">
                    <button
                      className={boleAcik ? "numpad-tus eylem acik" : "numpad-tus eylem"}
                      onClick={() => setBoleAcik((a) => !a)}
                    >
                      <Split size={16} />
                      1/n
                    </button>
                    {boleAcik && (
                      <div className="th-bolme-liste">
                        <p>{secimVar ? "Seçilen ürünü böl" : "Hesabı böl"}</p>
                        {[2, 3, 4, 5, 6].map((n) => (
                          <button key={n} onClick={() => { boleSec(n); setBoleAcik(false); }}>
                            1/{n}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {indirimYapabilir() && (
                    <button className="numpad-tus eylem" onClick={() => setIndirimAcik(true)}>
                      <Percent size={16} />
                      {secimVar ? "Ürüne" : "İndirim"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="th-sutun th-odeme">
            <div className="th-sekmeler">
              <button
                className={sekme === "odeme" ? "th-sekme acik" : "th-sekme"}
                onClick={() => setSekme("odeme")}
              >
                Ödeme Tipi
              </button>
              <button
                className={sekme === "bahsis" ? "th-sekme acik" : "th-sekme"}
                onClick={() => setSekme("bahsis")}
              >
                <HandCoins size={16} />
                Bahşiş
                {bekleyenBahsis > 0 && <em className="th-sekme-rozet">₺{bekleyenBahsis}</em>}
              </button>
            </div>

            {sekme === "odeme" ? (
              <>
                {bahsis > 0 && (
                  <div className="th-bahsis-serit">
                    <span>Bu ödemeye ₺{bahsis} bahşiş eklenecek</span>
                    <button onClick={() => { setBahsis(0); setBahsisGirdi(""); }}>
                      <X size={15} />
                      Kaldır
                    </button>
                  </div>
                )}
                <OdemeTipDugmeleri tipler={odemeTipleri} onSec={odemeAl} />
              </>
            ) : (
              <div className="th-bahsis">
                {bekleyenTip && (
                  <p className="th-bahsis-not">
                    Girilen tutar kalandan fazla. Üstü <strong>{bekleyenTip}</strong> tahsilatına
                    bahşiş olarak yazılacak.
                  </p>
                )}

                <label className="th-bahsis-alan">
                  <span>Bahşiş tutarı</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="₺0"
                    value={bahsisGirdi}
                    onChange={(e) => setBahsisGirdi(e.target.value)}
                  />
                </label>

                <div className="th-bahsis-aksiyon">
                  <button
                    className="th-eylem"
                    onClick={() => {
                      setSekme("odeme");
                      setBekleyenTip(null);
                      setBahsisGirdi(bahsis > 0 ? String(bahsis) : "");
                    }}
                  >
                    Vazgeç
                  </button>
                  <button className="th-eylem birincil" onClick={bahsisOnayla}>
                    <Check size={17} />
                    {bekleyenTip ? `${bekleyenTip} ile tahsil et` : "Bahşişi ekle"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {indirimAcik && (
        <IndirimModal
          baslik={secimVar ? "Seçilen Ürüne İndirim" : undefined}
          araToplam={secimVar ? seciliTutar(secilen) : araToplam}
          mevcutIndirim={secimVar ? 0 : indirim}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar, kaynak) => {
            if (secimVar) kalemIndirimiDagit(tutar, kaynak);
            else onIndirimDegis(tutar, kaynak);
            setIndirimAcik(false);
          }}
        />
      )}

      {cariSorusu && (
        <MusteriSecici
          onSec={(m) => {
            tahsilatIsle(cariSorusu.tip, cariSorusu.tutar, bahsis || undefined, m.id);
            setCariSorusu(null);
          }}
          onKapat={() => setCariSorusu(null)}
        />
      )}

      {eksikAcik && (
        <EksikKapat
          kalan={kalan}
          musteri={musteri}
          onKapat={() => setEksikAcik(false)}
          onOnay={(kisi, sebep) => {
            setEksikAcik(false);
            onOdendi(tahsilatlar, { kisi, sebep, tutar: kalan });
          }}
        />
      )}

      {silmeSorusu !== null && tahsilatlar[silmeSorusu] && (
        <OnayModal
          baslik="Tahsilatı sil"
          ikon={<X size={20} />}
          mesaj={`${tahsilatlar[silmeSorusu].tip} ₺${tahsilatlar[silmeSorusu].tutar} tahsilatı hesaptan çıkarılacak. Sebebi nedir?`}
          tehlikeli
          sebepler={SILME_SEBEPLERI}
          onayMetni="Evet, sil"
          onOnay={(sebep) => {
            tahsilatiCikar(silmeSorusu, sebep);
            setSilmeSorusu(null);
          }}
          onKapat={() => setSilmeSorusu(null)}
        />
      )}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}
    </div>
  );
}