import { Search, X } from "lucide-react";

/** Listesi uzayan ekranların süzgeci. Yeri ekrana göre değişiyor, kutu aynı. */
export default function AramaKutusu({
  deger,
  degistir,
  yer,
}: {
  deger: string;
  degistir: (deger: string) => void;
  yer?: string;
}) {
  return (
    <div className="ayar-arama">
      <Search size={16} />
      <input
        value={deger}
        onChange={(e) => degistir(e.target.value)}
        placeholder={yer ?? "Ara"}
      />
      {deger && (
        <button onClick={() => degistir("")} title="Aramayı temizle">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
