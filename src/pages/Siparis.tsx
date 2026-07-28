import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { kategoriler } from "../ornekVeri";
import { adisyonGetir, adisyonKaydet } from "../adisyonlar";
import UrunSecim from "../components/UrunSecim";
import TahsilatPanel from "../components/TahsilatPanel";
import type { Urun } from "../types";

export default function Siparis() {
  const { masaAd } = useParams();
  const navigate = useNavigate();
  const [secili, setSecili] = useState(kategoriler[0]);
  const [sepet, setSepet] = useState(() => adisyonGetir(masaAd ?? ""));
  const [secimUrunu, setSecimUrunu] = useState<Urun | null>(null);
  const [tahsilatAcik, setTahsilatAcik] = useState(false);
  const sepeteEkle = (ad: string, fiyat: number, porsiyon?: string, secimler?: string[]) => {
    const anahtar = [ad, porsiyon, ...(secimler ?? [])].join("|");
    setSepet((s) => {
      const var_mi = s.find((k) => [k.ad, k.porsiyon, ...(k.secimler ?? [])].join("|") === anahtar);
      if (var_mi)
        return s.map((k) => (k === var_mi ? { ...k, adet: k.adet + 1 } : k));
      return [...s, { ad, fiyat, adet: 1, porsiyon, secimler }];
    });
  };
  const sepettenCikar = (ad: string) => {
    setSepet((s) =>
      s
        .map((k) => (k.ad === ad ? { ...k, adet: k.adet - 1 } : k))
        .filter((k) => k.adet > 0)
    );
  };
  const toplam = sepet.reduce((t, k) => t + k.fiyat * k.adet, 0);

  return (
    <div className="siparis-sayfa">
      <header className="siparis-ust">
        <button className="geri" onClick={() => navigate("/")}>← Salon</button>
        <h1>{masaAd}</h1>
      </header>

      <div className="siparis-govde">
        <nav className="kategori-serit">
          {kategoriler.map((k) => (
            <button
              key={k.ad}
              className={k.ad === secili.ad ? "kategori aktif" : "kategori"}
              style={{ borderColor: k.renk }}
              onClick={() => setSecili(k)}
            >
              {k.ad}
            </button>
          ))}
        </nav>

        <main className="urun-alani">
          <div className="urun-grid">
            {secili.urunler.map((u) => (
              <button
                key={u.ad}
                className="urun-kart"
                onClick={() =>
                  u.porsiyonlar || u.secenekler
                    ? setSecimUrunu(u)
                    : sepeteEkle(u.ad, u.fiyat)
                }
              >
                <span>{u.ad}</span>
                <strong>₺{u.fiyat}</strong>
              </button>
            ))}
          </div>
        </main>
        <aside className="sepet">
          <h2>Adisyon</h2>
          <div className="sepet-liste">
            {sepet.length === 0 && <p className="bos">Henüz ürün yok</p>}
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
            <div className="toplam">
              <span>Toplam</span>
              <strong>₺{toplam}</strong>
            </div>
            <button
              className="ode"
              disabled={sepet.length === 0}
              onClick={() => setTahsilatAcik(true)}
            >
              Öde
            </button>
            <button
              className="kaydet"
              onClick={() => {
                adisyonKaydet(masaAd ?? "", sepet);
                navigate("/");
              }}
            >
              Kaydet
            </button>
          </footer>
        </aside>
      </div>
      {tahsilatAcik && (
        <TahsilatPanel
          kalemler={sepet}
          onKapat={() => setTahsilatAcik(false)}
          onOdendi={() => {
            adisyonKaydet(masaAd ?? "", []);
            navigate("/");
          }}
        />
      )}
      {secimUrunu && (
        <UrunSecim
          urun={secimUrunu}
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