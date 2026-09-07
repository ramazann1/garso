import { useEffect, useState } from "react";
import { Search, UserRound, Users, X } from "lucide-react";
import Bilgi from "./Bilgi";
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

  useEffect(() => {
    const kacis = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", kacis);
    return () => document.removeEventListener("keydown", kacis);
  }, [onKapat]);

  const gorunen = liste.filter((m) =>
    eslesiyor(`${tamAd(m)} ${m.telefon} ${m.no}`, ara)
  );

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal msc-modal" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          <span className="msc-im">
            <Users size={18} />
          </span>
          <h3>{baslik}</h3>
          <button className="up-kapat" aria-label="Kapat" onClick={onKapat}>
            <X size={19} />
          </button>
        </header>

        <div className="msc-ara">
          <Search size={16} />
          <input
            value={ara}
            onChange={(e) => setAra(e.target.value)}
            placeholder="Ad veya telefon ara"
            autoFocus
          />
        </div>

        <div className="msc-liste">
          {yukleniyor ? (
            <div className="yukleniyor"><div className="cember" /></div>
          ) : liste.length === 0 ? (
            <Bilgi>
              {hepsi
                ? "Kayıtlı müşteri yok. Müşteriler ekranından ekleyebilirsiniz."
                : "Açık hesap müşterisi yok. Müşteriler ekranından bir müşteri açıp \"Açık hesap müşterisi\" anahtarını açın."}
            </Bilgi>
          ) : gorunen.length === 0 ? (
            <Bilgi>Aramaya uyan müşteri yok.</Bilgi>
          ) : (
            gorunen.map((m) => (
              <button key={m.id} className="msc-satir" onClick={() => onSec(m)}>
                <span className="msc-amblem">
                  {tamAd(m).slice(0, 1).toLocaleUpperCase("tr") || <UserRound size={16} />}
                </span>
                <span className="msc-ad">
                  {tamAd(m)}
                  <small>{m.telefon || `#${m.no}`}</small>
                </span>
                <em className={m.bakiye > 0 ? "msc-bakiye borclu" : "msc-bakiye"}>
                  {paraGoster(m.bakiye)}
                </em>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
