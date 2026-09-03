import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Ban,
  Banknote,
  Clock,
  DoorOpen,
  Gift,
  HandCoins,
  History,
  LockOpen,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import OnayModal from "./OnayModal";
import OdemeTipDuzelt from "./OdemeTipDuzelt";
import { adetGoster, paraGoster } from "../para";
import { yetkiVar } from "../oturum";
import { adisyonIkram, adisyonIptal } from "../adisyonlar";
import { ODENMEZ_ANAHTAR, odenmezleriGetir, type Odenmez } from "../odenmezler";
import { useTanim } from "../tanimAbonelik";
import {
  adisyonAktifEt,
  adisyonDetayi,
  tahsilatTipiDuzelt,
  tamamiIkram,
  type AdisyonDetay as Detay,
} from "../analiz";
import type { SepetKalemi } from "../types";

const saat = (t: string) =>
  new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const gunSaat = (t: string) =>
  `${new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })} ${saat(t)}`;

const TIP_ADLARI = { masa: "Masa", gelal: "Gel Al", paket: "Paket" };

const DURUM_ADLARI = { acik: "Açık", kapali: "Kapandı", iptal: "İptal edildi" };

const durumAdi = (d: Detay) => (tamamiIkram(d) ? "İkram edildi" : DURUM_ADLARI[d.durum]);

/**
 * Adisyonun her yerden açılan tek detay penceresi: solda sipariş bilgileri,
 * ortada ürünler ve hesap dökümü, sağda tahsilatlar. Üç sütun yan yana duruyor
 * ki hesabı incelerken ürünle ödeme arasında aşağı yukarı gezinmek gerekmesin.
 * Sipariş geçmişi sütunların yerini alıyor — ikisi aynı anda kalabalık ediyor.
 */
