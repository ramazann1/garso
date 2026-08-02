import { useState } from "react";
import Anahtar from "./Anahtar";
import RenkSecici from "./RenkSecici";
import { paraMetin, paraSayi, paraYaz } from "../para";
import type { MenuBirim, MenuKategori, MenuPorsiyon, MenuSecenekGrubu, MenuUrun } from "../types";

// Para alanları taslakta metin, kaydederken sayı. Boş bırakılan alan 0 değil
// "tanımsız" demektir — tür fiyatında bu ayrım önemli.
type PorsiyonTaslak = {
  id?: number;
  birimId?: number;
  ad: string;
  fiyat: string;
  maliyet: string;
  barkod: string;
  masaFiyat: string;
  gelalFiyat: string;
  paketFiyat: string;
  varsayilan: boolean;
  grupIdler: number[];
};

const taslakYap = (p: MenuPorsiyon): PorsiyonTaslak => ({
  id: p.id,
  birimId: p.birimId,
  ad: p.ad,
  fiyat: paraMetin(p.fiyat),
  maliyet: paraMetin(p.maliyet),
  barkod: p.barkod ?? "",
  masaFiyat: paraMetin(p.masaFiyat),
  gelalFiyat: paraMetin(p.gelalFiyat),
  paketFiyat: paraMetin(p.paketFiyat),
  varsayilan: p.varsayilan,
  grupIdler: p.grupIdler,
});

