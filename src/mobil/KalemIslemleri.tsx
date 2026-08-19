import { useEffect, useState } from "react";
import {
  Ban,
  Gift,
  Minus,
  Percent,
  Plus,
  RotateCcw,
  Send,
  StickyNote,
  X,
} from "lucide-react";
import IndirimModal from "../components/IndirimModal";
import OnayModal from "../components/OnayModal";
import { bolgeleriGetir } from "../masalar";
import { kalemTutari, tumAdisyonlar, yeniKalemId } from "../adisyonlar";
import { indirimYapabilir, yetkiVar } from "../oturum";
import { paraGoster } from "../para";
import type { Bolge, SepetKalemi } from "../types";

// İptal sebebi denetim defterine yazılıyor; seçenekler kasadakiyle aynı.
const IPTAL_SEBEPLERI = ["Müşteri vazgeçti", "Yanlış girildi", "Ürün bitti", "Hatalı hazırlandı"];

/**
 * Kalem değişikliğini sepete uygular.
 *
 * Kaydedilmiş bir kalemin adedi **artıyorsa** eski satır olduğu gibi kalıyor,
 * fark yeni bir satır olarak ekleniyor: müşteri o ürünü sonradan istedi, mutfak
 * yeni sipariş olarak görmeli ve adisyonda hangi turda kaç tane geldiği
 * okunabilmeli. Eskisinin üstüne yazmak, saati de mutfak fişini de kaybediyor.
 * Azaltma, ikram, iptal ve indirim satırın kendi üstünde işleniyor.
 */
export function kalemiUygula(sepet: SepetKalemi[], eski: SepetKalemi, yeni: SepetKalemi) {
  const kaydedilmis = !!eski.id && eski.id > 0;
  const fark = yeni.adet - eski.adet;

  if (kaydedilmis && fark > 0) {
    return [
      ...sepet.map((k) => (k.id === eski.id ? { ...yeni, adet: eski.adet } : k)),
      {
        ...yeni,
        id: yeniKalemId(),
        adet: fark,
        turSira: undefined,
        turSaat: undefined,
        turGarson: undefined,
        // Yeni satır kendi hesabına giriyor; eskisinin indirimi taşınmıyor.
        indirim: undefined,
        indirimTanimId: undefined,
        indirimAd: undefined,
      },
    ];
  }

  return sepet.map((k) => (k.id === eski.id ? yeni : k)).filter((k) => k.adet > 0);
}

/**
 * Bir kalemin işlemleri — masaüstü KalemPaneli'nin mobil karşılığı.
 *
 * Üstte ürün, adet ve satır tutarı; altında işlemler. Adet, not ve indirim
 * satırın kendi üstünde değişiyor; ikram, iptal ve taşıma ayrı düğmeler.
 * Kaydedilmemiş kalem (kimliği negatif) yanlış dokunuşun kendisidir: adedini
 * ve çıkarılmasını herkes yapabiliyor, kaydedilmiş kalem yetki istiyor.
 */
