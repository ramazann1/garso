import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Kasa internetsiz kalınca uygulamanın kendisi de açılmıyordu: tarayıcı
    // sayfayı her açılışta sunucudan istediği için ekran bomboş geliyordu.
    // Service worker uygulamanın kabuğunu (HTML, JS, CSS, yazı tipi) cihazda
    // tutuyor; bağlantı gitse de ekran açılıyor, garson ne olduğunu görüyor.
    VitePWA({
      // Yeni sürüm yayınlandığında kasada elle bir şey yapılmıyor: dosyalar
      // arkada iniyor, uygulama kapanıp açılınca yenisiyle geliyor.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Garso',
        short_name: 'Garso',
        description: 'Restoran ve cafe satış ve işletme yönetim sistemi',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        background_color: '#fdf8f3',
        theme_color: '#ff7a59',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        // Yazı tipi de önbellekte: internetsiz açılan kasada Poppins yerine
        // sistem yazısı çıkarsa ekran tanınmaz hale geliyor.
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
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
