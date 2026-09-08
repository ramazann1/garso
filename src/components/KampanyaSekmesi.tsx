import { useState } from "react";
import {
  Check,
  Coins,
  Gift,
  Info,
  Layers,
  Percent,
  Plus,
  Receipt,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import Bilgi from "./Bilgi";
import {
  grubunVarsayilanSecimi,
  icerikPorsiyonu,
  maliyetEksikMi,
  menuMaliyeti,
  porsiyonFiyat,
  varsayilanBirim,
  bosMenuAlanlari,
} from "../menu";
import { paraMetin, paraSayi, paraYaz } from "../para";
import type {
  MenuBirim,
  MenuIcerikGrubu,
  MenuIcerikSatiri,
  MenuUrun,
} from "../types";

// Ek fiyat ve satış fiyatı taslakta metin — porsiyon fiyatlarındaki kuralın aynısı.
type SatirTaslak = Omit<MenuIcerikSatiri, "ekFiyat"> & { ekFiyat: string };
type GrupTaslak = Omit<MenuIcerikGrubu, "satirlar"> & { satirlar: SatirTaslak[] };

const grupYap = (g: GrupTaslak): MenuIcerikGrubu => ({
  ...g,
  baslik: g.baslik.trim(),
  satirlar: g.satirlar.map((s) => ({ ...s, ekFiyat: paraSayi(s.ekFiyat) ?? 0 })),
});

// Menü tek porsiyonla satılır — kampanyada porsiyon kavramı yok, tek fiyat var.
const menuFiyati = (u: MenuUrun) => {
  const p = u.porsiyonlar.find((x) => x.varsayilan) ?? u.porsiyonlar[0];
  return p ? porsiyonFiyat(p) : 0;
};

// Menü içindeki tipik seçimler tek tek satılsaydı ne tutardı.
function ayriAyriTutar(gruplar: MenuIcerikGrubu[], urunler: MenuUrun[]) {
  let toplam = 0;
  for (const g of gruplar) {
    for (const s of grubunVarsayilanSecimi(g)) {
      const porsiyon = icerikPorsiyonu(s, urunler);
      toplam += (porsiyon ? porsiyonFiyat(porsiyon) : 0) * s.miktar;
    }
  }
  return toplam;
}

export default function KampanyaSekmesi({
  urunler,
  birimler,
  onKaydet,
  onSil,
  onUyari,
}: {
  urunler: MenuUrun[];
  birimler: MenuBirim[];
  onKaydet: (u: MenuUrun) => void;
  onSil: (u: MenuUrun) => void;
  onUyari: (mesaj: string) => void;
}) {
  const kampanyalar = urunler.filter((u) => u.menuGruplari.length > 0);
  // Menünün içine kendisi ve başka bir kampanya konamaz — iç içe menü yok.
  const icerikAdaylari = urunler.filter((u) => u.id && !u.menuGruplari.length);

  const [seciliId, setSeciliId] = useState<number | null>(kampanyalar[0]?.id ?? null);
  const [yeni, setYeni] = useState(false);

  const secili = kampanyalar.find((u) => u.id === seciliId);
  const duzenlenen = yeni ? undefined : secili;

  const [ad, setAd] = useState(duzenlenen?.ad ?? "");
  // Fiyat elle girilmez: içeriğin normal toplamından indirim düşülerek bulunur.
  // Kayıtlı menüde tip bilgisi tutulmuyor, tutar farkı olarak geri okunuyor.
  const [indirimTipi, setIndirimTipi] = useState<"yuzde" | "tutar">("tutar");
  const [indirimDeger, setIndirimDeger] = useState("");
  const [gruplar, setGruplar] = useState<GrupTaslak[]>(
    (duzenlenen?.menuGruplari ?? []).map((g) => ({
      ...g,
      satirlar: g.satirlar.map((s) => ({ ...s, ekFiyat: paraMetin(s.ekFiyat) })),
    }))
  );

  // Listeden başka bir menüye geçmek forma o menüyü yükler.
  const yukle = (u?: MenuUrun) => {
    setYeni(!u);
    setSeciliId(u?.id ?? null);
    setAd(u?.ad ?? "");
    setIndirimTipi("tutar");
    setIndirimDeger(
      u ? paraMetin(Math.max(0, ayriAyriTutar(u.menuGruplari, urunler) - menuFiyati(u))) : ""
    );
    setGruplar(
      (u?.menuGruplari ?? []).map((g) => ({
        ...g,
        satirlar: g.satirlar.map((s) => ({ ...s, ekFiyat: paraMetin(s.ekFiyat) })),
      }))
    );
  };

  const grupDegis = (i: number, degisim: Partial<GrupTaslak>) =>
    setGruplar((l) => l.map((g, j) => (j === i ? { ...g, ...degisim } : g)));

  const satirDegis = (gi: number, si: number, degisim: Partial<SatirTaslak>) =>
    grupDegis(gi, {
      satirlar: gruplar[gi].satirlar.map((s, j) => (j === si ? { ...s, ...degisim } : s)),
    });

  const satirEkle = (gi: number) => {
    const ilk = icerikAdaylari[0];
    if (!ilk?.id) return;
    grupDegis(gi, {
      satirlar: [
        ...gruplar[gi].satirlar,
        {
          urunId: ilk.id,
          porsiyonId: (ilk.porsiyonlar.find((p) => p.varsayilan) ?? ilk.porsiyonlar[0])?.id,
          miktar: 1,
          ekFiyat: "",
          varsayilan: !gruplar[gi].satirlar.length,
        },
      ],
    });
  };

  const sayiyaCevir = (v: string) => Math.max(1, Number(v.replace(/\D/g, "") || 1));

  const temizGruplar = gruplar.filter((g) => g.baslik.trim() && g.satirlar.length).map(grupYap);
  const maliyet = menuMaliyeti(temizGruplar, urunler);
  const ayriTutar = ayriAyriTutar(temizGruplar, urunler);
  // İçerikte maliyeti girilmemiş ürün varsa "₺0" yanıltıcı — çizgi gösteriliyor.
  const maliyetGirilmemis = maliyetEksikMi(temizGruplar, urunler);
  // İndirim tutarı: yüzdede kuruş çıkmasın diye tam liraya yuvarlanıyor.
  const indirimGirdisi = paraSayi(indirimDeger) ?? 0;
  const indirimTutari =
    indirimTipi === "yuzde" ? Math.round((ayriTutar * indirimGirdisi) / 100) : indirimGirdisi;
  const satisFiyati = Math.max(0, ayriTutar - indirimTutari);
  const gecerliIndirim = indirimTutari > 0 && indirimTutari < ayriTutar;

  const kaydet = () => {
    if (!ad.trim()) return onUyari("Menü adı boş bırakılamaz.");
    if (!temizGruplar.length) return onUyari("En az bir grup ve içinde bir ürün olmalı.");
    if (!indirimTutari) return onUyari("Kampanya indirimi girilmeli — indirimsiz menü kampanya olmaz.");
    if (indirimTutari >= ayriTutar)
      return onUyari(
        `İndirim, ürünlerin normal toplamından (₺${ayriTutar}) küçük olmalı. ` +
          `Şu anki indirim ₺${indirimTutari}.`
      );

    const birim = varsayilanBirim(birimler);
    if (!birim) return onUyari("Önce Birimler sekmesinden bir birim tanımla.");

    const temel = duzenlenen?.porsiyonlar[0];
    const menu: MenuUrun = {
      ...bosMenuAlanlari(),
      ...duzenlenen,
      favori: duzenlenen?.favori ?? false,
      satistaGorunur: duzenlenen?.satistaGorunur ?? true,
      mutfaktaGorunur: duzenlenen?.mutfaktaGorunur ?? true,
      kategoriSira: duzenlenen?.kategoriSira ?? {},
      ad: ad.trim(),
      // Kampanya kategoriye bağlanmıyor; satış ekranında kendi yerinde duruyor.
      kategoriIdler: [],
      porsiyonlar: [
        {
          id: temel?.id,
          birimId: temel?.birimId ?? birim.id,
          ad: temel?.ad ?? birim.ad,
          fiyat: satisFiyati,
          maliyet: maliyetGirilmemis ? undefined : maliyet,
          varsayilan: true,
          grupIdler: [],
        },
      ],
      menuGruplari: temizGruplar,
    };
    onKaydet(menu);
  };

  return (
    <div className="kmp-duzen">
      <aside className="kmp-liste">
        <header className="kmp-liste-ust">
          <span className="kmp-im"><Sparkles size={17} /></span>
          <h3>Kampanyalı menüler</h3>
          <span className="kmp-sayi">{kampanyalar.length}</span>
        </header>

        <div className="kmp-liste-govde">
          {kampanyalar.map((u) => (
            <button
              key={u.id}
              className={!yeni && u.id === seciliId ? "kmp-satir secili" : "kmp-satir"}
              onClick={() => yukle(u)}
            >
              <span className="kmp-satir-ad">{u.ad}</span>
              <span className="kmp-satir-alt">
                <Layers size={13} />
                {u.menuGruplari.length} grup
                <b>₺{menuFiyati(u)}</b>
              </span>
            </button>
          ))}

          {kampanyalar.length === 0 && <p className="bos">Henüz kampanyalı menü yok</p>}
        </div>

        <footer className="kmp-liste-alt">
          <button className="kmp-yeni" onClick={() => yukle(undefined)}>
            <Plus size={16} /> Yeni menü
          </button>
        </footer>
      </aside>

      <section className="kmp-panel">
        {!yeni && !secili ? (
          <p className="bos">Soldan bir menü seç ya da yenisini oluştur</p>
        ) : (
          <>
            <div className="kmp-bolum">
              <div className="kmp-bolum-ust">
                <span className="kmp-im"><Tag size={16} /></span>
                <h4>Menü</h4>
              </div>

              <Bilgi>
                Kampanyalı menü, birden fazla ürünü tek fiyata satar. Her grup için kaç ürün
                seçilebileceğini belirlersin; siparişte garson o gruptan seçim yapar.
              </Bilgi>

              <div className="alan">
                <span>Menü adı</span>
                <input
                  value={ad}
                  onChange={(e) => setAd(e.target.value)}
                  placeholder="Kahvaltı Menüsü"
                />
              </div>
            </div>

            <div className="kmp-bolum">
              <div className="kmp-bolum-ust">
                <span className="kmp-im"><Layers size={16} /></span>
                <h4>Gruplar</h4>
                <span className="kmp-sayi">{gruplar.length}</span>
                <button
                  className="kmp-ekle"
                  onClick={() => setGruplar([...gruplar, { baslik: "", secilebilir: 1, satirlar: [] }])}
                >
                  <Plus size={15} /> Grup
                </button>
              </div>

              {gruplar.length === 0 && <p className="bos">Henüz grup yok.</p>}

              {gruplar.map((g, gi) => (
                <div key={gi} className="kmp-grup">
                  <div className="kmp-grup-ust">
                    <input
                      className="kmp-grup-ad"
                      value={g.baslik}
                      onChange={(e) => grupDegis(gi, { baslik: e.target.value })}
                      placeholder="Ana yemek"
                    />
                    <label className="kmp-adet">
                      Seçilebilir
                      <input
                        value={g.secilebilir}
                        onChange={(e) => grupDegis(gi, { secilebilir: sayiyaCevir(e.target.value) })}
                        title="Bu gruptan kaç ürün seçilebilir"
                      />
                    </label>
                    <button
                      className="kmp-sil"
                      title="Grubu kaldır"
                      onClick={() => setGruplar(gruplar.filter((_, j) => j !== gi))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="kmp-grup-not">
                    <Info size={14} />
                    Müşteri bu gruptan {g.secilebilir} ürün seçer. Yıldızlı satır hazır gelir.
                  </p>

                  {g.satirlar.map((s, si) => {
                    const urun = urunler.find((u) => u.id === s.urunId);
                    return (
                      <div key={si} className="kmp-urun-satir">
                        <button
                          className={s.varsayilan ? "kmp-yildiz dolu" : "kmp-yildiz"}
                          onClick={() => satirDegis(gi, si, { varsayilan: !s.varsayilan })}
                          title="Hazır gelen seçim"
                        >
                          <Star size={16} fill={s.varsayilan ? "currentColor" : "none"} />
                        </button>
                        <select
                          value={s.urunId}
                          onChange={(e) => {
                            const yeniUrun = urunler.find((u) => u.id === Number(e.target.value));
                            satirDegis(gi, si, {
                              urunId: Number(e.target.value),
                              porsiyonId: (
                                yeniUrun?.porsiyonlar.find((p) => p.varsayilan) ??
                                yeniUrun?.porsiyonlar[0]
                              )?.id,
                            });
                          }}
                        >
                          {icerikAdaylari.map((u) => (
                            <option key={u.id} value={u.id}>{u.ad}</option>
                          ))}
                        </select>
                        <select
                          value={s.porsiyonId ?? ""}
                          onChange={(e) =>
                            satirDegis(gi, si, {
                              porsiyonId: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        >
                          {(urun?.porsiyonlar ?? []).map((p) => (
                            <option key={p.id} value={p.id}>{p.ad}</option>
                          ))}
                        </select>
                        <input
                          className="kmp-kisa"
                          value={s.miktar}
                          onChange={(e) => satirDegis(gi, si, { miktar: sayiyaCevir(e.target.value) })}
                          title="Adet"
                        />
                        <input
                          className="kmp-kisa"
                          value={s.ekFiyat}
                          onChange={(e) => satirDegis(gi, si, { ekFiyat: paraYaz(e.target.value) })}
                          placeholder="+₺"
                          inputMode="decimal"
                          title="Bu seçim için ek fiyat"
                        />
                        <button
                          className="kmp-sil"
                          title="Satırı kaldır"
                          onClick={() =>
                            grupDegis(gi, { satirlar: g.satirlar.filter((_, j) => j !== si) })
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    className="kmp-ekle sade"
                    onClick={() => satirEkle(gi)}
                    disabled={!icerikAdaylari.length}
                  >
                    <Plus size={15} /> Ürün
                  </button>
                </div>
              ))}
            </div>

            {temizGruplar.length > 0 && (
              <div className="kmp-bolum">
                <div className="kmp-bolum-ust">
                  <span className="kmp-im"><Percent size={16} /></span>
                  <h4>Kampanya indirimi</h4>
                </div>

                <Bilgi>
                  Bu ürünler ayrı ayrı ₺{ayriTutar} tutuyor. İndirimi yüzde ya da tutar olarak
                  gir; menünün satış fiyatı buradan çıkar.
                </Bilgi>

                <div className="kmp-indirim">
                  <div className="mod-sec">
                    <button
                      className={indirimTipi === "yuzde" ? "aktif" : ""}
                      onClick={() => setIndirimTipi("yuzde")}
                    >
                      Yüzde
                    </button>
                    <button
                      className={indirimTipi === "tutar" ? "aktif" : ""}
                      onClick={() => setIndirimTipi("tutar")}
                    >
                      Tutar
                    </button>
                  </div>
                  <input
                    className={indirimTutari >= ayriTutar ? "kmp-kisa hatali" : "kmp-kisa"}
                    value={indirimDeger}
                    onChange={(e) => setIndirimDeger(paraYaz(e.target.value))}
                    placeholder={indirimTipi === "yuzde" ? "%" : "₺"}
                    inputMode="decimal"
                  />
                  <span className="kmp-sonuc">
                    Menü fiyatı <strong>₺{satisFiyati}</strong>
                    {gecerliIndirim && <em>−₺{indirimTutari}</em>}
                  </span>
                </div>
              </div>
            )}

            {temizGruplar.length > 0 && (
              <div className="kmp-ozet">
                <div className="kmp-kutu">
                  <span><Receipt size={15} /> Ayrı ayrı satılsa</span>
                  <strong>₺{ayriTutar}</strong>
                </div>
                <div className="kmp-kutu">
                  <span><Tag size={15} /> Menü fiyatı</span>
                  <strong>₺{satisFiyati}</strong>
                </div>
                <div className="kmp-kutu kazanc">
                  <span><Gift size={15} /> Müşterinin kazancı</span>
                  <strong>₺{indirimTutari}</strong>
                </div>
                <div className="kmp-kutu">
                  <span><Coins size={15} /> Maliyet</span>
                  <strong>{maliyetGirilmemis ? "—" : `₺${maliyet}`}</strong>
                </div>
                {satisFiyati > 0 && !maliyetGirilmemis && (
                  <div className="kmp-kutu kar">
                    <span><TrendingUp size={15} /> Kâr</span>
                    <strong>₺{satisFiyati - maliyet}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="kmp-alt">
              {duzenlenen && (
                <button className="kmp-menu-sil" onClick={() => onSil(duzenlenen)}>
                  <Trash2 size={16} /> Menüyü sil
                </button>
              )}
              <button className="kmp-kaydet" onClick={kaydet}>
                <Check size={16} /> Kaydet
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
