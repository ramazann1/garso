import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { menuGetir, agacUrunleri, altKategoriler, porsiyonFiyat } from "../menu";
import { adisyonGetir, adisyonKaydet } from "../adisyonlar";
import UrunSecim from "../components/UrunSecim";
import TahsilatPanel from "../components/TahsilatPanel";
import IndirimModal from "../components/IndirimModal";
import type { MenuKategori, MenuSecenekGrubu, MenuUrun, SepetKalemi, Tahsilat } from "../types";

// Masa siparişi ekranı — fiyat kuralı tek yerden (porsiyonFiyat) geçiyor.
function anaFiyat(u: MenuUrun) {
  const p = u.porsiyonlar.find((x) => x.varsayilan) ?? u.porsiyonlar[0];
  return p ? porsiyonFiyat(p, "masa") : 0;
}

export default function Siparis() {
  const { masaAd } = useParams();
  const navigate = useNavigate();
  const [kategoriler, setKategoriler] = useState<MenuKategori[]>([]);
  const [urunler, setUrunler] = useState<MenuUrun[]>([]);
  const [gruplar, setGruplar] = useState<MenuSecenekGrubu[]>([]);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [menuYukleniyor, setMenuYukleniyor] = useState(true);
  const [sepet, setSepet] = useState<SepetKalemi[]>([]);
  const [indirim, setIndirim] = useState(0);
  const [kayitliTahsilatlar, setKayitliTahsilatlar] = useState<Tahsilat[]>([]);
  const [secimUrunu, setSecimUrunu] = useState<MenuUrun | null>(null);
  const [tahsilatAcik, setTahsilatAcik] = useState(false);
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    menuGetir().then((veri) => {
      // Satışta gizlenen kategori ve ürünler sipariş ekranına hiç girmiyor.
      const acikKategoriler = veri.kategoriler.filter((k) => k.satistaGorunur);
      setKategoriler(acikKategoriler);
      setUrunler(veri.urunler.filter((u) => u.satistaGorunur));
      setGruplar(veri.gruplar);
      setSeciliId(acikKategoriler.find((k) => !k.ustId)?.id ?? acikKategoriler[0]?.id ?? null);
      setMenuYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    setYukleniyor(true);
    adisyonGetir(masaAd ?? "").then((veri) => {
      setSepet(veri.sepet);
      setIndirim(veri.indirim);
      setKayitliTahsilatlar(veri.tahsilatlar);
      setYukleniyor(false);
    });
  }, [masaAd]);

  // Şeritte ana kategoriler durur; alt kategoriler yalnızca seçili olanın altında
  // açılır. Üstü satışta gizliyse alt kategori şeride ana kategori gibi girer.
  const anaKategoriler = kategoriler.filter(
    (k) => !k.ustId || !kategoriler.some((x) => x.id === k.ustId)
  );
  const secili = kategoriler.find((k) => k.id === seciliId) ?? anaKategoriler[0];
  const acikUstId = secili?.ustId ?? secili?.id;
  // Üst kategoriye basınca altındakilerin ürünleri de geliyor — garson tek dokunuşta
  // hepsini görsün; alt kategoriye basınca liste ona daralıyor.
  const kategoriUrunleri = secili ? agacUrunleri(urunler, kategoriler, secili.id) : [];

  const sepeteEkle = (ad: string, fiyat: number, porsiyon?: string, secimler?: string[]) => {
    const anahtar = [ad, porsiyon, ...(secimler ?? [])].join("|");
    setSepet((s) => {
      const var_mi = s.find((k) => [k.ad, k.porsiyon, ...(k.secimler ?? [])].join("|") === anahtar);
      if (var_mi) return s.map((k) => (k === var_mi ? { ...k, adet: k.adet + 1 } : k));
      return [...s, { ad, fiyat, adet: 1, porsiyon, secimler }];
    });
  };

  const sepettenCikar = (ad: string) => {
    setSepet((s) => s.map((k) => (k.ad === ad ? { ...k, adet: k.adet - 1 } : k)).filter((k) => k.adet > 0));
  };

  const araToplam = sepet.reduce((t, k) => t + k.fiyat * k.adet, 0);
  const toplam = Math.max(0, araToplam - indirim);

  const kaydet = async () => {
    await adisyonKaydet(masaAd ?? "", { sepet, indirim, tahsilatlar: kayitliTahsilatlar });
    navigate("/");
  };

  return (
    <div className="siparis-sayfa">
      <header className="siparis-ust">
        <button className="geri" onClick={() => navigate("/")}>← Salon</button>
        <h1>{masaAd}</h1>
      </header>

      <div className="siparis-govde">
        <nav className="kategori-serit">
          {anaKategoriler.map((k) => (
            <div key={k.id} className="kategori-grup">
              <button
                className={k.id === secili?.id ? "kategori aktif" : "kategori"}
                style={{ borderColor: k.renk }}
                onClick={() => setSeciliId(k.id)}
              >
                {k.ad}
              </button>

              {k.id === acikUstId &&
                altKategoriler(kategoriler, k.id).map((a) => (
                  <button
                    key={a.id}
                    className={a.id === secili?.id ? "kategori alt aktif" : "kategori alt"}
                    style={{ borderColor: a.renk }}
                    onClick={() => setSeciliId(a.id)}
                  >
                    <em className="dal" />
                    {a.ad}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <main className="urun-alani">
          {menuYukleniyor && <div className="yukleniyor"><div className="cember" /></div>}

          {!menuYukleniyor && (
            <div className="urun-grid">
              {kategoriUrunleri.map((u) => (
                <button
                  key={u.id}
                  className="urun-kart"
                  onClick={() =>
                    u.porsiyonlar.length > 1 || u.porsiyonlar.some((p) => p.grupIdler.length > 0)
                      ? setSecimUrunu(u)
                      : sepeteEkle(u.ad, anaFiyat(u))
                  }
                >
                  <span>{u.ad}</span>
                  <strong>₺{anaFiyat(u)}</strong>
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className="sepet">
          <h2>Adisyon</h2>
          <div className="sepet-liste">
            {yukleniyor && <div className="yukleniyor"><div className="cember" /></div>}
            {!yukleniyor && sepet.length === 0 && <p className="bos">Henüz ürün yok</p>}
            {sepet.map((k) => (
              <div key={k.ad} className="sepet-satir">
                <span className="adet">{k.adet}</span>
                <span className="ad">
                  {k.ad}
                  {(k.porsiyon || k.secimler?.length) && (
                    <small className="kalem-detay">
                      {[k.porsiyon, ...(k.secimler ?? [])].filter(Boolean).join(" · ")}
                    </small>
                  )}
                </span>
                <span className="tutar">₺{k.fiyat * k.adet}</span>
                <button className="cikar" onClick={() => sepettenCikar(k.ad)}>−</button>
              </div>
            ))}
          </div>
          <footer>
            <div className="sepet-ozet">
              <div className="ozet-satir">
                <span>Ara Toplam</span>
                <span>₺{araToplam}</span>
              </div>
              {indirim > 0 && (
                <div className="ozet-satir indirim">
                  <span>İndirim</span>
                  <span>−₺{indirim}</span>
                </div>
              )}
              {kayitliTahsilatlar.length > 0 && (
                <>
                  <div className="ozet-satir odendi">
                    <span>Ödenen</span>
                    <span>₺{kayitliTahsilatlar.reduce((t, o) => t + o.tutar, 0)}</span>
                  </div>
                  <div className="ozet-satir kalan">
                    <span>Kalan</span>
                    <span>₺{Math.max(0, toplam - kayitliTahsilatlar.reduce((t, o) => t + o.tutar, 0))}</span>
                  </div>
                </>
              )}
              <div className="ozet-satir toplam-satir">
                <span>Toplam</span>
                <strong>₺{toplam}</strong>
              </div>
            </div>
            <div className="sepet-aksiyonlar">
              <button
                className="indirim-btn"
                disabled={sepet.length === 0}
                onClick={() => setIndirimAcik(true)}
              >
                İndirim
              </button>
              <button
                className="ode"
                disabled={sepet.length === 0}
                onClick={() => setTahsilatAcik(true)}
              >
                Öde
              </button>
            </div>
            <button className="kaydet" onClick={kaydet}>Kaydet</button>
          </footer>
        </aside>
      </div>

      {tahsilatAcik && (
        <TahsilatPanel
          kalemler={sepet}
          toplam={toplam}
          araToplam={araToplam}
          indirim={indirim}
          kayitliTahsilatlar={kayitliTahsilatlar}
          onKaydet={(t) => setKayitliTahsilatlar(t)}
          onIndirimDegis={(tutar) => setIndirim(tutar)}
          onKapat={() => setTahsilatAcik(false)}
          onOdendi={() => {
            adisyonKaydet(masaAd ?? "", { sepet: [], indirim: 0, tahsilatlar: [] });
            navigate("/");
          }}
        />
      )}

      {indirimAcik && (
        <IndirimModal
          araToplam={araToplam}
          mevcutIndirim={indirim}
          onKapat={() => setIndirimAcik(false)}
          onUygula={(tutar: number) => { setIndirim(tutar); setIndirimAcik(false); }}
        />
      )}

      {secimUrunu && (
        <UrunSecim
          urun={secimUrunu}
          gruplar={gruplar}
          onKapat={() => setSecimUrunu(null)}
          onEkle={(porsiyon, fiyat, secimler) => {
            sepeteEkle(secimUrunu.ad, fiyat, porsiyon, secimler);
            setSecimUrunu(null);
          }}
        />
      )}
    </div>
  );
}