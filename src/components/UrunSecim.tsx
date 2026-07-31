import { useState } from "react";
import type { MenuPorsiyon, MenuSecenekGrubu, MenuUrun } from "../types";

type Props = {
  urun: MenuUrun;
  gruplar: MenuSecenekGrubu[];
  onEkle: (porsiyon: string | undefined, fiyat: number, secimler: string[]) => void;
  onKapat: () => void;
};

export default function UrunSecim({ urun, gruplar, onEkle, onKapat }: Props) {
  const [porsiyon, setPorsiyon] = useState<MenuPorsiyon | undefined>(
    urun.porsiyonlar.find((p) => p.varsayilan) ?? urun.porsiyonlar[0]
  );
  const [secilenler, setSecilenler] = useState<Record<number, number[]>>({});

  const urunGruplari = gruplar.filter((g) => urun.grupIdler.includes(g.id));

  const sec = (grup: MenuSecenekGrubu, secenekId: number) => {
    setSecilenler((s) => {
      const mevcut = s[grup.id] ?? [];
      if (grup.tekli) return { ...s, [grup.id]: [secenekId] };
      const yeni = mevcut.includes(secenekId)
        ? mevcut.filter((x) => x !== secenekId)
        : [...mevcut, secenekId];
      return { ...s, [grup.id]: yeni };
    });
  };

  const secimAdlari: string[] = [];
  let ekToplam = 0;
  for (const grup of urunGruplari) {
    for (const secenekId of secilenler[grup.id] ?? []) {
      const secenek = grup.liste.find((s) => s.id === secenekId);
      if (!secenek) continue;
      secimAdlari.push(secenek.ad);
      ekToplam += secenek.ekFiyat;
    }
  }

  const fiyat = (porsiyon?.fiyat ?? 0) + ekToplam;

  return (
    <div className="perde" onClick={onKapat}>
      <div className="pencere" onClick={(e) => e.stopPropagation()}>
        <h3>{urun.ad}</h3>

        {urun.porsiyonlar.length > 1 && (
          <div className="grup">
            <span className="grup-ad">Porsiyon</span>
            <div className="secim-liste">
              {urun.porsiyonlar.map((p) => (
                <button
                  key={p.ad}
                  className={porsiyon?.ad === p.ad ? "secim aktif" : "secim"}
                  onClick={() => setPorsiyon(p)}
                >
                  {p.ad} · ₺{p.fiyat}
                </button>
              ))}
            </div>
          </div>
        )}

        {urunGruplari.map((grup) => (
          <div className="grup" key={grup.id}>
            <span className="grup-ad">{grup.ad}</span>
            <div className="secim-liste">
              {grup.liste.map((secenek) => (
                <button
                  key={secenek.id}
                  className={(secilenler[grup.id] ?? []).includes(secenek.id!) ? "secim aktif" : "secim"}
                  onClick={() => sec(grup, secenek.id!)}
                >
                  {secenek.ad}
                  {secenek.ekFiyat > 0 && ` (+₺${secenek.ekFiyat})`}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className="kaydet" onClick={() => onEkle(porsiyon?.ad, fiyat, secimAdlari)}>
          Ekle
        </button>
      </div>
    </div>
  );
}
