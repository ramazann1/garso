import { useEffect, useMemo, useState } from "react";
import { Receipt, ChefHat, Save } from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Anahtar from "../components/Anahtar";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import OnayModal from "../components/OnayModal";
import { adisyonOzeti, kalemTutari, sonAdisyonlar } from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import { isletmeAdi } from "../isletmeAyarlari";
import { paraGoster } from "../para";
import {
  ADISYON_PARAMETRELERI,
  ADISYON_PUNTOLARI,
  EN_BUYUK_PUNTO,
  EN_KUCUK_PUNTO,
  MUTFAK_PARAMETRELERI,
  MUTFAK_PUNTOLARI,
  fisSablonuGetir,
  fisSablonuKaydet,
  type FisAyari,
  type FisSablonu,
} from "../yazicilar";

/** Hiç sipariş yoksa önizleme boş kalmasın: kâğıtta ne göründüğü hep denenebilsin. */
const ORNEK: AdisyonVerisi = {
  no: 1042,
  ad: "Masa 4",
  kisiSayisi: 3,
  garson: "Elif",
  acilis: new Date().toISOString(),
  not: "Çorba önce gelsin",
  indirim: 0,
  tahsilatlar: [],
  sepet: [
    { id: 1, ad: "Mercimek Çorbası", adet: 2, fiyat: 90, porsiyon: "Tam", durum: "normal" },
    {
      id: 2,
      ad: "Izgara Köfte",
      adet: 1,
      fiyat: 320,
      porsiyon: "Tam",
      durum: "normal",
      not: "Az pişmiş",
    },
    {
      id: 3,
      ad: "Türk Kahvesi",
      adet: 3,
      fiyat: 75,
      porsiyon: "Tam",
      secimler: ["Orta şekerli"],
      durum: "normal",
    },
  ],
};

const saatMetni = (zaman?: string) =>
  new Date(zaman ?? Date.now()).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Kâğıda basılacak fişin ekrandaki karşılığı. Gerçek çıktı ESC/POS olacak ama
 * ikisi de aynı şablonu okuyor: burada görünen sıra, kâğıttaki sıra.
 */
