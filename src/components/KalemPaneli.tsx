import { useEffect, useState } from "react";
import { Ban, Gift, Minus, Plus, RotateCcw, Send, X } from "lucide-react";
import OnayModal from "./OnayModal";
import MasaSecim from "./MasaSecim";
import Bilgi from "./Bilgi";
import { porsiyonFiyat } from "../menu";
import { tumAdisyonlar, yeniKalemId } from "../adisyonlar";
import { bolgeleriGetir } from "../masalar";
import { paraMetin, paraSayi, paraYaz } from "../para";
import { yetkiVar } from "../oturum";
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
  const [iptalSorusu, setIptalSorusu] = useState(false);
  const [tasimaAcik, setTasimaAcik] = useState(false);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [doluIdler, setDoluIdler] = useState<Set<number>>(new Set());

  const porsiyonlar = urun?.porsiyonlar ?? [];

  // Masa listesi ancak taşıma istenince gerekiyor; panel açılışını yavaşlatmasın.
  useEffect(() => {
    if (!tasimaAcik) return;
    Promise.all([bolgeleriGetir(), tumAdisyonlar()]).then(([b, a]) => {
      setBolgeler(b);
      setDoluIdler(new Set(Object.keys(a).map(Number)));
    });
  }, [tasimaAcik]);

  const porsiyonSec = (ad: string) => {
    setPorsiyon(ad);
    const p = porsiyonlar.find((x) => x.ad === ad);
    if (p) setFiyat(paraMetin(porsiyonFiyat(p, "masa")));
  };

  const kaydet = (durum: SepetKalemi["durum"], sebep?: string) => {
    const temel = {
      ...kalem,
      adet,
      fiyat: paraSayi(fiyat) ?? 0,
      porsiyon,
      not: notMetni.trim() || undefined,
      sebep,
    };

    // "2 salebin biri ikram": adet satırın tamamından azsa satır ikiye ayrılır —
    // kalanı normal kalır, işleme giren kısım kendi satırına geçer.
    const bolunuyor = durum !== "normal" && kalem.durum !== durum && adet < kalem.adet;

    if (bolunuyor) {
      onUygula([
        { ...temel, adet: kalem.adet - adet, durum: kalem.durum ?? "normal" },
        { ...temel, id: yeniKalemId(), adet, durum },
      ]);
      return;
    }

    onUygula([{ ...temel, durum }]);
  };

  const satirToplami = (paraSayi(fiyat) ?? 0) * adet;

  // Henüz kaydedilmemiş kalem (kimliği negatif) yanlış dokunuşun kendisidir;
  // mutfağa da hesaba da gitmedi, herkes geri alabilir. Kaydedilmiş kalemi
  // çıkarmak ise satışa müdahale — yetki istiyor.
  const cikarabilir = !kalem.id || kalem.id < 0 || yetkiVar("siparis.urun_cikar");

  // Panelde tek açıklama satırı duruyor, o da duruma göre değişiyor: üst üste
  // dizilmiş bilgi kutuları paneli ders kitabına çeviriyordu.
  const aciklama =
    kalem.durum === "iptal"
      ? "Kalem yeniden hesaba girer ve aynı üründen normal satır varsa onunla birleşir."
      : kalem.adet > 1 && adet < kalem.adet
        ? `İkram, iptal veya taşımada ${kalem.adet} adedin ${adet} tanesi işleme girer; kalan ${kalem.adet - adet} adet adisyonda durur.`
        : odenmis
          ? "Bu kalemin ödemesi işlendiği için taşınamaz. Önce ilgili tahsilatı geri alın."
          : null;

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="urun-panel" onClick={(e) => e.stopPropagation()}>
        <header className="kp-ust">
          <div className="kp-ust-satir">
            <h3>{kalem.ad}</h3>
            <button className="panel-kapat" onClick={onKapat}>
              <X size={19} />
            </button>
          </div>

          <div className="kp-rozetler">
            {porsiyon && <span className="kp-rozet">{porsiyon}</span>}
            {kalem.durum === "ikram" && <span className="kp-rozet ikram">İkram</span>}
            {kalem.durum === "iptal" && <span className="kp-rozet iptal">İptal edildi</span>}
            {kalem.indirim ? <span className="kp-rozet indirimli">₺{kalem.indirim} indirim</span> : null}
          </div>

          {/* Tutar başlığın içinde: adet ya da fiyat değiştikçe gözün takılı
              olduğu rakam anında güncelleniyor. */}
          <div className="kp-tutar">
            <span>Satır toplamı</span>
            <strong>₺{satirToplami.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</strong>
          </div>
        </header>

        <div className="panel-govde kp-govde">
          <div className="kp-satir">
            <label>Adet</label>
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
          </div>

          {/* Fiyat yetkisi olmayan kişi rakamı görür ama değiştiremez; kutuyu
              tamamen kaldırmak "bu ürün kaça satılıyor" bilgisini de götürürdü. */}
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
              <div className="kp-porsiyonlar">
                {porsiyonlar.map((p) => (
                  <button
                    key={p.ad}
                    className={p.ad === porsiyon ? "kp-porsiyon secili" : "kp-porsiyon"}
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
            <input
              className="kp-not"
              value={notMetni}
              onChange={(e) => setNotMetni(e.target.value)}
              placeholder="Az şekerli"
            />
          </div>

          {/* Kalemin durumunu değiştiren işler ayrı bir bölümde toplanıyor;
              adet ve fiyat düzenlemesiyle aynı hizada durmasınlar. */}
          <div className="kp-islemler">
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
                    <button className="kp-islem" onClick={() => kaydet("ikram")}>
                      <Gift size={16} />
                      İkram et
                      <em>Hesaba girmez</em>
                    </button>
                  ))}

                {tasinabilir && yetkiVar("siparis.kalem_tasi") && (
                  <button
                    className="kp-islem"
                    disabled={odenmis}
                    onClick={() => setTasimaAcik(true)}
                  >
                    <Send size={16} />
                    Başka masaya taşı
                  </button>
                )}

                {kalem.indirim ? (
                  <button
                    className="kp-islem geri-al"
                    onClick={() => onUygula([{ ...kalem, indirim: undefined }])}
                  >
                    <RotateCcw size={16} />
                    Ürün indirimini kaldır
                  </button>
                ) : null}

                {cikarabilir && (
                  <button className="kp-islem tehlikeli" onClick={() => setIptalSorusu(true)}>
                    <Ban size={16} />
                    Kalemi iptal et
                  </button>
                )}
              </>
            )}
          </div>

          {aciklama && <Bilgi>{aciklama}</Bilgi>}
        </div>

        <footer className="kp-alt">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            // İkram ve iptalin kendi düğmesi var; "Uygula" yalnız adet, fiyat,
            // porsiyon ve not düzenlemesini yazar, kalemin durumuna dokunmaz.
            onClick={() => kaydet(kalem.durum ?? "normal")}
          >
            Uygula
          </button>
        </footer>
      </div>

      {tasimaAcik && (
        <MasaSecim
          baslik="Kalemi taşı"
          aciklama={
            adet < kalem.adet
              ? `“${kalem.ad}” kaleminin ${kalem.adet} adedinden ${adet} tanesi seçtiğiniz masaya gider, kalan ${kalem.adet - adet} adet bu adisyonda durur. Boş masa seçerseniz orada yeni adisyon açılır.`
              : `“${kalem.ad}” seçtiğiniz masanın adisyonuna geçer. Boş masa seçerseniz orada yeni adisyon açılır.`
          }
          bolgeler={bolgeler}
          doluIdler={doluIdler}
          secilebilirlik="hepsi"
          haricId={masaId}
          onSec={(m) => {
            setTasimaAcik(false);
            onTasi(m.id, adet);
          }}
          onKapat={() => setTasimaAcik(false)}
        />
      )}

      {iptalSorusu && (
        <OnayModal
          baslik="Ürün iptali"
          ikon={<Ban size={20} />}
          mesaj={`“${kalem.ad}” hesaptan çıkarılacak. Sebebi nedir?`}
          tehlikeli
          sebepler={IPTAL_SEBEPLERI}
          onayMetni="Evet, iptal et"
          onOnay={(sebep) => kaydet("iptal", sebep)}
          onKapat={() => setIptalSorusu(false)}
        />
      )}
    </div>
  );
}
