import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, Percent, SlidersHorizontal, Star, Wallet, X, Zap } from "lucide-react";
import { menuGetir, agacUrunleri, altKategoriler, porsiyonFiyat, urunKdv } from "../menu";
import { adisyonGetir, adisyonKaydet, kalemTasi, yeniKalemId } from "../adisyonlar";
import { masaGetir } from "../masalar";
import UrunSecim from "../components/UrunSecim";
import KampanyaSecim from "../components/KampanyaSecim";
import TahsilatPanel from "../components/TahsilatPanel";
import HizliOde from "../components/HizliOde";
import IndirimModal from "../components/IndirimModal";
import KdvDokum from "../components/KdvDokum";
import OnayModal from "../components/OnayModal";
import KalemPaneli from "../components/KalemPaneli";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import { kdvDokumu } from "../kdv";
import type { MenuKategori, MenuKdv, MenuSecenekGrubu, MenuUrun, SepetKalemi, Tahsilat } from "../types";

// Adisyonun kaydedilmiş hâliyle karşılaştırmak için sadeleştirilmiş imzası.
function adisyonImzasi(sepet: SepetKalemi[], indirim: number, tahsilatlar: Tahsilat[]) {
  return JSON.stringify({
    sepet: sepet.map((k) => [k.id, k.adet, k.fiyat, k.durum ?? "normal"]),
    indirim,
    tahsilat: tahsilatlar.map((t) => [t.tip, t.tutar]),
  });
}

// Aynı ürünün aynı durumdaki satırları tek satırda toplanır — ikram veya iptal
// geri alınınca adisyon yeniden sadeleşsin. Ödemesi işlenmiş kalem birleşmez;
// birleşseydi ödenen adet başka kaleme yazılırdı.
function satirlariBirlestir(sepet: SepetKalemi[], odenmisIdler: Set<number>) {
  const anahtar = (k: SepetKalemi) =>
    [k.durum ?? "normal", k.ad, k.porsiyon, k.fiyat, k.not, ...(k.secimler ?? [])].join("|");

  const sonuc: SepetKalemi[] = [];
  for (const k of sepet) {
    const es =
      !odenmisIdler.has(k.id ?? 0) &&
      sonuc.find((x) => anahtar(x) === anahtar(k) && !odenmisIdler.has(x.id ?? 0));
    if (es) es.adet += k.adet;
    else sonuc.push({ ...k });
  }
  return sonuc;
}

// Masa siparişi ekranı — fiyat kuralı tek yerden (porsiyonFiyat) geçiyor.
function anaFiyat(u: MenuUrun) {
  const p = u.porsiyonlar.find((x) => x.varsayilan) ?? u.porsiyonlar[0];
  return p ? porsiyonFiyat(p, "masa") : 0;
}

