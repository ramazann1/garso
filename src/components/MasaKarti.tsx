import type { Masa } from "../types";

type Props = {
  masa: Masa;
  onClick?: () => void;
};

export default function MasaKarti({ masa, onClick }: Props) {
  return (
    <div className={masa.dolu ? "masa-kart dolu" : "masa-kart"} onClick={onClick}>
      <strong>{masa.ad}</strong>
      {masa.dolu ? (
        <div className="detay">
          <div>₺{masa.tutar} · {masa.sure}</div>
          <div>{masa.garson}</div>
        </div>
      ) : (
        <span className="bos">Boş</span>
      )}
    </div>
  );
}