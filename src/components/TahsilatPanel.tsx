import { useEffect, useState } from "react";
import { Check, CircleCheckBig, Delete, HandCoins, Percent, Save, X } from "lucide-react";
import { OdemeIkon } from "../odemeIkon";
import IndirimModal from "./IndirimModal";
import type { IndirimKaynagi } from "../indirimler";
import OnayModal from "./OnayModal";
import EksikKapat from "./EksikKapat";
import KdvDokum from "./KdvDokum";
import OdemeTipDugmeleri from "./OdemeTipDugmeleri";
import MusteriSecici from "./MusteriSecici";
import { adetGoster } from "../para";
import { kalemTutari } from "../adisyonlar";
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
  // Kalandan fazla girilen tutar onaya düşer: üstü bahşiş mi, yanlış giriş mi?
  const [bahsisSorusu, setBahsisSorusu] = useState<{ tip: string; bahsis: number } | null>(null);
  // Açık hesap tipinde borcun kime yazılacağı soruluyor; tahsilat seçim
  // penceresi kapanana kadar bekliyor.
  const [cariSorusu, setCariSorusu] = useState<{ tip: string; tutar: number } | null>(null);
  // Kaydedilmiş tahsilatın silinmesi sebep soruyor; sıradaki satırın yeri.
  const [silmeSorusu, setSilmeSorusu] = useState<number | null>(null);
  const [eksikAcik, setEksikAcik] = useState(false);

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
    if (v === "Tümü") { setGirilen(String(kalan)); return; }
    setGirilen((g) => g + v);
  };

  // İkram ve iptal edilen kalemler listede durur ama ödemeye girmez.
  const odenebilir = (k: SepetKalemi) => (k.durum ?? "normal") === "normal";

  const kurus = (t: number) => Math.round(t * 100) / 100;
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
    const tutar = girilen ? Number(girilen) : kalan;
    if (tutar <= 0) return;
    if (tutar > kalan) { setBahsisSorusu({ tip, bahsis: tutar - kalan }); return; }
    // Açık hesap kasaya para getirmiyor, birinin borcuna yazılıyor: kime
    // yazıldığı sorulmadan tahsilat işlenmiyor.
    if (odemeTipleri.find((t) => t.ad === tip)?.acikHesap) {
      setCariSorusu({ tip, tutar });
      return;
    }
    tahsilatIsle(tip, tutar);
  };

  // Bahşiş kalanı azaltmaz; tahsilata kalanın kendisi yazılır, üstü ayrı alanda
  // durur. Yoksa hesap eksi kalana düşer.
  const tahsilatIsle = (tip: string, tutar: number, bahsis?: number, musteriId?: number) => {
    const secilenKalemler = Object.keys(secilen).length > 0 ? kalemPaylari(tutar) : undefined;
    const yeni = [
      ...(tahsilatlar ?? []),
      { tip, tutar, bahsis, musteriId, kalemler: secilenKalemler },
    ];
    setTahsilatlar(yeni);
    setSecilen({});
    setGirilen("");
    onKaydet(yeni);
  };

  // Kalan sıfırlansa bile adisyon kendi kendine kapanmaz; kapatma kararı
  // kullanıcınındır, panel açık kalır.
  const odemeBitti = kalan <= 0;

  return (
    <div className="tahsilat-fon" onClick={onKapat}>
      <aside className="tahsilat-panel genis" onClick={(e) => e.stopPropagation()}>
        <header className="tahsilat-ust">
          <h2>Tahsilat — Toplam ₺{toplam} / Kalan ₺{kalan}</h2>
          <button className="kapat" onClick={onKapat}><X size={20} /></button>
        </header>

        <div className="tahsilat-iki-sutun">
          <div className="tahsilat-sol">
            <p className="sutun-baslik">Ürünler</p>
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

            {(tahsilatlar ?? []).length > 0 && (
              <div className="tahsilat-gecmis">
                <p className="gecmis-baslik">Alınan Ödemeler</p>
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
          </div>

          <div className="tahsilat-sag">
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
              {bahsisToplam > 0 && (
                <div className="tutar-satir bahsis">
                  <span>Bahşiş</span><span>₺{bahsisToplam}</span>
                </div>
              )}
              <div className="tutar-satir kalan-satir">
                <span>Kalan</span><strong>₺{kalan}</strong>
              </div>
            </div>

            <div className="odeme-numpad">
              <input
                className="numpad-ekran"
                type="number"
                placeholder={`₺${kalan}`}
                value={girilen}
                onChange={(e) => { setSecilen({}); setGirilen(e.target.value); }}
              />
              <div className="numpad-grid">
                {["7","8","9","4","5","6","1","2","3","Tümü","0","⌫"].map((t) => (
                  <button
                    key={t}
                    className={t === "Tümü" ? "numpad-tus tum" : "numpad-tus"}
                    onClick={() => numpadTus(t)}
                  >
                    {t === "⌫" ? <Delete size={20} /> : t}
                  </button>
                ))}
              </div>
              <p className="bolme-baslik">
                {Object.keys(secilen).length > 0 ? "Seçilen ürünü böl" : "Hesabı böl"}
              </p>
              <div className="bolme-kisayol">
                {[2, 3, 4].map((n) => (
                  <button key={n} onClick={() => boleSec(n)}>
                    1/{n}
                  </button>
                ))}
                {indirimYapabilir() && (
                  <button className="indirim-kisayol" onClick={() => setIndirimAcik(true)}>
                    <Percent size={15} />
                    {secimVar ? "Ürüne indirim" : "İndirim"}
                  </button>
                )}
              </div>
            </div>

            <OdemeTipDugmeleri tipler={odemeTipleri} onSec={odemeAl} />

            {/* Hesap kapansa bile masa oturmaya devam ediyor olabilir; kapatmak
                zorunlu değil, ödeme kaydedilip adisyon açık bırakılabiliyor. */}
            <div className="tahsilat-alt-butonlar">
              <button className="tahsilat-kaydet" onClick={() => { onKaydet(tahsilatlar); onKapat(); }}>
                <Save size={18} />
                Kaydet
              </button>
              {odemeBitti ? (
                <button className="tahsilat-kapat-btn" onClick={() => onOdendi(tahsilatlar)}>
                  <CircleCheckBig size={19} />
                  Adisyonu Kapat
                </button>
              ) : (
                // Parası eksik kalan hesap da kapatılabiliyor ama bu ayrı bir
                // karar: borç birine yazılıyor, kayıt düşüyor, yetki istiyor.
                yetkiVar("odeme.eksik_kapat") && (
                  <button className="tahsilat-eksik-btn" onClick={() => setEksikAcik(true)}>
                    <HandCoins size={19} />
                    Eksik Kapat
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </aside>

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

      {bahsisSorusu && (
        <OnayModal
          mesaj={`Girilen tutar kalandan ₺${bahsisSorusu.bahsis} fazla. Üstü bahşiş olarak yazılsın mı?`}
          onayMetni="Bahşiş yaz"
          onOnay={() => {
            tahsilatIsle(bahsisSorusu.tip, kalan, bahsisSorusu.bahsis);
            setBahsisSorusu(null);
          }}
          onKapat={() => setBahsisSorusu(null)}
        />
      )}

      {cariSorusu && (
        <MusteriSecici
          onSec={(m) => {
            tahsilatIsle(cariSorusu.tip, cariSorusu.tutar, undefined, m.id);
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