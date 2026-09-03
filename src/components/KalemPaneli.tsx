import { useEffect, useState } from "react";
import { ArrowLeft, Ban, Gift, Minus, Percent, Plus, RotateCcw, Send, Trash2, X } from "lucide-react";
import MasaSecim from "./MasaSecim";
import IndirimModal from "./IndirimModal";
import Bilgi from "./Bilgi";
import { porsiyonFiyat } from "../menu";
import { kalemTutari, tumAdisyonlar, yeniKalemId } from "../adisyonlar";
import { bolgeleriGetir } from "../masalar";
import { adetGoster, paraGoster, paraMetin, paraSayi, paraYaz } from "../para";
import { indirimYapabilir, yetkiVar } from "../oturum";
import { odenmezleriGetir, type Odenmez } from "../odenmezler";
import type { Bolge, MenuUrun, SepetKalemi } from "../types";

type Props = {
  kalem: SepetKalemi;
  urun?: MenuUrun; // porsiyon değiştirmek için; menüden silinmiş ürünlerde boş olabilir
  masaId: number;
  /** Ödemesi işlenmiş kalem taşınmaz; düğme yerine gerekçe gösteriliyor. */
  odenmis?: boolean;
  /** Gel al ve paket adisyonlarında masa yok, taşıma düğmesi de çıkmıyor. */
  tasinabilir?: boolean;
  onKapat: () => void;
  // İkram/iptal kalemin bir kısmına uygulanabildiği için satır ikiye bölünebilir.
  onUygula: (kalemler: SepetKalemi[]) => void;
  onTasi: (hedefMasaId: number, adet: number) => void;
};

// İptal sebebi denetim defterine yazılıyor; hazır seçenekler işin mutfaktaki
// gerçek sebepleri, listede olmayan durum için "Diğer" var.
const IPTAL_SEBEPLERI = [
  "Müşteri vazgeçti",
  "Yanlış girildi",
  "Ürün bitti",
  "Hatalı hazırlandı",
];

/**
 * Kalemin durumunu değiştiren işler pencereyi kip değiştirerek yürüyor:
 * ikram, iptal ve taşıma için pencerenin üstüne ikinci bir pencere açmıyoruz.
 * Kaç adedin işleme gireceği, sebep ve kime yazılacağı hep aynı yüzeyde
 * soruluyor; kullanıcı tek "geri" ile düzenlemeye dönüyor.
 */
type Kip = "ikram" | "iptal" | "tasi";

const KIP_BASLIK: Record<Kip, string> = {
  ikram: "İkram et",
  iptal: "Kalemi iptal et",
  tasi: "Başka masaya taşı",
};

