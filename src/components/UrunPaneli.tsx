import { useState } from "react";
import Bilgi from "./Bilgi";
import { ChevronDown } from "lucide-react";
import Anahtar from "./Anahtar";
import RenkSecici from "./RenkSecici";
import { paraMetin, paraSayi, paraYaz } from "../para";
import { altKategoriler, varsayilanBirim } from "../menu";
import type {
  MenuBirim,
  MenuKategori,
  MenuKdv,
  MenuPorsiyon,
  MenuSecenekGrubu,
  MenuUrun,
} from "../types";

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
  kdvler,
  onKapat,
  onKaydet,
  onSil,
}: {
  urun: MenuUrun;
  kategoriler: MenuKategori[];
  gruplar: MenuSecenekGrubu[];
  birimler: MenuBirim[];
  kdvler: MenuKdv[];
  onKapat: () => void;
  onKaydet: (u: MenuUrun) => void;
  onSil?: () => void;
}) {
  const yeniPorsiyon = (varsayilan: boolean): PorsiyonTaslak => ({
    birimId: varsayilanBirim(birimler)?.id,
    ad: varsayilanBirim(birimler)?.ad ?? "",
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
  const [kdvId, setKdvId] = useState(urun.kdvId);
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

  const varsayilanKdv = kdvler.find((k) => k.varsayilan);
  // Alt kategoriler panel açılırken kapalı gelir; üstündeki rozet kaç alt
  // kategorinin seçili olduğunu gösterir, seçim gizli kalmasın diye.
  const anaKategoriler = kategoriler.filter(
    (k) => !k.ustId || !kategoriler.some((x) => x.id === k.ustId)
  );
  const [altAcik, setAltAcik] = useState<number[]>([]);
  const altKatla = (id: number) =>
    setAltAcik((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));


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
      kdvId,
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

          <div className="bolum">
            <button className="bolum-basi" onClick={() => katla("porsiyon")}>
              <span>Porsiyonlar ve fiyat</span>
              <small>{porsiyonlar.length}</small>
              <ChevronDown size={18} className={acik.includes("porsiyon") ? "bolum-ok donuk" : "bolum-ok"} />
            </button>

            {acik.includes("porsiyon") && (
              <>
                <div className="ekle-satir">
                  <button onClick={() => setPorsiyonlar([...porsiyonlar, yeniPorsiyon(false)])}>
                    + Porsiyon
                  </button>
                </div>
                <Bilgi>
                  {birimler.length
                    ? "Yıldızlı porsiyon, siparişte varsayılan olarak gelir."
                    : "Önce Menü Stüdyosu'nun Birimler sekmesinden birim tanımla."}
                </Bilgi>
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

                        <Bilgi>
                          Sipariş türüne göre fiyat. Boş bıraktığın türde yukarıdaki tek fiyat geçerli olur.
                        </Bilgi>
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

                        <Bilgi>
                          Seçenek grupları bu porsiyona bağlanır — "Tam" ve "Yarım" farklı
                          seçenek taşıyabilir.
                        </Bilgi>
                        {gruplar.length === 0 ? (
                          <Bilgi>Henüz seçenek grubu yok.</Bilgi>
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
              <ChevronDown size={18} className={acik.includes("kategori") ? "bolum-ok donuk" : "bolum-ok"} />
            </button>

            {acik.includes("kategori") && (
              <>
                <Bilgi>Ürün birden fazla kategoride görünebilir.</Bilgi>
                <div className="kategori-agac">
                  {anaKategoriler.map((k) => {
                    const altlar = altKategoriler(kategoriler, k.id);
                    const seciliAlt = altlar.filter((a) => kategoriIdler.includes(a.id)).length;
                    return (
                      <div key={k.id}>
                        <div className="agac-satir">
                          <button
                            className={kategoriIdler.includes(k.id) ? "agac-ad secili" : "agac-ad"}
                            onClick={() => secimDegis(kategoriIdler, setKategoriIdler, k.id)}
                          >
                            <span className="renk-nokta" style={{ background: k.renk }} />
                            {k.ad}
                          </button>
                          {altlar.length > 0 && (
                            <button
                              className="agac-ok"
                              onClick={() => altKatla(k.id)}
                              title="Alt kategoriler"
                            >
                              {seciliAlt > 0 && <em className="agac-rozet">{seciliAlt}</em>}
                              <ChevronDown size={18} className={altAcik.includes(k.id) ? "bolum-ok donuk" : "bolum-ok"} />
                            </button>
                          )}
                        </div>

                        {altAcik.includes(k.id) &&
                          altlar.map((a) => (
                            <button
                              key={a.id}
                              className={
                                kategoriIdler.includes(a.id) ? "agac-ad alt secili" : "agac-ad alt"
                              }
                              onClick={() => secimDegis(kategoriIdler, setKategoriIdler, a.id)}
                            >
                              <span className="renk-nokta" style={{ background: a.renk }} />
                              {a.ad}
                            </button>
                          ))}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="alan">
            <span>Ürün kodu</span>
            <input value={kod} onChange={(e) => setKod(e.target.value)} placeholder="Zorunlu değil" />
          </div>

          <div className="alan">
            <span>KDV grubu</span>
            <select
              value={kdvId ?? ""}
              onChange={(e) => setKdvId(e.target.value ? Number(e.target.value) : undefined)}
              disabled={!kdvler.length}
            >
              <option value="">
                {varsayilanKdv
                  ? `Varsayılan (${varsayilanKdv.ad} %${varsayilanKdv.oran})`
                  : "Varsayılan"}
              </option>
              {kdvler.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad} — %{k.oran}
                </option>
              ))}
            </select>
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