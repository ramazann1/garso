import type { CSSProperties } from "react";
import { OdemeIkon } from "../odemeIkon";
import { yetkiVar } from "../oturum";
import { ayarlar } from "../isletmeAyarlari";
import type { OdemeTipi } from "../odemeTipleri";

/**
 * Ödeme tipi düğmeleri. ÖKC (yazarkasaya iletilen) ve klasik tipler ayrı
 * başlıklar altında dizilir; işletmede ÖKC tipi tanımlı değilse başlık hiç
 * çıkmaz, ekran tek grup hâlinde sade kalır.
 */
export default function OdemeTipDugmeleri({
  tipler,
  pasif,
  onSec,
}: {
  tipler: OdemeTipi[];
  pasif?: boolean;
  onSec: (ad: string) => void;
}) {
  // Açık hesaba yazmak parayı kasaya sokmadan hesabı kapatıyor; yetkisi
  // olmayan kişi bu tipleri hiç görmüyor. Denetim tek yerde: düğmeleri çizen
  // bileşen burası, tahsilat ekranlarının hepsi buradan geçiyor.
  const acik = yetkiVar("odeme.acik_hesap");
  const yetkili = acik ? tipler : tipler.filter((t) => !t.acikHesap);
  // Yazarkasa kullanılmayan işletmede ÖKC tipleri hiç listelenmiyor; tipleri
  // tek tek kapatmak yerine tek anahtar hepsini kaldırıyor.
  const okcKullanilir = ayarlar().okcAcik;
  const gorunen = okcKullanilir ? yetkili : yetkili.filter((t) => t.sinif !== "okc");
  const okc = gorunen.filter((t) => t.sinif === "okc");
  const klasik = gorunen.filter((t) => t.sinif !== "okc");
  const gruplu = okc.length > 0 && klasik.length > 0;

  const izgara = (liste: OdemeTipi[]) => (
    <div className="odeme-tipler">
      {liste.map(({ id, ad, renk }) => (
        <button
          key={id}
          className="odeme-tip-btn"
          style={{ "--tip-renk": renk } as CSSProperties}
          disabled={pasif}
          onClick={() => onSec(ad)}
        >
          <span className="odeme-tip-ikon">
            <OdemeIkon ad={ad} size={24} />
          </span>
          <span className="odeme-tip-ad">{ad}</span>
        </button>
      ))}
    </div>
  );

  if (!gruplu) return izgara(gorunen);

  return (
    <>
      <p className="odeme-grup-baslik">Yazarkasa (ÖKC)</p>
      {izgara(okc)}
      <p className="odeme-grup-baslik">Klasik</p>
      {izgara(klasik)}
    </>
  );
}
