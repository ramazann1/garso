import { useEffect, useState } from "react";
import Duzen from "../components/Duzen";
import UrunPaneli from "../components/UrunPaneli";
import { menuGetir, kategoriEkle, kategoriGuncelle, kategoriSil, urunKaydet, urunSil } from "../menu";
import type { MenuKategori, MenuSecenekGrubu, MenuUrun } from "../types";

const renkler = ["#e8b4b4", "#d4b896", "#a8d5c2", "#9fc5d8", "#c9b8d8", "#e0c9a6", "#b8d4a8", "#d8b8c4"];

function anaFiyat(u: MenuUrun) {
  const p = u.porsiyonlar.find((x) => x.varsayilan) ?? u.porsiyonlar[0];
  return p?.fiyat ?? 0;
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

export default function MenuStudyosu() {
  const [kategoriler, setKategoriler] = useState<MenuKategori[]>([]);
  const [urunler, setUrunler] = useState<MenuUrun[]>([]);
  const [gruplar, setGruplar] = useState<MenuSecenekGrubu[]>([]);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [pencere, setPencere] = useState<{ kategori?: MenuKategori } | null>(null);
  const [panel, setPanel] = useState<MenuUrun | null>(null);

  const yukle = async (ilk = false) => {
    const veri = await menuGetir();
    setKategoriler(veri.kategoriler);
    setUrunler(veri.urunler);
    setGruplar(veri.gruplar);
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

  const kategoriyiSil = async (k: MenuKategori) => {
    if (sayac(k.id) > 0) {
      alert("Bu kategoride ürün var. Önce ürünleri başka kategoriye taşı veya sil.");
      return;
    }
    if (!confirm(`"${k.ad}" kategorisi silinsin mi?`)) return;
    await kategoriSil(k.id);
    if (seciliId === k.id) setSeciliId(null);
    yukle();
  };

  const kaydet = async (u: MenuUrun) => {
    await urunKaydet(u);
    setPanel(null);
    yukle();
  };

  const urunuSil = async (u: MenuUrun) => {
    if (!u.id || !confirm(`"${u.ad}" silinsin mi?`)) return;
    await urunSil(u.id);
    yukle();
  };

  const yeniUrun = (): MenuUrun => ({
    ad: "",
    favori: false,
    porsiyonlar: [{ ad: "Tam", fiyat: 0, varsayilan: true }],
    kategoriIdler: secili ? [secili.id] : [],
    grupIdler: [],
  });

  return (
    <Duzen>
      <div className="sayfa">
        <header className="menu-baslik">
          <h1>Menü Stüdyosu</h1>
        </header>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
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
                        <button className="ms-islem" onClick={(e) => { e.stopPropagation(); urunuSil(u); }}>×</button>
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
          onKapat={() => setPanel(null)}
          onKaydet={kaydet}
        />
      )}

      {pencere && (
        <KategoriPenceresi
          kategori={pencere.kategori}
          onKapat={() => setPencere(null)}
          onKaydet={kategoriKaydet}
        />
      )}
    </Duzen>
  );
}