import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bike,
  Check,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Network,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
  Usb,
  X,
  Zap,
} from "lucide-react";
import Duzen from "../components/Duzen";
import AyarBasligi from "../components/AyarBasligi";
import Anahtar from "../components/Anahtar";
import Bilgi from "../components/Bilgi";
import Bildirim from "../components/Bildirim";
import OnayModal from "../components/OnayModal";
import {
  BAGLANTILAR,
  TURLER,
  baglantiAdi,
  istasyonKaydet,
  istasyonSil,
  istasyonlariGetir,
  turAdi,
  yaziciKaydet,
  yaziciSil,
  yaziciSirasiniKaydet,
  yazicilariGetir,
  type Baglanti,
  type Istasyon,
  type Yazici,
  type YaziciAlanlari,
  type YaziciTuru,
} from "../yazicilar";

// Bağlantı ve tür seçimleri metin listesi yerine ikonlu kartlarla yapılıyor;
// işletmeci kablonun mu ağın mı söz konusu olduğunu okumadan ayırt ediyor.
const baglantiIkon: Record<string, typeof Network> = {
  ethernet: Network,
  usb: Usb,
  webusb: Zap,
};

const turIkon: Record<string, typeof Receipt> = {
  adisyon: Receipt,
  mutfak: ChefHat,
  kurye: Bike,
};

const turAciklama: Record<string, string> = {
  adisyon: "Müşteriye verilen hesap fişi",
  mutfak: "Siparişin istasyona giden fişi",
  kurye: "Paket siparişin adres fişi",
};

