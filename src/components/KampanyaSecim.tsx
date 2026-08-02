import { useState } from "react";
import { porsiyonFiyat } from "../menu";
import type { MenuUrun } from "../types";

// Kampanyalı menü siparişe girerken: her gruptan izin verilen sayıda seçim.
export default function KampanyaSecim({
  urun,
  urunler,
  onEkle,
  onKapat,
}: {
  urun: MenuUrun;
  urunler: MenuUrun[];
  onEkle: (fiyat: number, secimler: string[]) => void;
  onKapat: () => void;
}) {
  // Yıldızlı satırlar hazır gelir; garson yine değiştirebilir.
  const [secilenler, setSecilenler] = useState<Record<number, number[]>>(() =>
    Object.fromEntries(
      urun.menuGruplari.map((g, gi) => [
        gi,
        g.satirlar
          .map((s, si) => (s.varsayilan ? si : -1))
          .filter((si) => si >= 0)
          .slice(0, g.secilebilir),
      ])
    )
  );

  const sec = (gi: number, si: number) => {
    const grup = urun.menuGruplari[gi];
    setSecilenler((s) => {
      const mevcut = s[gi] ?? [];
      if (mevcut.includes(si)) return { ...s, [gi]: mevcut.filter((x) => x !== si) };
      // Sınır dolduysa en eski seçim düşer — garson tek dokunuşla değiştirsin.
      const yeni = [...mevcut, si].slice(-grup.secilebilir);
      return { ...s, [gi]: yeni };
    });
  };

  const satirAdi = (urunId: number, porsiyonId?: number) => {
    const icerik = urunler.find((u) => u.id === urunId);
    const porsiyon = icerik?.porsiyonlar.find((p) => p.id === porsiyonId);
    return porsiyon && icerik!.porsiyonlar.length > 1
      ? `${icerik!.ad} (${porsiyon.ad})`
      : icerik?.ad ?? "—";
  };

  const temelFiyat = (() => {
    const p = urun.porsiyonlar.find((x) => x.varsayilan) ?? urun.porsiyonlar[0];
    return p ? porsiyonFiyat(p, "masa") : 0;
  })();

  const secimAdlari: string[] = [];
  let ekToplam = 0;
  urun.menuGruplari.forEach((g, gi) => {
    for (const si of secilenler[gi] ?? []) {
      const s = g.satirlar[si];
      if (!s) continue;
      const ad = satirAdi(s.urunId, s.porsiyonId);
      secimAdlari.push(s.miktar > 1 ? `${s.miktar}× ${ad}` : ad);
      ekToplam += s.ekFiyat;
    }
  });

  const eksikler = urun.menuGruplari.filter(
    (g, gi) => (secilenler[gi] ?? []).length < g.secilebilir
  );

  return (
    <div className="perde" onClick={onKapat}>
      <div className="pencere" onClick={(e) => e.stopPropagation()}>
        <h3>{urun.ad}</h3>

        {urun.menuGruplari.map((g, gi) => (
          <div className="grup" key={gi}>
            <span className="grup-ad">
              {g.baslik}
              <em className="zorunlu-im">{g.secilebilir} seç</em>
            </span>
            <div className="secim-liste">
              {g.satirlar.map((s, si) => (
                <button
                  key={si}
                  className={(secilenler[gi] ?? []).includes(si) ? "secim aktif" : "secim"}
                  onClick={() => sec(gi, si)}
                >
                  {s.miktar > 1 && `${s.miktar}× `}
                  {satirAdi(s.urunId, s.porsiyonId)}
                  {s.ekFiyat > 0 && ` (+₺${s.ekFiyat})`}
                </button>
              ))}
            </div>
          </div>
        ))}

        {eksikler.length > 0 && (
          <p className="secim-uyari">
            Seçim tamamlanmalı: {eksikler.map((g) => g.baslik).join(", ")}
          </p>
        )}

        <button
          className="kaydet"
          disabled={eksikler.length > 0}
          onClick={() => onEkle(temelFiyat + ekToplam, secimAdlari)}
        >
          Ekle · ₺{temelFiyat + ekToplam}
        </button>
      </div>
    </div>
  );
}
