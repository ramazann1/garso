import { useState } from "react";
import Bilgi from "./Bilgi";
import {
  Check,
  ChevronDown,
  CupSoda,
  Info,
  Minus,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Anahtar from "./Anahtar";
import RenkSecici from "./RenkSecici";
import MenuGorunumu from "./MenuGorunumu";
import type { MenuAlanlari } from "./MenuGorunumu";
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
import type { Istasyon } from "../yazicilar";

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

// Sipariş türü fiyatı, açılışta yalnız gerçekten doldurulmuş porsiyonlarda açık
// gelir; boş bir üründe üç kutu daha göstermenin anlamı yok.
const turDolu = (t: PorsiyonTaslak) =>
  Boolean(t.masaFiyat || t.gelalFiyat || t.paketFiyat);

export default function UrunPaneli({
  urun,
  kategoriler,
  gruplar,
  birimler,
  kdvler,
  istasyonlar,
  onKapat,
  onKaydet,
  onSil,
  onUyari,
}: {
  urun: MenuUrun;
  kategoriler: MenuKategori[];
  gruplar: MenuSecenekGrubu[];
  birimler: MenuBirim[];
  kdvler: MenuKdv[];
  istasyonlar: Istasyon[];
  onKapat: () => void;
  onKaydet: (u: MenuUrun) => void;
  onSil?: () => void;
  onUyari: (mesaj: string) => void;
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
  const [istasyonId, setIstasyonId] = useState(urun.istasyonId);
  const [renk, setRenk] = useState(urun.renk);
  const [favori, setFavori] = useState(urun.favori);
  const [satistaGorunur, setSatistaGorunur] = useState(urun.satistaGorunur);
  const [mutfaktaGorunur, setMutfaktaGorunur] = useState(urun.mutfaktaGorunur);
  const [porsiyonlar, setPorsiyonlar] = useState<PorsiyonTaslak[]>(
    urun.porsiyonlar.length ? urun.porsiyonlar.map(taslakYap) : [yeniPorsiyon(true)]
  );
  const [kategoriIdler, setKategoriIdler] = useState<number[]>(urun.kategoriIdler);
  // QR menü alanları tek bir nesnede: hepsi birlikte kaydediliyor, panelin
  // tepesinde yedi ayrı durum değişkeni durmasın.
  const [menuAlan, setMenuAlan] = useState<MenuAlanlari>({
    aciklama: urun.aciklama,
    hazirlanmaDk: urun.hazirlanmaDk,
    kalori: urun.kalori,
    gramaj: urun.gramaj,
    alerjenler: urun.alerjenler,
    etiket: urun.etiket,
    tukendi: urun.tukendi,
    medya: urun.medya,
  });

  // Porsiyonlar sekme: aynı anda tek porsiyon açık, alanları da katlanmadan
  // duruyor. Eski panelde üç kat iç içe açılır kapanır vardı.
  const [secili, setSecili] = useState(0);
  const [turAcik, setTurAcik] = useState<number[]>(() =>
    porsiyonlar.map((p, i) => (turDolu(p) ? i : -1)).filter((i) => i >= 0)
  );
  // Seçenek grubu bağlama kendi penceresinde: liste uzayınca ürün penceresi
  // aşağı doğru büyüyordu.
  const [grupPencere, setGrupPencere] = useState<number | null>(null);
  const [menuAcik, setMenuAcik] = useState(false);

  const varsayilanKdv = kdvler.find((k) => k.varsayilan);
  // Ürün kendi istasyonunu seçmezse kategorisininki geçerli; birden çok
  // kategoride duruyorsa istasyonu tanımlı ilk kategori devralınır.
  const devralinan = istasyonlar.find((i) =>
    kategoriler.some((k) => kategoriIdler.includes(k.id) && k.istasyonId === i.id)
  );
  const anaKategoriler = kategoriler.filter(
    (k) => !k.ustId || !kategoriler.some((x) => x.id === k.ustId)
  );
  const [altAcik, setAltAcik] = useState<number[]>([]);
  const altKatla = (id: number) =>
    setAltAcik((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

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

  const porsiyonEkle = () => {
    setPorsiyonlar((liste) => [...liste, yeniPorsiyon(false)]);
    setSecili(porsiyonlar.length);
  };

  const porsiyonSil = (i: number) => {
    setPorsiyonlar((liste) => {
      const kalan = liste.filter((_, j) => j !== i);
      if (kalan.length && !kalan.some((p) => p.varsayilan)) kalan[0].varsayilan = true;
      return kalan;
    });
    // Sekme kapanınca seçim kaymasın: silinenden sonrakiler bir öne geliyor.
    setTurAcik((l) => l.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
    setSecili((s) => (s > i ? s - 1 : Math.min(s, porsiyonlar.length - 2)));
  };

  const turKatla = (i: number) =>
    setTurAcik((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]));

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
      istasyonId,
      renk,
      favori,
      satistaGorunur,
      mutfaktaGorunur,
      porsiyonlar: porsiyonlar.filter((p) => p.birimId).map(porsiyonYap),
      kategoriIdler,
      ...menuAlan,
      aciklama: menuAlan.aciklama.trim(),
    });
  };

  const p = porsiyonlar[secili];
  const onizlemeFiyat = porsiyonlar.find((x) => x.varsayilan)?.fiyat || p?.fiyat;
  const onizlemeBirim = porsiyonlar.find((x) => x.varsayilan)?.ad || p?.ad;

  return (
    <div className="up-fon" onClick={onKapat}>
      <div className="up-modal tam" onClick={(e) => e.stopPropagation()}>
        <header className="up-ust">
          <h3>{urun.id ? "Ürünü düzenle" : "Yeni ürün"}</h3>
          <button className="up-kapat" onClick={onKapat} title="Kapat">
            <X size={19} />
          </button>
        </header>

        <div className="up-govde">
          <aside className="up-raf">
            <div className="up-onizleme">
              <div className="up-yuvarlak" style={renk ? { background: renk } : undefined}>
                <CupSoda size={28} />
              </div>
              <div className="up-onizleme-ad">{ad.trim() || "Yeni ürün"}</div>
              {onizlemeBirim && <div className="up-onizleme-birim">{onizlemeBirim}</div>}
              <div className="up-onizleme-fiyat">₺{onizlemeFiyat || "0,00"}</div>
            </div>

            <div>
              <div className="up-raf-basi">Görünürlük</div>
              <Anahtar
                etiket="Favori ürün"
                acik={favori}
                degistir={setFavori}
              />
              <Anahtar
                etiket="Satış ekranında"
                acik={satistaGorunur}
                degistir={setSatistaGorunur}
              />
              <Anahtar
                etiket="Mutfak ekranında"
                acik={mutfaktaGorunur}
                degistir={setMutfaktaGorunur}
              />
              <Anahtar
                etiket="Bugün tükendi"
                acik={menuAlan.tukendi}
                degistir={(v) => setMenuAlan((m) => ({ ...m, tukendi: v }))}
              />
            </div>

            <div>
              <div className="up-raf-basi">Kart rengi</div>
              <RenkSecici renk={renk} degistir={setRenk} renksizOlur />
            </div>
          </aside>

          <div className="up-icerik">
            <section>
              <div className="up-blok-basi">Ürün</div>
              <div className="up-izgara">
                <div className="up-alan genis">
                  <label htmlFor="up-ad">Ürün adı</label>
                  <input
                    id="up-ad"
                    value={ad}
                    onChange={(e) => setAd(e.target.value)}
                    placeholder="Türk Kahvesi"
                    autoFocus
                  />
                </div>
                <div className="up-alan">
                  <label htmlFor="up-kod">Ürün kodu</label>
                  <input
                    id="up-kod"
                    value={kod}
                    onChange={(e) => setKod(e.target.value)}
                    placeholder="Zorunlu değil"
                  />
                </div>
                <div className="up-alan">
                  <label htmlFor="up-kdv">KDV grubu</label>
                  <select
                    id="up-kdv"
                    value={kdvId ?? ""}
                    onChange={(e) =>
                      setKdvId(e.target.value ? Number(e.target.value) : undefined)
                    }
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
                {istasyonlar.length > 0 && (
                  <div className="up-alan genis">
                    <label htmlFor="up-istasyon">Hazırlandığı istasyon</label>
                    <select
                      id="up-istasyon"
                      value={istasyonId ?? ""}
                      onChange={(e) =>
                        setIstasyonId(e.target.value ? Number(e.target.value) : undefined)
                      }
                    >
                      <option value="">
                        {devralinan
                          ? `Kategorisine göre (${devralinan.ad})`
                          : "Kategorisine göre"}
                      </option>
                      {istasyonlar.map((i) => (
                        <option key={i.id} value={i.id}>{i.ad}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="up-blok-basi">
                Kategoriler
                <em className="up-sayac">{kategoriIdler.length} seçili</em>
              </div>
              <div className="up-kategori-kutu">
                {anaKategoriler.map((k) => {
                  const altlar = altKategoriler(kategoriler, k.id);
                  const seciliAlt = altlar.filter((a) => kategoriIdler.includes(a.id)).length;
                  return (
                    <div key={k.id}>
                      <div className="up-agac-satir">
                        <button
                          className={kategoriIdler.includes(k.id) ? "up-agac-ad secili" : "up-agac-ad"}
                          onClick={() => secimDegis(kategoriIdler, setKategoriIdler, k.id)}
                        >
                          <span className="renk-nokta" style={{ background: k.renk }} />
                          {k.ad}
                        </button>
                        {altlar.length > 0 && (
                          <button className="up-agac-ok" onClick={() => altKatla(k.id)} title="Alt kategoriler">
                            {seciliAlt > 0 && <em className="up-agac-rozet">{seciliAlt}</em>}
                            <ChevronDown
                              size={17}
                              className={altAcik.includes(k.id) ? "bolum-ok donuk" : "bolum-ok"}
                            />
                          </button>
                        )}
                      </div>
                      {altAcik.includes(k.id) &&
                        altlar.map((a) => (
                          <button
                            key={a.id}
                            className={
                              kategoriIdler.includes(a.id) ? "up-agac-ad alt secili" : "up-agac-ad alt"
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
            </section>

            <section>
              <div className="up-blok-basi">Porsiyon ve fiyat</div>

              {!birimler.length && (
                <Bilgi>Önce Menü Stüdyosu'nun Birimler sekmesinden birim tanımla.</Bilgi>
              )}

              <div className="up-porsiyon-sekme">
                {porsiyonlar.map((t, i) => (
                  <button
                    key={i}
                    className={i === secili ? "up-psek secili" : "up-psek"}
                    onClick={() => setSecili(i)}
                  >
                    {t.varsayilan && <Star size={13} className="up-yildiz" fill="currentColor" />}
                    {t.ad || "Porsiyon"}
                    {porsiyonlar.length > 1 && (
                      <span
                        className="up-psek-sil"
                        title="Porsiyonu sil"
                        onClick={(e) => {
                          e.stopPropagation();
                          porsiyonSil(i);
                        }}
                      >
                        <X size={12} />
                      </span>
                    )}
                  </button>
                ))}
                <button className="up-psek-ekle" onClick={porsiyonEkle}>
                  <Plus size={14} /> Porsiyon
                </button>
              </div>

              {p && (
                <div className="up-porsiyon-kutu">
                  <div className="up-izgara uc">
                    <div className="up-alan">
                      <label htmlFor="up-birim">Birim</label>
                      <select
                        id="up-birim"
                        value={p.birimId ?? ""}
                        onChange={(e) => birimSec(secili, Number(e.target.value))}
                      >
                        <option value="" disabled>Birim seç</option>
                        {birimler.map((b) => (
                          <option key={b.id} value={b.id}>{b.ad}</option>
                        ))}
                      </select>
                    </div>
                    <div className="up-alan">
                      <label htmlFor="up-fiyat">Fiyat</label>
                      <div className="up-sonek">
                        <input
                          id="up-fiyat"
                          value={p.fiyat}
                          onChange={(e) => porsiyonDegis(secili, { fiyat: paraYaz(e.target.value) })}
                          placeholder="0,00"
                          inputMode="decimal"
                        />
                        <em>₺</em>
                      </div>
                    </div>
                    <div className="up-alan">
                      <label htmlFor="up-maliyet">Maliyet</label>
                      <div className="up-sonek">
                        <input
                          id="up-maliyet"
                          value={p.maliyet}
                          onChange={(e) => porsiyonDegis(secili, { maliyet: paraYaz(e.target.value) })}
                          placeholder="—"
                          inputMode="decimal"
                        />
                        <em>₺</em>
                      </div>
                    </div>
                    <div className="up-alan genis">
                      <label htmlFor="up-barkod">Barkod</label>
                      <input
                        id="up-barkod"
                        value={p.barkod}
                        onChange={(e) => porsiyonDegis(secili, { barkod: e.target.value })}
                        placeholder="—"
                      />
                    </div>
                  </div>

                  <div className="up-varsayilan-satir">
                    <button
                      className={p.varsayilan ? "up-varsayilan aktif" : "up-varsayilan"}
                      onClick={() => varsayilanSec(secili)}
                      disabled={p.varsayilan}
                    >
                      <Star size={14} fill={p.varsayilan ? "currentColor" : "none"} />
                      {p.varsayilan ? "Varsayılan porsiyon" : "Varsayılan yap"}
                    </button>
                    <small>Siparişte önce bu porsiyon gelir.</small>
                  </div>

                  <div className="up-katlanir">
                    <button className="up-katlanir-basi" onClick={() => turKatla(secili)}>
                      {turAcik.includes(secili) ? <Minus size={15} /> : <Plus size={15} />}
                      <span>Sipariş türüne göre farklı fiyat</span>
                      <small>Masa · Gel Al · Paket</small>
                    </button>
                    {turAcik.includes(secili) && (
                      <>
                        <Bilgi>
                          Boş bıraktığın türde yukarıdaki tek fiyat geçerli olur.
                        </Bilgi>
                        <div className="up-izgara uc">
                          <div className="up-alan">
                            <label htmlFor="up-masa">Masa</label>
                            <div className="up-sonek">
                              <input
                                id="up-masa"
                                value={p.masaFiyat}
                                onChange={(e) => porsiyonDegis(secili, { masaFiyat: paraYaz(e.target.value) })}
                                placeholder={p.fiyat || "0,00"}
                                inputMode="decimal"
                              />
                              <em>₺</em>
                            </div>
                          </div>
                          <div className="up-alan">
                            <label htmlFor="up-gelal">Gel Al</label>
                            <div className="up-sonek">
                              <input
                                id="up-gelal"
                                value={p.gelalFiyat}
                                onChange={(e) => porsiyonDegis(secili, { gelalFiyat: paraYaz(e.target.value) })}
                                placeholder={p.fiyat || "0,00"}
                                inputMode="decimal"
                              />
                              <em>₺</em>
                            </div>
                          </div>
                          <div className="up-alan">
                            <label htmlFor="up-paket">Paket</label>
                            <div className="up-sonek">
                              <input
                                id="up-paket"
                                value={p.paketFiyat}
                                onChange={(e) => porsiyonDegis(secili, { paketFiyat: paraYaz(e.target.value) })}
                                placeholder={p.fiyat || "0,00"}
                                inputMode="decimal"
                              />
                              <em>₺</em>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <div className="up-raf-basi">Seçenek grupları</div>
                    <div className="up-cipler">
                      {p.grupIdler.map((id) => {
                        const g = gruplar.find((x) => x.id === id);
                        if (!g) return null;
                        return (
                          <span key={id} className="up-cip">
                            <b>{g.ad}</b>
                            <small>{g.tekli ? "tekli" : "çoklu"} · {g.liste.length} seçenek</small>
                            <button
                              className="up-cip-sil"
                              onClick={() => grupDegis(secili, id)}
                              title="Bağlantıyı kaldır"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                      <button className="up-cip-ekle" onClick={() => setGrupPencere(secili)}>
                        <Plus size={13} /> Grup bağla
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section>
              <button className="up-katlanir-basi tek" onClick={() => setMenuAcik(!menuAcik)}>
                {menuAcik ? <Minus size={15} /> : <Plus size={15} />}
                <span>QR menü görünümü</span>
                <small>
                  {menuAlan.medya.length
                    ? `${menuAlan.medya.length} görsel`
                    : menuAlan.aciklama
                      ? "açıklama var"
                      : "boş"}
                </small>
              </button>
              {!menuAcik && (
                <div className="up-bilgi">
                  <Info size={15} />
                  <span>
                    Açıklama, görsel, alerjen ve kalori bilgisi burada. Yalnız karekodlu
                    menüde görünür, satış ekranını etkilemez.
                  </span>
                </div>
              )}
              {menuAcik && (
                <MenuGorunumu
                  deger={menuAlan}
                  degistir={(d) => setMenuAlan((m) => ({ ...m, ...d }))}
                  onUyari={onUyari}
                />
              )}
            </section>
          </div>
        </div>

        <footer className="up-alt">
          {urun.id && onSil && (
            <button className="up-tus sil" onClick={onSil}>
              <Trash2 size={15} /> Ürünü sil
            </button>
          )}
          <button className="up-tus vazgec" onClick={onKapat}>Vazgeç</button>
          <button className="up-tus kaydet" disabled={!gecerli} onClick={kaydet}>Kaydet</button>
        </footer>
      </div>

      {grupPencere !== null && (
        <div className="up-fon ust" onClick={() => setGrupPencere(null)}>
          <div className="up-grup-pencere" onClick={(e) => e.stopPropagation()}>
            <header className="up-ust">
              <h3>Seçenek grupları</h3>
              <button className="up-kapat" onClick={() => setGrupPencere(null)} title="Kapat">
                <X size={19} />
              </button>
            </header>
            <div className="up-grup-govde">
              <Bilgi>
                Seçilen gruplar yalnız bu porsiyona bağlanır — "Tam" ve "Yarım"
                farklı seçenek taşıyabilir.
              </Bilgi>
              {gruplar.length === 0 ? (
                <Bilgi>Henüz seçenek grubu yok.</Bilgi>
              ) : (
                <div className="up-grup-izgara">
                  {gruplar.map((g) => {
                    const sec = porsiyonlar[grupPencere].grupIdler.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        className={sec ? "up-grup-kart secili" : "up-grup-kart"}
                        onClick={() => grupDegis(grupPencere, g.id)}
                      >
                        <span className="up-grup-ad">{g.ad}</span>
                        <small>{g.tekli ? "tekli" : "çoklu"} · {g.liste.length} seçenek</small>
                        <span className="up-grup-im">{sec && <Check size={14} />}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <footer className="up-alt">
              <button className="up-tus kaydet" onClick={() => setGrupPencere(null)}>Tamam</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
