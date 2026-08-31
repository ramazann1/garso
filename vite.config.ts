import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Telefonla denemek için sunucu yerel ağa açılıyor: bilgisayarın wifi
  // adresine (örn. https://192.168.1.69:5173) aynı ağdaki cihazdan girilebiliyor.
  server: { host: true },
  plugins: [
    react(),
    // Geliştirme sunucusu HTTPS. Tarayıcılar bazı özellikleri yalnız güvenli
    // bağlantıda açıyor: PIN'i şifreleyen crypto.subtle ve çevrimdışı çalışmayı
    // sağlayan service worker. Bilgisayarda localhost güvenli sayıldığı için
    // sorun çıkmıyordu; telefon ağ adresiyle girdiğinde ikisi de kapanıyordu.
    // Sertifika kendi ürettiğimiz için tarayıcı ilk girişte uyarı veriyor.
    basicSsl(),
    // Kasa internetsiz kalınca uygulamanın kendisi de açılmıyordu: tarayıcı
    // sayfayı her açılışta sunucudan istediği için ekran bomboş geliyordu.
    // Service worker uygulamanın kabuğunu (HTML, JS, CSS, yazı tipi) cihazda
    // tutuyor; bağlantı gitse de ekran açılıyor, garson ne olduğunu görüyor.
    VitePWA({
      // Yeni sürüm yayınlandığında kasada elle bir şey yapılmıyor: dosyalar
      // arkada iniyor, uygulama kapanıp açılınca yenisiyle geliyor.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-icon-*.png'],
      manifest: {
        name: 'Garso',
        short_name: 'Garso',
        description: 'Restoran ve cafe satış ve işletme yönetim sistemi',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#fdf8f3',
        theme_color: '#ff7a59',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          // Android kısayol simgesini kendi kalıbına göre kırpıyor; bu sürümde
          // çizim ortada küçük durduğu için kenarlardan bir şey kesilmiyor.
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Yazı tipi de önbellekte: internetsiz açılan kasada Poppins yerine
        // sistem yazısı çıkarsa ekran tanınmaz hale geliyor.
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // Adres çubuğuna doğrudan /salon yazılsa bile uygulama açılsın.
        navigateFallback: '/index.html',
        // Veri istekleri ÖNBELLEĞE ALINMIYOR. Bayat menü ya da bayat adisyon
        // göstermek, hiç göstermemekten tehlikeli: garson olmayan fiyattan
        // satar. Kasa verisi her zaman sunucudan geliyor; çevrimdışı veri
        // aşama 2'nin işi ve kendi tazelik kuralıyla gelecek.
        runtimeCaching: [],
      },
    }),
  ],
})
