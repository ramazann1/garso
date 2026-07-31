import { useState } from "react";
import type { MenuBirim, MenuKategori, MenuPorsiyon, MenuSecenekGrubu, MenuUrun } from "../types";

const renkler = ["#e8b4b4", "#d4b896", "#a8d5c2", "#9fc5d8", "#c9b8d8", "#e0c9a6", "#b8d4a8", "#d8b8c4"];

// Boş bırakılan para alanı 0 değil, "tanımsız" demektir — tür fiyatında bu ayrım önemli.
const paraCevir = (deger: string) => {
  const temiz = deger.replace(/[^0-9.]/g, "");
  return temiz === "" ? undefined : Number(temiz) || 0;
};

export default function UrunPaneli({
  urun,
  kategoriler,
  gruplar,
  birimler,
  onKapat,
  onKaydet,
  onSil,
}: {
  urun: MenuUrun;
  kategoriler: MenuKategori[];
  gruplar: MenuSecenekGrubu[];
  birimler: MenuBirim[];
  onKapat: () => void;
  onKaydet: (u: MenuUrun) => void;
  onSil?: () => void;
}) {
  const yeniPorsiyon = (varsayilan: boolean): MenuPorsiyon => ({
    birimId: birimler[0]?.id,
    ad: birimler[0]?.ad ?? "",
    fiyat: 0,
    varsayilan,
  });

  const [ad, setAd] = useState(urun.ad);
  const [renk, setRenk] = useState(urun.renk);
  const [favori, setFavori] = useState(urun.favori);
  const [porsiyonlar, setPorsiyonlar] = useState<MenuPorsiyon[]>(
    urun.porsiyonlar.length ? urun.porsiyonlar : [yeniPorsiyon(true)]
  );
  const [kategoriIdler, setKategoriIdler] = useState<number[]>(urun.kategoriIdler);
  const [grupIdler, setGrupIdler] = useState<number[]>(urun.grupIdler);
  const [acik, setAcik] = useState<string[]>(["porsiyon"]);
  const [detayli, setDetayli] = useState<number[]>([]);

  const katla = (bolum: string) =>
    setAcik((l) => (l.includes(bolum) ? l.filter((x) => x !== bolum) : [...l, bolum]));

  const detayKatla = (i: number) =>
    setDetayli((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]));

  const porsiyonDegis = (i: number, degisim: Partial<MenuPorsiyon>) => {
    setPorsiyonlar((liste) => liste.map((p, j) => (j === i ? { ...p, ...degisim } : p)));
  };

  const birimSec = (i: number, birimId: number) => {
    const birim = birimler.find((b) => b.id === birimId);
    porsiyonDegis(i, { birimId, ad: birim?.ad ?? "" });
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
    setDetayli((l) => l.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
  };

  const secimDegis = (liste: number[], ayarla: (l: number[]) => void, deger: number) => {
    ayarla(liste.includes(deger) ? liste.filter((x) => x !== deger) : [...liste, deger]);
  };

  const gecerli =
    ad.trim().length > 0 &&
    kategoriIdler.length > 0 &&
    porsiyonlar.some((p) => p.birimId);

  const kaydet = () => {
    onKaydet({
      ...urun,
      ad: ad.trim(),
      renk,
      favori,
      porsiyonlar: porsiyonlar.filter((p) => p.birimId),
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
                  <button onClick={() => setPorsiyonlar([...porsiyonlar, yeniPorsiyon(false)])}>
                    + Porsiyon
                  </button>
                </div>
                <p className="ipucu">
                  {birimler.length
                    ? "Yıldızlı porsiyon, siparişte varsayılan olarak gelir."
                    : "Önce Menü Stüdyosu'nun Birimler sekmesinden birim tanımla."}
                </p>
                {porsiyonlar.map((p, i) => (
                  <div key={i} className="porsiyon">
                    <div className="satir-alan">
                      <button
                        className={p.varsayilan ? "varsayilan-tus aktif" : "varsayilan-tus"}
                        onClick={() => varsayilanSec(i)}
                        title="Varsayılan porsiyon"
                      >
                        {p.varsayilan ? "★" : "☆"}
                      </button>
                      <select
                        value={p.birimId ?? ""}
                        onChange={(e) => birimSec(i, Number(e.target.value))}
                      >
                        <option value="" disabled>Birim seç</option>
                        {birimler.map((b) => (
                          <option key={b.id} value={b.id}>{b.ad}</option>
                        ))}
                      </select>
                      <input
                        className="kisa"
                        value={p.fiyat || ""}
                        onChange={(e) => porsiyonDegis(i, { fiyat: paraCevir(e.target.value) ?? 0 })}
                        placeholder="₺"
                        inputMode="decimal"
                      />
                      <button className="satir-sil" onClick={() => porsiyonSil(i)} disabled={porsiyonlar.length === 1}>
                        ×
                      </button>
                    </div>

                    <button className="detay-tus" onClick={() => detayKatla(i)}>
                      {detayli.includes(i) ? "− Detayı gizle" : "+ Maliyet, barkod, sipariş türü fiyatı"}
                    </button>

                    {detayli.includes(i) && (
                      <div className="porsiyon-detay">
                        <div className="detay-satir">
                          <label>
                            <span>Maliyet</span>
                            <input
                              value={p.maliyet ?? ""}
                              onChange={(e) => porsiyonDegis(i, { maliyet: paraCevir(e.target.value) })}
                              placeholder="₺"
                              inputMode="decimal"
                            />
                          </label>
                          <label className="genis">
                            <span>Barkod</span>
                            <input
                              value={p.barkod ?? ""}
                              onChange={(e) => porsiyonDegis(i, { barkod: e.target.value })}
                              placeholder="—"
                            />
                          </label>
                        </div>

                        <p className="ipucu">
                          Sipariş türüne göre fiyat. Boş bıraktığın türde yukarıdaki tek fiyat geçerli olur.
                        </p>
                        <div className="detay-satir">
                          <label>
                            <span>Masa</span>
                            <input
                              value={p.masaFiyat ?? ""}
                              onChange={(e) => porsiyonDegis(i, { masaFiyat: paraCevir(e.target.value) })}
                              placeholder={`₺${p.fiyat || 0}`}
                              inputMode="decimal"
                            />
                          </label>
                          <label>
                            <span>Gel Al</span>
                            <input
                              value={p.gelalFiyat ?? ""}
                              onChange={(e) => porsiyonDegis(i, { gelalFiyat: paraCevir(e.target.value) })}
                              placeholder={`₺${p.fiyat || 0}`}
                              inputMode="decimal"
                            />
                          </label>
                          <label>
                            <span>Paket</span>
                            <input
                              value={p.paketFiyat ?? ""}
                              onChange={(e) => porsiyonDegis(i, { paketFiyat: paraCevir(e.target.value) })}
                              placeholder={`₺${p.fiyat || 0}`}
                              inputMode="decimal"
                            />
                          </label>
                        </div>
                      </div>
                    )}
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
          {urun.id && onSil && (
            <button className="sil-buton" onClick={onSil}>Ürünü sil</button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!gecerli} onClick={kaydet}>Kaydet</button>
        </footer>
      </div>
    </div>
  );
}