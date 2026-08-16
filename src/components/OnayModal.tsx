import { useState } from "react";

type Props = {
  mesaj: string;
  /** Mesajın üstünde duran kısa başlık; ikonla birlikte kullanılıyor. */
  baslik?: string;
  ikon?: React.ReactNode;
  tekTus?: boolean;
  tehlikeli?: boolean;
  /**
   * Verilirse pencere sebep sorar: hazır sebepler düğme olarak çıkar, en sonda
   * serbest yazma kutusu vardır. Sebep seçilmeden onay düğmesi çalışmaz.
   */
  sebepler?: string[];
  /**
   * Verilirse pencere "kime yazılsın" diye sorar: ödenmez listesi düğme olarak
   * çıkar. Seçim zorunlu değil — belirtilmeden de onaylanabiliyor, ikram yine
   * yapılıyor, yalnız kırılımda "belirtilmemiş" kalıyor.
   */
  odenmezler?: { id: number; ad: string }[];
  onayMetni?: string;
  iptalMetni?: string;
  onOnay?: (sebep?: string, odenmezId?: number) => void;
  onKapat: () => void;
};

export default function OnayModal({
  mesaj,
  baslik,
  ikon,
  tekTus,
  tehlikeli,
  sebepler,
  odenmezler,
  onayMetni,
  iptalMetni,
  onOnay,
  onKapat,
}: Props) {
  const [secili, setSecili] = useState("");
  const [serbest, setSerbest] = useState("");
  const [odenmezId, setOdenmezId] = useState<number | null>(null);

  const sebep = secili === "diger" ? serbest.trim() : secili;
  const onaylanabilir = !sebepler || !!sebep;

  return (
    <div className="onay-fon" onClick={(e) => { e.stopPropagation(); onKapat(); }}>
      <div
        className={baslik ? "onay-modal baslikli" : "onay-modal"}
        onClick={(e) => e.stopPropagation()}
      >
        {baslik && (
          <div className="onay-ust">
            {ikon && <span className={tehlikeli ? "onay-im tehlikeli" : "onay-im"}>{ikon}</span>}
            <h3>{baslik}</h3>
          </div>
        )}
        <p>{mesaj}</p>

        {sebepler && (
          <div className="onay-sebepler">
            {sebepler.map((s) => (
              <button
                key={s}
                className={secili === s ? "onay-sebep secili" : "onay-sebep"}
                onClick={() => setSecili(s)}
              >
                {s}
              </button>
            ))}
            <button
              className={secili === "diger" ? "onay-sebep secili" : "onay-sebep"}
              onClick={() => setSecili("diger")}
            >
              Diğer
            </button>
            {secili === "diger" && (
              <input
                className="onay-sebep-metin"
                autoFocus
                value={serbest}
                onChange={(e) => setSerbest(e.target.value)}
                placeholder="Sebebi yazın"
              />
            )}
          </div>
        )}

        {odenmezler && odenmezler.length > 0 && (
          <div className="onay-odenmez">
            <p>Kime yazılsın?</p>
            <div className="onay-sebepler">
              {odenmezler.map((o) => (
                <button
                  key={o.id}
                  className={odenmezId === o.id ? "onay-sebep secili" : "onay-sebep"}
                  onClick={() => setOdenmezId(odenmezId === o.id ? null : o.id)}
                >
                  {o.ad}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-aksiyonlar">
          {tekTus ? (
            <button className="uygula" onClick={onKapat}>Tamam</button>
          ) : (
            <>
              <button className="iptal" onClick={onKapat}>{iptalMetni ?? "Vazgeç"}</button>
              <button
                className={tehlikeli ? "uygula tehlikeli" : "uygula"}
                disabled={!onaylanabilir}
                onClick={() => onOnay?.(sebep || undefined, odenmezId ?? undefined)}
              >
                {onayMetni ?? (tehlikeli ? "Evet, sil" : "Evet")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
