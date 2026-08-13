import { useEffect, useMemo, useState } from "react";
import { Receipt, ChefHat, Save, ToggleLeft, Type, PenLine } from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Anahtar from "../components/Anahtar";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import OnayModal from "../components/OnayModal";
import { sonAdisyonlar } from "../adisyonlar";
import type { AdisyonVerisi } from "../adisyonlar";
import { kilitKaldir, kilitKur } from "../cikisKilidi";
import { fisIcerigi } from "../fis";
import type { FisSatiri } from "../fis";
import {
  ADISYON_PARAMETRELERI,
  ADISYON_PUNTOLARI,
  EN_BUYUK_PUNTO,
  EN_KUCUK_PUNTO,
  MUTFAK_PARAMETRELERI,
  MUTFAK_PUNTOLARI,
  VARSAYILAN_PUNTOLAR,
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

/**
 * Önizleme fişi üreten kodun kendisini kullanıyor: ekranda görünen satırlar
 * kâğıda giden satırların aynısı. Eskiden ikisi ayrı yazılıyordu ve şablona
 * her dokunuşta birbirinden kayıyorlardı.
 *
 * Kâğıtta punto 203 dpi noktaya çevriliyor; ekranda da aynı oranla büyütülüp
 * kâğıdın genişliğine oturtuluyor, böylece "sığıyor mu" sorusu burada görünüyor.
 */
const EKRAN_OLCEK = 0.72;

function FisOnizleme({ sablon, adisyon }: { sablon: FisSablonu; adisyon: AdisyonVerisi }) {
  // Önizlemede örnek bir sipariş numarası veriliyor: gerçek numarayı sipariş
  // kaydedilirken veritabanı üretiyor, burada kâğıtta nasıl duracağı görünsün.
  const icerik = useMemo(
    () => fisIcerigi(sablon, adisyon, undefined, 50124),
    [sablon, adisyon]
  );

  const boy = (s: FisSatiri) => {
    const alan = "alan" in s ? s.alan : undefined;
    const punto = (alan && icerik.puntolar[alan]) || VARSAYILAN_PUNTOLAR.genel;
    return punto * EKRAN_OLCEK * (s.t === "ic" ? 0.8 : 1);
  };

  return (
    <div className="fis-kagit">
      {icerik.satirlar.map((s, i) => {
        if (s.t === "cizgi") return <div key={i} className="fis-cizgi" />;
        if (s.t === "bosluk") return <div key={i} className="fis-bosluk" />;

        const stil = {
          fontSize: boy(s),
          fontWeight: "kalin" in s && s.kalin ? 600 : 500,
        };

        if (s.t === "ikiUc")
          return (
            <div key={i} className="fis-satir" style={stil}>
              <span>{s.sol}</span>
              <span>{s.sag}</span>
            </div>
          );

        return (
          <div
            key={i}
            className={s.t === "orta" ? "fis-orta" : s.t === "ic" ? "fis-ic" : "fis-sol"}
            style={stil}
          >
            {s.m}
          </div>
        );
      })}
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
      <label>
        {ayar.ad}
        {ayar.ipucu && <em>{ayar.ipucu}</em>}
      </label>
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

const BOLUMLER = [
  { kod: "icerik", ad: "Fişte ne yazsın", ikon: ToggleLeft },
  { kod: "boyut", ad: "Yazı boyutları", ikon: Type },
  { kod: "yazi", ad: "Kendi yazınız", ikon: PenLine },
] as const;

export default function FisTasarimi() {
  const [tip, setTip] = useState<FisSablonu["tip"]>("adisyon");
  const [bolum, setBolum] = useState<(typeof BOLUMLER)[number]["kod"]>("icerik");
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
    setSablon((s) => (s ? { ...s, parametreler: { ...s.parametreler, [kod]: acik } } : s));

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
            <section className="ayar-bolum fis-ayarlar">
              <div className="fis-bolum-sec">
                {BOLUMLER.map((b) => {
                  const Ikon = b.ikon;
                  return (
                    <button
                      key={b.kod}
                      className={bolum === b.kod ? "aktif" : ""}
                      onClick={() => setBolum(b.kod)}
                    >
                      <Ikon size={15} /> {b.ad}
                    </button>
                  );
                })}
              </div>

              {bolum === "icerik" && (
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
              )}

              {bolum === "boyut" && (
                <div className="punto-liste">
                  {puntolar.map((a) => (
                    <PuntoSatiri
                      key={a.kod}
                      ayar={a}
                      deger={sablon.puntolar[a.kod] ?? VARSAYILAN_PUNTOLAR[a.kod] ?? 20}
                      degistir={(d) => puntoDegis(a.kod, d)}
                    />
                  ))}
                </div>
              )}

              {bolum === "yazi" && (
                <>
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
                  <Bilgi>
                    Bu iki satır her fişte aynı çıkar; kampanya ya da teşekkür yazısı
                    için kullanılır.
                  </Bilgi>
                </>
              )}
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