export default function KalemPaneli({
  kalem,
  urun,
  masaId,
  odenmis,
  tasinabilir = true,
  onKapat,
  onUygula,
  onTasi,
}: Props) {
  const [adet, setAdet] = useState(kalem.adet);
  const [fiyat, setFiyat] = useState(paraMetin(kalem.fiyat));
  const [porsiyon, setPorsiyon] = useState(kalem.porsiyon);
  const [notMetni, setNotMetni] = useState(kalem.not ?? "");
  const [kip, setKip] = useState<Kip | null>(null);
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [odenmezler, setOdenmezler] = useState<Odenmez[]>([]);

  // Kipin kendi soruları: kaç adet işleme girecek, sebebi ne, kime yazılacak.
  const [kipAdet, setKipAdet] = useState(kalem.adet);
  const [sebep, setSebep] = useState("");
  const [serbestSebep, setSerbestSebep] = useState("");
  const [odenmezId, setOdenmezId] = useState<number | null>(null);

  const [masaSecimAcik, setMasaSecimAcik] = useState(false);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [doluIdler, setDoluIdler] = useState<Set<number>>(new Set());

  useEffect(() => {
    odenmezleriGetir().then(setOdenmezler);
  }, []);

  const porsiyonlar = urun?.porsiyonlar ?? [];

  // Masa listesi ancak taşıma istenince gerekiyor; panel açılışını yavaşlatmasın.
  useEffect(() => {
    if (!masaSecimAcik) return;
    Promise.all([bolgeleriGetir(), tumAdisyonlar()]).then(([b, a]) => {
      setBolgeler(b);
      setDoluIdler(new Set(Object.keys(a).map(Number)));
    });
  }, [masaSecimAcik]);

  const kipAc = (yeni: Kip) => {
    setKipAdet(adet);
    setSebep("");
    setSerbestSebep("");
    setOdenmezId(null);
    setKip(yeni);
  };

  const porsiyonSec = (ad: string) => {
    setPorsiyon(ad);
    const p = porsiyonlar.find((x) => x.ad === ad);
    if (p) setFiyat(paraMetin(porsiyonFiyat(p, "masa")));
  };

  const kaydet = (
    durum: SepetKalemi["durum"],
    islemAdedi = adet,
    kipSebep?: string,
    kipOdenmezId?: number | null
  ) => {
    const temel = {
      ...kalem,
      adet: islemAdedi,
      fiyat: paraSayi(fiyat) ?? 0,
      porsiyon,
      not: notMetni.trim() || undefined,
      sebep: kipSebep,
      // İkramdan çıkan kalem kimseye yazılı kalmasın.
      odenmezId: durum === "ikram" ? (kipOdenmezId ?? null) : null,
    };

    // "2 salebin biri ikram": adet satırın tamamından azsa satır ikiye ayrılır —
    // kalanı normal kalır, işleme giren kısım kendi satırına geçer.
    const bolunuyor =
      durum !== "normal" && kalem.durum !== durum && islemAdedi < kalem.adet;

    if (bolunuyor) {
      onUygula([
        { ...temel, adet: kalem.adet - islemAdedi, durum: kalem.durum ?? "normal" },
        { ...temel, id: yeniKalemId(), adet: islemAdedi, durum },
      ]);
      return;
    }

    onUygula([{ ...temel, durum }]);
  };

  const birim = paraSayi(fiyat) ?? 0;
  const satirToplami = birim * adet;
  const indirimsizToplam = satirToplami + (kalem.indirim ?? 0);

  // Henüz kaydedilmemiş kalem (kimliği negatif) yanlış dokunuşun kendisidir;
  // mutfağa da hesaba da gitmedi, herkes geri alabilir. Kaydedilmiş kalemi
  // çıkarmak ise satışa müdahale — yetki istiyor.
  const yeniKalem = !kalem.id || kalem.id < 0;
  const cikarabilir = yeniKalem || yetkiVar("siparis.urun_cikar");
  const miktarDegistirebilir = yeniKalem || yetkiVar("siparis.miktar");

  // Panelde tek açıklama satırı duruyor, o da duruma göre değişiyor: üst üste
  // dizilmiş bilgi kutuları paneli ders kitabına çeviriyordu.
  const aciklama =
    kalem.durum === "iptal"
      ? "Kalem yeniden hesaba girer ve aynı üründen normal satır varsa onunla birleşir."
      : odenmis
        ? "Bu kalemin ödemesi işlendiği için taşınamaz. Önce ilgili tahsilatı geri alın."
        : null;

  const kipSebebi = sebep === "diger" ? serbestSebep.trim() : sebep;
  const kipOnaylanabilir = kip !== "iptal" || !!kipSebebi;

  const kipOnayla = () => {
    if (kip === "tasi") {
      setMasaSecimAcik(true);
      return;
    }
    if (kip === "ikram") kaydet("ikram", kipAdet, undefined, odenmezId);
    if (kip === "iptal") kaydet("iptal", kipAdet, kipSebebi);
  };

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal tam kp-modal" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          {kip && (
            <button className="kp-geri" onClick={() => setKip(null)} aria-label="Geri">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="kp-baslik">
            <h3>{kip ? KIP_BASLIK[kip] : kalem.ad}</h3>
            <div className="kp-rozetler">
              {kip ? (
                <span className="kp-rozet">{kalem.ad}</span>
              ) : (
                <>
                  {porsiyon && <span className="kp-rozet">{porsiyon}</span>}
                  {kalem.secimler?.map((s) => (
                    <span key={s} className="kp-rozet">
                      {s}
                    </span>
                  ))}
                  {kalem.durum === "ikram" && <span className="kp-rozet ikram">İkram</span>}
                  {kalem.durum === "iptal" && <span className="kp-rozet iptal">İptal edildi</span>}
                  {kalem.indirim ? (
                    <span className="kp-rozet indirimli">{paraGoster(kalem.indirim)} indirim</span>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <button className="up-kapat" onClick={onKapat} aria-label="Kapat">
            <X size={19} />
          </button>
        </header>

        {/* Tutar başlığın hemen altında: adet ya da fiyat değiştikçe gözün
            takılı olduğu rakam anında güncelleniyor. */}
        <div className="kp-ozet">
          <span>Satır toplamı</span>
          <strong>
            {kalem.indirim ? <em className="kp-eski">{paraGoster(indirimsizToplam)}</em> : null}
            {paraGoster(Math.max(0, satirToplami))}
          </strong>
        </div>

        {kip ? (
          <div className="kp-kip">
            {kalem.adet > 1 && (
              <div className="kp-blok">
                <label>Kaç adet?</label>
                <div className="kp-kip-adet">
                  <div className="kp-adet">
                    <button
                      aria-label="Azalt"
                      disabled={kipAdet <= 1}
                      onClick={() => setKipAdet((a) => Math.max(1, a - 1))}
                    >
                      <Minus size={17} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={kalem.adet}
                      value={kipAdet}
                      onChange={(e) =>
                        setKipAdet(
                          Math.min(kalem.adet, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                    />
                    <button
                      aria-label="Artır"
                      disabled={kipAdet >= kalem.adet}
                      onClick={() => setKipAdet((a) => Math.min(kalem.adet, a + 1))}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  <button
                    className={kipAdet === kalem.adet ? "kp-tumu secili" : "kp-tumu"}
                    onClick={() => setKipAdet(kalem.adet)}
                  >
                    Tümü ({adetGoster(kalem.adet)})
                  </button>
                </div>
              </div>
            )}

            {kip === "iptal" && (
              <div className="kp-blok">
                <label>Sebebi nedir?</label>
                <div className="kp-secenekler">
                  {IPTAL_SEBEPLERI.map((s) => (
                    <button
                      key={s}
                      className={sebep === s ? "kp-secenek secili" : "kp-secenek"}
                      onClick={() => setSebep(s)}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    className={sebep === "diger" ? "kp-secenek secili" : "kp-secenek"}
                    onClick={() => setSebep("diger")}
                  >
                    Diğer
                  </button>
                </div>
                {sebep === "diger" && (
                  <input
                    className="kp-giris"
                    autoFocus
                    maxLength={80}
                    value={serbestSebep}
                    placeholder="Sebebi yazın"
                    onChange={(e) => setSerbestSebep(e.target.value)}
                  />
                )}
              </div>
            )}

            {kip === "ikram" && odenmezler.length > 0 && (
              <div className="kp-blok">
                <label>Kime yazılsın?</label>
                <div className="kp-secenekler">
                  {odenmezler.map((o) => (
                    <button
                      key={o.id}
                      className={odenmezId === o.id ? "kp-secenek secili" : "kp-secenek"}
                      onClick={() => setOdenmezId(o.id)}
                    >
                      {o.ad}
                    </button>
                  ))}
                  <button
                    className={odenmezId === null ? "kp-secenek secili" : "kp-secenek"}
                    onClick={() => setOdenmezId(null)}
                  >
                    Belirtilmesin
                  </button>
                </div>
              </div>
            )}

            <Bilgi>
              {kip === "ikram"
                ? `${adetGoster(kipAdet)} adet hesaptan düşülüyor, ürün adisyonda ikram olarak kalıyor.${
                    kipAdet < kalem.adet
                      ? ` Kalan ${adetGoster(kalem.adet - kipAdet)} adet normal satır olarak duruyor.`
                      : ""
                  }`
                : kip === "iptal"
                  ? `${adetGoster(kipAdet)} adet hesaptan çıkıyor. Kayıt silinmiyor, iptal olarak duruyor ve sebebi denetim defterine yazılıyor.`
                  : `Seçtiğiniz masanın adisyonuna ${adetGoster(kipAdet)} adet geçiyor. Boş masa seçerseniz orada yeni adisyon açılıyor.`}
            </Bilgi>
          </div>
        ) : (
          <div className="kp-govde">
            <div className="kp-sutun">
              <div className="kp-satir">
                <label>Adet</label>
                {/* Kaydedilmiş kalemin adedini değiştirmek yetki istiyor; kişi
                    henüz kaydetmediği kendi satırını serbestçe düzeltiyor. */}
                {miktarDegistirebilir ? (
                  <div className="kp-adet">
                    <button
                      aria-label="Azalt"
                      disabled={adet <= 1}
                      onClick={() => setAdet((a) => Math.max(1, a - 1))}
                    >
                      <Minus size={17} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={adet}
                      onChange={(e) => setAdet(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <button aria-label="Artır" onClick={() => setAdet((a) => a + 1)}>
                      <Plus size={17} />
                    </button>
                  </div>
                ) : (
                  <span className="kp-sabit">{adetGoster(kalem.adet)}</span>
                )}
              </div>

              {/* Fiyat yetkisi olmayan kişi rakamı görür ama değiştiremez;
                  kutuyu kaldırmak "bu ürün kaça satılıyor" bilgisini götürürdü. */}
              <div className="kp-satir">
                <label>Birim fiyat</label>
                {yetkiVar("siparis.fiyat") ? (
                  <div className="kp-para">
                    <em>₺</em>
                    <input
                      value={fiyat}
                      onChange={(e) => setFiyat(paraYaz(e.target.value))}
                      inputMode="decimal"
                    />
                  </div>
                ) : (
                  <strong className="kp-para-sabit">₺{fiyat}</strong>
                )}
              </div>

              {porsiyonlar.length > 1 && (
                <div className="kp-blok">
                  <label>Porsiyon</label>
                  <div className="kp-secenekler">
                    {porsiyonlar.map((p) => (
                      <button
                        key={p.ad}
                        className={p.ad === porsiyon ? "kp-secenek secili" : "kp-secenek"}
                        onClick={() => porsiyonSec(p.ad)}
                      >
                        {p.ad}
                        <em>₺{porsiyonFiyat(p, "masa")}</em>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="kp-blok">
                <label>Ürün notu</label>
                {/* Not mutfağa gidiyor; tek satırlık kutuda uzun tarif
                    yazılırken başı kayboluyordu. */}
                <textarea
                  className="kp-giris kp-not"
                  rows={3}
                  maxLength={200}
                  value={notMetni}
                  onChange={(e) => setNotMetni(e.target.value)}
                  placeholder="Az pişmiş, buzsuz, soğansız…"
                />
              </div>
            </div>

            {/* Kalemin durumunu değiştiren işler ayrı sütunda toplanıyor;
                adet ve fiyat düzenlemesiyle aynı hizada durmasınlar. */}
            <div className="kp-sutun kp-islemler">
              <label>İşlemler</label>

              {kalem.durum === "iptal" ? (
                cikarabilir && (
                  <button className="kp-islem geri-al" onClick={() => kaydet("normal")}>
                    <RotateCcw size={16} />
                    İptali geri al
                  </button>
                )
              ) : (
                <>
                  {yetkiVar("siparis.ikram") &&
                    (kalem.durum === "ikram" ? (
                      <button className="kp-islem geri-al" onClick={() => kaydet("normal")}>
                        <RotateCcw size={16} />
                        İkramı geri al
                      </button>
                    ) : (
                      <button className="kp-islem" onClick={() => kipAc("ikram")}>
                        <Gift size={16} />
                        İkram et
                        <em>Hesaba girmez</em>
                      </button>
                    ))}

                  {indirimYapabilir() && kalem.durum !== "ikram" && (
                    <button className="kp-islem" onClick={() => setIndirimAcik(true)}>
                      <Percent size={16} />
                      Ürüne indirim
                      {kalem.indirim ? <em>{paraGoster(kalem.indirim)}</em> : null}
                    </button>
                  )}

                  {kalem.indirim ? (
                    <button
                      className="kp-islem geri-al"
                      onClick={() =>
                        onUygula([
                          {
                            ...kalem,
                            indirim: undefined,
                            indirimTanimId: undefined,
                            indirimAd: undefined,
                          },
                        ])
                      }
                    >
                      <RotateCcw size={16} />
                      İndirimi kaldır
                    </button>
                  ) : null}

                  {tasinabilir && !yeniKalem && yetkiVar("siparis.kalem_tasi") && (
                    <button
                      className="kp-islem"
                      disabled={odenmis}
                      onClick={() => kipAc("tasi")}
                    >
                      <Send size={16} />
                      Başka masaya taşı
                    </button>
                  )}

                  {cikarabilir &&
                    (yeniKalem ? (
                      // Kaydedilmemiş satır hiçbir yere gitmedi: iptal kaydı
                      // açmaya değmez, sepetten düşüyor.
                      <button
                        className="kp-islem tehlikeli"
                        onClick={() => onUygula([{ ...kalem, adet: 0 }])}
                      >
                        <Trash2 size={16} />
                        Kalemi çıkar
                      </button>
                    ) : (
                      <button className="kp-islem tehlikeli" onClick={() => kipAc("iptal")}>
                        <Ban size={16} />
                        Kalemi iptal et
                      </button>
                    ))}
                </>
              )}

              {aciklama && <Bilgi>{aciklama}</Bilgi>}
            </div>
          </div>
        )}

        <footer className="kp-alt">
          {kip ? (
            <>
              <button className="iptal" onClick={() => setKip(null)}>
                Vazgeç
              </button>
              <button
                className={kip === "iptal" ? "uygula tehlikeli" : "uygula"}
                disabled={!kipOnaylanabilir}
                onClick={kipOnayla}
              >
                {kip === "ikram" ? "İkram et" : kip === "iptal" ? "İptal et" : "Masa seç"}
              </button>
            </>
          ) : (
            <>
              <button className="iptal" onClick={onKapat}>
                Vazgeç
              </button>
              <button
                className="uygula"
                // İkram, iptal ve taşımanın kendi kipi var; "Uygula" yalnız
                // adet, fiyat, porsiyon ve not düzenlemesini yazıyor.
                onClick={() => kaydet(kalem.durum ?? "normal")}
              >
                Uygula
              </button>
            </>
          )}
        </footer>
      </div>

      {masaSecimAcik && (
        <MasaSecim
          baslik="Kalemi taşı"
          aciklama={
            kipAdet < kalem.adet
              ? `“${kalem.ad}” kaleminin ${adetGoster(kalem.adet)} adedinden ${adetGoster(kipAdet)} tanesi seçtiğiniz masaya gider, kalan ${adetGoster(kalem.adet - kipAdet)} adet bu adisyonda durur. Boş masa seçerseniz orada yeni adisyon açılır.`
              : `“${kalem.ad}” seçtiğiniz masanın adisyonuna geçer. Boş masa seçerseniz orada yeni adisyon açılır.`
          }
          bolgeler={bolgeler}
          doluIdler={doluIdler}
          secilebilirlik="hepsi"
          haricId={masaId}
          onSec={(m) => {
            setMasaSecimAcik(false);
            onTasi(m.id, kipAdet);
          }}
          onKapat={() => setMasaSecimAcik(false)}
        />
      )}

      {/* İndirim penceresi olduğu gibi kalıyor — hesap indirimiyle aynı
          yüzeyi kullanmak "indirim nasıl verilir" sorusunu tek yerde tutuyor. */}
      {indirimAcik && (
        <IndirimModal
          baslik="Ürüne İndirim"
          araToplam={kalemTutari(kalem) + (kalem.indirim ?? 0)}
          mevcutIndirim={kalem.indirim ?? 0}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar, kaynak) => {
            setIndirimAcik(false);
            onUygula([
              {
                ...kalem,
                indirim: tutar,
                indirimTanimId: kaynak?.id,
                indirimAd: kaynak?.ad,
              },
            ]);
          }}
        />
      )}
    </div>
  );
}
