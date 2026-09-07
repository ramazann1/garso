import { useEffect, useState } from "react";
import { Check, ChevronRight, LayoutList, Plus, UtensilsCrossed, X } from "lucide-react";
import { porsiyonFiyat } from "../menu";
import { paraGoster } from "../para";
import type { MenuUrun, SiparisTuru } from "../types";

/**
 * Kampanyalı menü siparişe girerken: her gruptan izin verilen sayıda seçim.
 * Grup başlığındaki sayaç kaç seçim kaldığını söylüyor — garson pencerenin
 * neresinde eksik olduğunu aramasın diye. Eksik varken Ekle pasif; sebebi
 * alttaki yönlendirme şeridinde yazıyor.
 */
export default function KampanyaSecim({
  urun,
  urunler,
  tur = "masa",
  onEkle,
  onKapat,
}: {
  urun: MenuUrun;
  urunler: MenuUrun[];
  tur?: SiparisTuru;
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

  useEffect(() => {
    const kacis = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    document.addEventListener("keydown", kacis);
    return () => document.removeEventListener("keydown", kacis);
  }, [onKapat]);

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
    return p ? porsiyonFiyat(p, tur) : 0;
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
  const toplam = temelFiyat + ekToplam;

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal ka-modal" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          <span className="ka-im">
            <UtensilsCrossed size={18} />
          </span>
          <h3>{urun.ad}</h3>
          <button className="up-kapat" aria-label="Kapat" onClick={onKapat}>
            <X size={19} />
          </button>
        </header>

        <div className="ka-govde">
          {urun.menuGruplari.map((g, gi) => {
            const secili = secilenler[gi] ?? [];
            const tamam = secili.length >= g.secilebilir;
            return (
              <section className="ka-grup" key={gi}>
                <div className="ka-grup-ust">
                  <span className="ka-grup-im">
                    <LayoutList size={15} />
                  </span>
                  <span className="ka-grup-ad">{g.baslik}</span>
                  <span className={tamam ? "ka-sayac tamam" : "ka-sayac"}>
                    {tamam && <Check size={13} />}
                    {secili.length}/{g.secilebilir}
                  </span>
                </div>

                <div className="ka-secenekler">
                  {g.satirlar.map((s, si) => {
                    const isaretli = secili.includes(si);
                    return (
                      <button
                        key={si}
                        className={isaretli ? "ka-secenek secili" : "ka-secenek"}
                        onClick={() => sec(gi, si)}
                      >
                        <span className="ka-kutu">{isaretli && <Check size={14} />}</span>
                        <span className="ka-secenek-ad">
                          {s.miktar > 1 && <b className="ka-adet">{s.miktar}×</b>}
                          {satirAdi(s.urunId, s.porsiyonId)}
                        </span>
                        {s.ekFiyat > 0 && (
                          <span className="ka-ek">
                            <Plus size={12} />
                            {paraGoster(s.ekFiyat)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {eksikler.length > 0 && (
          <div className="ka-yonlendir">
            <ChevronRight size={16} />
            <span>Seçim bekleyen grup: {eksikler.map((g) => g.baslik).join(", ")}</span>
          </div>
        )}

        <footer className="ka-alt">
          <div className="ka-dokum">
            <span className="ka-dokum-ad">Menü fiyatı</span>
            <span className="ka-dokum-tutar">
              {paraGoster(temelFiyat)}
              {ekToplam > 0 && <em> + {paraGoster(ekToplam)} ek</em>}
            </span>
          </div>
          <button className="ka-ekle" disabled={eksikler.length > 0} onClick={() => onEkle(toplam, secimAdlari)}>
            <Plus size={17} />
            Ekle · {paraGoster(toplam)}
          </button>
        </footer>
      </div>
    </div>
  );
}
