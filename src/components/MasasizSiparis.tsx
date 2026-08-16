import { useState } from "react";
import { Bike, ShoppingBag, UserRound, X } from "lucide-react";
import Bilgi from "./Bilgi";
import MusteriSecici from "./MusteriSecici";
import type { MusteriBilgisi } from "../adisyonlar";
import { adresleriGetir, tamAd, type Musteri } from "../cari";
import { ayarlar } from "../isletmeAyarlari";

type Tip = "gelal" | "paket";

/**
 * Gel al / paket siparişi açma penceresi. Müşteri alanlarının hepsi isteğe
 * bağlı: tezgâhta bekleyen müşteri için ad yazmak bile gereksiz, kuryeye
 * gidecek siparişte ise adres işe yarıyor.
 */
export default function MasasizSiparis({
  baslangicTipi = "gelal",
  mevcut,
  onKapat,
  onAc,
}: {
  baslangicTipi?: Tip;
  /** Doluysa yeni sipariş değil, var olanın müşteri bilgisi düzenleniyor. */
  mevcut?: MusteriBilgisi & { tip: Tip };
  onKapat: () => void;
  onAc: (tip: Tip, musteri: MusteriBilgisi) => void;
}) {
  const [tip, setTip] = useState<Tip>(mevcut?.tip ?? baslangicTipi);
  const [ad, setAd] = useState(mevcut?.ad ?? "");
  const [telefon, setTelefon] = useState(mevcut?.telefon ?? "");
  const [adres, setAdres] = useState(mevcut?.adres ?? "");
  const [musteriId, setMusteriId] = useState<number | null>(mevcut?.musteriId ?? null);
  const [seciciAcik, setSeciciAcik] = useState(false);

  // Kayıtlı müşteri seçilince alanlar onun bilgisiyle doluyor; adres varsayılan
  // adresinden geliyor. Sonrasında elle düzeltilebiliyor — bugün başka bir
  // adrese gidiyor olabilir.
  const musteriyiAl = async (m: Musteri) => {
    setMusteriId(m.id);
    setAd(tamAd(m));
    setTelefon(m.telefon);
    const adresler = await adresleriGetir(m.id);
    const secili = adresler.find((a) => a.varsayilan) ?? adresler[0];
    if (secili) setAdres(secili.adres);
    setSeciciAcik(false);
  };

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>
            {mevcut
              ? "Sipariş bilgileri"
              : tip === "paket"
                ? "Yeni paket siparişi"
                : "Yeni gel al siparişi"}
          </h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          {/* Yeni siparişte tür zaten girilen karttan belli; sadece var olan
              siparişin türü düzeltilirken seçici gösteriliyor. */}
          {/* Tek tür açıksa seçilecek bir şey de yok. */}
          {mevcut && ayarlar().gelalAcik && ayarlar().paketAcik && (
          <div className="alan">
            <label>Sipariş türü</label>
            <div className="mod-sec">
              <button className={tip === "gelal" ? "aktif" : ""} onClick={() => setTip("gelal")}>
                <ShoppingBag size={16} /> Gel Al
              </button>
              <button className={tip === "paket" ? "aktif" : ""} onClick={() => setTip("paket")}>
                <Bike size={16} /> Paket
              </button>
            </div>
            <Bilgi>
              Gel Al siparişi müşteri tezgâhtan alır, Paket siparişi adrese gider.
              Ürünün o türe ait fiyatı tanımlıysa satışta o fiyat kullanılır.
            </Bilgi>
          </div>
          )}

          <div className="alan">
            <label>Müşteri adı</label>
            <input
              value={ad}
              onChange={(e) => {
                setAd(e.target.value);
                // Ad elle değiştirildiyse artık kayıtlı müşteri değil: bağlantı
                // kopuyor, yoksa başkasının carisine sipariş yazılabilirdi.
                setMusteriId(null);
              }}
              placeholder="İsteğe bağlı"
              autoFocus
            />
            <button className="satir-tus musteri-sec" onClick={() => setSeciciAcik(true)}>
              <UserRound size={15} />
              {musteriId ? "Başka müşteri seç" : "Kayıtlı müşteriden seç"}
            </button>
          </div>

          <div className="alan">
            <label>Telefon</label>
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="İsteğe bağlı"
              inputMode="tel"
            />
          </div>

          {tip === "paket" && (
            <div className="alan">
              <label>Adres</label>
              <input
                value={adres}
                onChange={(e) => setAdres(e.target.value)}
                placeholder="Mahalle, sokak, kapı no"
              />
            </div>
          )}
        </div>

        <footer className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            onClick={() =>
              onAc(tip, {
                ad,
                telefon,
                adres: tip === "paket" ? adres : "",
                musteriId,
              })
            }
          >
            {mevcut ? "Kaydet" : "Siparişi aç"}
          </button>
        </footer>
      </div>

      {seciciAcik && (
        <MusteriSecici
          baslik="Müşteri seç"
          hepsi
          onSec={musteriyiAl}
          onKapat={() => setSeciciAcik(false)}
        />
      )}
    </div>
  );
}