export default function KalemIslemleri({
  kalem,
  tasinabilir,
  onKapat,
  onUygula,
  onTasi,
}: {
  kalem: SepetKalemi;
  /** Ödemesi işlenmiş ya da masasız adisyonda taşıma yok. */
  tasinabilir?: boolean;
  onKapat: () => void;
  onUygula: (yeni: SepetKalemi) => void;
  onTasi?: (hedefMasaId: number, adet: number) => void;
}) {
  const yeniKalem = !kalem.id || kalem.id < 0;
  const [adet, setAdet] = useState(kalem.adet);
  const [notAcik, setNotAcik] = useState(false);
  const [notMetni, setNotMetni] = useState(kalem.not ?? "");
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [iptalSorusu, setIptalSorusu] = useState(false);
  const [tasimaAcik, setTasimaAcik] = useState(false);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [dolular, setDolular] = useState<Set<number>>(new Set());

  // Masa listesi ancak taşıma istenince gerekiyor; sayfa açılışını yavaşlatmasın.
  useEffect(() => {
    if (!tasimaAcik) return;
    Promise.all([bolgeleriGetir(), tumAdisyonlar()]).then(([b, a]) => {
      setBolgeler(b);
      setDolular(new Set(Object.keys(a).map(Number)));
    });
  }, [tasimaAcik]);

  const normal = (kalem.durum ?? "normal") === "normal";
  const miktarDegisir = yeniKalem || yetkiVar("siparis.miktar");
  const cikarabilir = yeniKalem || yetkiVar("siparis.urun_cikar");
  const satirTutari = kalem.fiyat * adet - (kalem.indirim ?? 0);

  const uygula = (degisen: Partial<SepetKalemi>) => onUygula({ ...kalem, adet, ...degisen });

  return (
    <>
      <div className="m-perde" onClick={onKapat}>
        <div className="m-sayfa" onClick={(e) => e.stopPropagation()}>
          <header className="m-kalem-ust">
            <div>
              <h2>{kalem.ad}</h2>
              {!!(kalem.porsiyon || kalem.secimler?.length) && (
                <p>{[kalem.porsiyon, ...(kalem.secimler ?? [])].filter(Boolean).join(" · ")}</p>
              )}
              {kalem.durum === "ikram" && <span className="m-kalem-rozet ikram">İkram</span>}
              {kalem.durum === "iptal" && <span className="m-kalem-rozet iptal">İptal edildi</span>}
            </div>
            <button className="m-ikon-dugme" onClick={onKapat} aria-label="Kapat">
              <X size={20} />
            </button>
          </header>

          {/* Adet ve satır tutarı yan yana: rakam değiştikçe tutar da oynuyor. */}
          <div className="m-kalem-sayac">
            {miktarDegisir ? (
              <div className="m-sayac kucuk">
                <button onClick={() => setAdet((a) => Math.max(1, a - 1))} aria-label="Azalt">
                  <Minus size={20} />
                </button>
                <span>{adet}</span>
                <button onClick={() => setAdet((a) => a + 1)} aria-label="Artır">
                  <Plus size={20} />
                </button>
              </div>
            ) : (
              <span className="m-sayac-sabit">{adet} adet</span>
            )}
            <strong>{paraGoster(Math.max(0, satirTutari))}</strong>
          </div>

          <div className="m-islemler">
            {!normal ? (
              <button className="m-islem" onClick={() => uygula({ durum: "normal" })}>
                <RotateCcw size={19} />
                {kalem.durum === "ikram" ? "İkramı geri al" : "İptali geri al"}
              </button>
            ) : (
              <>
                <button className="m-islem" onClick={() => setNotAcik(true)}>
                  <StickyNote size={19} />
                  {kalem.not ? "Notu değiştir" : "Not ekle"}
                  {kalem.not ? <em>{kalem.not}</em> : null}
                </button>

                {indirimYapabilir() && (
                  <button className="m-islem" onClick={() => setIndirimAcik(true)}>
                    <Percent size={19} />
                    Ürüne indirim
                    {kalem.indirim ? <em>{paraGoster(kalem.indirim)}</em> : null}
                  </button>
                )}

                {yetkiVar("siparis.ikram") && (
                  <button className="m-islem" onClick={() => uygula({ durum: "ikram" })}>
                    <Gift size={19} />
                    İkram et
                  </button>
                )}

                {tasinabilir && !yeniKalem && yetkiVar("siparis.kalem_tasi") && (
                  <button className="m-islem" onClick={() => setTasimaAcik(true)}>
                    <Send size={19} />
                    Başka masaya taşı
                  </button>
                )}

                {cikarabilir && (
                  <button
                    className="m-islem tehlikeli"
                    onClick={() => (yeniKalem ? uygula({ adet: 0 }) : setIptalSorusu(true))}
                  >
                    <Ban size={19} />
                    {yeniKalem ? "Kalemi çıkar" : "Kalemi iptal et"}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Adet değiştiyse kaydedilmesi gerekiyor; değişmediyse düğme çıkmıyor. */}
          {adet !== kalem.adet && (
            <div className="m-kalem-alt">
              <button className="m-ode-btn" onClick={() => uygula({})}>
                {adet} adet olarak kaydet
              </button>
            </div>
          )}
        </div>
      </div>

      {notAcik && (
        <div className="m-perde" onClick={() => setNotAcik(false)}>
          <div className="m-sayfa kisa" onClick={(e) => e.stopPropagation()}>
            <header className="m-sayfa-ust">
              <h2>Ürün notu</h2>
              <button className="m-ikon-dugme" onClick={() => setNotAcik(false)} aria-label="Kapat">
                <X size={20} />
              </button>
            </header>
            <div className="m-not-govde">
              <input
                className="m-arama"
                autoFocus
                value={notMetni}
                placeholder="Az pişmiş, buzsuz…"
                onChange={(e) => setNotMetni(e.target.value)}
              />
              <button
                className="m-ode-btn"
                onClick={() => {
                  setNotAcik(false);
                  uygula({ not: notMetni.trim() || undefined });
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {indirimAcik && (
        <IndirimModal
          baslik="Ürüne İndirim"
          araToplam={kalemTutari(kalem) + (kalem.indirim ?? 0)}
          mevcutIndirim={kalem.indirim ?? 0}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar, kaynak) => {
            setIndirimAcik(false);
            uygula({ indirim: tutar, indirimTanimId: kaynak?.id, indirimAd: kaynak?.ad });
          }}
        />
      )}

      {iptalSorusu && (
        <OnayModal
          baslik="Kalemi iptal et"
          ikon={<Ban size={20} />}
          mesaj={`“${kalem.ad}” hesaptan düşecek. Kayıt silinmez, iptal olarak durur. Sebebi nedir?`}
          tehlikeli
          sebepler={IPTAL_SEBEPLERI}
          onayMetni="Evet, iptal et"
          onOnay={(sebep) => {
            setIptalSorusu(false);
            uygula({ durum: "iptal", sebep });
          }}
          onKapat={() => setIptalSorusu(false)}
        />
      )}

      {tasimaAcik && (
        <div className="m-perde" onClick={() => setTasimaAcik(false)}>
          <div className="m-sayfa" onClick={(e) => e.stopPropagation()}>
            <header className="m-sayfa-ust">
              <h2>Hangi masaya?</h2>
              <button className="m-ikon-dugme" onClick={() => setTasimaAcik(false)} aria-label="Kapat">
                <X size={20} />
              </button>
            </header>
            <div className="m-sayfa-icerik">
              <div className="m-liste">
                {bolgeler.flatMap((b) =>
                  b.masalar
                    .filter((m) => m.aktif)
                    .map((m) => (
                      <button
                        key={m.id}
                        className="m-satir"
                        onClick={() => {
                          setTasimaAcik(false);
                          onTasi?.(m.id, adet);
                        }}
                      >
                        <span>
                          {m.ad}
                          <small>
                            {b.ad} · {dolular.has(m.id) ? "dolu" : "boş"}
                          </small>
                        </span>
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
