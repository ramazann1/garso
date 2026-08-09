import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
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
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>
            {baslik}
            {no ? ` · Adisyon #${no}` : ""}
          </h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <Bilgi>
            Bu bilgiler adisyonun kendisine yazılır; fiş ve raporlarda hesabın
            kime ait olduğunu görürsünüz. Hepsi isteğe bağlıdır.
          </Bilgi>

          <div className="alan">
            <label>Adisyon adı</label>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Örn. Doğum günü, Toplantı"
              autoFocus
            />
          </div>

          <div className="alan">
            <label>Kişi sayısı</label>
            <div className="sayi-secici">
              <button onClick={() => setKisi((k) => Math.max(0, k - 1))} disabled={kisi <= 0}>
                <Minus size={16} />
              </button>
              <strong>{kisi > 0 ? kisi : "—"}</strong>
              <button onClick={() => setKisi((k) => k + 1)}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="alan">
            <label>Müşteri adı</label>
            <input
              value={musteriAd}
              onChange={(e) => setMusteriAd(e.target.value)}
              placeholder="İsteğe bağlı"
            />
          </div>

          <div className="alan">
            <label>Telefon</label>
            <input
              value={musteriTelefon}
              onChange={(e) => setMusteriTelefon(e.target.value)}
              placeholder="İsteğe bağlı"
              inputMode="tel"
            />
          </div>

          <div className="alan">
            <label>Adisyon notu</label>
            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value)}
              rows={3}
              placeholder="Örn. Pencere kenarı, fatura kesilecek"
            />
          </div>
        </div>

        <footer className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
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
