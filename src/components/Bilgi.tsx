import { Info } from "lucide-react";

// Açıklama satırı: soluk küçük punto yerine ikonlu kutu — okunur ve ekranda yerini bilir.
export default function Bilgi({ children }: { children: React.ReactNode }) {
  return (
    <div className="bilgi-kutu">
      <Info size={16} />
      <p>{children}</p>
    </div>
  );
}
