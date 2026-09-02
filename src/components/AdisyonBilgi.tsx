import { useState } from "react";
import { Minus, Phone, Plus, StickyNote, Tag, User, Users, X } from "lucide-react";
import Bilgi from "./Bilgi";

export type AdisyonBilgisi = {
  ad?: string;
  kisiSayisi?: number;
  not?: string;
  musteriAd?: string;
  musteriTelefon?: string;
};

/**
 * Adisyonun kendisine ait alanlar: ürünlerden bağımsız, hesabın kime ve kaç
 * kişiye ait olduğunu anlatan bilgiler. Hepsi isteğe bağlı — kalabalık masada
 * kişi sayısı, rezervasyonda isim işe yarıyor, sade satışta hiçbiri gerekmiyor.
 *
 * Kişi sayısı üstte kendi kartında duruyor: beşinin içinde en çok kullanılan o
 * ve kuver hesabı ona bakıyor. Diğerleri alt alta değil, ilişkili olanlar yan
 * yana — müşteri adı ile telefonu tek satırda.
 */
export default function AdisyonBilgi({
  baslik,
  no,
  bilgi,
  onKapat,
  onKaydet,
}: {
  baslik: string;
  no?: number;
  bilgi: AdisyonBilgisi;
  onKapat: () => void;
  onKaydet: (bilgi: AdisyonBilgisi) => void;
}) {
  const [ad, setAd] = useState(bilgi.ad ?? "");
  const [kisi, setKisi] = useState(bilgi.kisiSayisi ?? 0);
  const [not, setNot] = useState(bilgi.not ?? "");
  const [musteriAd, setMusteriAd] = useState(bilgi.musteriAd ?? "");
  const [musteriTelefon, setMusteriTelefon] = useState(bilgi.musteriTelefon ?? "");

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal ab-modal" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          <h3>{baslik}</h3>
          {no ? <span className="ab-no">Adisyon #{no}</span> : null}
          <button className="up-kapat" onClick={onKapat} aria-label="Kapat">
            <X size={19} />
          </button>
        </header>

        <div className="ab-govde">
          {/* Kuver kişi başına hesaplandığı için bu alan diğerlerinden önemli;
              forma sıra numarası olarak değil, kendi kartıyla giriyor. */}
          <div className="ab-kisi">
            <span className="ab-kisi-im">
              <Users size={19} />
            </span>
            <div className="ab-kisi-yazi">
              <strong>Kişi sayısı</strong>
              <em>Kuver bu sayıya göre hesaplanır</em>
            </div>
            <div className="ab-sayac">
              <button
                onClick={() => setKisi((k) => Math.max(0, k - 1))}
                disabled={kisi <= 0}
                aria-label="Azalt"
              >
                <Minus size={17} />
              </button>
              <strong>{kisi > 0 ? kisi : "—"}</strong>
              <button onClick={() => setKisi((k) => k + 1)} aria-label="Artır">
                <Plus size={17} />
              </button>
            </div>
          </div>

          <label className="ab-alan">
            <span>
              <Tag size={15} />
              Adisyon adı
            </span>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Örn. Doğum günü, Toplantı"
              autoFocus
            />
          </label>

          <div className="ab-ikili">
            <label className="ab-alan">
              <span>
                <User size={15} />
                Müşteri adı
              </span>
              <input
                value={musteriAd}
                onChange={(e) => setMusteriAd(e.target.value)}
                placeholder="İsteğe bağlı"
              />
            </label>

            <label className="ab-alan">
              <span>
                <Phone size={15} />
                Telefon
              </span>
              <input
                value={musteriTelefon}
                onChange={(e) => setMusteriTelefon(e.target.value)}
                placeholder="İsteğe bağlı"
                inputMode="tel"
              />
            </label>
          </div>

          <label className="ab-alan">
            <span>
              <StickyNote size={15} />
              Adisyon notu
            </span>
            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value)}
              rows={3}
              placeholder="Örn. Pencere kenarı, fatura kesilecek"
            />
          </label>

          <Bilgi>
            Bu bilgiler adisyonun kendisine yazılır; fiş ve raporlarda hesabın kime ait
            olduğunu görürsünüz. Hepsi isteğe bağlıdır.
          </Bilgi>
        </div>

        <footer className="ab-alt">
          <button className="iptal" onClick={onKapat}>
            Vazgeç
          </button>
          <button
            className="uygula"
            onClick={() => onKaydet({ ad, kisiSayisi: kisi, not, musteriAd, musteriTelefon })}
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}