export default function AdisyonDetay({
  adisyonId,
  onKapat,
  onDegisti,
}: {
  adisyonId: number;
  onKapat: () => void;
  /** Adisyon yeniden açıldığında listenin tazelenmesi için. */
  onDegisti?: () => void;
}) {
  const [detay, setDetay] = useState<Detay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gecmis, setGecmis] = useState(false);
  const [aktifSor, setAktifSor] = useState(false);
  const [islem, setIslem] = useState<"iptal" | "ikram" | null>(null);
  const [duzeltilen, setDuzeltilen] = useState<Detay["tahsilatlar"][number] | null>(null);
  const [hata, setHata] = useState("");
  // Liste sunucuda değişince ekran kendiliğinden yeniliyor.
  const odenmezler = useTanim<Odenmez[]>(ODENMEZ_ANAHTAR, odenmezleriGetir, []);
  const navigate = useNavigate();

  useEffect(() => {
    setYukleniyor(true);
    adisyonDetayi(adisyonId).then((d) => {
      setDetay(d);
      setYukleniyor(false);
    });
  }, [adisyonId]);

  const siparisYolu = detay
    ? detay.masaId
      ? `/siparis/${detay.masaId}`
      : `/adisyon/${detay.id}`
    : "";

  const aktifEt = async () => {
    if (!detay) return;
    setAktifSor(false);
    try {
      await adisyonAktifEt(detay);
      onDegisti?.();
      navigate(siparisYolu);
    } catch (e) {
      setHata((e as Error).message);
    }
  };

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal tam detay-pencere" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust detay-ust">
          <h3>
            Adisyon #{detay?.no ?? "…"}
            {detay && (
              <span className={detay.durum === "acik" ? "detay-rozet acik" : "detay-rozet"}>
                {durumAdi(detay)}
              </span>
            )}
          </h3>

          <div className="detay-aksiyon">
            {detay && (
              <>
                <button
                  className={gecmis ? "detay-dugme acik" : "detay-dugme"}
                  onClick={() => setGecmis(!gecmis)}
                >
                  <History size={16} />
                  {gecmis ? "Detaya dön" : "Sipariş geçmişi"}
                </button>

                {detay.durum === "acik" ? (
                  <>
                    {yetkiVar("siparis.adisyon_ikram") && (
                      <button className="detay-dugme" onClick={() => setIslem("ikram")}>
                        <Gift size={16} /> İkram et
                      </button>
                    )}
                    {yetkiVar("siparis.iptal") && (
                      <button className="detay-dugme" onClick={() => setIslem("iptal")}>
                        <Ban size={16} /> İptal et
                      </button>
                    )}
                    <button className="detay-dugme ana" onClick={() => navigate(siparisYolu)}>
                      Siparişe git <ArrowRight size={16} />
                    </button>
                  </>
                ) : detay.durum === "iptal" ? null : (
                  yetkiVar("siparis.aktif_et") && (
                    <button className="detay-dugme ana" onClick={() => setAktifSor(true)}>
                      <LockOpen size={16} /> Siparişi aktif et
                    </button>
                  )
                )}
              </>
            )}
            <button className="up-kapat" onClick={onKapat}>
              <X size={19} />
            </button>
          </div>
        </header>

        {yukleniyor || !detay ? (
          <div className="yukleniyor">
            <div className="cember" />
          </div>
        ) : gecmis ? (
          <div className="detay-govde tek">
            <ZamanCizelgesi detay={detay} />
          </div>
        ) : (
          <div className="detay-govde">
            <section className="detay-sutun">
              <h4>Sipariş bilgileri</h4>
              <Bilgiler detay={detay} />
            </section>

            <section className="detay-sutun orta">
              <h4>Ürünler</h4>
              {detay.turlar.length === 0 ? (
                <p className="detay-bos">Bu adisyona hiç ürün girilmemiş.</p>
              ) : (
                <ul className="detay-kalemler">
                  {detay.turlar.map((tur) =>
                    tur.kalemler.map((k) => (
                      <Kalem key={k.id} kalem={k} tur={tur.saat} garson={tur.garson} />
                    ))
                  )}
                </ul>
              )}

              <dl className="detay-dokum">
                <div>
                  <dt>Ara toplam</dt>
                  <dd>{paraGoster(detay.araToplam)}</dd>
                </div>
                <div>
                  <dt>İndirim</dt>
                  <dd className={detay.indirim ? "azalan" : ""}>
                    {detay.indirim ? `−${paraGoster(detay.indirim)}` : paraGoster(0)}
                  </dd>
                </div>
                <div>
                  <dt>Brüt tutar</dt>
                  <dd>{paraGoster(detay.matrah)}</dd>
                </div>
                <div>
                  <dt>KDV</dt>
                  <dd>{paraGoster(detay.kdv)}</dd>
                </div>
                {detay.kuver > 0 && (
                  <div>
                    <dt>Kuver{detay.kisiSayisi ? ` (${detay.kisiSayisi} kişi)` : ""}</dt>
                    <dd>{paraGoster(detay.kuver)}</dd>
                  </div>
                )}
                {detay.garsoniye > 0 && (
                  <div>
                    <dt>Garsoniye</dt>
                    <dd>{paraGoster(detay.garsoniye)}</dd>
                  </div>
                )}
                <div className="dokum-toplam">
                  <dt>Toplam</dt>
                  <dd>{paraGoster(detay.toplam)}</dd>
                </div>
              </dl>
            </section>

            <section className="detay-sutun">
              <h4>Tahsilatlar</h4>
              {detay.tahsilatlar.length === 0 ? (
                <p className="detay-bos">Bu adisyondan tahsilat alınmamış.</p>
              ) : (
                <ul className="detay-tahsilatlar">
                  {detay.tahsilatlar.map((t) => (
                    <li key={t.id}>
                      <span>
                        <strong>{t.tip}</strong>
                        <em>
                          {saat(t.olusturma)}
                          {t.bahsis > 0 && ` · ${paraGoster(t.bahsis)} bahşiş`}
                        </em>
                      </span>
                      <b>{paraGoster(t.tutar)}</b>
                      {/* Kapanmış hesabın ödeme tipi yanlış yazılmış olabiliyor;
                          düzeltme yetkiye bağlı ve deftere kayıt düşüyor. */}
                      {detay.durum !== "acik" && yetkiVar("odeme.tip_duzelt") && (
                        <button
                          className="tahsilat-duzelt"
                          aria-label="Ödeme tipini düzelt"
                          onClick={() => setDuzeltilen(t)}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <dl className="detay-dokum">
                <div className="dokum-toplam">
                  <dt>Tahsil edilen</dt>
                  <dd>{paraGoster(detay.odenen)}</dd>
                </div>
                {detay.kalan > 0 && (
                  <div>
                    <dt>{detay.durum === "acik" ? "Kalan" : "Tahsil edilmedi"}</dt>
                    <dd className="azalan">{paraGoster(detay.kalan)}</dd>
                  </div>
                )}
              </dl>

              {/* Hesap eksik kapatıldıysa borcun kimde olduğu burada okunuyor;
                  cari hesap gelene kadar tek kayıt yeri bu. */}
              {detay.eksikKisi && (
                <div className="detay-eksik">
                  <span className="detay-eksik-ust">
                    <HandCoins size={15} /> {detay.eksikKisi}
                  </span>
                  <em>{detay.eksikSebep}</em>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {duzeltilen && detay && (
        <OdemeTipDuzelt
          tip={duzeltilen.tip}
          tutar={duzeltilen.tutar}
          onKapat={() => setDuzeltilen(null)}
          onKaydet={async (yeniTip, sebep) => {
            try {
              await tahsilatTipiDuzelt(detay, duzeltilen.id, yeniTip, sebep);
              setDuzeltilen(null);
              setDetay(await adisyonDetayi(adisyonId));
              onDegisti?.();
            } catch (e) {
              setDuzeltilen(null);
              setHata((e as Error).message);
            }
          }}
        />
      )}

      {aktifSor && detay && (
        <OnayModal
          baslik="Adisyon yeniden açılsın mı?"
          ikon={<LockOpen size={18} />}
          mesaj={`#${detay.no} numaralı adisyon tekrar açılıp sipariş ekranına gidilecek. Kapanmış hesap ciroya yazılmayı bırakır, yeniden kapatılana kadar açık görünür.`}
          onayMetni="Evet, aç"
          onOnay={aktifEt}
          onKapat={() => setAktifSor(false)}
        />
      )}

      {islem && detay && (
        <OnayModal
          baslik={islem === "iptal" ? "Adisyon iptal edilsin mi?" : "Adisyon ikram edilsin mi?"}
          ikon={islem === "iptal" ? <Ban size={18} /> : <Gift size={18} />}
          tehlikeli={islem === "iptal"}
          mesaj={
            islem === "iptal"
              ? `#${detay.no} numaralı adisyon iptal edilecek. Hesap ciroya yazılmaz; kayıt silinmez, iptal olarak durur.`
              : `#${detay.no} numaralı adisyondaki ürünlerin tamamı ikrama çevrilecek ve hesap sıfırlanıp kapanacak.`
          }
          sebepler={
            islem === "iptal"
              ? ["Yanlış masa açıldı", "Müşteri vazgeçti", "Sipariş yanlış girildi"]
              : ["İşletme ikramı", "Müşteri şikâyeti", "Tanıtım"]
          }
          onayMetni={islem === "iptal" ? "Evet, iptal et" : "Evet, ikram et"}
          odenmezler={islem === "ikram" ? odenmezler : undefined}
          onOnay={async (sebep, odenmezId) => {
            const tip = islem;
            setIslem(null);
            try {
              if (tip === "iptal") await adisyonIptal(detay.id, sebep ?? "");
              else await adisyonIkram(detay.id, sebep, odenmezId);
              setDetay(await adisyonDetayi(adisyonId));
              onDegisti?.();
            } catch (e) {
              setHata((e as Error).message);
            }
          }}
          onKapat={() => setIslem(null)}
        />
      )}

      {hata && <OnayModal tekTus mesaj={hata} onKapat={() => setHata("")} />}
    </div>
  );
}

function Bilgiler({ detay }: { detay: Detay }) {
  const satirlar: [string, string][] = [
    ["Sipariş türü", TIP_ADLARI[detay.tip]],
    ["Durum", durumAdi(detay)],
  ];
  if (detay.durum === "iptal" && detay.iptalSebep) {
    satirlar.push(["İptal sebebi", detay.iptalSebep]);
  }

  if (detay.tip === "masa") {
    satirlar.push(["Masa", [detay.bolgeAd, detay.masaAd].filter(Boolean).join(" · ") || "—"]);
  }
  satirlar.push(["Açan", detay.garson || "—"]);
  satirlar.push(["Açılış", gunSaat(detay.acilis)]);
  satirlar.push(["Kapanış", detay.kapanis ? gunSaat(detay.kapanis) : "Devam ediyor"]);
  if (detay.kisiSayisi > 0) satirlar.push(["Misafir", `${detay.kisiSayisi} kişi`]);
  if (detay.ad) satirlar.push(["Adisyon adı", detay.ad]);
  if (detay.musteri) satirlar.push(["Müşteri", detay.musteri]);
  if (detay.telefon) satirlar.push(["Telefon", detay.telefon]);
  if (detay.adres) satirlar.push(["Adres", detay.adres]);
  if (detay.indirimAd) satirlar.push(["İndirim", detay.indirimAd]);
  if (detay.not) satirlar.push(["Sipariş notu", detay.not]);

  return (
    <dl className="detay-bilgi">
      {satirlar.map(([etiket, deger]) => (
        <div key={etiket}>
          <dt>{etiket}</dt>
          <dd>{deger}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Kalem satırı Adisyo'daki gibi: adet · ürün · saat (kullanıcı) · tutar. */
function Kalem({
  kalem,
  tur,
  garson,
}: {
  kalem: SepetKalemi;
  tur: string;
  garson: string;
}) {
  const tutar = Math.max(0, kalem.fiyat * kalem.adet - (kalem.indirim ?? 0));
  const durum = kalem.durum ?? "normal";
  const altSatir = [kalem.porsiyon, kalem.secimler?.join(", "), kalem.not]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={durum === "iptal" ? "iptal" : ""}>
      <span className="kalem-adet">{adetGoster(kalem.adet)}</span>
      <span className="kalem-ad">
        <strong>{kalem.ad}</strong>
        {altSatir && <small>{altSatir}</small>}
        <em>
          {saat(tur)}
          {garson && ` · ${garson}`}
        </em>
      </span>
      <span className="kalem-tutar">
        {durum === "normal" ? paraGoster(tutar) : "—"}
        {durum !== "normal" && (
          <em className="kalem-durum">{durum === "ikram" ? "İkram" : "İptal"}</em>
        )}
        {durum === "normal" && kalem.indirim ? (
          <em>{kalem.indirimAd || "İndirimli"}</em>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Türetilmiş zaman çizelgesi. Ayrı bir denetim kaydı tutmuyoruz — turların ve
 * tahsilatların kendi saatleri olayları zaten sırayla anlatıyor.
 */
function ZamanCizelgesi({ detay }: { detay: Detay }) {
  type Olay = {
    zaman: string;
    ikon: React.ReactNode;
    kisi: string;
    baslik: string;
    alt?: string;
  };

  const olaylar: Olay[] = [
    {
      zaman: detay.acilis,
      ikon: <DoorOpen size={15} />,
      kisi: detay.garson,
      baslik: "Sipariş açıldı",
    },
    ...detay.turlar.map((tur) => ({
      zaman: tur.saat,
      ikon: <Plus size={15} />,
      kisi: tur.garson,
      baslik: "Yeni ürün eklendi",
      alt: tur.kalemler.map((k) => `${adetGoster(k.adet)} × ${k.ad}`).join(" · "),
    })),
    ...detay.tahsilatlar.map((t) => ({
      zaman: t.olusturma,
      ikon: <Banknote size={15} />,
      kisi: "",
      baslik: "Ödeme yapıldı",
      alt: `${t.tip} · ${paraGoster(t.tutar)}`,
    })),
  ];

  if (detay.kapanis) {
    olaylar.push({
      zaman: detay.kapanis,
      ikon: <Clock size={15} />,
      kisi: "",
      baslik: "Sipariş kapatıldı",
      alt: paraGoster(detay.toplam),
    });
  }

  olaylar.sort((a, b) => a.zaman.localeCompare(b.zaman));

  return (
    <ol className="detay-cizelge">
      {olaylar.map((o, i) => (
        <li key={i}>
          <span className="cizelge-saat">{gunSaat(o.zaman)}</span>
          <span className="cizelge-im">{o.ikon}</span>
          <span className="cizelge-metin">
            <strong>{o.baslik}</strong>
            {o.kisi && <b>{o.kisi}</b>}
            {o.alt && <em>{o.alt}</em>}
          </span>
        </li>
      ))}
    </ol>
  );
}
