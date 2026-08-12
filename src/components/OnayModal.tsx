type Props = {
  mesaj: string;
  /** Mesajın üstünde duran kısa başlık; ikonla birlikte kullanılıyor. */
  baslik?: string;
  ikon?: React.ReactNode;
  tekTus?: boolean;
  tehlikeli?: boolean;
  onayMetni?: string;
  iptalMetni?: string;
  onOnay?: () => void;
  onKapat: () => void;
};

export default function OnayModal({
  mesaj,
  baslik,
  ikon,
  tekTus,
  tehlikeli,
  onayMetni,
  iptalMetni,
  onOnay,
  onKapat,
}: Props) {
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
        <div className="modal-aksiyonlar">
          {tekTus ? (
            <button className="uygula" onClick={onKapat}>Tamam</button>
          ) : (
            <>
              <button className="iptal" onClick={onKapat}>{iptalMetni ?? "Vazgeç"}</button>
              <button className={tehlikeli ? "uygula tehlikeli" : "uygula"} onClick={onOnay}>
                {onayMetni ?? (tehlikeli ? "Evet, sil" : "Evet")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
