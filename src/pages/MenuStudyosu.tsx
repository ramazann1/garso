import { useEffect, useState } from "react";
import Duzen from "../components/Duzen";
import UrunPaneli from "../components/UrunPaneli";
import OnayModal from "../components/OnayModal";
import {
  menuGetir,
  kategoriEkle,
  kategoriGuncelle,
  kategoriSil,
  urunKaydet,
  urunSil,
  grupKaydet,
  grupSil,
  birimleriKaydet,
  porsiyonFiyat,
} from "../menu";
import type { MenuBirim, MenuKategori, MenuSecenekGrubu, MenuUrun } from "../types";

const renkler = ["#e8b4b4", "#d4b896", "#a8d5c2", "#9fc5d8", "#c9b8d8", "#e0c9a6", "#b8d4a8", "#d8b8c4"];

function anaFiyat(u: MenuUrun) {
  const p = u.porsiyonlar.find((x) => x.varsayilan) ?? u.porsiyonlar[0];
  return p ? porsiyonFiyat(p) : 0;
}

function KategoriPenceresi({
  kategori,
  onKapat,
  onKaydet,
}: {
  kategori?: MenuKategori;
  onKapat: () => void;
  onKaydet: (ad: string, renk: string) => void;
}) {
  const [ad, setAd] = useState(kategori?.ad ?? "");
  const [renk, setRenk] = useState(kategori?.renk ?? renkler[0]);

  return (
    <div className="modal-fon" onClick={onKapat}>
      <div className="kategori-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{kategori ? "Kategoriyi düzenle" : "Yeni kategori"}</h3>

        <div className="alan">
          <span>Kategori adı</span>
          <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Sıcak İçecekler" autoFocus />
        </div>

        <div className="alan">
          <span>Renk</span>
          <div className="renk-secim">
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

        <div className="modal-aksiyonlar">
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!ad.trim()} onClick={() => onKaydet(ad.trim(), renk)}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function GrupPaneli({
  grup,
  onKapat,
  onKaydet,
  onSil,
}: {
  grup?: MenuSecenekGrubu;
  onKapat: () => void;
  onKaydet: (ad: string, tekli: boolean, liste: { ad: string; ekFiyat: number }[]) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(grup?.ad ?? "");
  const [tekli, setTekli] = useState(grup?.tekli ?? true);
  const [liste, setListe] = useState(
    grup?.liste.length
      ? grup.liste.map((s) => ({ ad: s.ad, ekFiyat: s.ekFiyat }))
      : [{ ad: "", ekFiyat: 0 }]
  );

  const satirDegis = (i: number, alan: "ad" | "ekFiyat", deger: string) => {
    setListe((l) =>
      l.map((s, j) => (j === i ? { ...s, [alan]: alan === "ekFiyat" ? Number(deger) || 0 : deger } : s))
    );
  };

  const satirSil = (i: number) => {
    setListe((l) => l.filter((_, j) => j !== i));
  };

  const gecerli = ad.trim().length > 0 && liste.some((s) => s.ad.trim());

  const kaydet = () => {
    onKaydet(ad.trim(), tekli, liste.filter((s) => s.ad.trim()));
  };

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="urun-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{grup ? "Grubu düzenle" : "Yeni seçenek grubu"}</h3>
          <button className="panel-kapat" onClick={onKapat}>×</button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <span>Grup adı</span>
            <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Şeker" autoFocus />
          </div>

          <div className="mod-sec">
            <button className={tekli ? "aktif" : ""} onClick={() => setTekli(true)}>Tekli seçim</button>
            <button className={!tekli ? "aktif" : ""} onClick={() => setTekli(false)}>Çoklu seçim</button>
          </div>

          <div className="bolum">
            <div className="ekle-satir">
              <button onClick={() => setListe([...liste, { ad: "", ekFiyat: 0 }])}>+ Seçenek</button>
            </div>
            <p className="ipucu">Ek fiyat boş bırakılırsa ücretsiz sayılır.</p>
            {liste.map((s, i) => (
              <div key={i} className="satir-alan">
                <input value={s.ad} onChange={(e) => satirDegis(i, "ad", e.target.value)} placeholder="Sade" />
                <input
                  className="kisa"
                  value={s.ekFiyat || ""}
                  onChange={(e) => satirDegis(i, "ekFiyat", e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="₺"
                  inputMode="decimal"
                />
                <button className="satir-sil" onClick={() => satirSil(i)} disabled={liste.length === 1}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <footer className="modal-aksiyonlar">
          {grup && onSil && (
            <button className="sil-buton" onClick={onSil}>Grubu sil</button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button className="uygula" disabled={!gecerli} onClick={kaydet}>Kaydet</button>
        </footer>
      </div>
    </div>
  );
}

function BirimlerSekmesi({
  birimler,
  kullanim,
  onKaydet,
  onUyari,
}: {
  birimler: MenuBirim[];
  kullanim: (id: number) => number;
  onKaydet: (liste: { id?: number; ad: string }[], silinenler: number[]) => void;
  onUyari: (mesaj: string) => void;
}) {
  const [liste, setListe] = useState<{ id?: number; ad: string }[]>(
    birimler.map((b) => ({ id: b.id, ad: b.ad }))
  );
  const [silinenler, setSilinenler] = useState<number[]>([]);

  const satirSil = (i: number) => {
    const satir = liste[i];
    if (satir.id && kullanim(satir.id) > 0) {
      onUyari(`"${satir.ad}" birimi ${kullanim(satir.id)} porsiyonda kullanılıyor. Önce o porsiyonların birimini değiştir.`);
      return;
    }
    if (satir.id) setSilinenler((s) => [...s, satir.id!]);
    setListe((l) => l.filter((_, j) => j !== i));
  };

  const kaydet = () => {
    const dolu = liste.filter((b) => b.ad.trim()).map((b) => ({ ...b, ad: b.ad.trim() }));
    const adlar = dolu.map((b) => b.ad.toLocaleLowerCase("tr"));
    if (new Set(adlar).size !== adlar.length) {
      onUyari("Aynı isimde iki birim olamaz.");
      return;
    }
    onKaydet(dolu, silinenler);
  };

  return (
    <div className="ms-urunler">
      <div className="ms-urun-ust">
        <h2>Birimler</h2>
        <span>{liste.length} birim</span>
        <button className="ms-urun-ekle" onClick={() => setListe([...liste, { ad: "" }])}>+ Birim</button>
      </div>

      <p className="ipucu">
        Porsiyon adları bu listeden seçilir — "Tam" ile "tam" karmaşası olmasın diye tek yerde tutuluyor.
      </p>

      <div className="birim-liste">
        {liste.map((b, i) => (
          <div key={b.id ?? `yeni-${i}`} className="satir-alan">
            <input
              value={b.ad}
              onChange={(e) =>
                setListe((l) => l.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))
              }
              placeholder="Tam"
            />
            <span className="birim-sayac">{b.id ? `${kullanim(b.id)} porsiyon` : "yeni"}</span>
            <button className="satir-sil" onClick={() => satirSil(i)}>×</button>
          </div>
        ))}
      </div>

      {liste.length === 0 && <p className="bos">Henüz birim yok</p>}

      <div className="birim-aksiyon">
        <button className="birim-kaydet" onClick={kaydet}>Kaydet</button>
      </div>
    </div>
  );
}

export default function MenuStudyosu() {
  const [kategoriler, setKategoriler] = useState<MenuKategori[]>([]);
  const [urunler, setUrunler] = useState<MenuUrun[]>([]);
  const [gruplar, setGruplar] = useState<MenuSecenekGrubu[]>([]);
  const [birimler, setBirimler] = useState<MenuBirim[]>([]);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [pencere, setPencere] = useState<{ kategori?: MenuKategori } | null>(null);
  const [panel, setPanel] = useState<MenuUrun | null>(null);
  const [gorunum, setGorunum] = useState<"kategoriler" | "gruplar" | "birimler">("kategoriler");
  const [grupPencere, setGrupPencere] = useState<{ grup?: MenuSecenekGrubu } | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  const [onaySor, setOnaySor] = useState<{ mesaj: string; devam: () => void } | null>(null);

  const yukle = async (ilk = false) => {
    const veri = await menuGetir();
    setKategoriler(veri.kategoriler);
    setUrunler(veri.urunler);
    setGruplar(veri.gruplar);
    setBirimler(veri.birimler);
    if (ilk) setSeciliId(veri.kategoriler[0]?.id ?? null);
  };

  useEffect(() => {
    yukle(true).then(() => setYukleniyor(false));
  }, []);

  const secili = kategoriler.find((k) => k.id === seciliId) ?? kategoriler[0];
  const kategoriUrunleri = secili ? urunler.filter((u) => u.kategoriIdler.includes(secili.id)) : [];
  const sayac = (id: number) => urunler.filter((u) => u.kategoriIdler.includes(id)).length;

  const kategoriKaydet = async (ad: string, renk: string) => {
    if (pencere?.kategori) await kategoriGuncelle(pencere.kategori.id, ad, renk);
    else await kategoriEkle(ad, renk, kategoriler.length + 1);
    setPencere(null);
    yukle();
  };

  const kategoriyiSil = (k: MenuKategori) => {
    if (sayac(k.id) > 0) {
      setUyari("Bu kategoride ürün var. Önce ürünleri başka kategoriye taşı veya sil.");
      return;
    }
    setOnaySor({
      mesaj: `"${k.ad}" kategorisi silinsin mi?`,
      devam: async () => {
        await kategoriSil(k.id);
        if (seciliId === k.id) setSeciliId(null);
        yukle();
      },
    });
  };

  const kaydet = async (u: MenuUrun) => {
    await urunKaydet(u);
    setPanel(null);
    yukle();
  };

  const urunuSil = (u: MenuUrun) => {
    if (!u.id) return;
    setOnaySor({
      mesaj: `"${u.ad}" silinsin mi?`,
      devam: async () => {
        await urunSil(u.id!);
        yukle();
        setPanel(null);
      },
    });
  };

  const grupSayaci = (id: number) => urunler.filter((u) => u.grupIdler.includes(id)).length;

  const grubuKaydet = async (ad: string, tekli: boolean, liste: { ad: string; ekFiyat: number }[]) => {
    await grupKaydet(grupPencere?.grup?.id, ad, tekli, liste);
    setGrupPencere(null);
    yukle();
  };

  const grubuSil = (g: MenuSecenekGrubu) => {
    if (grupSayaci(g.id) > 0) {
      setUyari("Bu grup bir ürüne bağlı. Önce üründen kaldır veya ürünü sil.");
      return;
    }
    setOnaySor({
      mesaj: `"${g.ad}" grubu silinsin mi?`,
      devam: async () => {
        await grupSil(g.id);
        yukle();
        setGrupPencere(null);
      },
    });
  };

  const birimKullanimi = (id: number) =>
    urunler.reduce((t, u) => t + u.porsiyonlar.filter((p) => p.birimId === id).length, 0);

  const birimleriYaz = async (liste: { id?: number; ad: string }[], silinenler: number[]) => {
    await birimleriKaydet(liste, silinenler);
    yukle();
  };

  const yeniUrun = (): MenuUrun => ({
    ad: "",
    favori: false,
    porsiyonlar: [],
    kategoriIdler: secili ? [secili.id] : [],
    grupIdler: [],
  });

  return (
    <Duzen>
      <div className="sayfa">
        <header className="menu-baslik">
          <h1>Menü Stüdyosu</h1>
          <div className="mod-sec">
            <button className={gorunum === "kategoriler" ? "aktif" : ""} onClick={() => setGorunum("kategoriler")}>
              Kategoriler
            </button>
            <button className={gorunum === "gruplar" ? "aktif" : ""} onClick={() => setGorunum("gruplar")}>
              Seçenek Grupları
            </button>
            <button className={gorunum === "birimler" ? "aktif" : ""} onClick={() => setGorunum("birimler")}>
              Birimler
            </button>
          </div>
        </header>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : gorunum === "birimler" ? (
          <BirimlerSekmesi
            key={birimler.map((b) => `${b.id}:${b.ad}`).join("|")}
            birimler={birimler}
            kullanim={birimKullanimi}
            onKaydet={birimleriYaz}
            onUyari={setUyari}
          />
        ) : gorunum === "gruplar" ? (
          <div className="ms-urunler">
            <div className="ms-urun-ust">
              <h2>Seçenek Grupları</h2>
              <span>{gruplar.length} grup</span>
              <button className="ms-urun-ekle" onClick={() => setGrupPencere({})}>+ Seçenek Grubu</button>
            </div>

            <div className="menu-urunler">
              {gruplar.map((g) => (
                <div key={g.id} className="menu-urun tiklanir" onClick={() => setGrupPencere({ grup: g })}>
                  <div className="urun-bilgi">
                    <span>{g.ad}</span>
                    <small>{g.tekli ? "tekli" : "çoklu"} · {g.liste.length} seçenek</small>
                  </div>
                  <button className="menu-urun-sil" onClick={(e) => { e.stopPropagation(); grubuSil(g); }}>Sil ×</button>
                </div>
              ))}
            </div>

            {gruplar.length === 0 && <p className="bos">Henüz seçenek grubu yok</p>}
          </div>
        ) : (
          <div className="ms-duzen">
            <div className="ms-kategoriler">
              <button className="ms-ekle" onClick={() => setPencere({})}>+ Kategori</button>

              {kategoriler.map((k) => (
                <div
                  key={k.id}
                  className={k.id === secili?.id ? "ms-kategori aktif" : "ms-kategori"}
                  onClick={() => setSeciliId(k.id)}
                >
                  <span className="renk-nokta" style={{ background: k.renk }} />
                  <span className="ms-ad">{k.ad}</span>
                  <span className="ms-sayi">{sayac(k.id)}</span>
                  <button
                    className="ms-islem"
                    title="Düzenle"
                    onClick={(e) => { e.stopPropagation(); setPencere({ kategori: k }); }}
                  >
                    ✎
                  </button>
                  <button
                    className="ms-islem"
                    title="Sil"
                    onClick={(e) => { e.stopPropagation(); kategoriyiSil(k); }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {kategoriler.length === 0 && <p className="bos">Henüz kategori yok</p>}
            </div>

            <div className="ms-urunler">
              {secili ? (
                <>
                  <div className="ms-urun-ust">
                    <h2>{secili.ad}</h2>
                    <span>{kategoriUrunleri.length} ürün</span>
                    <button className="ms-urun-ekle" onClick={() => setPanel(yeniUrun())}>+ Ürün</button>
                  </div>

                  <div className="menu-urunler">
                    {kategoriUrunleri.map((u) => (
                      <div
                        key={u.id}
                        className="menu-urun tiklanir"
                        style={u.renk ? { borderLeft: `4px solid ${u.renk}` } : undefined}
                        onClick={() => setPanel(u)}
                      >
                        <div className="urun-bilgi">
                          <span>
                            {u.favori && <em className="favori-im">★</em>}
                            {u.ad}
                          </span>
                          <small>
                            {[
                              u.porsiyonlar.length > 1 && `${u.porsiyonlar.length} porsiyon`,
                              u.grupIdler.length > 0 && `${u.grupIdler.length} seçenek`,
                              u.kategoriIdler.length > 1 && `${u.kategoriIdler.length} kategori`,
                            ].filter(Boolean).join(" · ")}
                          </small>
                        </div>
                        <strong>₺{anaFiyat(u)}</strong>
                        <button className="menu-urun-sil" onClick={(e) => { e.stopPropagation(); urunuSil(u); }}>Sil ×</button>
                      </div>
                    ))}
                  </div>

                  {kategoriUrunleri.length === 0 && <p className="bos">Bu kategoride ürün yok</p>}
                </>
              ) : (
                <p className="bos">Soldan bir kategori seç</p>
              )}
            </div>
          </div>
        )}
      </div>

      {panel && (
        <UrunPaneli
          urun={panel}
          kategoriler={kategoriler}
          gruplar={gruplar}
          birimler={birimler}
          onKapat={() => setPanel(null)}
          onKaydet={kaydet}
          onSil={() => urunuSil(panel)}
        />
      )}

      {pencere && (
        <KategoriPenceresi
          kategori={pencere.kategori}
          onKapat={() => setPencere(null)}
          onKaydet={kategoriKaydet}
        />
      )}

      {grupPencere && (
        <GrupPaneli
          grup={grupPencere.grup}
          onKapat={() => setGrupPencere(null)}
          onKaydet={grubuKaydet}
          onSil={grupPencere.grup ? () => grubuSil(grupPencere.grup!) : undefined}
        />
      )}

      {uyari && <OnayModal mesaj={uyari} tekTus onKapat={() => setUyari(null)} />}

      {onaySor && (
        <OnayModal
          mesaj={onaySor.mesaj}
          tehlikeli
          onOnay={() => { onaySor.devam(); setOnaySor(null); }}
          onKapat={() => setOnaySor(null)}
        />
      )}
    </Duzen>
  );
}