function FisOnizleme({
  sablon,
  adisyon,
}: {
  sablon: FisSablonu;
  adisyon: AdisyonVerisi;
}) {
  const mutfak = sablon.tip === "mutfak";
  const p = sablon.parametreler;
  const punto = (kod: string, varsayilan: number) => sablon.puntolar[kod] ?? varsayilan;
  const ozet = adisyonOzeti(adisyon);
  const satilanlar = adisyon.sepet.filter((k) => (k.durum ?? "normal") === "normal");

  return (
    <div className="fis-kagit">
      {!mutfak && (
        <>
          {p.logo && <div className="fis-logo">LOGO</div>}
          <div
            className="fis-isletme"
            style={{ fontSize: punto("isletme_adi", 25) / 1.6 }}
          >
            {isletmeAdi() || "İşletmeniz"}
          </div>
        </>
      )}

      {mutfak && p.siparis_no && (
        <div className="fis-no" style={{ fontSize: punto("siparis_no", 30) / 1.6 }}>
          #{adisyon.no ?? "—"}
        </div>
      )}

      {sablon.ustMetin && <div className="fis-serbest">{sablon.ustMetin}</div>}

      <div className="fis-kunye">
        <span>{adisyon.ad ?? "Masa"}</span>
        <span>{saatMetni(adisyon.acilis)}</span>
      </div>
      <div className="fis-kunye">
        {adisyon.garson && <span>Garson: {adisyon.garson}</span>}
        {!mutfak && p.siparis_no && <span>Fiş No: {adisyon.no ?? "—"}</span>}
        {mutfak && p.musteri_sayisi && adisyon.kisiSayisi && (
          <span>Kişi: {adisyon.kisiSayisi}</span>
        )}
      </div>

      {mutfak && p.musteri_bilgileri && adisyon.musteri?.ad && (
        <div className="fis-kunye">
          <span>{adisyon.musteri.ad}</span>
          <span>{adisyon.musteri.telefon}</span>
        </div>
      )}

      <div className="fis-cizgi" />

      {!mutfak && p.baslik && (
        <div className="fis-satir fis-baslik">
          <span>Ürün</span>
          <span>Adet</span>
          <span>Tutar</span>
        </div>
      )}

      <div style={{ fontSize: punto("urun_listesi", mutfak ? 24 : 20) / 1.7 }}>
        {satilanlar.map((k) => (
          <div key={k.id} className="fis-urun">
            <div className="fis-satir">
              <span>
                {k.ad}
                {!mutfak && p.urun_birimleri && k.porsiyon ? ` (${k.porsiyon})` : ""}
              </span>
              <span>{k.adet}</span>
              {(!mutfak || p.urun_fiyatlari) && <span>{paraGoster(kalemTutari(k))}</span>}
            </div>
            {k.secimler?.length ? (
              <div className="fis-secim">{k.secimler.join(" • ")}</div>
            ) : null}
            {k.not && <div className="fis-secim">Not: {k.not}</div>}
          </div>
        ))}
      </div>

      <div className="fis-cizgi" />

      {(!mutfak || p.siparis_toplami) && (
        <div style={{ fontSize: punto("toplam", 25) / 1.7 }}>
          {!mutfak && adisyon.indirim > 0 && (
            <div className="fis-satir">
              <span>İndirim</span>
              <span>−{paraGoster(adisyon.indirim)}</span>
            </div>
          )}
          {!mutfak && p.kdv_bilgisi && (
            <div className="fis-satir">
              <span>KDV</span>
              <span>{paraGoster(ozet.kdv)}</span>
            </div>
          )}
          {!mutfak && p.kdv_grubu && (
            <div className="fis-satir soluk">
              <span>KDV %10</span>
              <span>{paraGoster(ozet.kdv)}</span>
            </div>
          )}
          <div className="fis-satir fis-toplam">
            <span>TOPLAM</span>
            <span>{paraGoster(ozet.toplam)}</span>
          </div>
        </div>
      )}

      {!mutfak && p.hesabi_paylas && adisyon.kisiSayisi ? (
        <div className="fis-satir">
          <span>Kişi başı ({adisyon.kisiSayisi})</span>
          <span>{paraGoster(ozet.toplam / adisyon.kisiSayisi)}</span>
        </div>
      ) : null}

      {!mutfak && p.bahsis && (
        <div className="fis-bahsis">
          <span>Bahşiş: ____________</span>
          <span>Toplam: ____________</span>
        </div>
      )}

      {adisyon.not && (
        <div className="fis-not" style={{ fontSize: punto("not", 15) / 1.5 }}>
          {adisyon.not}
        </div>
      )}

      {!mutfak && p.karekod && <div className="fis-karekod">▣</div>}

      {sablon.altMetin && <div className="fis-serbest">{sablon.altMetin}</div>}
    </div>
  );
}

function PuntoSatiri({
  ayar,
  deger,
  degistir,
}: {
  ayar: FisAyari;
  deger: number;
  degistir: (yeni: number) => void;
}) {
  return (
    <div className="punto-satir">
      <label>{ayar.ad}</label>
      <input
        type="range"
        min={EN_KUCUK_PUNTO}
        max={EN_BUYUK_PUNTO}
        value={deger}
        onChange={(e) => degistir(Number(e.target.value))}
      />
      <span className="punto-deger">{deger}</span>
    </div>
  );
}

