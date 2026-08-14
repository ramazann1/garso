import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  ChefHat,
  ImagePlus,
  Save,
  ToggleLeft,
  Trash2,
  Type,
  PenLine,
} from "lucide-react";
import QRCode from "qrcode";
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

/**
 * Karekodun ekrandaki hâli. Köprü kâğıda kare kare çiziyor; burada aynı kareler
 * tek bir çizim olarak basılıyor, telefondan okunabiliyor — adresin doğru
 * yazıldığı kâğıda basmadan denenebilsin.
 */
function Karekod({ icerik }: { icerik: string }) {
  const cizim = useMemo(() => {
    try {
      const kod = QRCode.create(icerik, { errorCorrectionLevel: "M" });
      const boyut = kod.modules.size;
      const veri = kod.modules.data;
      const kareler: string[] = [];

      for (let satir = 0; satir < boyut; satir++)
        for (let sutun = 0; sutun < boyut; sutun++)
          if (veri[satir * boyut + sutun])
            kareler.push(`<rect x="${sutun}" y="${satir}" width="1" height="1"/>`);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${boyut + 4} ${
        boyut + 4
      }" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${boyut + 4}" height="${
        boyut + 4
      }" fill="#fff"/><g fill="#000">${kareler.join("")}</g></svg>`;
    } catch {
      return null;
    }
  }, [icerik]);

  if (!cizim) return null;
  return (
    <img
      className="fis-karekod"
      src={`data:image/svg+xml;utf8,${encodeURIComponent(cizim)}`}
      alt=""
    />
  );
}

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
        if (s.t === "logo") return <img key={i} className="fis-logo" src={s.m} alt="" />;
        if (s.t === "karekod") return <Karekod key={i} icerik={s.m} />;

        const stil = {
          fontSize: boy(s),
          fontWeight: "kalin" in s && s.kalin ? 600 : 500,
          // İşletme adı fişin başlığı: altındaki künye satırlarına yapışmasın.
          paddingBottom: "alan" in s && s.alan === "isletme_adi" ? boy(s) * 0.4 : undefined,
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

/** Kâğıdın nokta genişliği; logo bundan büyük olamaz, olsa da yazıcı kırpar. */
const LOGO_EN = 384;
const LOGO_BOY = 260;

/**
 * Logo yükleme. Görsel tarayıcıda kâğıt ölçüsüne küçültülüp beyaz zemine
 * oturtuluyor: saydam arka plan termal kâğıtta siyah çıkıyor, büyük dosya da
 * her fiş kaydını şişiriyor.
 */
function LogoAlani({
  logo,
  degistir,
  onHata,
}: {
  logo: string;
  degistir: (yeni: string) => void;
  onHata: (mesaj: string) => void;
}) {
  const sec = (dosya?: File) => {
    if (!dosya) return;
    if (!dosya.type.startsWith("image/")) {
      onHata("Yalnız resim dosyası yüklenebilir.");
      return;
    }

    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      const resim = new Image();
      resim.onload = () => {
        const olcek = Math.min(1, LOGO_EN / resim.width, LOGO_BOY / resim.height);
        const tuval = document.createElement("canvas");
        tuval.width = Math.max(1, Math.round(resim.width * olcek));
        tuval.height = Math.max(1, Math.round(resim.height * olcek));

        const kalem = tuval.getContext("2d");
        if (!kalem) return;
        kalem.fillStyle = "#fff";
        kalem.fillRect(0, 0, tuval.width, tuval.height);
        kalem.drawImage(resim, 0, 0, tuval.width, tuval.height);

        degistir(tuval.toDataURL("image/png"));
      };
      resim.onerror = () => onHata("Resim açılamadı.");
      resim.src = String(okuyucu.result);
    };
    okuyucu.readAsDataURL(dosya);
  };

  return (
    <div className="fis-ek-ayar">
      {logo && <img className="fis-logo-onizleme" src={logo} alt="" />}

      <div className="fis-logo-dugmeler">
        <label className="ayar-ekle">
          <ImagePlus size={15} /> {logo ? "Logoyu değiştir" : "Logo yükle"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              sec(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {logo && (
          <button className="sil-buton" onClick={() => degistir("")}>
            <Trash2 size={15} /> Kaldır
          </button>
        )}
      </div>

      <Bilgi>
        Termal yazıcı gri ton basmaz: düz siyah-beyaz, arka planı boş bir görsel
        en iyi sonucu verir. Renkli logolar lekeli çıkar.
      </Bilgi>
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
                  {parametreler.map((a) => {
                    const acik = !!sablon.parametreler[a.kod];
                    return (
                      <div key={a.kod}>
                        <Anahtar
                          etiket={a.ad}
                          ipucu={a.ipucu}
                          acik={acik}
                          degistir={(yeni) => parametreDegis(a.kod, yeni)}
                        />

                        {/* Anahtarın kendi ayarı hemen altında açılıyor. */}
                        {acik && a.kod === "logo" && (
                          <LogoAlani
                            logo={sablon.logo}
                            degistir={(logo) => setSablon({ ...sablon, logo })}
                            onHata={setHata}
                          />
                        )}

                        {acik && a.kod === "karekod" && (
                          <div className="fis-ek-ayar">
                            <div className="mod-sec kompakt">
                              <button
                                className={sablon.karekodTip === "fis" ? "aktif" : ""}
                                onClick={() => setSablon({ ...sablon, karekodTip: "fis" })}
                              >
                                Fiş bilgisi
                              </button>
                              <button
                                className={sablon.karekodTip === "baglanti" ? "aktif" : ""}
                                onClick={() => setSablon({ ...sablon, karekodTip: "baglanti" })}
                              >
                                Bağlantı
                              </button>
                            </div>

                            {sablon.karekodTip === "baglanti" ? (
                              <div className="alan">
                                <label>Karekodun açacağı adres</label>
                                <input
                                  value={sablon.karekodAdres}
                                  onChange={(e) =>
                                    setSablon({ ...sablon, karekodAdres: e.target.value })
                                  }
                                  placeholder="https://instagram.com/isletmeniz"
                                />
                              </div>
                            ) : (
                              <Bilgi>
                                Karekod okutulduğunda işletme adı, tarih ve tutar görünür.
                              </Bilgi>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
