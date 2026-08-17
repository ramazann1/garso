/**
 * Yazıcı programının (köprü) indirme bilgisi.
 *
 * Adres yalnız burada yazıyor — ekranlarda "İndir" düğmesi var, adres yok.
 * Yayın yeri ya da alan adı değişirse tek satır güncelleniyor, ekranlara
 * dokunulmuyor.
 *
 * Sürüm elle değiştirilmiyor — `npm.cmd run surum` bütün dosyalardaki numarayı
 * birlikte artırıyor.
 */
export const KOPRU_INDIRME = {
  surum: "1.0.4",
  /** Dosyanın yayınlandığı adres. Sürüm numarası dosya adına giriyor. */
  adres: "https://indir.garso.app/garso-kopru-kurulum-1.0.4.exe",
  /**
   * Dosya adreste duruyor mu. Alan adı alınıp dosya yüklenince `true` yapılır;
   * o ana kadar düğme sönük ve tıklanınca hiçbir yere gitmiyor.
   */
  yayinda: true,
};