function YaziciPaneli({
  yazici,
  istasyonlar,
  onKapat,
  onKaydet,
  onSil,
}: {
  yazici: Yazici | null;
  istasyonlar: Istasyon[];
  onKapat: () => void;
  onKaydet: (alanlar: YaziciAlanlari) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(yazici?.ad ?? "");
  const [baglanti, setBaglanti] = useState<Baglanti>(yazici?.baglanti ?? "ethernet");
  const [ip, setIp] = useState(yazici?.ip ?? "");
  const [port, setPort] = useState(String(yazici?.port ?? 9100));
  const [sistemAd, setSistemAd] = useState(yazici?.sistemAd ?? "");
  const [kagit, setKagit] = useState(yazici?.kagitGenislik ?? 80);
  const [zil, setZil] = useState(yazici?.zil ?? false);
  const [turler, setTurler] = useState<YaziciTuru[]>(yazici?.turler ?? ["adisyon"]);
  const [secilenler, setSecilenler] = useState<number[]>(yazici?.istasyonlar ?? []);
  const [aktif, setAktif] = useState(yazici?.aktif ?? true);

  const turDegis = (kod: YaziciTuru, acik: boolean) =>
    setTurler((eski) => (acik ? [...eski, kod] : eski.filter((t) => t !== kod)));

  const istasyonDegis = (id: number, acik: boolean) =>
    setSecilenler((eski) => (acik ? [...eski, id] : eski.filter((i) => i !== id)));

  const secilenBaglanti = BAGLANTILAR.find((b) => b.kod === baglanti)!;
  const gecerli =
    ad.trim().length > 0 &&
    turler.length > 0 &&
    (baglanti !== "ethernet" || ip.trim().length > 0);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel yazici-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{yazici ? "Yazıcıyı düzenle" : "Yeni yazıcı"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>Yazıcı adı</label>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Mutfak, Bar, Kasa…"
              autoFocus
            />
          </div>

          <div className="yz-bolum">
            <h4>Bağlantı</h4>
            <div className="yz-kartlar">
              {BAGLANTILAR.map((b) => {
                const Ikon = baglantiIkon[b.kod];
                return (
                  <button
                    key={b.kod}
                    className={baglanti === b.kod ? "yz-kart secili" : "yz-kart"}
                    onClick={() => setBaglanti(b.kod)}
                  >
                    <Ikon size={20} />
                    <strong>{b.ad}</strong>
                  </button>
                );
              })}
            </div>
            <p className="yz-aciklama">{secilenBaglanti.aciklama}</p>

            {baglanti === "ethernet" && (
              <div className="alan ikili">
                <div>
                  <label>IP adresi</label>
                  <input
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="192.168.1.50"
                  />
                </div>
                <div>
                  <label>Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="9100"
                  />
                </div>
              </div>
            )}

            {baglanti === "usb" && (
              <div className="alan">
                <label>Bilgisayardaki yazıcı adı</label>
                <input
                  value={sistemAd}
                  onChange={(e) => setSistemAd(e.target.value)}
                  placeholder="XP-80"
                />
              </div>
            )}

            <div className="alan">
              <label>Kâğıt genişliği</label>
              <div className="yz-cipler">
                {[80, 58].map((mm) => (
                  <button
                    key={mm}
                    className={kagit === mm ? "yz-cip secili" : "yz-cip"}
                    onClick={() => setKagit(mm)}
                  >
                    {kagit === mm && <Check size={13} />}
                    {mm} mm
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="yz-bolum">
            <h4>Bu yazıcıdan çıkacak fişler</h4>
            <div className="yz-secimler">
              {TURLER.map((t) => {
                const Ikon = turIkon[t.kod];
                const secili = turler.includes(t.kod);
                return (
                  // Mutfak fişinin istasyon seçimi kendi satırının içinde
                  // açılıyor: ayrı bir bölüm olarak aşağıda belirince hangi
                  // seçime ait olduğu anlaşılmıyordu.
                  <div
                    key={t.kod}
                    className={secili ? "yz-secim-kutu secili" : "yz-secim-kutu"}
                  >
                    <button className="yz-secim" onClick={() => turDegis(t.kod, !secili)}>
                      <span className="yz-secim-ikon"><Ikon size={18} /></span>
                      <span className="yz-secim-yazi">
                        <strong>{t.ad} fişi</strong>
                        <em>{turAciklama[t.kod]}</em>
                      </span>
                      <span className="yz-tik">{secili && <Check size={14} />}</span>
                    </button>

                    {t.kod === "mutfak" && secili && (
                      <div className="yz-alt-secim">
                        <label>Hangi istasyonların siparişi bu yazıcıdan çıksın?</label>
                        {istasyonlar.length === 0 ? (
                          <Bilgi>
                            Henüz istasyon yok. İstasyonlar sekmesinden ekledikten sonra
                            buradan seçebilirsiniz.
                          </Bilgi>
                        ) : (
                          <div className="yz-cipler">
                            {istasyonlar.map((i) => {
                              const acik = secilenler.includes(i.id);
                              return (
                                <button
                                  key={i.id}
                                  className={acik ? "yz-cip secili" : "yz-cip"}
                                  onClick={() => istasyonDegis(i.id, !acik)}
                                >
                                  {acik && <Check size={13} />}
                                  {i.ad}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Anahtar
            etiket="Fiş çıkarken zil çalsın"
            ipucu="Mutfakta fişin düştüğünü haber verir"
            acik={zil}
            degistir={setZil}
          />

          <Anahtar
            etiket="Kullanımda"
            ipucu="Kapatırsanız yazıcı silinmez, fiş gönderilmez"
            acik={aktif}
            degistir={setAktif}
          />
        </div>

        <footer className="modal-aksiyonlar">
          {onSil && (
            <button className="sil-buton" onClick={onSil}>
              <Trash2 size={15} /> Sil
            </button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={!gecerli}
            onClick={() =>
              onKaydet({
                ad,
                baglanti,
                ip,
                port: Number(port) || 9100,
                sistemAd,
                kagitGenislik: kagit,
                zil,
                turler,
                aktif,
                istasyonlar: secilenler,
              })
            }
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

function IstasyonPaneli({
  istasyon,
  onKapat,
  onKaydet,
  onSil,
}: {
  istasyon: Istasyon | null;
  onKapat: () => void;
  onKaydet: (alanlar: { ad: string; pisirme: boolean; paketleme: boolean }) => void;
  onSil?: () => void;
}) {
  const [ad, setAd] = useState(istasyon?.ad ?? "");
  const [pisirme, setPisirme] = useState(istasyon?.pisirme ?? true);
  const [paketleme, setPaketleme] = useState(istasyon?.paketleme ?? false);

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>{istasyon ? "İstasyonu düzenle" : "Yeni istasyon"}</h3>
          <button className="panel-kapat" onClick={onKapat}><X size={19} /></button>
        </header>

        <div className="panel-govde">
          <div className="alan">
            <label>İstasyon adı</label>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Mutfak, Bar, Nargile…"
              autoFocus
            />
          </div>

          <Anahtar
            etiket="Hazırlık yapılıyor"
            ipucu="Ocak, ızgara, fırın gibi siparişin pişirildiği istasyonlar"
            acik={pisirme}
            degistir={setPisirme}
          />
          <Anahtar
            etiket="Paketleme yapılıyor"
            ipucu="Paket ve gel al siparişlerinin toplandığı istasyon"
            acik={paketleme}
            degistir={setPaketleme}
          />
        </div>

        <footer className="modal-aksiyonlar">
          {onSil && (
            <button className="sil-buton" onClick={onSil}>
              <Trash2 size={15} /> Sil
            </button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            disabled={!ad.trim()}
            onClick={() => onKaydet({ ad, pisirme, paketleme })}
          >
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function Yazicilar() {
  const { pathname } = useLocation();
  const istasyonBolumu = pathname === "/ayarlar/istasyonlar";

  const [yukleniyor, setYukleniyor] = useState(true);
  const [yazicilar, setYazicilar] = useState<Yazici[]>([]);
  const [istasyonlar, setIstasyonlar] = useState<Istasyon[]>([]);
  const [bildirim, setBildirim] = useState("");
  const [hata, setHata] = useState("");

  const [yaziciPaneli, setYaziciPaneli] = useState<Yazici | null | undefined>(undefined);
  const [istasyonPaneli, setIstasyonPaneli] = useState<Istasyon | null | undefined>(
    undefined
  );
  const [silinecek, setSilinecek] = useState<
    { tur: "yazici" | "istasyon"; id: number; ad: string } | null
  >(null);

  const tazele = async () => {
    const [y, i] = await Promise.all([yazicilariGetir(), istasyonlariGetir()]);
    setYazicilar(y);
    setIstasyonlar(i);
    setYukleniyor(false);
  };

  useEffect(() => {
    tazele();
  }, []);

  // Hata metni tek yerden: her çağrının kendi try'ı olsa aynı satır beş kez yazılırdı.
  const calistir = async (is: () => Promise<void>, mesaj: string) => {
    try {
      await is();
      await tazele();
      setBildirim(mesaj);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İşlem tamamlanamadı.");
    }
  };

  const yaziciTasi = async (yazici: Yazici, yon: number) => {
    const sirali = yazicilar.map((y) => y.id);
    const yer = sirali.indexOf(yazici.id);
    const hedef = yer + yon;
    if (hedef < 0 || hedef >= sirali.length) return;
    [sirali[yer], sirali[hedef]] = [sirali[hedef], sirali[yer]];
    await yaziciSirasiniKaydet(sirali);
    await tazele();
  };

  const istasyonYazicilari = (id: number) =>
    yazicilar.filter((y) => y.istasyonlar.includes(id));

  return (
    <Duzen>
      <div className="sayfa ayar-sayfa">
        <AyarBasligi />

        <div className="bilgi-serit">
          <Bilgi>
            {istasyonBolumu
              ? "İstasyon, siparişin hazırlandığı yerdir: mutfak, bar, nargile. Ürünün hangi istasyona gideceğini kategorisi belirler, gerekirse ürün kendi istasyonunu seçer."
              : "Fişlerin hangi yazıcıdan çıkacağını buradan tanımlarsınız."}
          </Bilgi>
        </div>

        {yukleniyor ? (
          <div className="yukleniyor"><div className="cember" /></div>
        ) : istasyonBolumu ? (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><ChefHat size={17} /> İstasyonlar</h2>
              <button className="ayar-ekle" onClick={() => setIstasyonPaneli(null)}>
                <Plus size={15} /> İstasyon ekle
              </button>
            </div>

            {istasyonlar.length === 0 ? (
              <div className="ayar-bos">
                <ChefHat size={30} />
                <p>Henüz istasyon yok. Mutfak ve Bar ile başlayabilirsiniz.</p>
              </div>
            ) : (
              <div className="odeme-tip-liste">
                {istasyonlar.map((i) => {
                  const bagli = istasyonYazicilari(i.id);
                  return (
                    <div key={i.id} className="odeme-tip-satir">
                      <span className="yazici-ad">
                        <ChefHat size={16} /> {i.ad}
                      </span>
                      <span className="odeme-tip-etiket">
                        {[i.pisirme && "Hazırlık", i.paketleme && "Paketleme"]
                          .filter(Boolean)
                          .join(" · ") || "Aşama seçilmedi"}
                        {" · "}
                        {bagli.length > 0
                          ? bagli.map((y) => y.ad).join(", ")
                          : "Yazıcı bağlanmadı"}
                      </span>
                      <span className="odeme-tip-islem">
                        <button onClick={() => setIstasyonPaneli(i)} title="Düzenle">
                          <Pencil size={14} />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="ayar-bolum">
            <div className="ayar-bolum-ust">
              <h2><Printer size={17} /> Yazıcılar</h2>
              <button className="ayar-ekle" onClick={() => setYaziciPaneli(null)}>
                <Plus size={15} /> Yazıcı ekle
              </button>
            </div>

            <Bilgi>
              Ağa bağlı yazıcılar ve para çekmecesi için kasada Garso Kasa Köprüsü
              çalışır. Tek USB yazıcı kullanıyorsanız kurulum gerekmez.
            </Bilgi>

            {yazicilar.length === 0 ? (
              <div className="ayar-bos">
                <Printer size={30} />
                <p>Henüz yazıcı tanımlanmadı. Kasa yazıcısıyla başlayın.</p>
              </div>
            ) : (
              <div className="odeme-tip-liste">
                {yazicilar.map((y, i) => (
                  <div
                    key={y.id}
                    className={y.aktif ? "odeme-tip-satir" : "odeme-tip-satir kapali"}
                  >
                    <span className="yazici-ad">
                      <Printer size={16} /> {y.ad}
                    </span>
                    <span className="odeme-tip-etiket">
                      {y.turler.map(turAdi).join(" · ")}
                      {" · "}
                      {baglantiAdi(y.baglanti)}
                      {y.baglanti === "ethernet" && y.ip && ` · ${y.ip}`}
                      {y.baglanti === "usb" && y.sistemAd && ` · ${y.sistemAd}`}
                      {!y.aktif && " · Kapalı"}
                    </span>
                    <span className="odeme-tip-islem">
                      <button
                        disabled={i === 0}
                        onClick={() => yaziciTasi(y, -1)}
                        title="Yukarı al"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        disabled={i === yazicilar.length - 1}
                        onClick={() => yaziciTasi(y, 1)}
                        title="Aşağı al"
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button onClick={() => setYaziciPaneli(y)} title="Düzenle">
                        <Pencil size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {yaziciPaneli !== undefined && (
        <YaziciPaneli
          key={yaziciPaneli?.id ?? "yeni"}
          yazici={yaziciPaneli}
          istasyonlar={istasyonlar}
          onKapat={() => setYaziciPaneli(undefined)}
          onSil={
            yaziciPaneli
              ? () =>
                  setSilinecek({ tur: "yazici", id: yaziciPaneli.id, ad: yaziciPaneli.ad })
              : undefined
          }
          onKaydet={(alanlar) =>
            calistir(async () => {
              await yaziciKaydet(yaziciPaneli?.id ?? null, alanlar);
              setYaziciPaneli(undefined);
            }, "Yazıcı kaydedildi")
          }
        />
      )}

      {istasyonPaneli !== undefined && (
        <IstasyonPaneli
          key={istasyonPaneli?.id ?? "yeni"}
          istasyon={istasyonPaneli}
          onKapat={() => setIstasyonPaneli(undefined)}
          onSil={
            istasyonPaneli
              ? () =>
                  setSilinecek({
                    tur: "istasyon",
                    id: istasyonPaneli.id,
                    ad: istasyonPaneli.ad,
                  })
              : undefined
          }
          onKaydet={(alanlar) =>
            calistir(async () => {
              await istasyonKaydet(istasyonPaneli?.id ?? null, {
                ...alanlar,
                sira: istasyonPaneli?.sira ?? istasyonlar.length + 1,
              });
              setIstasyonPaneli(undefined);
            }, "İstasyon kaydedildi")
          }
        />
      )}

      {silinecek && (
        <OnayModal
          mesaj={
            silinecek.tur === "yazici"
              ? `"${silinecek.ad}" yazıcısı silinsin mi?`
              : `"${silinecek.ad}" istasyonu silinsin mi? Bu istasyona bağlı ürünlerin fişi hiçbir yazıcıya gitmez.`
          }
          tehlikeli
          onayMetni="Evet, sil"
          onOnay={() =>
            calistir(async () => {
              if (silinecek.tur === "yazici") await yaziciSil(silinecek.id);
              else await istasyonSil(silinecek.id);
              setSilinecek(null);
              setYaziciPaneli(undefined);
              setIstasyonPaneli(undefined);
            }, "Silindi")
          }
          onKapat={() => setSilinecek(null)}
        />
      )}

      {hata && (
        <OnayModal mesaj={hata} tekTus onayMetni="Tamam" onKapat={() => setHata("")} />
      )}

      {bildirim && <Bildirim mesaj={bildirim} onKapat={() => setBildirim("")} />}
    </Duzen>
  );
}
