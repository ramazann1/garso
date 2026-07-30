import { useState } from "react";
import type { MenuKategori, MenuPorsiyon, MenuSecenekGrubu, MenuUrun } from "../types";

const renkler = ["#e8b4b4", "#d4b896", "#a8d5c2", "#9fc5d8", "#c9b8d8", "#e0c9a6", "#b8d4a8", "#d8b8c4"];

export default function UrunPaneli({
  urun,
  kategoriler,
  gruplar,
  onKapat,
  onKaydet,
}: {
  urun: MenuUrun;
  kategoriler: MenuKategori[];
  gruplar: MenuSecenekGrubu[];
  onKapat: () => void;
  onKaydet: (u: MenuUrun) => void;
}) {
  const [ad, setAd] = useState(urun.ad);
  const [renk, setRenk] = useState(urun.renk);
  const [favori, setFavori] = useState(urun.favori);
  const [porsiyonlar, setPorsiyonlar] = useState<MenuPorsiyon[]>(
    urun.porsiyonlar.length ? urun.porsiyonlar : [{ ad: "Tam", fiyat: 0, varsayilan: true }]
  );
  const [kategoriIdler, setKategoriIdler] = useState<number[]>(urun.kategoriIdler);
  const [grupIdler, setGrupIdler] = useState<number[]>(urun.grupIdler);
  const [acik, setAcik] = useState<string[]>(["porsiyon"]);

  const katla = (bolum: string) =>
    setAcik((l) => (l.includes(bolum) ? l.filter((x) => x !== bolum) : [...l, bolum]));

  const porsiyonDegis = (i: number, alan: "ad" | "fiyat", deger: string) => {
    setPorsiyonlar((liste) =>
      liste.map((p, j) =>
        j === i ? { ...p, [alan]: alan === "fiyat" ? Number(deger) || 0 : deger } : p
      )
    );
  };

  const varsayilanSec = (i: number) => {
    setPorsiyonlar((liste) => liste.map((p, j) => ({ ...p, varsayilan: j === i })));
  };

  const porsiyonSil = (i: number) => {
    setPorsiyonlar((liste) => {
      const kalan = liste.filter((_, j) => j !== i);
      if (kalan.length && !kalan.some((p) => p.varsayilan)) kalan[0].varsayilan = true;
      return kalan;
    });
  };

  const secimDegis = (liste: number[], ayarla: (l: number[]) => void, deger: number) => {
    ayarla(liste.includes(deger) ? liste.filter((x) => x !== deger) : [...liste, deger]);
  };

  const gecerli =
    ad.trim().length > 0 &&
    kategoriIdler.length > 0 &&
    porsiyonlar.some((p) => p.ad.trim());

  const kaydet = () => {
    onKaydet({
      ...urun,
      ad: ad.trim(),
      renk,
      favori,
      porsiyonlar: porsiyonlar.filter((p) => p.ad.trim()),
      kategoriIdler,
      grupIdler,
    });
  };

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="urun-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{urun.id ? "Ürünü düzenle" : "Yeni ürün"}</h3>
          <button className="panel-kapat" onClick={onKapat}>×</button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <span>Ürün adı</span>
            <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Türk Kahvesi" autoFocus />
          </div>

          <div className="alan">
            <span>Kart rengi</span>
            <div className="renk-secim">
              <button
                className={!renk ? "renk-kutu bos secili" : "renk-kutu bos"}
                onClick={() => setRenk(undefined)}
                title="Renksiz"
              >
                —
              </button>
              {renkler.map((r) => (
                <button
                  key={r}
                  className={r === renk ? "renk-kutu secili" : "renk-kutu"}
                  style={{ background: r }}
                  onClick={() => setRenk(r)}
                />
              ))}
            </div>
          </div>

          <button className={favori ? "favori-tus aktif" : "favori-tus"} onClick={() => setFavori(!favori)}>
            {favori ? "★ Favori üründe" : "☆ Favorilere ekle"}
          </button>

          <div className="bolum">
            <button className="bolum-basi" onClick={() => katla("porsiyon")}>
              <span>Porsiyonlar ve fiyat</span>
              <small>{porsiyonlar.length}</small>
              <em className={acik.includes("porsiyon") ? "ok acik" : "ok"}>›</em>
            </button>

            {acik.includes("porsiyon") && (
              <>
                <div className="ekle-satir">
                  <button onClick={() => setPorsiyonlar([...porsiyonlar, { ad: "", fiyat: 0, varsayilan: false }])}>
                    + Porsiyon
                  </button>
                </div>
                <p className="ipucu">Yıldızlı porsiyon, siparişte varsayılan olarak gelir.</p>
                {porsiyonlar.map((p, i) => (
                  <div key={i} className="satir-alan">
                    <button
                      className={p.varsayilan ? "varsayilan-tus aktif" : "varsayilan-tus"}
                      onClick={() => varsayilanSec(i)}
                      title="Varsayılan porsiyon"
                    >
                      {p.varsayilan ? "★" : "☆"}
                    </button>
                    <input value={p.ad} onChange={(e) => porsiyonDegis(i, "ad", e.target.value)} placeholder="Tam" />
                    <input
                      className="kisa"
                      value={p.fiyat || ""}
                      onChange={(e) => porsiyonDegis(i, "fiyat", e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="₺"
                      inputMode="decimal"
                    />
                    <button className="satir-sil" onClick={() => porsiyonSil(i)} disabled={porsiyonlar.length === 1}>
                      ×
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="bolum">
            <button className="bolum-basi" onClick={() => katla("kategori")}>
              <span>Kategoriler</span>
              <small>{kategoriIdler.length} seçili</small>
              <em className={acik.includes("kategori") ? "ok acik" : "ok"}>›</em>
            </button>

            {acik.includes("kategori") && (
              <>
                <p className="ipucu">Ürün birden fazla kategoride görünebilir.</p>
                <div className="cipler">
                  {kategoriler.map((k) => (
                    <button
                      key={k.id}
                      className={kategoriIdler.includes(k.id) ? "cip secili" : "cip"}
                      onClick={() => secimDegis(kategoriIdler, setKategoriIdler, k.id)}
                    >
                      <span className="renk-nokta" style={{ background: k.renk }} />
                      {k.ad}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bolum">
            <button className="bolum-basi" onClick={() => katla("secenek")}>
              <span>Seçenek grupları</span>
              <small>{grupIdler.length} bağlı</small>
              <em className={acik.includes("secenek") ? "ok acik" : "ok"}>›</em>
            </button>

            {acik.includes("secenek") && (
              <>
                <p className="ipucu">Bir kez tanımlanır, istediğin ürüne bağlanır.</p>
                <div className="cipler">
                  {gruplar.length === 0 && <p className="ipucu">Henüz seçenek grubu yok.</p>}
                  {gruplar.map((g) => (
                    <button
                      key={g.id}
                      className={grupIdler.includes(g.id) ? "cip secili" : "cip"}
                      onClick={() => secimDegis(grupIdler, setGrupIdler, g.id)}
                    >
                      {g.ad}
                      <small>{g.tekli ? "tekli" : "çoklu"} · {g.liste.length}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!gecerli} onClick={kaydet}>Kaydet</button>
        </footer>
      </div>
    </div>
  );
}