export default function Siparis() {
  const { masaId: masaIdParam } = useParams();
  const masaId = Number(masaIdParam);
  const [masaAdi, setMasaAdi] = useState("");
  const navigate = useNavigate();
  const [kategoriler, setKategoriler] = useState<MenuKategori[]>([]);
  const [urunler, setUrunler] = useState<MenuUrun[]>([]);
  // Menü içeriğindeki ürünler satışta gizli olabilir; adları yine de gösterilmeli.
  const [tumUrunler, setTumUrunler] = useState<MenuUrun[]>([]);
  const [gruplar, setGruplar] = useState<MenuSecenekGrubu[]>([]);
  const [kdvler, setKdvler] = useState<MenuKdv[]>([]);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [menuYukleniyor, setMenuYukleniyor] = useState(true);
  const [sepet, setSepet] = useState<SepetKalemi[]>([]);
  const [indirim, setIndirim] = useState(0);
  const [kayitliTahsilatlar, setKayitliTahsilatlar] = useState<Tahsilat[]>([]);
  const [secimUrunu, setSecimUrunu] = useState<MenuUrun | null>(null);
  const [kampanyaUrunu, setKampanyaUrunu] = useState<MenuUrun | null>(null);
  // Şeridin üstündeki kategori dışı listeler; ikisi de kategoriyle aynı anda açık olmaz.
  const [ozelListe, setOzelListe] = useState<"kampanya" | "favori" | null>(null);
  // Alt kategoriler kendiliğinden açılmaz; oktan açılır ve aynı anda tek dal açık kalır.
  const [acikGrupId, setAcikGrupId] = useState<number | null>(null);
  const [arama, setArama] = useState("");
  const [tahsilatAcik, setTahsilatAcik] = useState(false);
  const [hizliAcik, setHizliAcik] = useState(false);
  const [indirimAcik, setIndirimAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  // Kaydedilmiş hâlin imzası; değişince çıkışta uyarı çıkıyor.
  const [kayitliImza, setKayitliImza] = useState("");
  const [cikisSorusu, setCikisSorusu] = useState(false);
  const [seciliKalem, setSeciliKalem] = useState<SepetKalemi | null>(null);
  const [tasimaUyarisi, setTasimaUyarisi] = useState<string | null>(null);

  useEffect(() => {
    menuGetir().then((veri) => {
      // Satışta gizlenen kategori ve ürünler sipariş ekranına hiç girmiyor.
      const acikKategoriler = veri.kategoriler.filter((k) => k.satistaGorunur);
      setKategoriler(acikKategoriler);
      setUrunler(veri.urunler.filter((u) => u.satistaGorunur));
      setTumUrunler(veri.urunler);
      setGruplar(veri.gruplar);
      setKdvler(veri.kdvler);
      setSeciliId(acikKategoriler.find((k) => !k.ustId)?.id ?? acikKategoriler[0]?.id ?? null);
      setMenuYukleniyor(false);
    });
  }, []);

  useEffect(() => {
    masaGetir(masaId).then((m) => setMasaAdi(m?.ad ?? ""));
  }, [masaId]);

  useEffect(() => {
    setYukleniyor(true);
    adisyonGetir(masaId).then((veri) => {
      setSepet(veri.sepet);
      setIndirim(veri.indirim);
      setKayitliTahsilatlar(veri.tahsilatlar);
      setKayitliImza(adisyonImzasi(veri.sepet, veri.indirim, veri.tahsilatlar));
      setYukleniyor(false);
    });
  }, [masaId]);

  // Şeritte ana kategoriler durur; alt kategoriler satırdaki okla açılır.
  // Üstü satışta gizliyse alt kategori şeride ana kategori gibi girer.
  const anaKategoriler = kategoriler.filter(
    (k) => !k.ustId || !kategoriler.some((x) => x.id === k.ustId)
  );
  const secili = kategoriler.find((k) => k.id === seciliId) ?? anaKategoriler[0];

  // Kampanyalı menüler şeridin en üstünde kendi maddesinde toplanır; hiç yoksa
  // madde de görünmez.
  const kampanyalar = urunler.filter((u) => u.menuGruplari.length > 0);

  // Favoriler de aynı yerde kendi maddesinde; hiç favori yoksa madde görünmez.
  const favoriler = urunler.filter((u) => u.favori);

  // Üst kategoriye basınca altındakilerin ürünleri de geliyor — garson tek dokunuşta
  // hepsini görsün; alt kategoriye basınca liste ona daralıyor.
  // Arama açıkken kategori sınırı kalkar: garson ürünün hangi kategoride
  // olduğunu düşünmeden adını yazsın.
  const aranan = arama.trim().toLocaleLowerCase("tr");
  const listelenen = aranan
    ? urunler.filter(
        (u) =>
          u.ad.toLocaleLowerCase("tr").includes(aranan) ||
          (u.kod ?? "").toLocaleLowerCase("tr").includes(aranan)
      )
    : ozelListe === "kampanya"
      ? kampanyalar
      : ozelListe === "favori"
        ? favoriler
        : secili
          ? agacUrunleri(urunler, kategoriler, secili.id).filter((u) => !u.menuGruplari.length)
          : [];

  // KDV oranı satış anında kaleme yazılır — sonradan ürünün grubu değişse bile
  // kesilmiş adisyonun dökümü oynamasın.
  const sepeteEkle = (
    urun: MenuUrun,
    fiyat: number,
    porsiyon?: string,
    secimler?: string[]
  ) => {
    const ad = urun.ad;
    const kdvOran = urunKdv(urun, kdvler)?.oran;
    const anahtar = [ad, porsiyon, ...(secimler ?? [])].join("|");
    setSepet((s) => {
      // Yeni ürün yalnızca normal satırla birleşir; ikram/iptal satırı ayrı durur.
      const var_mi = s.find(
        (k) =>
          (k.durum ?? "normal") === "normal" &&
          [k.ad, k.porsiyon, ...(k.secimler ?? [])].join("|") === anahtar
      );
      if (var_mi) return s.map((k) => (k === var_mi ? { ...k, adet: k.adet + 1 } : k));
      return [
        ...s,
        { id: yeniKalemId(), urunId: urun.id, ad, fiyat, adet: 1, porsiyon, secimler, kdvOran },
      ];
    });
  };

  // Çıkarma kalem kimliğiyle yapılır: aynı ürünün iki porsiyonu ayrı satırdır.
  const sepettenCikar = (id?: number) => {
    setSepet((s) => s.map((k) => (k.id === id ? { ...k, adet: k.adet - 1 } : k)).filter((k) => k.adet > 0));
  };

  // Ödemesi işlenmiş kalemler: birleştirmede bunlara dokunulmuyor.
  const odenmisIdler = new Set<number>(
    kayitliTahsilatlar.flatMap((t) => Object.keys(t.kalemler ?? {}).map(Number))
  );

  // İkram ve iptal edilen kalemler adisyonda görünür ama hesaba girmez.
  const hesaba = (k: SepetKalemi) => (k.durum ?? "normal") === "normal";
  const odenecekler = sepet.filter(hesaba);

  // Ürün kartındaki rozet: o üründen adisyonda kaç adet var (porsiyonlar toplanır).
  const kartAdetleri = sepet.reduce<Record<string, number>>((m, k) => {
    if (k.durum === "iptal") return m;
    m[k.ad] = (m[k.ad] ?? 0) + k.adet;
    return m;
  }, {});

  const araToplam = odenecekler.reduce((t, k) => t + k.fiyat * k.adet, 0);
  const toplam = Math.max(0, araToplam - indirim);
  const kdvSatirlari = kdvDokumu(odenecekler, indirim, kdvler.find((k) => k.varsayilan)?.oran);
  const odenen = kayitliTahsilatlar.reduce((t, o) => t + o.tutar, 0);
  const kalan = Math.max(0, toplam - odenen);

  const kirli = !yukleniyor && adisyonImzasi(sepet, indirim, kayitliTahsilatlar) !== kayitliImza;

  // Sol menü de aynı kilide bakıyor; sipariş ekranı bugün menüsüz açılıyor ama
  // kural tek yerden işlesin.
  useEffect(() => {
    kilitKur(() => kirli);
    return kilitKaldir;
  }, [kirli]);

  // Adisyonu tazeleyip kirli imzayı da sıfırlar; taşıma gibi doğrudan diske
  // yazan işlemlerden sonra ekran veritabanıyla aynı hizaya geliyor.
  const adisyonuTazele = async () => {
    const veri = await adisyonGetir(masaId);
    setSepet(veri.sepet);
    setIndirim(veri.indirim);
    setKayitliTahsilatlar(veri.tahsilatlar);
    setKayitliImza(adisyonImzasi(veri.sepet, veri.indirim, veri.tahsilatlar));
  };

  // Taşıma veritabanı üstünde çalışıyor: ekrandaki henüz kaydedilmemiş kalemin
  // karşılığı diskte olmadığı için önce adisyon yazılıyor.
  const kalemiTasi = async (kalem: SepetKalemi, hedefMasaId: number, adet: number) => {
    setSeciliKalem(null);
    try {
      const kayitli = await adisyonKaydet(masaId, { sepet, indirim, tahsilatlar: kayitliTahsilatlar });
      const guncel = kayitli.sepet.find(
        (k) => k.id === kalem.id || (kalem.id && kalem.id < 0 && k.ad === kalem.ad)
      );
      if (!guncel?.id) throw new Error("Kalem kaydedilemedi, taşıma yapılmadı.");

      await kalemTasi(masaId, hedefMasaId, guncel.id, adet);
      await adisyonuTazele();
    } catch (e) {
      await adisyonuTazele();
      setTasimaUyarisi(e instanceof Error ? e.message : "Kalem taşınamadı.");
    }
  };

  const kaydet = async () => {
    await adisyonKaydet(masaId, { sepet, indirim, tahsilatlar: kayitliTahsilatlar });
    kilitKaldir();
    navigate("/");
  };

  const salonaDon = () => {
    if (kirli) setCikisSorusu(true);
    else navigate("/");
  };

  return (
    <div className="siparis-sayfa">
      <header className="siparis-ust">
        <button className="geri" onClick={salonaDon}>
          <ArrowLeft size={17} />
          Salon
        </button>
        <h1>{masaAdi}</h1>
      </header>

      <div className="siparis-govde">
        <nav className="kategori-serit">
          {kampanyalar.length > 0 && (
            <button
              className={ozelListe === "kampanya" ? "kategori kampanya aktif" : "kategori kampanya"}
              onClick={() => setOzelListe("kampanya")}
            >
              Kampanyalı Menüler
            </button>
          )}

          {favoriler.length > 0 && (
            <button
              className={ozelListe === "favori" ? "kategori favori aktif" : "kategori favori"}
              onClick={() => setOzelListe("favori")}
            >
              <Star size={15} strokeWidth={2} fill="currentColor" />
              Favoriler
            </button>
          )}

          {anaKategoriler.map((k) => {
            const altlar = altKategoriler(kategoriler, k.id);
            return (
            <div key={k.id} className="kategori-grup">
              <button
                className={!ozelListe && k.id === secili?.id ? "kategori aktif" : "kategori"}
                style={{ borderColor: !ozelListe && k.id === secili?.id ? "transparent" : k.renk }}
                onClick={() => { setOzelListe(null); setSeciliId(k.id); }}
              >
                {k.ad}

                {altlar.length > 0 && (
                  <span
                    className="alt-ac"
                    title={acikGrupId === k.id ? "Alt kategorileri kapat" : "Alt kategorileri aç"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAcikGrupId(acikGrupId === k.id ? null : k.id);
                    }}
                  >
                    <ChevronDown size={18} className={acikGrupId === k.id ? "donuk" : ""} />
                  </span>
                )}
              </button>

              {k.id === acikGrupId &&
                altlar.map((a) => (
                  <button
                    key={a.id}
                    className={
                      !ozelListe && a.id === secili?.id ? "kategori alt aktif" : "kategori alt"
                    }
                    style={{ borderColor: !ozelListe && a.id === secili?.id ? "transparent" : a.renk }}
                    onClick={() => { setOzelListe(null); setSeciliId(a.id); }}
                  >
                    <em className="dal" />
                    {a.ad}
                  </button>
                ))}
            </div>
            );
          })}
        </nav>

        <main className="urun-alani">
          <div className="urun-arama">
            <input
              placeholder="Ürün ara"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
            />
            {arama && (
              <button className="arama-temizle" onClick={() => setArama("")}><X size={15} /></button>
            )}
          </div>

          {menuYukleniyor && <div className="yukleniyor"><div className="cember" /></div>}

          {!menuYukleniyor && aranan && listelenen.length === 0 && (
            <p className="bos">“{arama}” için ürün bulunamadı</p>
          )}

          {!menuYukleniyor && (
            <div className="urun-grid">
              {listelenen.map((u) => (
                <button
                  key={u.id}
                  className={u.menuGruplari.length ? "urun-kart kampanya" : "urun-kart"}
                  onClick={() =>
                    u.menuGruplari.length
                      ? setKampanyaUrunu(u)
                      : u.porsiyonlar.length > 1 || u.porsiyonlar.some((p) => p.grupIdler.length > 0)
                        ? setSecimUrunu(u)
                        : sepeteEkle(u, anaFiyat(u))
                  }
                >
                  {kartAdetleri[u.ad] > 0 && (
                    <em className="kart-rozet">{kartAdetleri[u.ad]}</em>
                  )}
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
            {sepet.map((k) => {
              const detay = [
                k.porsiyon,
                ...(k.secimler ?? []),
                k.not,
                k.durum === "ikram" ? "ikram" : k.durum === "iptal" ? "iptal" : null,
              ].filter(Boolean);
              return (
              <div
                key={k.id}
                className={k.durum && k.durum !== "normal" ? `sepet-satir ${k.durum}` : "sepet-satir"}
                onClick={() => setSeciliKalem(k)}
              >
                <span className="adet">{k.adet}</span>
                <span className="ad">
                  {k.ad}
                  {detay.length > 0 && (
                    <small className="kalem-detay">{detay.join(" · ")}</small>
                  )}
                </span>
                <span className="tutar">₺{hesaba(k) ? k.fiyat * k.adet : 0}</span>
                <span className="kalem-duzenle" title="Kalem işlemleri">
                  <SlidersHorizontal size={16} />
                </span>
                <button
                  className="cikar"
                  onClick={(e) => { e.stopPropagation(); sepettenCikar(k.id); }}
                >
                  −
                </button>
              </div>
              );
            })}
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
              <KdvDokum satirlar={kdvSatirlari} />
              {kayitliTahsilatlar.length > 0 && (
                <>
                  <div className="ozet-satir odendi">
                    <span>Ödenen</span>
                    <span>₺{odenen}</span>
                  </div>
                  <div className="ozet-satir kalan">
                    <span>Kalan</span>
                    <span>₺{kalan}</span>
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
                <Percent size={17} />
                İndirim
              </button>
              <button
                className="ode"
                disabled={sepet.length === 0}
                onClick={() => setTahsilatAcik(true)}
              >
                <Wallet size={18} />
                Öde
              </button>
              <button
                className="hizli-ode-btn"
                disabled={sepet.length === 0 || kalan <= 0}
                onClick={() => setHizliAcik(true)}
              >
                <Zap size={18} />
                Hızlı Öde
              </button>
            </div>
            <button className="kaydet" onClick={kaydet}>
              <Check size={18} />
              Kaydet
            </button>
          </footer>
        </aside>
      </div>

      {tahsilatAcik && (
        <TahsilatPanel
          kalemler={sepet}
          toplam={toplam}
          araToplam={araToplam}
          indirim={indirim}
          kdvSatirlari={kdvSatirlari}
          kayitliTahsilatlar={kayitliTahsilatlar}
          onKaydet={(t) => setKayitliTahsilatlar(t)}
          onIndirimDegis={(tutar) => setIndirim(tutar)}
          onKapat={() => setTahsilatAcik(false)}
          onOdendi={async (tahsilatlar) => {
            // Kapanan adisyon silinmiyor, kapalıya çekiliyor — gün sonu raporu ona bakacak.
            await adisyonKaydet(masaId, { sepet, indirim, tahsilatlar }, true);
            kilitKaldir();
            navigate("/");
          }}
        />
      )}

      {hizliAcik && (
        <HizliOde
          baslik={masaAdi}
          araToplam={araToplam}
          indirim={indirim}
          toplam={toplam}
          odenen={odenen}
          kalan={kalan}
          onIndirimDegis={(tutar) => setIndirim(tutar)}
          onKapat={() => setHizliAcik(false)}
          onSec={async (tip, tutar, kapat) => {
            const tahsilatlar = [...kayitliTahsilatlar, { tip, tutar }];
            await adisyonKaydet(masaId, { sepet, indirim, tahsilatlar }, kapat);
            if (kapat) {
              kilitKaldir();
              navigate("/");
              return;
            }
            // Adisyon açık kaldı: ekran diskteki hâliyle aynı hizaya geliyor,
            // kaydedilmemiş değişiklik uyarısı boşuna çıkmasın.
            await adisyonuTazele();
            setHizliAcik(false);
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

      {kampanyaUrunu && (
        <KampanyaSecim
          urun={kampanyaUrunu}
          urunler={tumUrunler}
          onKapat={() => setKampanyaUrunu(null)}
          onEkle={(fiyat, secimler) => {
            sepeteEkle(kampanyaUrunu, fiyat, undefined, secimler);
            setKampanyaUrunu(null);
          }}
        />
      )}

      {secimUrunu && (
        <UrunSecim
          urun={secimUrunu}
          gruplar={gruplar}
          onKapat={() => setSecimUrunu(null)}
          onEkle={(porsiyon, fiyat, secimler) => {
            sepeteEkle(secimUrunu, fiyat, porsiyon, secimler);
            setSecimUrunu(null);
          }}
        />
      )}

      {seciliKalem && (
        <KalemPaneli
          kalem={seciliKalem}
          urun={tumUrunler.find((u) => u.id === seciliKalem.urunId || u.ad === seciliKalem.ad)}
          masaId={masaId}
          odenmis={odenmisIdler.has(seciliKalem.id ?? 0)}
          onTasi={(hedefMasaId, adet) => kalemiTasi(seciliKalem, hedefMasaId, adet)}
          onKapat={() => setSeciliKalem(null)}
          onUygula={(yeniler) => {
            // Satır bölündüyse eskisinin yerine birden fazla satır geçer; aynı
            // duruma dönen satırlar tekrar birleşir.
            setSepet((s) =>
              satirlariBirlestir(
                s.flatMap((k) => (k.id === yeniler[0].id ? yeniler : [k])).filter((k) => k.adet > 0),
                odenmisIdler
              )
            );
            setSeciliKalem(null);
          }}
        />
      )}

      {tasimaUyarisi && (
        <OnayModal mesaj={tasimaUyarisi} tekTus onKapat={() => setTasimaUyarisi(null)} />
      )}

      {cikisSorusu && (
        <OnayModal
          mesaj="Adisyonda kaydedilmemiş değişiklik var. Kaydetmeden çıkılsın mı?"
          tehlikeli
          onayMetni="Kaydetmeden çık"
          onOnay={() => { kilitKaldir(); navigate("/"); }}
          onKapat={() => setCikisSorusu(false)}
        />
      )}
    </div>
  );
}