export default function FisTasarimi() {
  const [tip, setTip] = useState<FisSablonu["tip"]>("adisyon");
  const [sablon, setSablon] = useState<FisSablonu | null>(null);
  const [kayitli, setKayitli] = useState("");
  const [adisyonlar, setAdisyonlar] = useState<AdisyonVerisi[]>([]);
  const [secilenAdisyon, setSecilenAdisyon] = useState(0);
  const [bildirim, setBildirim] = useState("");
  const [hata, setHata] = useState("");

  const parametreler = tip === "adisyon" ? ADISYON_PARAMETRELERI : MUTFAK_PARAMETRELERI;
  const puntolar = tip === "adisyon" ? ADISYON_PUNTOLARI : MUTFAK_PUNTOLARI;

  useEffect(() => {
    sonAdisyonlar().then((liste) => setAdisyonlar(liste.filter((a) => a.sepet.length > 0)));
  }, []);

  // Şablon sekme değişince yeniden okunuyor; iki tip ayrı satır, ayrı ayarlar.
  useEffect(() => {
    setSablon(null);
    fisSablonuGetir(tip).then((s) => {
      setSablon(s);
      setKayitli(JSON.stringify(s));
    });
  }, [tip]);

  const degisti = !!sablon && JSON.stringify(sablon) !== kayitli;

  // Kaydedilmemiş değişiklikle sayfadan çıkılırsa sol menü uyarıyor.
  useEffect(() => {
    kilitKur(() => degisti);
    return kilitKaldir;
  }, [degisti]);

  const onizlenen = useMemo(
    () => adisyonlar[secilenAdisyon] ?? ORNEK,
    [adisyonlar, secilenAdisyon]
  );

  const parametreDegis = (kod: string, acik: boolean) =>
    setSablon((s) =>
      s ? { ...s, parametreler: { ...s.parametreler, [kod]: acik } } : s
    );

  const puntoDegis = (kod: string, deger: number) =>
    setSablon((s) => (s ? { ...s, puntolar: { ...s.puntolar, [kod]: deger } } : s));

  const kaydet = async () => {
    if (!sablon) return;
    try {
      await fisSablonuKaydet(sablon);
      setKayitli(JSON.stringify(sablon));
      kilitKaldir();
      setBildirim("Fiş tasarımı kaydedildi");
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
    }
  };

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <AyarBasligi />

        <div className="bilgi-serit">
          <Bilgi>
            Fişin neye benzeyeceğini buradan belirlersiniz. Sağdaki önizleme
            işletmenizin gerçek siparişiyle çizilir, kâğıda ne sığdığı orada görünür.
          </Bilgi>
        </div>

        <div className="fis-mod">
          <div className="mod-sec">
            <button
              className={tip === "adisyon" ? "aktif" : ""}
              onClick={() => setTip("adisyon")}
            >
              <Receipt size={15} /> Adisyon Fişi
            </button>
            <button
              className={tip === "mutfak" ? "aktif" : ""}
              onClick={() => setTip("mutfak")}
            >
              <ChefHat size={15} /> Mutfak Fişi
            </button>
          </div>

          <button className="ayar-ekle" disabled={!degisti} onClick={kaydet}>
            <Save size={15} /> Kaydet
          </button>
        </div>

        {!sablon ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : (
          <div className="fis-duzen">
            <section className="ayar-bolum">
              <h2>Fişte neler yazsın</h2>
              <div className="fis-anahtarlar">
                {parametreler.map((a) => (
                  <Anahtar
                    key={a.kod}
                    etiket={a.ad}
                    ipucu={a.ipucu}
                    acik={!!sablon.parametreler[a.kod]}
                    degistir={(acik) => parametreDegis(a.kod, acik)}
                  />
                ))}
              </div>

              <h2 className="fis-ara-baslik">Yazı boyutları</h2>
              <div className="punto-liste">
                {puntolar.map((a) => (
                  <PuntoSatiri
                    key={a.kod}
                    ayar={a}
                    deger={sablon.puntolar[a.kod] ?? 20}
                    degistir={(d) => puntoDegis(a.kod, d)}
                  />
                ))}
              </div>

              <h2 className="fis-ara-baslik">Kendi yazınız</h2>
              <div className="alan">
                <label>Fişin başında</label>
                <input
                  value={sablon.ustMetin}
                  onChange={(e) => setSablon({ ...sablon, ustMetin: e.target.value })}
                  placeholder="Hoş geldiniz"
                />
              </div>
              <div className="alan">
                <label>Fişin sonunda</label>
                <input
                  value={sablon.altMetin}
                  onChange={(e) => setSablon({ ...sablon, altMetin: e.target.value })}
                  placeholder="Afiyet olsun."
                />
              </div>
            </section>

            <section className="fis-onizleme-alan">
              <div className="fis-onizleme-ust">
                <h2>Önizleme</h2>
                {adisyonlar.length > 0 ? (
                  <select
                    value={secilenAdisyon}
                    onChange={(e) => setSecilenAdisyon(Number(e.target.value))}
                  >
                    {adisyonlar.map((a, i) => (
                      <option key={a.id ?? i} value={i}>
                        {a.ad ?? "Sipariş"} · #{a.no ?? "—"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="fis-ornek-not">Örnek sipariş</span>
                )}
              </div>

              <FisOnizleme sablon={sablon} adisyon={onizlenen} />
            </section>
          </div>
        )}
      </div>

      {hata && (
        <OnayModal mesaj={hata} tekTus onayMetni="Tamam" onKapat={() => setHata("")} />
      )}
      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
