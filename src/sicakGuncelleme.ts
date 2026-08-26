/**
 * Kendi durumunu bellekte tutan modüller için: geliştirirken sıcak güncelleme
 * yerine sayfayı tam yenile.
 *
 * Vite bir dosyayı sıcak güncellediğinde eski kopya bellekte kalabiliyor.
 * Kuyruk gibi listesini modül içinde tutan bir dosyada bu şu demek: gönderimi
 * yeni kopya yapıyor, ekranlar eski kopyaya abone kalıyor. Kuyruk boşaldığı
 * hâlde şerit "1 sipariş bekliyor" demeye devam ediyor — 7 Eyl 2026'da bu
 * yüzden çalışan bir düzeltme bozuk sanıldı.
 *
 * Üretim paketinde `import.meta.hot` yok; çağrı hiçbir şey yapmıyor.
 */
export function durumluModul(hot: ImportMeta["hot"]) {
  hot?.accept(() => window.location.reload());
}