const porsiyonYap = (t: PorsiyonTaslak): MenuPorsiyon => ({
  id: t.id,
  birimId: t.birimId,
  ad: t.ad,
  fiyat: paraSayi(t.fiyat) ?? 0,
  maliyet: paraSayi(t.maliyet),
  barkod: t.barkod.trim() || undefined,
  masaFiyat: paraSayi(t.masaFiyat),
  gelalFiyat: paraSayi(t.gelalFiyat),
  paketFiyat: paraSayi(t.paketFiyat),
  varsayilan: t.varsayilan,
  grupIdler: t.grupIdler,
});

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
  const yeniPorsiyon = (varsayilan: boolean): PorsiyonTaslak => ({
    birimId: birimler[0]?.id,
    ad: birimler[0]?.ad ?? "",
    fiyat: "",
    maliyet: "",
    barkod: "",
    masaFiyat: "",
    gelalFiyat: "",
    paketFiyat: "",
    varsayilan,
    grupIdler: [],
  });

  const [ad, setAd] = useState(urun.ad);
  const [kod, setKod] = useState(urun.kod ?? "");
  const [renk, setRenk] = useState(urun.renk);
  const [favori, setFavori] = useState(urun.favori);
  const [satistaGorunur, setSatistaGorunur] = useState(urun.satistaGorunur);
  const [mutfaktaGorunur, setMutfaktaGorunur] = useState(urun.mutfaktaGorunur);
  const [porsiyonlar, setPorsiyonlar] = useState<PorsiyonTaslak[]>(
    urun.porsiyonlar.length ? urun.porsiyonlar.map(taslakYap) : [yeniPorsiyon(true)]
  );
  const [kategoriIdler, setKategoriIdler] = useState<number[]>(urun.kategoriIdler);
  const [acik, setAcik] = useState<string[]>(["porsiyon"]);
  const [detayli, setDetayli] = useState<number[]>([]);

  const katla = (bolum: string) =>
    setAcik((l) => (l.includes(bolum) ? l.filter((x) => x !== bolum) : [...l, bolum]));

  const detayKatla = (i: number) =>
    setDetayli((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]));

  const porsiyonDegis = (i: number, degisim: Partial<PorsiyonTaslak>) => {
    setPorsiyonlar((liste) => liste.map((p, j) => (j === i ? { ...p, ...degisim } : p)));
  };

  const birimSec = (i: number, birimId: number) => {
    const birim = birimler.find((b) => b.id === birimId);
    porsiyonDegis(i, { birimId, ad: birim?.ad ?? "" });
  };

  const grupDegis = (i: number, grupId: number) => {
    const mevcut = porsiyonlar[i].grupIdler;
    porsiyonDegis(i, {
      grupIdler: mevcut.includes(grupId)
        ? mevcut.filter((x) => x !== grupId)
        : [...mevcut, grupId],
    });
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
      kod: kod.trim() || undefined,
      renk,
      favori,
      satistaGorunur,
      mutfaktaGorunur,
      porsiyonlar: porsiyonlar.filter((p) => p.birimId).map(porsiyonYap),
      kategoriIdler,
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
            <span>Ürün kodu</span>
            <input value={kod} onChange={(e) => setKod(e.target.value)} placeholder="Zorunlu değil" />
          </div>

          <div className="alan">
            <span>Kart rengi</span>
            <RenkSecici renk={renk} degistir={setRenk} renksizOlur />
          </div>

          <button className={favori ? "favori-tus aktif" : "favori-tus"} onClick={() => setFavori(!favori)}>
            {favori ? "★ Favori üründe" : "☆ Favorilere ekle"}
          </button>

          <Anahtar
            etiket="Satış ekranında göster"
            ipucu="Kapalıysa sipariş ekranında çıkmaz"
            acik={satistaGorunur}
            degistir={setSatistaGorunur}
          />
          <Anahtar
            etiket="Mutfak ekranında göster"
            acik={mutfaktaGorunur}
            degistir={setMutfaktaGorunur}
          />

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
                        value={p.fiyat}
                        onChange={(e) => porsiyonDegis(i, { fiyat: paraYaz(e.target.value) })}
                        placeholder="₺"
                        inputMode="decimal"
                      />
                      <button className="satir-sil" onClick={() => porsiyonSil(i)} disabled={porsiyonlar.length === 1}>
                        ×
                      </button>
                    </div>

                    <button className="detay-tus" onClick={() => detayKatla(i)}>
                      {detayli.includes(i)
                        ? "− Detayı gizle"
                        : "+ Maliyet, barkod, seçenekler, sipariş türü fiyatı"}
                      {!detayli.includes(i) && p.grupIdler.length > 0 && (
                        <em className="detay-rozet">{p.grupIdler.length} seçenek</em>
                      )}
                    </button>

                    {detayli.includes(i) && (
                      <div className="porsiyon-detay">
                        <div className="detay-satir">
                          <label>
                            <span>Maliyet</span>
                            <input
                              value={p.maliyet}
                              onChange={(e) => porsiyonDegis(i, { maliyet: paraYaz(e.target.value) })}
                              placeholder="₺"
                              inputMode="decimal"
                            />
                          </label>
                          <label className="genis">
                            <span>Barkod</span>
                            <input
                              value={p.barkod}
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
                              value={p.masaFiyat}
                              onChange={(e) => porsiyonDegis(i, { masaFiyat: paraYaz(e.target.value) })}
                              placeholder={`₺${p.fiyat || 0}`}
                              inputMode="decimal"
                            />
                          </label>
                          <label>
                            <span>Gel Al</span>
                            <input
                              value={p.gelalFiyat}
                              onChange={(e) => porsiyonDegis(i, { gelalFiyat: paraYaz(e.target.value) })}
                              placeholder={`₺${p.fiyat || 0}`}
                              inputMode="decimal"
                            />
                          </label>
                          <label>
                            <span>Paket</span>
                            <input
                              value={p.paketFiyat}
                              onChange={(e) => porsiyonDegis(i, { paketFiyat: paraYaz(e.target.value) })}
                              placeholder={`₺${p.fiyat || 0}`}
                              inputMode="decimal"
                            />
                          </label>
                        </div>

                        <p className="ipucu">
                          Seçenek grupları bu porsiyona bağlanır — "Tam" ve "Yarım" farklı
                          seçenek taşıyabilir.
                        </p>
                        {gruplar.length === 0 ? (
                          <p className="ipucu">Henüz seçenek grubu yok.</p>
                        ) : (
                          <div className="cipler">
                            {gruplar.map((g) => (
                              <button
                                key={g.id}
                                className={p.grupIdler.includes(g.id) ? "cip secili" : "cip"}
                                onClick={() => grupDegis(i, g.id)}
                              >
                                {g.ad}
                                <small>{g.tekli ? "tekli" : "çoklu"} · {g.liste.length}</small>
                              </button>
                            ))}
                          </div>
                        )}
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
                      {k.ustId ? `↳ ${k.ad}` : k.ad}
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