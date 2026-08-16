import { useEffect, useState } from "react";
import { UserRound, X } from "lucide-react";
import { eslesiyor } from "../arama";
import { paraGoster } from "../para";
import { acikHesapMusterileri, musterileriGetir, tamAd, type Musteri } from "../cari";

/**
 * Açık hesaba yazarken müşteriyi seçme penceresi. Yalnız "açık hesap
 * müşterisi" işaretli olanlar listeleniyor: herkese veresiye açılmıyor,
 * kimin hesabına yazılabileceğine işletme önceden karar veriyor.
 */
export default function MusteriSecici({
  baslik = "Kimin hesabına yazılsın?",
  hepsi,
  onSec,
  onKapat,
}: {
  baslik?: string;
  /** Açık hesabı olmayanlar da listelensin — sipariş müşterisi seçilirken. */
  hepsi?: boolean;
  onSec: (musteri: Musteri) => void;
  onKapat: () => void;
}) {
  const [liste, setListe] = useState<Musteri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ara, setAra] = useState("");

  useEffect(() => {
    (hepsi
      ? musterileriGetir().then((m) => m.filter((x) => x.aktif))
      : acikHesapMusterileri()
    ).then((m) => {
      setListe(m);
      setYukleniyor(false);
    });
  }, [hepsi]);

  const gorunen = liste.filter((m) =>
    eslesiyor(`${tamAd(m)} ${m.telefon} ${m.no}`, ara)
  );

  return (
    <div className="modal-fon" onClick={onKapat}>
      <div className="musteri-secici" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>{baslik}</h3>
          <button className="kapat" aria-label="Kapat" onClick={onKapat}>
            <X size={20} />
          </button>
        </header>

        <input
          className="musteri-secici-ara"
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Ad veya telefon ara"
          autoFocus
        />

        <div className="musteri-secici-liste">
          {yukleniyor ? (
            <div className="yukleniyor"><div className="cember" /></div>
          ) : liste.length === 0 ? (
            <p className="cari-bos">
              {hepsi
                ? "Kayıtlı müşteri yok. Müşteriler ekranından ekleyebilirsiniz."
                : "Açık hesap müşterisi yok. Müşteriler ekranından bir müşteri açıp \"Açık hesap müşterisi\" anahtarını açın."}
            </p>
          ) : gorunen.length === 0 ? (
            <p className="cari-bos">Aramaya uyan müşteri yok.</p>
          ) : (
            gorunen.map((m) => (
              <button key={m.id} onClick={() => onSec(m)}>
                <UserRound size={16} />
                <span>
                  {tamAd(m)}
                  <small>{m.telefon || `#${m.no}`}</small>
                </span>
                <em className={m.bakiye > 0 ? "borclu" : ""}>{paraGoster(m.bakiye)}</em>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
