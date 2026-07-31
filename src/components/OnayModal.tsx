type Props = {
  mesaj: string;
  tekTus?: boolean;
  tehlikeli?: boolean;
  onayMetni?: string;
  onOnay?: () => void;
  onKapat: () => void;
};

export default function OnayModal({ mesaj, tekTus, tehlikeli, onayMetni, onOnay, onKapat }: Props) {
  return (
    <div className="onay-fon" onClick={(e) => { e.stopPropagation(); onKapat(); }}>
      <div className="onay-modal" onClick={(e) => e.stopPropagation()}>
        <p>{mesaj}</p>
        <div className="modal-aksiyonlar">
          {tekTus ? (
            <button className="uygula" onClick={onKapat}>Tamam</button>
          ) : (
            <>
              <button className="iptal" onClick={onKapat}>Vazgeç</button>
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
