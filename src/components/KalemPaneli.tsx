import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import OnayModal from "./OnayModal";
import Anahtar from "./Anahtar";
import Bilgi from "./Bilgi";
import { porsiyonFiyat } from "../menu";
import { yeniKalemId } from "../adisyonlar";
import { paraMetin, paraSayi, paraYaz } from "../para";
import type { MenuUrun, SepetKalemi } from "../types";

type Props = {
  kalem: SepetKalemi;
  urun?: MenuUrun; // porsiyon değiştirmek için; menüden silinmiş ürünlerde boş olabilir
  onKapat: () => void;
  // İkram/iptal kalemin bir kısmına uygulanabildiği için satır ikiye bölünebilir.
  onUygula: (kalemler: SepetKalemi[]) => void;
};

export default function KalemPaneli({ kalem, urun, onKapat, onUygula }: Props) {
  const [adet, setAdet] = useState(kalem.adet);
  const [fiyat, setFiyat] = useState(paraMetin(kalem.fiyat));
  const [porsiyon, setPorsiyon] = useState(kalem.porsiyon);
  const [notMetni, setNotMetni] = useState(kalem.not ?? "");
  const [ikram, setIkram] = useState(kalem.durum === "ikram");
  const [iptalSorusu, setIptalSorusu] = useState(false);

  const porsiyonlar = urun?.porsiyonlar ?? [];

  const porsiyonSec = (ad: string) => {
    setPorsiyon(ad);
    const p = porsiyonlar.find((x) => x.ad === ad);
    if (p) setFiyat(paraMetin(porsiyonFiyat(p, "masa")));
  };

  const kaydet = (durum: SepetKalemi["durum"]) => {
    const temel = {
      ...kalem,
      adet,
      fiyat: paraSayi(fiyat) ?? 0,
      porsiyon,
      not: notMetni.trim() || undefined,
    };

    // "2 salebin biri ikram": adet satırın tamamından azsa satır ikiye ayrılır —
    // kalanı normal kalır, işleme giren kısım kendi satırına geçer.
    const bolunuyor = durum !== "normal" && kalem.durum !== durum && adet < kalem.adet;

    if (bolunuyor) {
      onUygula([
        { ...temel, adet: kalem.adet - adet, durum: kalem.durum ?? "normal" },
        { ...temel, id: yeniKalemId(), adet, durum },
      ]);
      return;
    }

    onUygula([{ ...temel, durum }]);
  };

  return (
    <div className="panel-fon" onClick={onKapat}>
      <div className="urun-panel" onClick={(e) => e.stopPropagation()}>
        <header className="panel-ust">
          <h3>
            {kalem.ad}
            {porsiyon && <em className="panel-alt-baslik">{porsiyon}</em>}
          </h3>
          <button className="panel-kapat" onClick={onKapat}>×</button>
        </header>

        <div className="panel-govde">
          <div className="kalem-ikili">
            <div className="alan">
              <span>Adet</span>
              <div className="adet-kutu">
                <button onClick={() => setAdet((a) => Math.max(1, a - 1))}>
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  min={1}
                  value={adet}
                  onChange={(e) => setAdet(Math.max(1, Number(e.target.value) || 1))}
                />
                <button onClick={() => setAdet((a) => a + 1)}>
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="alan">
              <span>Birim fiyat</span>
              <div className="para-alan">
                <em>₺</em>
                <input
                  value={fiyat}
                  onChange={(e) => setFiyat(paraYaz(e.target.value))}
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          <div className="kalem-toplam">
            <span>Satır toplamı</span>
            <strong>₺{((paraSayi(fiyat) ?? 0) * adet).toFixed(2)}</strong>
          </div>

          {kalem.adet > 1 && adet < kalem.adet && (
            <Bilgi>
              İkram veya iptal ederseniz {kalem.adet} adedin {adet} tanesi işleme girer,
              kalan {kalem.adet - adet} adet adisyonda normal satır olarak durur.
            </Bilgi>
          )}

          {porsiyonlar.length > 1 && (
            <div className="alan">
              <span>Porsiyon</span>
              <div className="porsiyon-secim">
                {porsiyonlar.map((p) => (
                  <button
                    key={p.ad}
                    className={p.ad === porsiyon ? "porsiyon-tus secili" : "porsiyon-tus"}
                    onClick={() => porsiyonSec(p.ad)}
                  >
                    {p.ad}
                    <em>₺{porsiyonFiyat(p, "masa")}</em>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="alan">
            <span>Ürün notu</span>
            <input
              value={notMetni}
              onChange={(e) => setNotMetni(e.target.value)}
              placeholder="Az şekerli"
            />
          </div>

          <Anahtar
            etiket="İkram"
            ipucu="Kalem adisyonda kalır, tutarı hesaba girmez"
            acik={ikram}
            degistir={setIkram}
          />

          {kalem.durum === "iptal" ? (
            <>
              <button className="iptali-geri-al" onClick={() => kaydet("normal")}>
                İptali geri al
              </button>
              <Bilgi>Kalem yeniden hesaba girer ve aynı üründen normal satır varsa onunla birleşir.</Bilgi>
            </>
          ) : (
            <Bilgi>
              İptal edilen kalem silinmez; adisyonda üstü çizili kalır ve hesaba girmez.
              Aynı panelden geri alınabilir.
            </Bilgi>
          )}
        </div>

        <footer className="modal-aksiyonlar">
          {kalem.durum !== "iptal" && (
            <button className="sil-buton" onClick={() => setIptalSorusu(true)}>
              Kalemi iptal et
            </button>
          )}
          <button className="iptal" onClick={onKapat}>Vazgeç</button>
          <button
            className="uygula"
            onClick={() =>
              // İptal edilmiş kalemde "Uygula" iptali kaldırmaz; onun kendi düğmesi var.
              kaydet(kalem.durum === "iptal" ? "iptal" : ikram ? "ikram" : "normal")
            }
          >
            Uygula
          </button>
        </footer>
      </div>

      {iptalSorusu && (
        <OnayModal
          mesaj={`“${kalem.ad}” iptal edilsin mi?`}
          tehlikeli
          onayMetni="Evet, iptal et"
          onOnay={() => kaydet("iptal")}
          onKapat={() => setIptalSorusu(false)}
        />
      )}
    </div>
  );
}
