import { OdemeIkon } from "../odemeIkon";
import { yaziRengi } from "../renk";
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
  const okc = tipler.filter((t) => t.sinif === "okc");
  const klasik = tipler.filter((t) => t.sinif !== "okc");
  const gruplu = okc.length > 0 && klasik.length > 0;

  const izgara = (liste: OdemeTipi[]) => (
    <div className="odeme-tipler">
      {liste.map(({ id, ad, renk }) => (
        <button
          key={id}
          className="odeme-tip-btn"
          style={{ background: renk, color: yaziRengi(renk) }}
          disabled={pasif}
          onClick={() => onSec(ad)}
        >
          <OdemeIkon ad={ad} />
          {ad}
        </button>
      ))}
    </div>
  );

  if (!gruplu) return izgara(tipler);

  return (
    <>
      <p className="odeme-grup-baslik">Yazarkasa (ÖKC)</p>
      {izgara(okc)}
      <p className="odeme-grup-baslik">Klasik</p>
      {izgara(klasik)}
    </>
  );
}
