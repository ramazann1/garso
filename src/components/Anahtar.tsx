// Açık/kapalı ayarlar için ortak anahtar — menü tanımlarında çok yerde geçiyor.
export default function Anahtar({
  etiket,
  ipucu,
  acik,
  degistir,
}: {
  etiket: string;
  ipucu?: string;
  acik: boolean;
  degistir: (deger: boolean) => void;
}) {
  return (
    <label className={acik ? "anahtar-satir acik" : "anahtar-satir"}>
      <span>
        {etiket}
        {ipucu && <small>{ipucu}</small>}
      </span>
      <input type="checkbox" checked={acik} onChange={(e) => degistir(e.target.checked)} />
      <em className="anahtar" />
    </label>
  );
}
