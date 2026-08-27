# GARSO — Teknik Tasarım: Veri Modeli & Ekran Haritası
*Restoran ve cafe'ler için bulut tabanlı satış ve işletme yönetim sistemi.*

## 0. SIRADAKİ İŞ (9 Eyl 2026'da güncellendi)

> **Sıradaki iş: yerel yazdırmanın gerçek kesintide denenmesi.** 8 Eyl'de kod bitti
> ama test yapılamadı: eGZOZ'da yazıcılar **ağ (wifi) yazıcısı**, wifi kapatınca
> kasa yazıcıyı da kaybediyor. Doğru test modemin WAN kablosunu çıkarmak
> (wifi ayakta, internet yok). Köprünün de yeniden paketlenmesi gerekiyor —
> kasadaki exe eski sürüm.
>
> **Sonra: Adisyo'dan alınacak** kasa ekranında görünür "N bekleyen" sayacı.
> (Kasa penceresindeki bekleyen ödeme satırı 8 Eyl'de geldi; eksik olan salon
> üstünde her ekrandan görünen sayaç.)
>
> **Sonra: kasa çevrimdışıyken "masa durumları güncel değil" uyarısı.** Salonun
> tepesinde şerit, o hâldeyken ödeme almaya kalkılınca "bu hesap başka bir
> cihazdan kapanmış olabilir, doğrulanamıyor" penceresi. Engel değil uyarı.
>
> **Ondan sonra: çevrimdışı giriş ve PIN ile kişi değiştirme.**
>
> **8 Eyl 2026: üç iş daha bitti.**
> - **Çevrimdışı ödeme kasada görünüyor.** `bekleyenTahsilatlar()` (kuyruk)
>   kimliği olmayan — yani sunucuya hiç gitmemiş — tahsilatları veriyor;
>   `kasaDurumu` bunların kasaya giren tiplerini süzüp `bekleyenNakit`
>   olarak "kasada olması gereken"e katıyor (para çekmecede, sunucuda
>   olmaması sayımı değiştirmez). Ödeme tipi listesi önbellekten okunuyor ki
>   çevrimdışı da süzülebilsin; hiç okunamazsa bekleyen sıfır sayılıyor —
>   olmayan parayı kasaya yazmak eksik yazmaktan beter. Kasa penceresinde
>   mercan "Gönderilmeyi bekleyen · N ödeme" satırı, kapatırken "Yine de
>   kapat / Bekle" uyarısı (engel değil).
> - **Yerel yazdırma: kasa fişi doğrudan köprüye veriyor.** Köprüde
>   `src/yerelSunucu.js` — yalnız `127.0.0.1:7423`, `GET /durum` +
>   `POST /yazdir`. Garso'da `src/yerelYazdirma.ts` (1,5 sn zaman aşımı,
>   yoklama 30 sn akılda). `kuyrugaEkle` önce köprüye gidiyor; kâğıt çıktıysa
>   bulut kaydı "basıldı · yerel" yazılıyor, internetsizlikten yazılamazsa
>   sessiz geçiliyor — işin aslı kâğıt zaten çıktı. Çift basımı `istemci_kimlik`
>   durduruyor: köprü bastığı kimlikleri 12 saat hatırlıyor, aynı fiş buluttan
>   gelirse basmadan "basıldı" diyor. Kuyruk ekranında "Kasadan" rozeti,
>   köprünün durum penceresinde "Yerel yazdırma · Açık" satırı.
>   **Kazanç sınırlı olduğu bilinerek yapıldı:** ağ yazıcısı kullanan işletmede
>   yalnız "modem çalışıyor ama dışarısı kesik" durumunu kurtarıyor; USB
>   yazıcıda internet tamamen gitse de fiş çıkıyor. Ayrıca fiş buluta gidip
>   dönmediği için mutfağa daha hızlı düşüyor.
> - **Servis bedeli artık bayat sepetten hesaplanmıyor.** `servisAlanlari()`
>   yalnız karar bayraklarını yazıyor; tutarı, kalemler yazıldıktan sonra
>   `servisiTazele()` koyuyor — o ekranın sepetine değil hesabın sunucudaki son
>   hâline bakıyor. Servis kapalıysa (`servisVar()`) hiç çağrılmıyor.
>
> **8 Eyl 2026: üç iş bitti.**
> - **Başlık alanları artık körü körüne yazılmıyor.** `AdisyonVerisi.bilinenBilgi`
>   hesabın okunduğu andaki başlığını (indirim, tanım, ad, kişi sayısı, not,
>   müşteri, servis kararı) kaydın içinde taşıyor; `indirimAlanlari()`,
>   `bilgiAlanlari()` ve servis bayrakları yalnız **değişen sütuna** dokunuyor.
>   `bilinenIdler` ile aynı desen — ekranlar taşıdığı için kuyruğa da giriyor.
>   `CEVRIMDISI_ADISYON`'da `bilinenBilgi: { indirim: 0 }`: "hiçbir şey görmedim"
>   hâli başlıkta da geçerli.
> - **Kuyruk gönderimi tek tetiğe bağlı değil.** Eskiden yalnız açılışta ve
>   bağlantı gelince deneniyordu; modem yeni kalkarken ilk deneme düşünce durum
>   çevrimiçi kalıyor, kuyruk sayfa yenilenene kadar bekliyordu. Artık bağlantı
>   hatasında `kopukBildir()` çağrılıyor ve 3 sn'den başlayıp 30 sn'ye çıkan
>   artan bekleme kuruluyor; başarılı kayıtta sıfırlanıyor.
> - **Çevrimdışı salon artık gerçeği gösteriyor.** `salonKopyasiYaz()` her salon
>   okumasında masaların özetini cihaza yazıyor (`tumAdisyonlar` sonunda);
>   eskiden yalnız elle açılan masaların kopyası vardı, kesintide salon boş
>   görünüyordu. Kart rozetinde **kaynak ayrımı**: kuyrukta bekleyen kayıt
>   "Gönderilmedi" (mercan), kopyadan çizilen masa "21:05 hâli" (koyu, `.kopya`).
>   Çevrimdışı kapatılan hesap salon kopyasından da düşüyor.
>
> **8 Eyl 2026: geliştirme tuzağı — `src/sicakGuncelleme.ts`.** Vite sıcak
> güncellemede modülün eski kopyası bellekte kalabiliyor: gönderimi yeni kopya
> yapıyor, ekranlar eskiye abone kalıyor ve kuyruk boşaldığı hâlde şerit "1
> sipariş bekliyor" diyor. Çalışan bir düzeltme üç tur boyunca bozuk sanıldı.
> Durumunu bellekte tutan modüller (`kuyruk`, `baglanti`, `oturum`, `onbellek`,
> `hesapKopyasi`, `mesguliyet`) artık `durumluModul(import.meta.hot)` ile sıcak
> güncelleme yerine tam yenileme istiyor. Üretim paketine girmiyor.
>
> **7 Eyl 2026: Adisyo'nun çevrimdışı turu (ekran kaydı).** Adisyo'nun çözümü
> yapı olarak bizimkinden farklı — kasada **ayrı bir program**: "Adisyo
> Çevrimdışı".
> - Çevrimdışı mod **elle** açılıyor (üstte siyah şerit + "Çevrimdışı moda geç").
> - Mod açılınca **ana POS penceresi kilitleniyor**: "Bu ekranda başka işlem
>   yapmayın." Bütün iş ayrı panele taşınıyor.
> - Panel "sunucudaki açık siparişler ve bu cihazda bekleyen çevrimdışı
>   işlemler" diyor — yani onlar da hesabın kopyasını cihazda tutuyor, bizim
>   `hesapKopyasi` ile aynı fikir. Sayaç: "19 sipariş · 0 bekleyen". Listede
>   **Kaynak** sütunu (Sunucu / cihaz), satırda yazdır + Öde.
> - Senkron **elle**: "Adisyo'ya Gönder".
> - Bağlantı gelince ekran kendiliğinden tazelenmiyor: "Güncel siparişlerinizi
>   görmek için buraya tıklayınız."
>
> **Bizim önde olduğumuz yerler — değiştirilmeyecek:** çevrimdışına kendiliğinden
> geçiyoruz, ekran kilitlenmiyor, senkron kendiliğinden, bağlantı gelince ekran
> kendini tazeliyor, çift ödeme koruması var (Adisyo'da izi yok).
>
> **Adisyo'nun iki davranışı (Ramazan'ın denemesi):** (1) kasa çevrimdışıyken
> telefondan kapatılan hesabı görmüyor — bizimle aynı, sektörün hâli. (2) Aynı
> masa hem çevrimdışı kasadan hem çevrimiçi telefondan değiştirilince senkron
> **tamamen başarısız** oluyor ("başka bir işlem yapılmış"), çevrimdışı girilen
> ürünler kayboluyor. Bizde beklenen davranış birleştirme — `bilinenIdler`
> sayesinde iki taraf da duruyor. Denenmedi, denenecek.
>
> **Yerel ağ (telefon → kasadaki köprü) yapılmayacak — 7 Eyl 2026 kararı.**
> Senaryolar ayrıştırılınca işe yaramadığı görüldü: (1) komple kesintide wifi
> ayakta ve herkes yerel ağda — burada işe yarardı ama o an telefonun da
> interneti yok; (2) kasa internetsiz, garson kendi 4G'sinde — telefon yerel
> ağda **değil**, köprüye zaten ulaşamıyor; (3) wifi'de internet var ve kasa
> bağlı değilse kasayı bağlamak zaten çözüm. Yani asıl senaryonun (2)
> yazılımsal çözümü yok; çözümü kasaya yedek bağlantı vermek (hotspot / 4G
> çubuğu). Adisyo da telefondan kasaya yerel ağdan haber göndermiyor. Cihaz kapanıp
> açılırsa garson çevrimdışı sipariş de alamıyor, tahsilat da; şifre ve PIN
> sunucuda doğrulanıyor. Çevrimdışı tahsilat 7 Eyl'de bitti, sıradaki engel bu.
>
> **Sonra: `sql/2026-09-07-cevrimdisi-tahsilat.sql` Supabase'e çalıştırılacak.**
> Çalıştırılmadan çevrimdışı tahsilat çift ödeme koruması olmadan işler.
>
> **7 Eyl 2026: çevrimdışı tahsilat geldi.** 20 Ağu'daki "çevrimdışı tahsilat
> yok" kararı **iptal edildi**. Gerekçe Ramazan'dan: Adisyo'da internet gidince
> ödeme almak durmuyor, işletmede müşteri masada bekletilemiyor. Kural role
> değil yetkiye bağlandı — **`odeme.al` yetkisi olan** çevrimdışı da tahsilat
> alıyor, "yönetici" diye istisna yok. Yapılanlar:
> - **`hesapKopyasi.ts` (yeni)** — açık hesabın cihazdaki son bilinen kopyası.
>   Canlı veri önbelleğe girmez kuralından bilerek ayrıldık: cihaz hesabı
>   bilmeden parasını alamaz. Kopya `adisyonGetir`/`masasizGetir` her okuduğunda
>   tazeleniyor, hesap kapanınca siliniyor, 12 saatte bir düşüyor (bir
>   vardiyadan eski kopya bilgi değil tahmindir), en son 60 hesap tutuluyor.
>   Bayatlık gizlenmiyor: mobil ve kasa hesap ekranında "hesabın 14:32
>   itibarıyla bilinen hâli" şeridi çıkıyor (`.m-kopya-serit`).
> - **Kuyruk artık parayı da taşıyor** (`kuyruk.ts`). İş künyesine `kapat`
>   eklendi. Üç yeni kural: kapatma kaydının üstüne yazılmıyor (yazılsaydı
>   hesabın kapandığı bilgisi kaybolurdu), `bekleyenKayit` kapatma kaydını
>   sepet diye vermiyor, `bekleyenMasalar` kapatılan masayı dolu göstermiyor.
> - **Çift ödeme koruması**: `tahsilatlar.istemci_kimlik` (uuid, tekil).
>   Kimlik **ödeme alındığı anda** üretiliyor (`yeniTahsilat()`), kaydedilirken
>   değil — kuyruk aynı kaydı yeniden gönderirse kimlik de aynı kalsın diye.
>   Sunucu ikinci kaydı yazmıyor, var olanın kimliğini döndürüyor. Ödeme üreten
>   beş yer de bu yardımcıdan geçiyor.
> - **Çevrimdışı salon dolu masaları gösteriyor** (`kopyaMasalari()`). Eskiden
>   bomboştu; dolu masaya girilemeyince ödemesi de alınamıyordu.
> - **Ödeme yolları kuyruğa düşüyor**: mobil hesap ekranı, mobil Hızlı Öde,
>   kasa sipariş/tahsilat ekranı, kasa Hızlı Öde, kasadan hesap kapatma.
>   Hepsinde aynı desen — bağlantı yoksa hiç denenmiyor, deneme bağlantı
>   yüzünden düşerse kuyruğa iniyor, başka hata ekranda söyleniyor.
> - **Sessiz kalmayan iki durum**: para taşıyan kayıt sunucuda reddedilirse
>   şerit "tahsilat kasaya girmedi" diyor; hesap bu arada başka cihazdan
>   kapanmışsa "aynı hesap iki kez tahsil edilmiş olabilir" uyarısı çıkıyor.
>
> **Yan etki — kasa sipariş ekranı çevrimdışı artık boş açılmıyor.** 30 Ağu'daki
> "çevrimdışı ekran boş sepetle açılır" kuralı kopya varken geçerli değil;
> silme koruması `bilinenIdler`den geliyor, yani kopyanın görmediği kaleme
> dokunulmuyor. Gözlenecek: bayat kopyayla kaydetme bir sorun çıkarırsa kural
> yalnız ödeme ekranına daraltılacak.
>
> **7 Eyl 2026: İstasyon ve Satış sekmeleri yeni tasarım diline geçti.**
> Satış'ta ciro altındaki üç kutu tek karta indi (`m-kutu-grup`), ödeme tipi
> satırı ızgaraya alındı (ad · tutar, çubuk altta), alt açıklama `Bilgi`
> kutusuna geçti. İstasyon'da başlığa yenile düğmesi, kart soluna 4px durum
> şeridi (bekleyen sakin ton / geciken mercan, eski iç gölge kalktı),
> "Hazırlanan" boş durumuna ikon, tezgâh seçimi kart diline geçti.
>
> **6 Eyl 2026: okuma tarafı bütünüyle kapandı.** Üç grup da bitti, dosyalar:
> - `2026-09-06-okuma-yetkileri.sql` (kolay) — kasa vardiyaları, kasa
>   hareketleri, giderler, denetim defteri, müşteri/adres/cari hareket. Tek
>   `for all` politikası bölündü: yazma eskisi gibi işletmeye bakıyor, okuma
>   ayrıca yetki soruyor (aynı komuta bakan politikalar VEYA ile birleştiği
>   için bölmek şarttı). `personel.pin_hash` sütunu tarayıcıya kapandı.
> - `2026-09-06-adisyon-okuma.sql` (zor) — adisyon durumuna göre: açık adisyon
>   `siparis.al`/`odeme.al`/`mutfak.ekran`/`kasa.ac_kapat`/rapor, kapanmış
>   adisyon `siparis.kapali_gor`/`aktif_et`/`tip_duzelt`/`iade`/`kasa.ac_kapat`
>   /rapor. Tur, kalem ve tahsilat bağlı oldukları adisyona bakıyor.
>   `kasa.ac_kapat` iki listede: kasayı kapatan hesapları göremeden kasa
>   sayamıyor. Ödenmez silmedeki kullanım sayımı sunucuya alındı
>   (`odenmez_kullanimda`), yoksa yetkisiz kişide sıfır görünüp kullanılmış
>   kayıt kalıcı silinecekti.
> - `2026-09-06-maliyet-gizli.sql` (orta) — `porsiyonlar.maliyet` sütunu
>   kapandı; `tanim.menu` yetkisi olana `porsiyon_maliyetleri` görünümünden
>   veriliyor. Menü sorgusundan maliyet çıkarıldı (`menu.ts`), menü ekranı
>   `maliyetleriGetir()` ile ayrıca alıyor.
>
> **6 Eyl 2026: yetki envanteri.** 37 kodun hepsi kullanımda, karşılıksız kod
> yok. Çakışan sıra numaraları düzeltildi (gruplara yüzlük bloklar), istasyon
> yetkisi kendi grubuna alındı, iki eksik yetki eklendi: `siparis.fis_yazdir`
> ve `kasa.cekmece` (`2026-09-06-yetki-envanteri.sql`). Adisyo'nun 46 satırıyla
> karşılaştırması: fark ya bizde olmayan modül (stok, entegrasyon, şube) ya da
> bizim bilerek tek kodda tuttuğumuz ayrım.
>
> **Özellik gelince yetkisi de gelecek** (şimdi eklenmedi, ekranı yok):
> kasa açılış/kapanış tutarını sonradan düzeltme, manuel mutfak çıktısı, stok.
> Kural: ekranı olmayan yetki listede durmaz, işletmeci boşuna açıp kapatır.
>
> **Kural role değil yetkiye bağlanır (5 Eyl 2026 kararı).** Erişim kuralı
> tasarlarken "bizim işletmede garson bunu yapmıyor" varsayımı kullanılmaz.
> Garso başka işletmelere satılıyor; oradaki rol dağılımı bambaşka olabilir.
> Ölçüt her zaman "bu iş hangi yetki kodunun kapsamında". Yetki canlı okunuyor,
> işletmeci ayarı değiştirince kural kendiliğinden uyar.
>
> Küçük iş: **`yazdirma_kuyrugu` tablosu yetkisiz** — fiş yazdırma düğmeleri
> 6 Eyl'de `siparis.fis_yazdir`a bağlandı ama tablonun kendisi hâlâ açık,
> konsoldan kuyruğa satır atılabiliyor. Köprü o tabloyu okuyup güncellediği
> için kapı dikkatli konmalı: yanlış kural yazıcıyı durdurur.
>
> Küçük iş: **Excel aktarımında isimle eşleşme** — dosyadaki ürün, menüdeki
> aynı adlı ürünün üstüne yazıyor; kullanıcı yeni ürün eklediğini sanıyor.
> 6 Eyl'de yazma anında menü tazelenmesi ve silinmiş ürünün yeniden açılması
> düzeltildi, ama önizleme hangi ürünlerin üstüne yazılacağını hâlâ isim isim
> göstermiyor. Ramazan "liste ekran görüntüsünü çirkinleştirir" dedi; başka
> bir yol bulunursa yapılacak.
> Küçük iş: **sipariş ekranının sepet dökümünde KDV** — hesap ekranı 22 Ağu'da
> düzeldi (KDV dahil modda da yazıyor), sipariş ekranı eski davranışta kaldı.
> Küçük iş: **kuver/garsoniyeyi o hesaba özel açma-kapama** — veri katmanı
> hazır (kuverUygula/garsoniyeUygula), arayüzü ne kasada ne mobilde var.
>
> **Paket / Gel Al mobile alınmayacak (19 Ağu 2026 kararı).** Masasız sipariş
> telefonla ayakta girilen bir iş değil; mobil garsonun masa işi için.
>
> **Canlıya geçerken yapılacaklar (5 Eyl 2026'da ayrıldı).** Üçü de barındırma
> servisi ya da dışarıdan hesap gerektiriyor; alan adı ve sunucu alınmadan
> denenemiyorlar, o yüzden sıradan çıkarıldı:
> - **Yayın güvenlik başlıkları** — `Content-Security-Policy`,
>   `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`. Ayar
>   dosyası servise göre değişiyor: Vercel'de `vercel.json`, Cloudflare
>   Pages/Netlify'da `public/_headers`, kendi sunucuda nginx bloğu. Envanter
>   çıkarıldı: yazı tipi pakete gömülü, dışarıdan script/stil çekilmiyor,
>   `connect-src` yalnız Supabase (realtime için `wss:` de gerekiyor), 27 satır
>   içi stil olduğu için `style-src` `'unsafe-inline'` istiyor.
> - **Kayıt ekranına CAPTCHA** — Supabase panelinde açılıyor ama hCaptcha ya da
>   Cloudflare Turnstile'da hesap açmak gerekiyor; Ramazan'ın yapması lazım.
> - **Köprü exe'sinin imzalanması** — `indir.garso.app`'ten imzasız exe iniyor,
>   özeti de doğrulanmıyor. Tedarik zinciri riski; mağazaya çıkış işleriyle
>   birlikte.
>
> Sırada bekleyenler: **kurye atama ve teslimat takibi** → **KDS'in kalan
> parçaları** (pişirme/paketleme aşamaları, mutfak fişi, hazırlık süresi
> raporu, çoklu istasyon).
>
> Offline'ın açık kalan uçları: **çevrimdışı giriş ve PIN ile kişi değiştirme**
> (artık sıranın başında), **masasız adisyonun çevrimdışı açılması**.
> Çevrimdışı tahsilat 7 Eyl'de bitti.
>
> Küçük iş: **Analiz ve Kasa ekranlarına canlı tazeleme** (katman hazır:
> `useCanli(..., SAKIN)`). Küçük iş: **Analiz'in diğer tablolarına kendi
> kutusunda kaydırma**. Küçük iş: **PWA simgesi** — `public/favicon.svg` hâlâ
> Vite'ın mor varsayılan logosu.
>
> **Ara sıra çıkan, henüz yakalanamamış sorun:** yeni cihazda **ilk giriş**
> yapılırken düğme "Kontrol ediliyor…" hâlinde takılıyor; sayfa yenilenince
> oturum açılmış oluyor. 31 Ağu 2026'da düğmenin ölü kalmaması düzeltildi
> (`Giris.tsx`) ama **asıl sebep bulunamadı**. Şüpheli: girişten hemen sonra
> yetkilerin okunması (`kisiyiYukle`). Tekrar olursa 15 saniye beklenip
> konsoldaki hata kaydedilecek.
>
> **Proje sonuna doğru Ramazan'a hatırlatılacak:** mobil masa kartındaki
> **"Hesap çıktı" şeridi** — bütün kartları 152px'e çıkarıyor, ekranda daha az
> masa görünüyor. Seçenekler: inceltmek, yalnız ikon bırakmak, kaldırmak.

*Ramazan seansa "devam edelim" diye giriyor — sıradaki iş bu listenin en üstündeki
maddedir. Seans sonunda bu liste güncellenir: biten madde silinir, kalanlar
yukarı kayar, yeni çıkanlar sıraya girer.*

**Menü modülü, masa/bölge tanımları, salon çekirdeği, Hızlı Öde, tahsilat
zenginleştirmesi ve Gel Al / Paket akışı bitti.** Eksik envanteri bölüm 6'da,
Adisyo turları `pos-yol-haritasi.md` bölüm 7 ve 8'de.

**Sıra 9 Ağu 2026'da değişti.** Rapor ve kapanmış adisyon ekranı öne alınmıştı;
ikisi de "kim yaptı" bilgisine dayandığı için personel sistemi olmadan yarısı
baştan yazılacaktı. Önce Ayarlar'ın eksik yarısı (personel/yetki), sonra kasa,
en son raporlar. Adisyo'nun ayar ve kullanıcı ekranları `pos-yol-haritasi.md`
bölüm 9'da (9 Ağu 2026 canlı turu) detaylı duruyor.

**5 Eyl 2026: Yazma tarafı bütünüyle sunucuya bağlandı.** Dört SQL dosyası:

- `2026-09-05-kim-yapti-sunucuda.sql` — "kim yaptı" imzası artık tetikleyiciyle
  atılıyor: `adisyonlar.acan_id`, `turlar.garson_id`, `kasa_vardiyalari.acan_id`
  ve `kapatan_id`, `kasa_hareketleri.kisi_id`. İmza bir kere konuyor, sonra
  güncellemede eski değer geri yazılıyor — sonradan devredilemiyor.
- `2026-09-05-tanim-yetkileri.sql` — 27 tanım tablosu yetki soruyor (menü,
  masa, ayar, personel/roller, yazıcı, gider tipleri). Ortak `tanim_yetkisi()`
  tetikleyicisi, yetki kodu tetikleyici tanımında. Personel tarafında ilk
  kurulum istisnası var: hiç hesap açılmamışsa serbest, yoksa kurulum kendini
  kilitler.
- `2026-09-05-denetim-defteri.sql` — defter yalnız yazılıp okunuyor; güncelleme
  ve silme kimseye açık değil. İmzası (`kisi_id` + `kisi_ad`) sunucuda.
- `2026-09-05-kasa-cari-yetkileri.sql` — kasa, gider ve cari tabloları. Cari
  hareketleri işine göre ayrıldı: `satis` (açık hesaba yazma) `odeme.acik_hesap`,
  `acilis` `cari.duzenle`, `tahsilat`/`duzeltme` `cari.tahsilat`. Hepsi tek
  yetkiye bağlansaydı garsonun açık hesap akışı kırılırdı.

Tarayıcı tarafı bu alanları artık hiç göndermiyor (`adisyonlar.ts`, `kasa.ts`,
`denetim.ts`, `cari.ts`, `masraflar.ts`). Köprü etkilenmiyor — o yalnız okuma
yapıyor (`personel`, `yazicilar` select).

Denetimde temiz çıkanlar: RLS istisnasız her tabloda, kodda gömülü sır yok,
`.env.local` git'e girmiyor, `innerHTML`/`eval` hiç kullanılmamış, tarayıcı
deposunda hassas veri yok, `pin_hash` okumaya kapalı (2 Eyl), Excel aktarımı
tamamen yerel.

Açık kalan: **okuma tarafı** (0. bölümde) ve canlıya geçiş üçlüsü.

**14 Ağu 2026:** Kimlik ve yetki tarafı kapandı. Auth geçişi doğrulandı (giriş,
telefon değişimi, şifre koruma çalışıyor; `personel.sifre_hash` kaldırıldı),
**satır güvenliği açıldı** (25 tabloda `isletme_id = oturum_isletmesi()`),
"kim yaptı" bilgisi satışa girdi (`adisyonlar.acan_id`, `turlar.garson_id`),
yetki denetimi ekranlara bağlandı ve beş işletme parametresi eklendi.

**11 Ağu 2026:** Adisyo'nun kasa ve gider tarafı canlı turlandı (yol haritası
bölüm 10) ve **kasanın açma/kapatma çekirdeği bitti**. Turda planı değiştiren dört
bulgu çıktı: kasa günü ile vardiya ayrı kavramlar, kasa ekranı sayfa değil pencere,
para giriş/çıkış giderden ayrı bir işlem, gider ödeme tipi satışınkinden ayrı sabit
liste. Ayrıca **ayar ekranlarının düzeni yeniden kuruldu** (aşağıda).

**12 Ağu 2026:** Kasa modülü bitti (Kasa Geçmişi, Giderler, kapanış hatırlatması)
ve **Adisyo'nun Raporlar bölümü baştan sona turlandı** — altı raporun her sekmesi,
adisyon detay penceresi ve sipariş geçmişi dahil (yol haritası bölüm 11). Rapor
kapsamı kararı: **Adisyo'daki her rapor Garso'da da olacak, üstüne bizim
eklediklerimizle daha zengin.** Eksik görünenler vazgeçilmiş değil, dayandığı
modüle bağlı (stok, cari hesap, entegrasyon). Sıralama kısıtı var, kapsam kısıtı yok.

**16 Ağu 2026:** Rapor ekranının iskeleti kuruldu ve **adı "Analiz" oldu** —
Adisyo'nun kelimesini kullanmama kararı, adres `/analiz`, veri katmanı
`analiz.ts`. Tek ekran + üst sekmeler (Özet · Adisyonlar · Ürünler · Personel ·
Giderler · Denetim), ortak `AnalizFiltre` bileşeni (dönem hepsi kasa gününe
oturuyor, vardiya seçimi vardiyanın kendi aralığını geçiriyor, seçilenler çip
olarak duruyor) ve **adisyon detay penceresi** bitti. Detay penceresi Adisyo'nun
düzeninde: üç sütun (sipariş bilgileri / ürünler + döküm / tahsilatlar), sipariş
geçmişi ayrı görünüm olarak sütunların yerini alıyor — ikisi aynı anda ekranda
durunca kalabalık oluyordu. Adisyonlar listesi Adisyo'nun sütunlarıyla gerçek
bir tablo; **"Eksik tahsilat" durumu bizim eklememiz** (kapanmış ama parası
eksik kalan hesap Adisyo'da ayrı işaretlenmiyor). Yeni yetki:
`siparis.aktif_et` (kapanmış adisyonu yeniden açma).

**20 Ağu 2026 (2. seans): Canlı tazeleme, masa meşguliyeti, aynı hesapta iki
kişi, PIN'in sunucuya taşınması.** Seans "telefonda görmek istiyorum" diye
başladı; dev server ağa açıldı (`server: { host: true }`) ve **HTTPS'e alındı**
(`@vitejs/plugin-basic-ssl`). Sebep sertifika hevesi değil: tarayıcı `crypto.subtle`
ve service worker'ı yalnız güvenli bağlantıda açıyor, telefon ağ adresiyle
girdiğinde PIN girişi hata veriyor ve PWA/çevrimdışı hiç çalışmıyordu.

- **Canlı tazeleme** (`canli.ts`). Ekranlar veriyi bir kez okuyup öylece
  kalıyordu. Ortak katman: tabloya tek kanal, art arda gelen haberler tek
  tazelemede birleşiyor, ekran arkadayken hiç sorgu yapılmıyor. İki tempo —
  `HIZLI` iş ekranları, `SAKIN` bakma ekranları. Bağlı ekranlar: Salon, mobil
  Masalar, iki sipariş ekranı, mobil Adisyon, mobil Satış. **Analiz ve Kasa
  bilinçli dışarıda.** Tablolar `supabase_realtime` yayınına eklendi.
- **Aynı hesapta iki kişi — kalem kaybı kapatıldı.** `adisyonKaydet` "sepette
  olmayanı sil" diyordu; başka cihazın eklediği ürün sessizce siliniyordu.
  **Kural: silme yalnız ekranın gördüğü kalemler üzerinden yürüyor.** Liste
  ekranların taşımasına bırakılmadı (parçalayıp yeniden kuruyorlar, ilk denemede
  düştü) — veri katmanının kendi defterinde duruyor (`gorulenler`), `adisyonGetir`
  yazıyor, `kalemleriYaz` okuyor. Aynı koruma tahsilatlarda da var.
- **Masa meşguliyeti** (`mesguliyet.ts`, `masa_mesguliyet`). Masa ekranı açıkken
  masa "Ahmet'te" görünüyor; 20 sn kalp atışı, 60 sn sessizlikte işaret ölüyor
  (ekranı açık unutan garson işletmeyi durdurmasın). **Kilit değil işaret:**
  yetkisi olan devralıyor (`masa.devral`, varsayılan Yönetici/Müdür), devralınan
  kişi masadan çıkarılıyor. Yetkisiz yalnız bilgi penceresi görüyor.
  **Kural: kalp atışı yalnız kendi satırını tazeliyor** — körü körüne yazınca
  masayı geri çalıyordu ve devralma yirmi saniyede geri alınıyordu.
- **Sipariş ekranı tazelenirken kimsenin yazdığı silinmiyor** (`sepetiTazele`):
  ekranda kaydedilmemiş bir şey yoksa sunucudaki hesap aynen geçerli, varsa
  yereldeki hâl korunup sunucudan yalnız yeni kalemler biniyor.
- **PIN ile kişi değiştirme sunucuya taşındı** (`sql/2026-08-30-pin-sunucuda.sql`).
  İki açık vardı: PIN'i tarayıcı doğruluyordu ve veritabanı "kim bu" sorusunu
  giriş biletinden soruyordu — yani 28 Ağu'da yazdığımız yetki tetikleyicileri
  PIN'le geçen kişiyi değil kasayı açanı denetliyordu. Artık `pin_ile_gec()`
  doğruluyor, `oturum_kisileri` kaydı tutuyor, `oturum_yetkisi()` dayanağını
  `oturum_personeli()`den alıyor. Yan fayda: `crypto.subtle` ihtiyacı kalktı.
- **Çevrimdışı siparişin masayı silmesi kapatıldı.** Çevrimdışı ekran boş
  sepetle açılıyor; o kayıt kuyruktan yazılınca masadaki her şeyi siliyordu.
  `CEVRIMDISI_ADISYON` "hiçbir kalem görmedim" diyor, kaydetme hiçbir şey
  silmiyor. **Kapanmış hesaba geç gelen sipariş** artık sessiz değil: kuyruk
  bunu görüp çevrimdışı şeridinde uyarıyor (kapatılana kadar duruyor).
- Küçük: mobil Masalar'da **seçili bölge cihazda kalıyor** (Bahçe'den gönderip
  dönünce yine Bahçe).

Çevrimdışının sınırı konuşuldu ve kabul edildi: **kopuk cihaz meşguliyet rozetini
göremez** — bilgi sunucuda yaşıyor, ulaştıracak kanal yok. Kalan risk (kapanmış
hesaba geç sipariş) görünür yapıldı, kapatılmaya çalışılmadı.

**20 Ağu 2026: Mobil aşama 3 (ödeme), Satış ve İstasyon sekmeleri, yetki
denetimi ve mobil arayüzün yeniden yazımı.**

Yapılanlar:
- **Adisyon/ödeme ekranı** (`mobil/Adisyon.tsx`): kalemler + döküm + alınan
  ödemeler yukarıda, ödeme alanı altta sabit. Sıradan iş iki dokunuş —
  "₺X öde" → tip. Tuş takımı ekranda durmuyor, "Tutar gir" kendi sayfasında
  açıyor. Hesabın parası tamamlanınca adisyon kendiliğinden kapanıyor;
  "öde ve kapat" gibi seçenek sorulmuyor (denendi, kaldırıldı).
- **Tahsilat sayfası** (`mobil/OdemeTipleri.tsx`) — Hızlı Öde ve adisyon ekranı
  aynı bileşeni kullanıyor. Üç düzen denendi (renkli ızgara → dolu renkli
  düğmeler → sade liste); **sade liste kaldı**: tam genişlikte satır, renk
  yalnız ikonda, üstte tahsil edilecek tutar iri.
- **Kalem işlemleri** (`mobil/KalemIslemleri.tsx`) — masaüstü `KalemPaneli`nin
  mobil karşılığı; adisyon ve sipariş ekranı ikisi de kullanıyor: adet, not,
  ürün indirimi, ikram, iptal (sebepli), başka masaya taşıma.
  **Kural: kaydedilmiş kalemin adedi artarsa fark yeni satır olur** — eski tur
  bozulmuyor, mutfak farkı yeni sipariş olarak görüyor (`kalemiUygula`).
- **Masa kartı ⋮ menüsü**: Öde · Hızlı Öde · Yazdır · Masayı taşı · Masaları
  birleştir · Adisyonu iptal et. Taşıma/birleştirme **ızgaranın kendi üstünde**
  seçiliyor (uygun olmayan masa soluyor, altta Vazgeç/Uygula şeridi).
  Sipariş ekranının ⋮ menüsünde de aynı işlemler + misafir sayısı.
- **Satış sekmesi** (`mobil/Satis.tsx`): bugünün cirosu, açık masalar, ödeme
  tipi dökümü (oran çubuklu), kasaya giren / eksik tahsilat. Gider ve kâr yok.
- **İstasyon sekmesi** (`mobil/Istasyon.tsx`): tek sütun kartlar, Bekleyen /
  Hazırlanan sekmeleri, kalem düğmeleri, 10 sn geri alma şeridi. Alt çubuktaki
  ad "Mutfak" değil **İstasyon**.
- **Yetki denetimi tamamlandı.** Tarama sonucu yedi yetki hiç sorulmuyordu:
  `odeme.al`, `odeme.acik_hesap`, `odeme.iade`, `siparis.miktar`,
  `siparis.gelal`, `siparis.paket`, `siparis.kapali_gor`. Hepsi arayüze
  bağlandı ve **veritabanı tarafına tetikleyiciler yazıldı**
  (`sql/2026-08-28-yetki-denetimi.sql`): tahsilat, kalem ve adisyon yazmaları
  `oturum_yetkisi()` sorguluyor. `auth.uid()` boşken denetim yapılmıyor (SQL
  düzenleyicisi ve kurulum betikleri kilitlenmesin).

Kararlar:
- **Paket / Gel Al mobile alınmayacak** — masasız sipariş kasada oturarak
  alınıyor, telefonda ayakta değil.
- **Ödeme sırasında açık hesap seçilirse müşteri sorulur** (Hızlı Öde'de
  sorulmuyordu, düzeltildi: borcun kime yazıldığı bilinmeden hesap kapanmaz).
- **Çevrimdışı tahsilat yok**, bağlantı gelmeden ödeme alınmıyor.
  *(7 Eyl 2026'da iptal edildi — bölüm 0'a bak: `odeme.al` yetkisi olan
  çevrimdışı da tahsilat alacak.)*

**19 Ağu 2026 (5. seans): Mobil arayüz — aşama 1 (kabuk + Masalar) ve
aşama 2 (sipariş ekranı) bitti.** Kapsam kararı yukarıda; burada yapılanlar.

Aşama 1 — kabuk. `mobilTercih.ts` cihazın dar olup olmadığına bakıyor (sınır
820px) ve elle seçimi cihazda tutuyor; `MobilKabuk.tsx` alt sekme çubuğu,
sekmeler `rotaYetkileri`den hesaplanıyor (tek sekmesi olana çubuk hiç
çizilmiyor). `App.tsx`'te `GorunumKapisi` yalnız iki uç adreste yönlendiriyor
(masaüstü kökü ve `/mobil`) — kişi elle bir adrese gittiyse ekran altından
kaydırılmıyor. Mobil adresler de yetki listesine girdi: menüden gizlemek koruma
değil. `Masalar.tsx` bölge çipleri (doluluk sayılı) + masa ızgarası, kuyrukta
bekleyen masa dolu görünüyor ve "Gönderilmedi" işareti taşıyor. `Ben.tsx`
kilit, masaüstüne geçiş ve çıkış. Masaüstü `Duzen.tsx`'e de mobile dönüş
düğmesi kondu (yalnız dar ekranda; kasada yer kaplıyor).

Aşama 2 — `mobil/Siparis.tsx`. Konuşulan üç ayrışmanın hepsi burada: sepet
şeridi hep ekranda (dokununca tam adisyon açılıyor, kalemler saat damgalı
turlar hâlinde), ürüne dokunmak doğrudan ekliyor ve tekrar dokunmak adedi
artırıyor (adet penceresi yok; porsiyonu veya seçeneği olan üründe pencere
kendiliğinden açılıyor, uzun basış her üründe açıyor), tek ana düğme Gönder.
Bağlantı yoksa ikon buluta dönüyor, kayıt kuyruğa girip garson beklemiyor.
Veri katmanı masaüstüyle ortak: `adisyonKaydet`, `menuGetir`, `porsiyonFiyat`,
`kuyruk`. Kaydedilmiş turun kalemi mobilde değiştirilemiyor — geri alma, ikram
ve iptal yetkiye bağlı işler, kasa ekranında kalıyor.

Ekran denenince çıkan üç hata (üçü de kapatıldı):
1. Seçeneksiz ürünün adının yanında **0** yazıyordu: `k.secimler?.length && (...)`
   ifadesi boş listede 0'a düşüyor, React sıfırı basıyor. JSX'te sayıya düşen
   koşul her yerde aynı tuzağı kuruyor, `!!` ile boolean'a çevriliyor.
2. **Toplam doğru ama dökümsüzdü.** Kuver ve garsoniye toplama giriyor, sepet
   sayfasında görünmüyordu — garson farkın nereden geldiğini göremiyordu. Alta
   döküm eklendi (ara toplam · indirim · kuver · garsoniye · KDV), satırlar
   masaüstüyle aynı `servisSatirlari`ndan geliyor.
3. **Sessiz olan ve asıl ciddi olanı:** `kuver_uygula` / `garsoniye_uygula`
   okunmuyordu, `servisAlanlari` her kayıtta `null` yazıyordu. Kasiyerin o
   hesaptan kaldırdığı kuver, garson mobilden bir ürün ekleyince geri geliyordu.
   Alanlar artık okunup geri yazılıyor. **Kural: adisyonun bir sütununu
   yazan her ekran onu önce okumak zorunda** — kaydetme çağrısı kısmi değil,
   verinin tamamını yazıyor.

**Yazdırma mobilde ayrıca kurulmadı, gerekmiyor:** mutfak fişi `adisyonKaydet`
içinde veritabanındaki yazdırma kuyruğuna düşüyor, kasadaki köprü basıyor.
Telefonun yazıcıyla doğrudan ilişkisi yok.

**19 Ağu 2026 (5. seans): Mobil arayüz kapsamı yeniden tanımlandı.**
Yol haritasındaki madde "garson mobil sipariş ekranı"ydı; konuşmada üç şey
netleşti ve kapsam değişti.

1. **Mobil, web ekranlarının dar hâli değil — kendi arayüzü.** Garsonun işi
   kasiyerinkinden farklı: ayakta, tek elle, saniyeler içinde. Ekranlar
   `src/mobil/` altında kendi bileşenleriyle yazılıyor; `Salon.tsx` ve
   `Siparis.tsx` masaüstü ekranı olarak kalıyor, dokunulmuyor.
   **Veri katmanı tek kalıyor** (`menu.ts`, `adisyonlar.ts`, `masalar.ts`,
   `kuyruk.ts`, `onbellek.ts`) — fiyat, kuruş yuvarlaması ve offline kuyruğu
   iki kere yazılmaz. Ayrışma yalnız ekranda.
2. **Tek uygulama, role göre şekillenen alt sekmeler.** Adisyo'da mobil sadece
   garsonun değil; mutfak personelinin ve yöneticinin de yüzeyi. Bizde sekmeler
   kişinin yetkisinden hesaplanıyor, `rotaYetkileri.ts` aynen kullanılıyor:
   Masalar (`siparis.al`) · Paket/Gel Al (`siparis.al`) · Mutfak
   (`mutfak.ekran`) · Satış (`rapor.gun_sonu`) · Ben (herkes: vardiya, kilit,
   çıkış). Garson üç sekme görür, mutfakçı bir tane, yönetici beşini.
   Ayrı uygulama, ayrı giriş, ayrı "patron uygulaması" yok.
3. **Adisyo'nun mobili kopyalanmıyor.** Turda zayıf bulunan üç noktada bilinçli
   ayrılıyoruz:
   - **Sepet hep ekranda.** Adisyo'da sepet alttan kayan ayrı sayfa; garson ürün
     seçerken ne girdiğini görmüyor. Bizde altta ince şerit — son kalem, adet,
     toplam sürekli görünür; yukarı çekince tam liste.
   - **Adet için pencere yok.** Ürüne tekrar dokunmak adedi artırıyor. Uzun
     basış porsiyon/seçenek/not açıyor.
   - **Tek ana düğme: Gönder.** Adisyo'nun Kaydet / Öde / Hızlı Öde üçlüsü her
     siparişte karar verdiriyor, acemi personel orada takılıyor. Ödeme sipariş
     girme ekranında değil, adisyonun kendi ekranında — ayrı an, ayrı iş.
   - Bizim ekimiz: çevrimdışıyken şerit kaç siparişin kuyrukta beklediğini
     söylüyor. Adisyo'da garson gönderdi mi göndermedi mi bilmiyor.

**Mağaza paketlemesi (Capacitor) ertelendi, iptal değil.** Aynı React kodu
sonradan App Store / Google Play'e konulabilir bir uygulamaya sarılabiliyor;
bugünkü işin üstüne biniyor, kod baştan yazılmıyor. Maliyeti Apple 99 $/yıl +
iOS derlemesi için Mac, Google 25 $ tek sefer ve her güncellemede mağaza onayı.
Ürün satışa çıkarken "App Store'da var mı" sorusu geldiğinde yapılacak.
React Native ile ayrı mobil uygulama **reddedildi**: ikinci kod tabanı her
özelliği iki kere yazdırır.

**Mutfak sekmesi** şimdilik mevcut İstasyon ekranının mobil hâli. Derinleşmesi
(pişirme/paketleme aşamaları, hazırlık süresi) KDS'in kalanıyla birlikte, sırası
geldiğinde. **Satış sekmesi** Analiz'in tamamı değil, telefonda bakılacak kadarı:
günün cirosu, açık masalar, ödeme tipi dökümü.

Aşamalar: **(1) kabuk + rol bazlı alt sekmeler + Masalar**, (2) sipariş ekranı
(kategori/ürün, hep görünen sepet), (3) ödeme (adisyon ekranında).

**19 Ağu 2026 (3. seans): Offline dayanıklılık — aşama 1 bitti (kabuk + bağlantı durumu).**
Seansın başında iki karar düzeltildi:

1. **Tahsilat fişi yapılmayacak.** Adisyo canlı turlandı: müşteri detayında
   yazdırma yok (üst şerit Geri · İndir · Bakiye Güncelle · Ödeme Al), Ödeme Al
   modalında yazdırma seçeneği yok, Tahsilat No'ya tıklamak fiş değil ödemeyi
   *düzenleme* penceresi açıyor, Çıktı Tasarımı'nda yalnız iki tür var (Adisyon,
   Mutfak). "Açık Hesap Alacak Fişi" Adisyo'da bir kayıt türünün adı, kâğıda
   basılan bir şey değil. Fiş numarası bizde de aynı işi görüyor: kaydı
   konuşabilmek için.
2. **Faz 2 sırası düzeltildi.** Bir önceki seansta "KDS'in kalanı kurye atamasından önce"
   yazılmıştı; doğrusu **KDS'in kalanı en sonda** — offline dayanıklılık, sonra
   garson mobil, sonra kurye atama. Karar daha önce konuşulmuş ama dosyaya
   işlenmemişti.

**Offline neden önce:** kasa internetsiz kalınca satış tamamen duruyordu.
Uygulama üç aşamada dayanıklı hale geliyor — (1) kabuk ve bağlantı durumu,
(2) yerel okuma önbelleği, (3) yazma kuyruğu. Sıra bu: kuyruk tek başına işe
yaramıyor, menü yüklenemezse garson zaten ürün seçemiyor.

Aşama 1'de yapılanlar:
- **Service worker** (`vite-plugin-pwa`, `vite.config.ts`): uygulamanın kabuğu
  (HTML, JS, CSS, Poppins) cihazda. İnternetsiz açılışta eskiden tarayıcının
  hata sayfası geliyordu. **Veri istekleri bilerek önbelleğe alınmıyor** —
  bayat menü göstermek hiç göstermemekten tehlikeli, garson olmayan fiyattan
  satar. Çevrimdışı veri aşama 2'nin işi, kendi tazelik kuralıyla gelecek.
- **`baglanti.ts`**: bağlantı durumu tek yerden. `navigator.onLine` yetmiyor
  (modem açık ama internet yoksa "bağlı" diyor), Supabase'e gerçekten yoklama
  atılıyor — bağlıyken 30 sn, kopukken 5 sn arayla. `sureSinirli()` ekranların
  cevapsız istekte asılı kalmasını engelliyor (sınır 5 sn).
- **`supabase.ts`**: istemcinin `fetch`'i sarıldı. 113 çağrının her biri durumu
  besliyor, ayrıca cevapsız istek 12 sn'de kesiliyor. Sunucudan gelen "yetkin
  yok" gibi cevaplar kopukluk sayılmıyor — cevap dönmesi ulaşıldığının kanıtı.
- **`CevrimdisiSerit`**: ekranın üstünde mercan şerit, giriş ve kilit ekranı
  dahil. Sayfanın üstüne biniyor, düzeni kaydırmıyor.

Turda çıkan ve kapatılan **beş gerçek hata** (hepsi offline'a bakınca görüldü):
1. `Siparis.kaydet` hatayı hiç yakalamıyordu: bağlantı yokken Kaydet'e basınca
   ne kayıt oluyordu ne uyarı çıkıyordu.
2. Ödeme kapatma ve Hızlı Öde de aynı şekilde sessizce düşüyordu.
3. Cari tahsilat da öyle.
4. **Oturum çevrimdışıyken kapanıyordu:** `kisiyiYukle` okuma hatasını "kişi
   yok" sayıyor, çağıran da `signOut()` çağırıyordu — geçici ağ kopukluğu
   kalıcı çıkışa dönüşüyordu. Okuma hatası artık ayrı.
5. **Yoklama döngüsü ölüyordu:** sekme arkaya alınınca zamanlayıcı temizleniyor,
   öne gelince yeniden kurulmuyordu; bir kez "kopuk" diyen ekran bağlantı
   gelse de öyle kalıyordu.

Bağlantı gelince ekran kendiliğinden toparlanıyor: oturum yeniden okunuyor,
Salon kendini dolduruyor. Salon'un okuma hatası artık "Masalar yüklenemedi"
kutusu + Yeniden dene düğmesi; eskiden halka sonsuza kadar dönüyordu.

**Aşama 1'in bilinen sınırı:** çevrimdışıyken giriş yapılamıyor (şifre sunucuda
doğrulanıyor) ve veri görünmüyor. İkisi de aşama 2'nin işi.

**19 Ağu 2026 (4. seans): Offline dayanıklılık bitti — aşama 2 (okuma önbelleği) ve
aşama 3 (yazma kuyruğu).** Kasa artık internetsiz de satış alıyor.

Aşama 2 — `onbellek.ts`. Kural **önce sunucu, olmazsa cihazdaki kopya**:
bağlıyken her okuma sunucudan gelir ve kopyayı tazeler, kopya bir hızlandırma
değil kopukluk sigortasıdır. Menü, bölge/masa, işletme ayarları, işletme
kimliği ve ödeme tipleri bu sarmaldan geçiyor. Canlı veriler (adisyon, sipariş,
tahsilat) bilerek **girmiyor** — bir dakika öncesinin masa durumu yanlış
bilgidir, yokluğu yanlış bilgiden iyidir. Kopya işletme kimliğiyle saklanıyor,
çıkışta siliniyor. Oturum da (ad, rol, yetkiler) cihazda: kasa internetsiz
açılınca artık giriş ekranına düşmüyor.

Turda çıkan üç kural, üçü de "bekleme" üzerine:
- Supabase okumaları hatayı fırlatmıyor, sonucun içinde döndürüyor. Kontrol
  edilmezse kopukluk **boş liste** gibi görünüyor ve menü bomboş açılıyordu
  (`hataysaFirlat`).
- Oturum açılmadan yapılan okuma satır güvenliği yüzünden boş dönüyor; o boşluk
  kopyanın üstüne yazılırsa çevrimdışı açılışta ayarlar kayboluyordu. Oturum
  yokken kopyaya **yazılmıyor**.
- **Bağlantının olmadığı biliniyorsa sunucu hiç denenmiyor.** Çevrimdışı istek
  hata vermek yerine asılı kalıyor; denemenin bedeli her sayfada saniyelerce
  dönen yükleniyor halkasıydı.

Aşama 3 — `kuyruk.ts`. **Mimari karar: numaraları sunucu üretmeye devam ediyor**
(adisyon no, sipariş no, kalem kimlikleri); kuyruk kaydın kendisini değil "ne
yapılacağını" saklıyor ve sırası gelince aynı kaydetme çağrısını yapıyor.
Cihazın kendi numarasını üretmesi her tabloda kimlik tipi değişimi ve iki
kasada aynı numara riski demekti.

- **Bir hedefin yalnız son kaydı duruyor.** Sepet her kaydetmede bütün hâliyle
  gidiyor; aynı masanın iki kaydı arka arkaya gönderilseydi ilk kaydın ürünleri
  ikinci kayıtta yeniden eklenir, masaya iki katı yazılırdı.
- Kuyruk **sırayla** boşalıyor. Bağlantı hatası kaydı yerinde bırakıyor; sunucu
  reddederse (silinmiş masa, yetki) kayıt kuyruktan çıkıp sebebi şeritte
  yazıyor — yoksa kuyruk aynı kaydı sonsuza kadar deneyip tıkanırdı.
- Salon kuyruktaki masaları dolu gösteriyor, masa kartında **"Gönderilmedi"**
  işareti var (süre çipinin yerinde, beyaz zeminli — mercan kartta okunuyor).
- **Tahsilat ve hesap kapatma kuyruğa girmiyor.** Para işlemi bekletilmez;
  çevrimdışıyken kapatma yine engelleniyor, sipariş almak devam ediyor.
- Şerit ekranın **altına** taşındı: üstte başlıkların ve düğmelerin üstüne
  biniyordu. Üç hâli var — bağlantı yok (kaç sipariş beklediği + kopyanın
  tarihi), gönderiliyor, gönderilemedi.

**19 Ağu 2026 (2. seans): İstasyon ekranı (KDS) çekirdeği bitti.** Önce Adisyo'nun
mutfak ekranı canlı turlandı (yol haritası bölüm "KDS (Mutfak) Ekranı"). Turda
ürün → istasyon eşlemesinin bizde zaten kurulu olduğu görüldü (`istasyonlar`
tablosu, `pisirme`/`paketleme` sütunlarıyla), o yüzden ön adım gerekmedi.

Ekran `/istasyon` adresinde, giriş istasyon seçtiriyor, seçilen tezgâh
`/istasyon/:id`'de açılıyor. Veri katmanı `mutfak.ts`, göç
`sql/2026-08-27-mutfak-hazir.sql`.

Adisyo'dan bilinçli ayrıldığımız yerler:
- **Kart = tur, adisyon değil.** Adisyo'da iki saat önce girilen ürünle az önce
  söylenen aynı kartta duruyor; tezgâh yeni geleni ayırt edemiyor. Bizde her
  sipariş turu kendi kartı.
- **Sayaç kartta, kalem satırında değil.** Adisyo her satıra ayrı sayaç koyuyor,
  kart kalabalıklaşıyor. Bizde tek sayaç + kartın sol kenarında şerit: süre
  dolunca yeşilden mercana dönüyor, eşik işletme ayarı (`mutfak_gecikme_dk`,
  Ayarlar › Genel). Adisyo'da eşik sabit.
- **Onay yok, geri alma var.** Hazır düğmesi tek dokunuşla işaretliyor (mutfakta
  hız var); yanlış basılan on saniye boyunca alttaki şeritten, sonrasında
  Hazırlananlar panelinden geri alınıyor. Adisyo'da geri alma hiç yok.
- **Koyu zemin.** Adisyo'nunki bembeyaz; mutfak ekranı uzaktan okunuyor, koyu
  zeminde kartlar öne çıkıyor. Yan menü yok, ekran tam ekran.
- **Kartlar sabit boyda** (340px; punto kademesine göre 300/400). İki ürünlü
  sipariş de on ürünlüsü de aynı kutuda; sığmayan liste kartın içinde kayıyor,
  başlık ve "Tümü hazır" yerinde kalıyor — Analiz'deki kendi kaydırma penceresi
  kararının aynısı. Düğmeler bütün kartlarda aynı hizada.
- **Garson adı masa adının üstünde**, kendi satırında ve koyu. Künye satırında
  nokta ayraçları arasında kayboluyordu.

Veri tarafındaki kararlar:
- Hazır durumu ayrı tablo değil, kalemin kendi sütunu (`hazir_at`, `hazir_kisi`).
  Boşsa bekliyor, doluysa hazır; üçüncü durum yok. Aşamalar geldiğinde bu
  sütunlar yerinde kalacak.
- **İkram hazırlanır, iptal hazırlanmaz.** İstasyonu olmayan ürün hiçbir ekrana
  düşmez — mutfak fişindeki kuralın aynısı, ikisi aynı haritadan okuyor
  (`urunIstasyonlari`).
- Ekran canlı yayınla besleniyor; kablosuz zayıflarsa 30 saniyelik yoklama
  yedekte duruyor.
- Yazı boyutu (üç kademe) cihazda saklanıyor, sunucuda değil: aynı işletmede
  mutfak tabletle, bar duvar ekranıyla çalışabiliyor.
- Yeni yetki: `mutfak.ekran`.

Turda çıkan ve bu seansta yapılmayan işler en sona bırakıldı (bölüm 0).

**19 Ağu 2026:** Analiz → Adisyonlar tablosuna **Kuver** ve **Garsoniye**
sütunları eklendi (sıralanabilir, alt toplam satırında dönem toplamı). Aynı
tabloya **kendi kaydırma penceresi** verildi: kutu ekranda kendisine kalan yeri
ölçüp o kadar yükseliyor, liste kendi dikey çubuğuyla kayıyor, sütun başlıkları
ve Toplam satırı sabit duruyor. Karar: **liste kutusunun yüksekliği sabit `vh`
ile verilmez** — üstteki başlık, sekmeler ve filtre şeridi yer kapladığı için
kutunun alt kenarı (ve yatay çubuğu) ekranın dışında kalıyordu. Denenip
vazgeçilen iki fikir: toplam satırının bir kopyasını başlıkların altına koymak
ve tablonun üstüne ikinci bir yatay kaydırma çubuğu koymak — kutu kendi içinde
kayınca ikisi de gereksizleşti.

**17 Ağu 2026:** **Analiz'in Denetim dışındaki bütün sekmeleri bitti.** Özet
yeniden kuruldu: üstte toplama işlemi gibi okunan üç sayı (`Kapanan ciro +
Açık masalar = Toplam`, açık masa yoksa tek sayıya iniyor), altında künye bandı,
tek hesap dökümü (ciro → kasaya giren → eksik tahsilat), üç kart tek sırada ve
saat grafiği tam genişlikte. Açık adisyon bilgi kutusu kalktı, bilgi şeridin
kendisine girdi. **Ürünler** (kategori dağılımı kendi renkleriyle + ürün tablosu),
**Personel** ve **Giderler** sekmeleri yazıldı. Turda çıkan kararlar:
- **Ciro satışı yapana yazılıyor**, masayı açana değil: her kalem kendi turunun
  garsonuna (`turlar.garson_id`). Bir masaya üç kişi sipariş girdiyse ciro üçe
  bölünüyor. "Açtığı masa" ayrı bir sütun olarak duruyor — masa açmak da bir iş
  ama ciro değil. Adisyon geneline verilen indirim kalemlere tutarları oranında
  dağıtılıyor ki personel ciroları toplamı özetteki ciroyu tutsun.
- **Arama her sekmenin kendi işi.** Ortak filtre şeridinden kaldırıldı (bir
  sekmede aranan şey diğerini boşaltıyordu); Ürünler'de kategori ve ürün için
  iki ayrı kutu var.
- **Sıralama sütun başlığında**, ayrı düğme şeridinde değil: aktif sütun mercan
  ve ok yönünü gösteriyor, diğerlerinde soluk ⇅ duruyor.
- **Gider tarihi kasa gününe bağlandı.** Giderler ekranı takvim gününü
  kullanıyordu; kasa günü 08:45'te başlayan bir işletmede gece 03:00'te girilen
  gider bir ekranda bugüne, diğerinde düne düşüyordu.
- **Yetki ekranındaki "Rapor" grubu "Analiz" oldu** (`sql/2026-08-17-analiz-
  adlandirma.sql`). Yetki kodları `rapor.tumu` / `rapor.gun_sonu` olarak kaldı:
  kimseye görünmüyorlar ve kişilere atanmış yetkiler bunlara bağlı.

**18 Ağu 2026:** **Denetim tarafı bitti, Analiz'in altı sekmesi de tamam.**
Hassas işlemler artık tek deftere yazılıyor (`denetim_kayitlari`: kim · ne zaman ·
işlem · adisyon · yer · konu · adet · tutar · sebep). Bu seansta çıkanlar:
- **Kalem iptali sebep soruyor** (hazır sebepler + "Diğer"); ikram sorusuz ama
  deftere düşüyor. Sebep sorma kalıbı ayrı bileşen olarak değil, `OnayModal`'ın
  `sebepler` özelliği olarak kuruldu — aynı desen üç yerde kullanılıyor.
- **Tahsilatlar kimlik kazandı.** Eskiden her kayıtta toptan silinip yeniden
  yazılıyordu; artık duran güncelleniyor, giden siliniyor ve sebebiyle deftere
  düşüyor. Silinen tahsilat denetiminin önündeki yapısal engel buydu.
- **Kapanmış hesabın ödeme tipi düzeltilebiliyor** (`odeme.tip_duzelt`) — tutara
  dokunmuyor ama nakit/kart dengesini değiştirdiği için yetkiye bağlı.
- **Eksik tahsilatla hesap kapatma** (`odeme.eksik_kapat`): kalan varken "Eksik
  Kapat" düğmesi çıkıyor, borcun kime yazıldığı ve sebebi zorunlu
  (`adisyonlar.eksik_kisi`, `eksik_sebep`). Analiz'deki eksik tahsilat rozeti
  artık gerçek veriyle çalışıyor.
- **Açık hesap ile eksik kapatma ayrı kavramlar** (karar): tanınan müşteri →
  Açık Hesap ödeme tipi, cari bakiyesine yazılır (Faz 2, cari modülüyle);
  tanınmayan/kayıt dışı → eksik kapatma, denetim kaydı olarak kalır. Cari gelince
  `EksikKapat`'taki serbest metin kutusu müşteri seçiciye dönüşecek.
- **Yan menü sabitlendi** — sayfayla birlikte kayıyordu, alttaki kişi satırı ancak
  aşağı inince görünüyordu. Artık ekrana yapışık (`sticky`, 100vh), uzarsa yalnız
  bağlantı listesi kayıyor.

**19 Ağu 2026:** **Adisyon iptali/ikramı ve işletme kaydı ekranı bitti.**
- **Adisyonun tamamına iptal ve ikram** (`sql/2026-08-19-adisyon-iptal-ikram.sql`).
  İptal edilen adisyon silinmiyor, `durum` = `iptal` oluyor ve `iptal_sebep`
  yazılıyor. **Tahsilatı olan adisyon iptal edilemiyor** — kasaya girmiş para
  ortada kalırdı. İkram bütün kalemleri ikrama çevirip hesabı kapatıyor. İkisi
  de Salon'un üç nokta menüsünde ve adisyon detay penceresinde, sebep zorunlu.
  Yetki için yeni kod açılmadı: `siparis.iptal` zaten "Adisyon iptali" adıyla
  duruyordu ve kodda kullanılmıyordu, o kullanıldı; yalnız
  `siparis.adisyon_ikram` yeni.
- **İkram ayrı bir durum değil, türetiliyor** (`tamamiIkram`): hesap kapanmış,
  ikram tutarı var ve ödenecek sıfırsa o adisyon ikramdır. Kalem kalem ikram
  edilen masa da böylece doğru görünüyor. Rozet metni ve sıralama tek kaynaktan
  (`durumMetni`) geliyor. Analiz'in durum süzgecinde beş seçenek birbirini
  kesmiyor: **"Kapanmış" ikramları içermiyor.**
- **Adisyonlar tablosunun on iki başlığı da sıralanabilir** — Ürünler'deki
  `SiraBaslik` deseni. Sıralama ekranda yazan değeri görüyor (masasız siparişte
  müşteri adı, tahsilat sütununda ödeme tipi); durum alfabetik.
- **İşletme kaydı ekranı** (`sql/2026-08-19-isletme-kur.sql`, `pages/Kayit.tsx`).
  Kayıt ayrı bir adres değil: oturum yokken yönlendirici hiç kurulmuyor, giriş
  ile kayıt aynı kapının iki yüzü. `isletme_kur` tek işlemde işletmeyi, altı
  rolü, **dolu gelen yetkileri** (2026-08-12'deki şablonun aynısı), ayarları,
  **on dört ödeme tipini** (Nakit ve kart açık, gerisi kapalı — işletme
  kullandığını Ayarlar'dan açar), birimleri, KDV gruplarını, örnek salonu
  (altı masa) ve örnek menüyü (dört kategori, on bir ürün, iki seçenek grubu)
  açıyor. Örnek veri kararı: yeni işletme boş ekranla karşılaşmasın, sipariş
  akışını ilk dakikada deneyebilsin.
- **Satır güvenliğinde açık bulundu (Ramazan yakaladı).** `kategoriler`,
  `urunler` ve `masalar` tablolarında satır güvenliği göçünden önceki
  "herkes/`true`" politikaları duruyordu; politikalar "veya" ile birleştiği için
  doğru politika eklenmiş olmasına rağmen **bütün işletmeler birbirinin verisini
  görüyordu**. Eski açık politikalar silindi. Kural: `isletme_id` sütunu olan
  bir tabloda `true` koşullu politika kalmamalı.
- **Tekillik kuralları işletmeye göre oldu** (`sql/2026-08-19-tekillik-isletmeye-gore.sql`).
  `birimler.ad` gibi alanlarda tekillik veritabanı genelindeydi; ikinci işletme
  "Tam" birimini ekleyemiyordu. Artık `(isletme_id, alan)`.
- **Auth jeton sütunları** NULL kalınca giriş servisi çöküyor ve kullanıcı
  "bilgiler doğru değil" görüyor. `auth.users` üstüne tetikleyici kondu: hangi
  yoldan açılırsa açılsın yeni hesabın jeton sütunları boş metinle başlıyor.
- **Ayarlar girişten sonra yeniden okunuyor.** Program açılırken bir kez
  okunuyordu, o an oturum olmadığı için satır güvenliği hiçbir şey döndürmüyor
  ve elde varsayılanlar kalıyordu. Yalnız kaydı değil normal girişi de
  etkileyen bir hataydı.

**Göç notu:** satır güvenliği açıldığından beri `isletme_id` oturumdan geliyor;
SQL editöründe oturum olmadığı için göç dosyalarında bu sütun **elle
yazılmalı** (kaynağı ilgili satırın kendi işletmesi). `rol_yetkileri`'ne yetki
eklerken bu yüzden hata alındı.

**19 Ağu 2026:** **Kayıt ekranı korumaya alındı ve işletme kimliği kuruldu.**
Bu iki maddeyle birlikte sıradaki iş listesinin yapılabilir kısmı bitti; Faz 1
(satış çekirdeği) tamamlandı, sıra Faz 2'de.
- **Kayıt hız sınırı** (`sql/2026-08-20-kayit-koruma.sql`). Tasarım notunda
  "SQL'de hız sınırı kurulamaz, Edge Function gerekir" yazıyordu — yanlış
  çıktı: PostgREST isteğin başlıklarını veritabanına geçiriyor, IP oradan
  okunabiliyor (`istek_ip()`). Sınır IP'ye göre: **24 saatte 2, 7 günde 5**
  işletme. Telefona göre sınırlamak işe yaramaz, saldırgan her seferinde başka
  numara yazar. **Yalnız başarılı kayıtlar sayılıyor** — kurulum hata verince
  işlem geri alınıyor, deftere yazılan satır da onunla gidiyor; engellenmek
  istenen zaten toplu işletme açma. Defteri (`kayit_denemeleri`) kimse okuyamaz,
  30 günden eskisi silinir. Kurulumun gövdesi `isletme_kur_uygula` adını alıp
  dışarıya kapatıldı; `isletme_kur` artık önce sınıra bakan ince bir kapı.
- **İşletme adı ve kodu değişmez** (`sql/2026-08-20-isletme-kodu.sql`). Ürün
  satılacağı için işletmenin sabit bir kimliği olmalı: `isletmeler.kod`, kendi
  dizisiyle **15000'den** başlıyor, kayıt sırasında sorulmuyor, veritabanı
  atıyor. Tablonun `id`'si bu iş için kullanılmadı — o iç numaralandırma,
  dışarıya verilmez. `isletmeler_duzenle` politikası tamamen kaldırıldı: ad da
  kod da programdan değiştirilemiyor, arayüzü atlayan istek de değiştiremiyor.
  Ad düzeltmesi gerekirse SQL editöründen elle yapılıyor.
- **Kimlik iki yerde görünüyor.** Yan menüde marka adının altında işletme adı
  ve kodu (menü katlanınca gizleniyor); Ayarlar → Genel'in en üstünde okunur
  kimlik kartı — baş harf amblemi, ad, kilit ikonlu açıklama ve tıklayınca
  panoya kopyalanan kod rozeti. Ad ve kod ayarlarla birlikte tek seferde
  okunuyor (`isletmeKimliginiGetir`), önbellekte duruyor.

**21 Ağu 2026:** **Yazıcı modülünün ayar tarafı bitti** — veri modeli, Yazıcılar
ekranı, İstasyonlar ve canlı önizlemeli Fiş Tasarımı. Bu seansta çıkanlar:
- **"Mutfak grubu" değil "İstasyon"** (`sql/2026-08-21-istasyon-adlandirma.sql`).
  Adisyo'nun kelimesi "mutfak grubu" ama bar ve nargile de aynı yapıyı
  kullanıyor; bardaki kişiye "mutfak" dememiş oluyoruz. Tablolar `istasyonlar`
  ve `yazici_istasyonlari`, ürün/kategori sütunu `istasyon_id`.
- **Yönlendirme zinciri: ürün → istasyon → yazıcı.** İstasyonu **kategori**
  belirliyor, ürün gerekirse kendi istasyonunu yazıp eziyor (Adisyo'da yalnız
  ürünün alanı; 200 ürünlük menüde tek tek seçtirmek işkence).
- **Fiş şablonu iki `jsonb` sütunda** (`parametreler`, `puntolar`). Görünürlük
  anahtarları ve alan alan puntolar onlarca küçük ayar; her biri ayrı sütun
  olsaydı şablona her eklemede göç gerekirdi. Alanların listesi veritabanında
  değil `yazicilar.ts`'te — bunlar işletmenin tanımladığı satırlar değil,
  programın bildiği alanlar.
- **Yazdırma kuyruğu tablosu kuruldu** (`yazdirma_kuyrugu`): fiş önce kuyruğa
  yazılır, köprü basar, basılamayan "başarısız" kalır. İçerik metni satırda
  donuyor ki şablon sonradan değişse bile eski fiş o günkü haliyle yeniden
  basılabilsin.
- **Yeni işletme varsayılanları tetikleyiciyle**: `isletme_kur_uygula`'nın
  gövdesine dokunmak yerine `isletmeler` üstünde `after insert` tetikleyici —
  hangi yoldan açılırsa açılsın iki istasyon ve iki şablon hazır geliyor.
- **Ayar ekranlarının alt sekme kuralı genelleşti.** `AyarBasligi` yalnız
  Personel'in alt şeridini biliyordu; artık `ayarBolumleri` içinde `alt` taşıyan
  her bölüm ikinci şeridi çiziyor.
- Yeni yetki: `yazici.yonet`. Yeni ekranlar `/ayarlar/yazicilar`,
  `/ayarlar/istasyonlar`, `/ayarlar/fis-tasarimi`.

**22 Ağu 2026:** **Yazıcı zinciri baştan sona bağlandı** — ürün artık istasyon
seçiyor, fiş üretiliyor ve kuyruk ekranından izleniyor. Bu seansta çıkanlar:
- **İstasyon seçimi Menü Stüdyosu'na girdi.** Kategori penceresinde ve ürün
  panelinde "Hazırlandığı istasyon"; üründeki boş seçenek **"Kategorisine göre
  (Bar)"** diye devralınanı yazıyor, kural ekranda okunuyor. Hiç istasyon
  tanımlı değilse alan iki ekranda da görünmüyor — boş kutu gösterilmiyor.
- **Fiş metni ayrı katmanda** (`src/fis.ts`). Şablonu 42 karakterlik düz metne
  çeviriyor; önizlemeyle aynı `parametreler` anahtarlarını okuyor. **Puntolar bu
  katmanın işi değil** — onlar ESC/POS komutu, köprü yazıcıya kendisi söylüyor.
- **Mutfak fişi yalnız o turun kalemlerini basıyor.** Yeni tur açılınca kuyruğa
  düşüyor; eski kalemler ikinci kez gitseydi aynı yemek iki defa hazırlanırdı.
  Kalemler istasyona göre ayrılıyor, barın fişinde mutfağın ürünü olmuyor.
  Fiş yazımı ayrı sarmalda: yazıcı tarafındaki hata siparişin kaydını düşürmüyor.
- **Ürün → istasyon eşlemesi bellekte** (`istasyonHaritasi`); her sipariş
  kaydında menüyü baştan okumamak için. Menü Stüdyosu kayıtta tazeliyor.
- **Yazdırma Kuyruğu ekranı** (`/ayarlar/yazdirma-kuyrugu`, Yazıcılar'ın
  dördüncü alt sekmesi): durum sekmeleri, yeniden bas / iptal, satıra tıklayınca
  fişin donmuş metni. Liste 15 saniyede bir kendini tazeliyor — basma işini
  köprü yapıyor, durum bu ekranın haberi olmadan değişiyor.
- **Supabase hatalarını yutmamak kuralı.** Kuyruk ekranı boş görünüyordu:
  sorguda adisyon numarası `no` yazılmıştı, sütunun adı `adisyon_no`. Hata
  sessizce yutulduğu için ekran "kayıt yok" diyordu. Artık hem kuyruğa yazma hem
  okuma hatası kullanıcıya çıkıyor.

**23 Ağu 2026:** **Kasa köprüsü çalıştı — fiş ilk kez kâğıda bastı.** Ayrı klasör
(`kopru/`, kendi paketi, sade Node). Giriş → kuyruğu dinle → çiz → yazıcıya
gönder → sonucu yaz. Ethernet yazıcıya doğrudan `IP:9100`, sürücü kurulmadan.
Bu seansta çıkanlar:
- **Fiş metin değil çizim.** Termal yazıcının kendi yazısı denendi ve battı:
  her marka karakter tablosunu başka numarada tutuyor, Türkçe harfler bozuk
  çıkıyor (yazıcıya tablo tarama fişi bastırılarak görüldü — hiçbiri tutmadı).
  Adisyo bu sorunu Windows sürücüsüne devrederek çözmüş: **Adisyo'nun fişi de
  çizim**, farkı çizeni Windows'un yapması (turda görüldü — yazıcı tanımında IP
  ve kâğıt sorulmuyor, Çıktı Tasarımı önizlemesi kalın/altı çizili/oransal
  yazıyla dolu). Biz kendimiz çiziyoruz: **Poppins gömülü** (₺ ve Türkçe harfler
  onda var), alan alan punto, kalın başlıklar, sağa hizalı tutarlar.
  Kazancı: sürücü kurulumu yok, işletim sistemi bağımsız, punto gerçekten
  çalışıyor; logo ve karekod da ileride aynı yoldan basılacak.
- **İnce yazı termal kâğıtta silik çıkıyor.** Gövde yazısı 500, vurgular 600
  ağırlıkta; siyah eşiği yüksek tutuluyor ki harfin yumuşatılmış kenarı da
  yansın. Punto ölçeği 1,3 (20 punto ≈ 3 mm).
- **Fiş içeriği alanlı pakete dönüştü** (`fis.ts`). 42 karakterlik düz metin
  yerine "bu satır işletme adı", "bu satır ürün — solda ad, sağda tutar".
  Puntolar pakete gömülüyor: şablon sonradan değişse de eski fiş aynı çıkıyor.
  Kuyruk ekranı okunur özetini gösteriyor (`icerikOzeti`), eski düz metin
  kayıtlar da basılabiliyor.
- **Fiş Tasarımı ekranı yeniden kuruldu.** Önizleme artık fişi üreten kodun
  kendisini çağırıyor — ekran ve kâğıt tek kaynaktan. Ayarlar üç bölüme ayrıldı
  (Fişte ne yazsın · Yazı boyutları · Kendi yazınız). **Punto alanları
  genişletildi**: künye, ürün altı satırlar, ödeme satırları ve alt metin de
  ayarlanabiliyor — sabit boyda satır kalmadı.
- **Kâğıt genişliği yazıcı ayarı oldu** (58/80 mm). Adisyo sormuyor çünkü çizimi
  Windows yapıyor; doğrudan basan bizim bilmemiz gerekiyor.
- **Zil**: fiş çıkarken yazıcının kendi zili çalıyor, yazıcı bazında ayar
  (mutfakta açık, kasada kapalı). Fiş kesildikten sonra ötüyor.
- **Numaralar ayrıldı ve işletmeye özel oldu** (`sql/2026-08-23-numaralar.sql`).
  Adisyon no 3000'den, **sipariş no 50000'den** başlıyor; mutfak fişinin üstünde
  turun kendi numarası yazıyor — aynı masadan üç sipariş gelince üçü ayrı
  numarayla düşüyor. Eskiden adisyon numarası bütün işletmeler için tek
  sayaçtandı; **ortak sayaç tartışıldı ve reddedildi** (numara zıplaması, rakip
  hacminin sızması, muhasebe ardışıklığı). Numarayı tetikleyici veriyor.
- **Hız.** Sipariş kaydı yavaştı: fiş yazımı ekranı bekletiyordu, duran kalemler
  her kayıtta tek tek güncelleniyordu, yazıcı ve şablon her fişte yeniden
  okunuyordu. Artık fiş yazımı beklenmiyor, yalnız değişen kalem yazılıyor
  (o da toplu), yazıcı/şablon bellekte, turlar ile tahsilatlar aynı anda
  okunuyor. Köprü de **canlı bağlantıya** geçti (`sql/2026-08-23-kuyruk-canli.sql`),
  3 saniyelik yoklama yedek olarak duruyor.
- **Kuyruk çakışmaya karşı korundu** (`sql/2026-08-23-kuyruk-cihaz.sql`): köprü
  fişi önce üstüne alıyor (`cihaz`, `alinma`), iki kasa aynı fişi basmıyor.
- **Fişteki kişi bilgisi düzeldi.** Personel sisteminden önceki serbest metin
  sütunundan okunuyordu, boş çıkıyordu. **Mutfak fişinde turu giren**, adisyon
  fişinde masayı açan yazıyor. Masa adı ve numara da fiş yazılmadan önce
  veritabanından okunuyor.
- **Göç notu:** `alter table` tabloyu tek başına kilitliyor; köprü ve açık Garso
  sekmesi aynı tabloya bakarken göç çalıştırılırsa **deadlock** oluyor. Göçten
  önce köprü kapatılıp sekmeler kapatılmalı.

**24 Ağu 2026:** **USB yazıcı, para çekmecesi, logo/karekod ve Bağlantı Durumu
ekranı bitti.** Köprüden geriye yalnız paketleme kaldı. Bu seansta çıkanlar:
- **USB yazıcı Windows'un yazdırma servisi üzerinden** basıyor (`kopru/src/usb.js`
  + `ham-yazdir.ps1`): marka sürücüsü gerekmiyor, Windows'un kendi
  **Generic / Text Only** sürücüsü yetiyor çünkü çizimi biz yapıp ham
  gönderiyoruz. `npm.cmd run yazicilar` kurulu yazıcıların adını listeliyor —
  tarayıcı kasadaki yazıcı listesini göremiyor, ad birebir yazılmak zorunda.
- **Windows, yazıcı fişten çekilmiş olsa bile işi kuyruğuna alıp "aldım" diyor.**
  Bu yüzden basmadan önce yazıcının durumuna bakılıyor (WMI: çevrimdışı mı,
  kâğıdı var mı); ağ yazıcısında kısa bir bağlantı denemesi yapılıyor. Yalan
  söyleyen bir "Dene" düğmesi hiç olmamasından kötü.
- **Çekmece ayrı bir cihaz değil, yazıcının özelliği** (`yazicilar.cekmece`):
  fişten sonra yazıcıya giden bir darbeyle açılıyor. Kuyruğa `tip = 'cekmece'`
  işi düşüyor, köprü onu görünce fiş basmadan yalnız darbeyi gönderiyor; bekleyen
  çekmece işi beş dakikada bir iptal oluyor (geç açılan çekmece kasayı durup
  dururken açıyor). Kasaya para giren tahsilatta kendiliğinden açılıyor
  (`cekmece_nakitte_acilsin`), Kasa penceresinde elle düğmesi de var.
  **Ramazan'ın kendi çekmecesi bu düzene uygun değil** — kendi düğmesiyle çalışan
  bağımsız bir düzenek, yazıcıya kablosu yok; yazıcının çekmece çıkışı (24V 1A) var.
- **Logo ve karekod bitti.** Logo şablonun içinde gömülü resim olarak duruyor
  (ayrı dosya deposu kurulmadı), tarayıcıda 384 noktaya küçültülüp beyaz zemine
  oturtuluyor; **kırpma denendi ve geri alındı** — başka işletmelerin logosunu
  bozma riski kazancından büyük. **Karekodun içeriğini işletme seçiyor**: fiş
  bilgisi (Adisyo'nun yaptığı) ya da bağlantı; adresin başına `https://` kendimiz
  ekliyoruz, yoksa telefon onu arama metni sayıyor.
- **Fişteki KDV sıfır görünüyordu.** Fiş, toplama *eklenen* vergiyi yazıyordu;
  fiyatlar KDV dahil olduğu için o hep sıfır. Artık fiyatın *içindeki* vergi
  yazıyor, "KDV grubu dökümü" anahtarı da (duruyordu ama basılmıyordu) çalışıyor.
- **Fiş Tasarımı'na iki anahtar:** ürün seçenekleri/notları hesap fişinde
  görünsün mü, aynı ürünler tek satırda toplansın mı (üç turda gelen çay
  "3 x Çay"). Yalnız fişte aynı görünen kalemler birleşiyor. Şablona sonradan
  eklenen anahtarlar `VARSAYILAN_PARAMETRELER` ile açık geliyor — eksik anahtar
  kapalı sayıldığı için eski işletmelerin fişi kendiliğinden değişmesin diye.
- **Bağlantı Durumu ekranı** (`/ayarlar/baglanti-durumu`): köprü yirmi saniyede
  bir "buradayım" diyor (`kopru_cihazlari`), yazıcıları otuz saniyede bir
  yokluyor (`yazici_durumlari`). **Dene** düğmesi gerçek kuyruktan geçen bir
  deneme fişi atıyor — ayrı bir yol açılsaydı "denemede çalıştı ama fiş
  çıkmıyor" durumu doğardı.
- **Satır düzeni kuralı:** liste satırlarında etiket ve düğmeler sabit
  sütunlarda duruyor, yanlarındaki yazı uzayınca kaymıyorlar; açıklamalar
  satıra yazı olarak değil `Ipucu` ("i") içine giriyor.

**25 Ağu 2026:** **Köprü paketlendi — kasada Node kurulumu ve terminal gerekmiyor.**
`npm.cmd run paketle` ile `kopru/dagitim/` klasörü çıkıyor. Bu seansta çıkanlar:
- **Paketleme yolu: esbuild + Node'un kendi SEA'sı.** Kaynak tek dosyaya
  toplanıp node.exe kopyasının içine gömülüyor (`paketle.js`). **Dağıtım tek
  dosya değil, tek klasör:** çizim kütüphanesi (`@napi-rs/canvas`) bir Windows
  eklentisi, ancak diskteki dosyadan yüklenebiliyor; exe'nin yanındaki
  `node_modules`'tan okunuyor.
- **Dosya yerleri tek yerden** (`src/yerler.js`). Paketlenmiş programda kaynak
  dosyalar exe'nin içinde kaldığı için `import.meta.url` ile yan dosya
  bulunamıyor; kök, exe'nin klasörü oluyor. `import.meta.url` koddan tamamen
  kalktı — paketleyici onu düz dosyaya çeviremiyor.
- **Yazı tipi ve betik köprünün kendi klasöründe** (`kopru/varliklar/`). Poppins
  ana projenin `node_modules`'ından okunuyordu; kasada o klasör yok.
- **İlk açılış bilgileri kendi soruyor** — `ayarlar.json` yoksa program hata
  verip kapanmıyor, dört soru sorup dosyayı kendi yazıyor.
- **Windows başlangıcına Başlangıç klasörü kısayoluyla** (`garso-kopru.exe kur`),
  kayıt defterine dokunulmadan; `kaldir` geri alıyor. `kur` önce programı
  `%LOCALAPPDATA%\Garso\Kopru`'ya kopyalıyor — klasör masaüstünde kalırsa
  silindiği gün köprü de gider, kasa fiş basmayı sessizce bırakır.
- **Sürüm artık kodda** (`src/surum.js`, 1.0.0): exe'nin yanında `package.json`
  yok. `package.json` ile birlikte elle güncelleniyor.

**25 Ağu 2026 (2. seans):** **Köprü pencereli bir Windows programı oldu ve tek
kurulum dosyasına indi.** Terminal penceresi satılacak bir üründe duramazdı.
Bu seansta çıkanlar:
- **Electron seçildi.** Garso zaten React; köprünün penceresi de aynı dille
  yazılıyor, ana programın rengini ve yazı tipini kullanıyor. Bedeli dosya
  boyutu (~200 MB kurulum), kasaya bir kez kurulan program için önemsiz.
  Eski tek dosya paketlemesi (SEA + esbuild + postject) tamamen kalktı.
- **Program pencere olarak yaşamıyor, tepside yaşıyor** (Adisyo'nun düzeni,
  görünüşü değil): ilk açılışta giriş penceresi, sonra saat yanındaki simge.
  Pencerenin X'i programı kapatmıyor — kasada X'e basıp fiş basmayı durdurmak
  kolay olmamalı. Çıkış yalnız tepsi menüsünden.
- **Sunucu adresi ve anon anahtarı programa gömülü** (`src/sunucu.js`,
  paketlerken `sunucu-gomulu.js` üretiliyor, kaynağı ana projenin `.env.local`
  dosyası). Kurulumda yalnız telefon ve şifre soruluyor. Anahtar gizli bilgi
  değil, tarayıcıdaki Garso'nun içinde de duruyor.
- **Şifre diske düz metin yazılmıyor:** Windows'un kendi şifrelemesi (DPAPI,
  Electron `safeStorage`). Dosya kopyalanıp başka bilgisayarda açılamıyor.
  Kalıcı çözüm yine de cihaz anahtarı — aşağıda sırada.
- **Motor pencereden ayrıldı** (`src/motor.js`): terminal sürümü ve pencereli
  sürüm aynı motoru çalıştırıyor, arayüz yalnız olayları dinliyor.
- **Cihaz kimliği bir kez hesaplanıp saklanıyor.** Her açılışta ağ kartından
  yeniden hesaplanıyordu; birden çok kartı olan bilgisayarda tek kasa iki ayrı
  cihaz gibi görünüyordu (Ramazan yakaladı). Ölü cihaz satırı Bağlantı
  Durumu'ndan silinebiliyor.
- **Köprü kapanırken haber veriyor** (`sql/2026-08-25-kopru-kapanis.sql`).
  Ekran kapanmayı sessizlik sınırının dolmasıyla anlıyordu. Sınır 45 → 20 sn,
  haber aralığı 20 → 5 sn, ekran tazelemesi 15 → 10 sn. Ekran artık
  "Kapatıldı" ile "Ulaşılamıyor"u ayırıyor: biri program kapatılmış, diğerinde
  bilgisayara ya da internete bir şey olmuş.
- **Yazıcı kasaya bağlanabiliyor** (`sql/2026-08-25-yazici-kasa.sql`,
  `yazicilar.cihaz`). USB yazıcı yalnız takılı olduğu bilgisayardan basabiliyor
  ama kuyruktaki iş işaretlenmiyordu; iki kasalı işletmede fişi yanlış köprü
  kapıyordu. Alan yalnız USB'de görünüyor, boş bırakılırsa eski davranış.
  Köprü başka kasaya bağlı yazıcıyı yoklamıyor da — boşuna "çevrimdışı" yazardı.
- **Durum penceresinde günlük yok** (karar): künye + bağlantılar + yazıcılar.
  Akan işlem listesi ekranda çirkin duruyordu; "Bilgileri Kopyala" metninde
  duruyor, destek hattı için en değerli bilgi o.
- **Kurulum dosyası** electron-builder/NSIS ile: `npm.cmd run paketle` →
  `%LOCALAPPDATA%\Garso\dagitim\garso-kopru-kurulum-<sürüm>.exe`. Çıktı proje
  klasörünün dışında: Windows'un dizinleyicisi Masaüstü'nü sürekli tarıyor ve
  paketlemeyi "EPERM" ile durduruyordu. Windows başlangıcına kayıt artık
  Electron'un kendi yoluyla (`setLoginItemSettings`) ve her açılışta kontrol
  ediliyor — kayıt silinirse kendini onarıyor.

**15 Ağu 2026:** **Kurulum sihirbaz oldu, köprü koyu panele geçti, indirme
bağlantısı ve sürüm düzeni kuruldu.** Bu seansta çıkanlar:
- **Kurulum artık tek tıkla değil sihirbaz** (`kopru/package.json` → `nsis`,
  `kopru/kurulum/`). Kullanım koşulları sayfası, değiştirilebilir kurulum
  klasörü, bitiş sayfası. Kaldırırken "ayarlar da silinsin mi?" soruluyor,
  varsayılan **hayır** — yeni sürüm kurarken kasada tekrar şifre sorulmasın.
  Kurulum penceresinin kenar görseli ve üst şeridi **paketleme sırasında
  çiziliyor** (`paketle.js`); NSIS yalnız BMP kabul ettiği için BMP başlığı
  elle yazılıyor. Kurulum kullanıcıya yapılıyor (`perMachine: false`) —
  kasada yönetici şifresi sorulmuyor.
- **Köprü pencereleri koyu.** Ana programın açık zemini bırakıldı: köprü bir
  sayfa değil, kasada duran cihazın paneli. Durum penceresinin tepesinde tek
  cümlelik **nabız** satırı (ışık + "Fiş basmaya hazır" / "Sunucuya
  ulaşılamıyor"...); pencere kaymıyor, yalnız liste kendi içinde kayıyor.
  **Tepsi menüsü kendi sözlerimizi aldı** — ilk satır renkli ışıklı durum,
  sonra işletme·kod (tıklayınca kopyalanır), "Durum panelini aç", "Bu kasanın
  bağlantısını kes", "Köprüyü kapat".
- **Yazıcı programını indir bağlantısı** (`src/kopruIndirme.ts`,
  `components/KopruIndir.tsx`). Yazıcılar bölümünün **alt sekme şeridinin sağ
  ucunda**, beş sekmenin hepsinde. Adres hiçbir ekranda yazmıyor, tek dosyada
  duruyor: **alan adı henüz alınmadı** ve değişebilir. Dosya yayına girene
  kadar düğme sönük ve tıklanmıyor (`yayinda: false`) — kırık bağlantı
  göstermek olmamasından kötü. Karar: dosya **kendi alan adımızda** duracak;
  Supabase deposu elenmiş, çünkü indirme trafiği veritabanıyla aynı kotayı
  yiyor (~200 MB'lık dosya bedava planı 25 indirmede bitirir).
- **Tek sürüm numarası** (`surum.js`, `npm.cmd run surum`). Garso ile köprü
  aynı numarayı taşıyor; ayrı numaralar "kasadaki program hangi Garso ile
  uyumlu" sorusunu doğuruyordu. Numara beş dosyada birden değişiyor, elle
  yazılmıyor. Seans sonunda artırılıyor (kural CLAUDE.md'de). Garso'nun sürümü
  yan menüde işletme kodunun yanında.

1. **Köprünün kalan işleri:**
   a. **Köprü penceresinin tasarımı baştan** — 15 Ağu 2026'da pencereler koyu
      panele çevrildi, tepsi menüsü kendi sözlerimizi aldı, kurulum sihirbaz
      oldu. Yine de yeterli değil (Ramazan'ın notu): **bu programın tasarımı
      tamamen değişecek**, bugünkü hâl ara adım. İşleyişe dokunulmayacak.
   b. **Alan adı ve dosyanın yayınlanması** — bağlantı ekranda hazır, dosya
      henüz hiçbir adreste yok. Alan adı alınıp dosya yüklenince
      `src/kopruIndirme.ts`'te adres yazılıp `yayinda: true` yapılacak.
   c. **Cihaz anahtarı** — kasada personel şifresi durmasın; yalnız kuyruğa
      yetkili, iptal edilebilir cihaz anahtarı olsun.
   d. **Kod imzalama sertifikası** — Windows'un "bilinmeyen yayıncı" uyarısı
      kalkar; yıllık ücretli, satışa yaklaşınca.
   e. **Kendi kendini güncelleme** — yeni sürüm şu an kasalara elle gidiyor.
      Electron'un hazır altyapısı var, (b) ile birlikte düşünülecek.
2. **Mutfak ekranı (KDS)** — Faz 2'nin ikinci büyük modülü, o da turlanmamış
   (önce Adisyo turu, sonra plan).
3. **ÖKC ve arayan numara (CallerID)** — ikisi de köprünün üstüne biniyor.
4. **Yurt dışına açılırsa değişmesi gerekenler** — para birimi (₺ arayüzde sabit
   yazılı), tarih/saat biçimi (`tr-TR`) ve "KDV" teriminin kendisi. Bugünün işi
   değil, akılda dursun diye burada.

**Ödenmezler** 16 Ağu, **Kuver/Garsoniye** 17 Ağu 2026'da yapıldı.

**17 Ağu 2026:** **Kuver ve garsoniye bitti** (`sql/2026-08-17-kuver.sql`,
`src/servis.ts`).
- **Servis bedeli ürün değil, adisyonun kendi sütunu.** Sepete kalem olarak
  girseydi mutfağa düşer, ürün raporunda satır tutardı. `adisyonlar.kuver_tutar`
  ve `garsoniye_tutar` satış anında hesaplanıp yazılıyor; Analiz onları yeniden
  hesaplamıyor, **kasada ne yazdıysa onu okuyor**.
- **Tanım işletme ayarında** (`isletme_ayarlari`): tek ana anahtar + her ikisi
  için otomatik/ad/tip/değer. Ana anahtar **açık adisyon varken değiştirilemez**
  (KDV ayarındaki kural) — oturan müşterinin hesabına sonradan kuver binmesin.
- **Kuver kişi sayısıyla çarpılıyor** (tutar tipinde); misafir sayısı girilmemiş
  adisyona kuver yazılmıyor, uydurma "1 kişi" varsayılmıyor. Yüzde tipinde ikisi
  de indirim düşülmüş tutarın yüzdesi. **Üstlerine ayrıca KDV hesaplanmıyor.**
- **Otomatik ekleme yalnız masada**; gel al ve pakette oturan misafir yok, yetkisi
  olan elle ekliyor. Karar `kuver_uygula`/`garsoniye_uygula` sütunlarında:
  boş = ayarın dediği, true = elle eklendi, false = bu hesapta kaldırıldı. Ayarın
  otomatik olup olmamasından bağımsız durduğu için "bu masada kuver istenmedi"
  bilgisi kayboluyor değil.
- Sepet özetinde kendi satırları var; kaldırma ve geri koyma **yeni yetkiye**
  bağlı (`siparis.servis`). Tamamı ikram edilen adisyondan servis de düşüyor.
- **Ciroda masayı açana yazılıyor**: kuver belli bir ürünün değil masanın bedeli,
  kalemlere dağıtılsaydı hangi garsona yazılacağı keyfi olurdu. Personel
  ciroları toplamı özetteki ciroyu tutmaya devam ediyor.
- Masa birleştirme ve kalem taşımadan sonra tutar yeniden yazılıyor
  (`servisiTazele`): yüzdeli garsoniye sepet değişince eski rakamda kalmasın.

**16 Ağu 2026 (Faz 2 açıldı):** **Cari hesap ve ödenmezler bitti.**

*Cari hesap* (`sql/2026-08-16-cari.sql`, `src/cari.ts`, `/musteriler`):
- Üç tablo: `musteriler` (işletme içinde 1'den başlayan kendi numarası),
  `musteri_adresleri`, `cari_hareketler`. **Bakiye sütun değil** — hareketlerin
  toplamı (borç − alacak). İki yerde para tutulursa er geç birbirini tutmaz.
- Yeni yetkiler `cari.gor` · `cari.duzenle` · `cari.tahsilat` ("Cari" grubu).
  Garson yalnız görüyor: siparişi doğru kişiye bağlasın, parasına dokunmasın.
- **Müşteri detay kartı**: kalan bakiye tek büyük sayı, üç sekme (Hesap Ekstresi
  yürüyen bakiyeyle, Adisyonlar, Ödemeler). Adisyona bağlı satıra basınca
  Analiz'in adisyon detay penceresi açılıyor — pencere tek yerde duruyor.
- **Ödeme Al** ve **Bakiye Düzelt**. Düzeltmede sebep zorunlu, fark hareket
  olarak yazılıyor; bakiyenin kendisi hiçbir yerde ezilmiyor.
- **Satışa bağlandı:** açık hesap işaretli ödeme tipine basılınca müşteri
  soruluyor (Hızlı Öde ve Tahsilat paneli), borç `cari_hareketler`'e
  `tahsilat_id` ile bağlı yazılıyor — **tahsilat silinirse borç da düşüyor**.
- **Gel Al / Paket'te "kayıtlı müşteriden seç"**: ad, telefon ve varsayılan
  adres kendiliğinden doluyor (`adisyonlar.musteri_id`). Ad elle değiştirilirse
  bağ kopuyor, yoksa başkasının carisine sipariş yazılabilirdi.
- Analiz'e **Açık Hesap** sekmesi: borç ve tahsilat hareketleri ayrı tablolar.

*Ödenmezler* (`sql/2026-08-16-odenmezler.sql`, `src/odenmezler.ts`):
- `odenmezler` tablosu ve `/ayarlar/odenmezler`; **personele bağlanmıyor** —
  ödenmez yalnız çalışan olmuyor (ev sahibi, tedarikçi) ve ayrılanın geçmiş
  ikramları listede kalmalı. "Personelden aktar" tek yönlü kopyalama.
- İkram artık **kime yazıldığını soruyor**: `OnayModal`'a `odenmezler` özelliği
  eklendi, kalem ikramında ve adisyon ikramında aynı pencere. Seçim zorunlu
  değil — belirtilmeyen ikram "Belirtilmemiş" satırında toplanıyor, gizlenmiyor.
- `adisyon_kalemleri.odenmez_id`, `adisyonlar.odenmez_id`,
  `denetim_kayitlari.odenmez`. Adisyonun tamamı ikram edilince kalemlerin
  hepsine aynı kişi yazılıyor ki döküm tek yerden toplanabilsin.
- Analiz'e **Ödenmezler** sekmesi: kişi başına tutar ve pay, satır açılınca
  hangi üründen kaç adet.
- Yeni yetki `tanim.odenmez` — ikram yapabilen listeyi değiştirememeli, yoksa
  kendi adına satır açıp oraya yazardı.

**18 Ağu 2026:** **Excel aktarımı cari ve ödenmez tarafına yayıldı, tahsilat
fiş numarası kazandı.**

- **Ödenmezler Excel'i** (`src/odenmezler.ts`): No · Ad Soyad · Unvan · Listede
  Görünsün. Eşleştirme No → ad. Menüdeki gibi ayrı bir `aktarim.ts` açılmadı,
  dört sütun kendi modülüne sığdı.
- **Müşteri Excel'i** (`src/cari.ts`): Müşteri No · Ad · Soyad · Telefon ·
  Telefon 2 · Açık Hesap · Notlar · Aktif · Bakiye. Eşleştirme No → **telefon**
  → ad+soyad; telefon karşılaştırması yalnız rakamlar ve son 10 hane üzerinden
  (`+90 532…` ile `0532…` aynı kişi).
- **Karar: var olan müşterinin bakiyesi Excel'den değişmez.** Bakiye
  hareketlerin toplamı; tabloya yazılan rakam ekstredeki geçmişle tutmayan bir
  bakiye yaratırdı. Ama sessizce yok sayılmıyor — dosyada farklı yazılmışsa özet
  penceresi "şu müşterilerin bakiyesi değiştirilmeyecek" diye listeliyor.
  **Yeni müşteride** ise bakiye devreden borç olarak açılış hareketine yazılıyor;
  eski programdan liste taşımanın asıl ihtiyacı bu.
- Her iki ekranda da yazmadan önce **özet penceresi** (kaç yeni, kaç güncellenecek,
  kaç atlanan satır). Menüdeki tam sayfa özet paneli bu ekranlar için ağır kaçıyor;
  `OnayModal` yetti. `.onay-modal p` artık satır sonlarını koruyor.
- **Tahsilat fiş numarası** (`sql/2026-08-26-tahsilat-no.sql`):
  `cari_hareketler.fis_no`, sayaç `isletmeler.son_tahsilat_no`, numarayı
  tetikleyici veriyor — adisyon ve sipariş numarasıyla **aynı yol**. 9000'den
  başlıyor ki adisyon (3000'ler) ve siparişle (50000'ler) karışmasın. Yalnız
  tahsilat satırı numara alıyor: satışın adisyon numarası zaten var, düzeltme ve
  açılış müşteriye fiş verilen işlemler değil. Ödemeler sekmesinde **Fiş No**
  sütunu, ekstrede küçük "· Fiş 9001" notu, tahsilat alınınca bildirimde numara.
- **Eksik:** fişin yazıcıdan basılması. Numara var, fiş tasarımı yok.

**İkon seti:** `lucide-react`. 7 Ağu 2026'da **tüm ekranlar geçti** — düz
karakter simgesi (× ← ✓ ⌫ ⧉ ⇅ ✎) kalmadı. Bundan sonra her yeni düğme, başlık
ve durum işareti ikonuyla yazılıyor (karar 51).

## 1. TEKNOLOJİ KARARLARI
- **Veritabanı:** PostgreSQL 16 (para alanları `BIGINT` kuruş, asla float)
- **Backend:** Node.js + NestJS, REST + WebSocket (Socket.IO)
- **Frontend:** React + TypeScript, PWA (kasa, garson, mutfak aynı kod tabanı, rol bazlı arayüz)
- **Kimlik:** JWT + cihaz oturumu; kasa modunda PIN ile hızlı kullanıcı değişimi
- **Çoklu kiracı:** her satırda `tenant_id` + `branch_id`, Postgres Row-Level Security

## 2. VERİ MODELİ (çekirdek tablolar)

### Kiracı & Organizasyon
```sql
tenants        (id, ad, plan, olusturma)
branches       (id, tenant_id, ad, saat_dilimi, kasa_gunu_baslangic TIME)  -- gün sonu "kasa günü" mantığı
users          (id, tenant_id, ad, eposta, telefon, sifre_hash, pin_hash, aktif)
roles          (id, tenant_id, ad)                    -- Garson, Kasiyer, Müdür, Mutfak, Kurye...
permissions    (id, kod)                              -- 'siparis.ikram', 'odeme.indirim', 'rapor.gunsonu'...
role_permissions (role_id, permission_id)             -- granüler, işlem bazlı yetki
user_branch_roles (user_id, branch_id, role_id)
```

### Mekan
```sql
zones          (id, branch_id, ad, kisa_ad, sira)     -- salon/bahçe/teras
tables         (id, zone_id, ad, sira, aktif)
```

### Menü — 30 Tem 2026'da kuruldu, 1 Ağu 2026'da tamamlandı
```sql
kategoriler          (id, ad, renk, sira, ust_id NULL, satista_gorunur, mutfakta_gorunur)
urunler              (id, ad, kod UNIQUE*, kdv_id NULL, renk, favori, satista_gorunur, mutfakta_gorunur)
birimler             (id, ad UNIQUE, sira, varsayilan)  -- Tam, Yarım, Adet, Kg... porsiyon adının tek kaynağı
porsiyonlar          (id, urun_id, birim_id, fiyat, maliyet, barkod,
                      masa_fiyat, gelal_fiyat, paket_fiyat, varsayilan, sira)
urun_kategorileri    (urun_id, kategori_id, sira)     -- çoktan-çoğa + ürünün O kategorideki sırası
kdv_gruplari         (id, ad, oran, varsayilan, sira) -- en fazla 8 tanım
menu_gruplari        (id, urun_id, baslik, secilebilir_adet, sira)   -- kampanyalı menü
menu_satirlari       (id, grup_id, urun_id, porsiyon_id, miktar, ek_fiyat, varsayilan, sira)
secenek_gruplari     (id, ad, tekli, zorunlu, sira)   -- Servis, Şeker, Aroma...
secenekler           (id, grup_id, ad, ek_fiyat, sira)
porsiyon_secenek_gruplari(porsiyon_id, grup_id)       -- grup bir kez tanımlanır, PORSİYONA bağlanır
```
`ust_id` kategorinin kendine bağlı: boşsa ana kategori, doluysa alt kategori
(ağaç iki seviye). `sira` **kardeşler arasında** geçerlidir — ana kategoriler kendi
arasında, bir üstün altındakiler kendi arasında 1'den başlar.
`* kod` benzersizliği kısmi indeksle: `unique ... where kod is not null` — kodsuz
ürün serbest, kodlu ürünler çakışamaz. `urunler.sira` **silindi**; ürün sırası
artık kategori bazlı (`urun_kategorileri.sira`).
`fiyat` = tek fiyat (varsayılan). `masa_fiyat`/`gelal_fiyat`/`paket_fiyat` boşsa o
sipariş türünde tek fiyat geçerlidir — kural tek yerde: `menu.ts → porsiyonFiyat()`.

`kdv_gruplari` 3 Ağu 2026'da geldi: ürünün `kdv_id`'si boşsa **varsayılan işaretli
grup** geçerli — kural tek yerde: `menu.ts → urunKdv()`. `birimler.varsayilan` da
aynı mantık: yeni ürünün ilk porsiyonu **yıldızlı birim → yoksa "Tam" → yoksa
listedeki ilk birim** (`varsayilanBirim()`).

**Kampanyalı menü** = `menu_gruplari` dolu olan bir üründür; ayrı bir tablo değil.
Böylece fiyat, satış ve adisyon akışı normal üründen ayrışmıyor. Menünün satış
fiyatı tek porsiyonunda tutulur, maliyeti içeriğinden hesaplanır.

Kalıcı modelde ayrıca gelecek: `stations` (Mutfak/Bar/Nargile — KDS ve yazıcı hedefi), reçete.

### Satış Çekirdeği — Garso'nun kalbi
```sql
checks         (id, branch_id, tip ENUM('masa','paket','gelal'), table_id NULL,
                musteri_id NULL, kisi_sayisi, acan_user_id, acilis_ts, kapanis_ts,
                durum ENUM('acik','kapali','iptal'), not)
rounds         (id, check_id, user_id, ts)            -- sipariş turu: aynı adisyona her gönderim ayrı tur
check_items    (id, round_id, product_id, portion_id, adet NUMERIC(9,3),
                birim_fiyat_kurus BIGINT,             -- satış anındaki fiyat (fiyat değişse bile sabit)
                durum ENUM('bekliyor','hazirlaniyor','hazir','servis','iptal','ikram'),
                not, servis_grubu SMALLINT,           -- kurs sırası (1. servis, 2. servis)
                odenen_kurus BIGINT DEFAULT 0)        -- kalem bazlı ödeme takibi → ürün bazlı bölme
check_item_options (check_item_id, option_id, ek_fiyat_kurus BIGINT)
payments       (id, check_id, tip_id, tutar_kurus BIGINT, bahsis_kurus BIGINT,
                -- prototipte: kalemler jsonb { kalem indeksi: ödenen adet }
                -- kalıcı modelde payment_items ara tablosu olacak
                user_id, ts, iptal_mi BOOL, iptal_eden_id NULL, iptal_ts NULL)  -- silinmez, ters kayıt
payment_types  (id, branch_id, ad, sinif ENUM('okc','klasik'), acik_hesap_mi BOOL, sira)
discounts      (id, branch_id, ad, tip ENUM('yuzde','tutar'), deger)
check_discounts(id, check_id, discount_id NULL, tutar_kurus, user_id, ts)
audit_log      (id, tenant_id, user_id, eylem, hedef_tablo, hedef_id, detay JSONB, ts)
```
9 Ağu 2026'da adisyon düzeyi alanlar geldi: `adisyonlar.ad` (serbest ad — "Doğum
günü"), `kisi_sayisi`, `not_metni`; müşteri alanları (`musteri_ad`,
`musteri_telefon`, `adres`) artık masalı adisyonda da doldurulabiliyor. Bu alanlar
sipariş ekranının başlığından tek pencerede giriliyor ve sepetle birlikte
kaydediliyor — kaydetme çağrısı alanı taşımıyorsa sütuna dokunulmuyor.

**Tasarım ilkeleri:** (1) Hiçbir satış kaydı fiziksel silinmez; iptal/ikram durum değişikliği + audit_log. (2) `rounds` katmanı sayesinde mutfağa tur tur gönderim ve adisyonda zaman damgalı gruplama doğal olarak çıkar. (3) `check_items.odenen_kurus` sayesinde ürün bazlı hesap bölme ekstra tablo istemez.

### Cari, Kasa, Stok (Faz 1.5)
```sql
customers      (id, branch_id, ad, telefon, adres, bakiye_kurus BIGINT)  -- açık hesap
protokol       (id, branch_id, ad, unvan)                                 -- ödenmez kişiler
cash_sessions  (id, branch_id, acilis_ts, kapanis_ts, acilis_tutar, kapanis_tutar, user_id)
expenses       (id, branch_id, tip_id, tutar_kurus, aciklama, ts, user_id)
expense_types  (id, branch_id, ad)
wastages       (id, branch_id, product_id, adet, neden, sorumlu_user_id, ts)
stock_moves    (id, branch_id, urun/malzeme, tip ENUM('giris','sayim','satis_dusum'), miktar, ts, user_id)
```

## 3. GARSO EKRAN HARİTASI (web/masaüstü — kendi tasarımımız)

| # | Ekran | Garso'da adı | Bilinçli farklılaşma |
|---|---|---|---|
| 1 | Salon görünümü | **Salon** | Bölge sekmeleri yerine tek ekranda kaydırılabilir bölge blokları; masa kartında süre + tutar + garson tek satır rozet |
| 2 | Adisyon ekranı | **Sipariş** | Kategori şeridi solda dikey (dokunmatik dikey ergonomi); sepet sağda sabit; turlar otomatik ayrılmış |
| 3 | Ödeme | **Tahsilat** | Tek modal yerine sağdan açılan panel; "Hızlı Kapat" ve "Detaylı Tahsilat" tek panelin iki modu (Adisyo'da 2 ayrı akış) |
| 4 | Mutfak ekranı | **İstasyon** | Kanban kolonları: Yeni → Hazırlanıyor → Hazır (Adisyo liste, biz kanban) |
| 5 | Menü yönetimi | **Menü Stüdyosu** | İki sütun (sol kategori, sağ ürün); ürün düzenleme ayrı sayfa değil sağdan panel; panel içi bölümler katlanır |
| 6 | Tanımlar | **İşletme Ayarları** | Masa/bölge, vergi, istasyon, ödeme tipleri, garsoniye tek yerde gruplu |
| 7 | Ekip | **Ekip & Yetkiler** | Yetki matrisi rol × kategori ızgarası, hazır rol şablonları + kopyala |
| 8 | Raporlar | **Panorama** | Tek dashboard + derinleşen alt raporlar (gün sonu, ürün, personel, iptal/silme denetimi "Denetim" adıyla) |
| 9 | Cari | **Veresiye Defteri** | Müşteri + protokol tek modül, bakiye yaşlandırma göstergesi |
| 10 | Kasa | **Kasa Defteri** | Açılış/kapanış + gider + zayi tek akış |

**Gezinme (30 Tem 2026 kararı, 2 Ağu'da genişletildi):** Sol dikey şerit, daralt/genişlet düğmesiyle 80px ↔ 205px. Kapalıyken sadece ikon, açıkken ikon + yazı. Adisyo'nun içeriği karartıp kapatan 312px overlay çekmecesi kullanılmıyor — Garso'nun şeridi içeriği hiç kapatmaz. Sipariş ekranında şerit gizlenir (tam ekran odak).

**Kimlik farklılaşması:** Garso'nun kendi renk paleti — AYDINLIK TEMA (kesinleşti): krem zemin #faf7f2, kart beyazı #ffffff, mercan vurgu #ff7a59, yumuşak yeşil (onay) #2ecc9a, metin #2d3436, soluk metin #8a9296. Koyu tema kullanılmayacak (kullanıcı kararı), kendi ikon seti, kendi terminolojisi (Adisyon→Hesap/Check, Ödenmezler→Protokol, Özellikler→Seçenekler, Gün Sonu→Kasa Kapanışı).

## 4. MVP KAPSAMI (ilk çalışan sürüm)
1. Salon + masa yönetimi (aç/taşı/birleştir)
2. Sipariş: kategori/ürün/porsiyon/seçenek, tur sistemi, not, ikram/iptal (yetkili)
3. Tahsilat: hızlı kapat + ürün bazlı / 1-n / tutar bazlı bölme, çoklu ödeme tipi
4. Menü Stüdyosu (CRUD)
5. Ekip & granüler yetkiler, PIN ile hızlı geçiş
6. Kasa Kapanışı raporu (kasa günü mantığıyla) + Denetim raporu
7. Gerçek zamanlı senkron (salon ↔ sipariş ↔ istasyon)

## 5. GELİŞTİRME DURUMU (güncel — 30 Tem 2026)
- ✅ Kurulum: Node v24, Vite + React + TS (`Desktop/garso`), react-router-dom, @supabase/supabase-js
- ✅ Aydınlık tema (`index.css`), dosya düzeni: `pages/`, `components/`, `types.ts`, `ornekVeri.ts`, `supabase.ts`, `menu.ts`
- ✅ Salon: bölgeler + masa kartları, doluluk sayacı, açılış süre takibi, sayfa geçiş animasyonu
- ✅ Sipariş ekranı: kategori şeridi (sol dikey), ürün kartları, sepet (sağ sabit), porsiyon/seçenek penceresi, sepet özet
- ✅ İndirim modülü (`IndirimModal.tsx`): Tutar/Yüzde sekmeleri ayrı hafızada
- ✅ Tahsilat ekranı (`TahsilatPanel.tsx`): sağdan açılan geniş panel (820px), parçalı ödeme, tahsilat geçmişi + silme, 1/2-1/3-1/4 bölme, panel içi indirim
- ✅ İndirim tekleştirildi (29 Tem): tek `indirim` değeri, sipariş ekranı + tahsilat paneli ortak
- ✅ Ödeme tipleri veritabanından (`odeme_tipleri`): Nakit, Kredi Kartı, Multinet, Sodexo, Açık Hesap
- ✅ Yükleniyor çemberi (30 Tem): `.yukleniyor` + `.cember`, Supabase yanıtı gelene kadar (233–316 ms) dönüyor
- ✅ Ödendi rozeti düzeldi (30 Tem): `Tahsilat` tipine `kalemler?: Record<number, number>` eklendi
- ✅ Tahsilat paneli kaydırma çubuğu kaldırıldı, Alınan Ödemeler hizası düzeltildi (30 Tem)

### 30 TEMMUZ — GEZİNME
- ✅ **`Duzen.tsx`** eklendi: sol dikey şerit, daralt/genişlet, aktif sayfa mercan. Salon ve Menü Stüdyosu bu çerçeveye alındı.
- ✅ Menü yazıları soluk griden ana metin rengine çekildi (14→15px, weight 500) — okunurluk şikâyeti üzerine.

### 30 TEMMUZ — MENÜ STÜDYOSU
- ✅ **Ekran kuruldu:** iki sütun — sol kategori listesi (ürün sayacı, düzenle/sil), sağ o kategorinin ürünleri.
- ✅ **Kategori CRUD:** ekle / ad+renk düzenle / sil. 8 renkli palet. Dolu kategori silinemiyor.
- ✅ **Veri modeli yenilendi:** ürünler `kategoriler.urunler` jsonb'sinden çıkarılıp kendi tablosuna alındı; kategori bağlantısı çoktan-çoğa, seçenek grupları ortak tablo. Mevcut 14 ürün / 15 porsiyon / 3 grup SQL ile aktarıldı.
- ✅ **Ürün paneli (`UrunPaneli.tsx`):** sağdan kayan panel — ad, kart rengi (renksiz seçeneği dahil), favori, porsiyonlar (varsayılan yıldızı), çoklu kategori seçimi, seçenek grubu bağlama. Bölümler **katlanır** (porsiyonlar açık başlar) — panel kalabalık görünmesin diye.
- ✅ **Animasyon yumuşatıldı:** panel `cubic-bezier` ile sağdan kayıyor, sol kenarı yuvarlak + gölge; fon yumuşak açılıyor; alanlarda odak halkası; kategori penceresi hafif büyüyerek geliyor.
- ✅ Tarayıcı testi: kategori ekle/düzenle/sil, dolu kategori koruması, ürün paneli — hepsi doğrulandı.

### 31 TEMMUZ — SİPARİŞ EKRANI GERÇEK MENÜYE BAĞLANDI
- ✅ **`Siparis.tsx`** artık `ornekVeri.ts`'teki sabit menü yerine `menuGetir()` ile Supabase'den gerçek kategori/ürün/porsiyon/seçenek verisini çekiyor. Kategori şeridi ve ürün grid'i yeni veri modeline (`MenuKategori`/`MenuUrun`) göre çalışıyor; menü yüklenirken yükleniyor çemberi dönüyor.
- ✅ **`UrunSecim.tsx`** yeni ürün modeline göre yeniden yazıldı: porsiyon seçimi + çoklu/tekli seçenek grupları artık `menu.ts` verisinden geliyor. Bonus düzeltme: seçeneklerin ek fiyatı (`ekFiyat`) artık toplam fiyata doğru ekleniyor (eski statik menüde bu hesap yoktu).
- ✅ **Temizlik:** `ornekVeri.ts`'teki eski sabit `kategoriler` verisi ve kullanılmayan `Kategori`/`Urun` tipleri (`types.ts`) silindi. `bolgeler` verisi (Salon ekranı için) korundu.
- ✅ Tarayıcıda uçtan uca test edildi: kategori geçişi, tekli seçenekli ürün (Çay → Sıcak/Soğuk), çoklu porsiyon + çoklu seçenekli ürün (Natural Shisha → Double + Nane + Elma), sepete ekleme, kaydetme, Salon ekranında tutarın doğru yansıması — hepsi çalıştı.

### 31 TEMMUZ — SEÇENEK GRUPLARI, BUTON DÜZELTMELERİ, KENDİ MODAL SİSTEMİMİZ
- ✅ **Seçenek grubu yönetimi** eklendi: Menü Stüdyosu'nda "Kategoriler / Seçenek Grupları" sekmesi. Grup listesi (ad, tekli/çoklu, seçenek sayısı), yeni grup ekleme, gruba tıklayınca sağdan panel (ad, tekli/çoklu seçimi, seçenek satırları + ek fiyat, satır ekle/sil). `menu.ts`'e `grupKaydet`/`grupSil` eklendi.
- ✅ **Buton düzeltmeleri:** `UrunSecim.tsx`'teki "Ekle" butonu hiç stillenmemiş bir eski hataydı — mercan renkli ana buton stiline çekildi. Ürün/grup listesindeki sil butonu (`.ms-islem`) hover'da görünen, üründe hiç açılmayan bir eski hataydı — artık "Sil ×" olarak her zaman görünür. Ürün/grup düzenleme panellerine de ayrı, kırmızı kutulu belirgin bir "Sil" butonu eklendi (sadece mevcut kayıtta, yeni kayıt oluştururken görünmez).
- ✅ **Kendi modal sistemimiz:** `components/OnayModal.tsx` eklendi — onay (Vazgeç/Evet, tehlikeli işlemler kırmızı) ve uyarı (tek Tamam) için. Tüm `confirm()`/`alert()` çağrıları (kategori/ürün/grup silme onayları, dolu kategori/grup uyarısı, indirim/tahsilat tutar limiti uyarıları) buna taşındı. Kural: bundan sonra onay/uyarı gereken her yerde tarayıcı popup'ı değil, bu modal kullanılacak (`CLAUDE.md`'ye işlendi).

### 1 AĞUSTOS — ŞEMA TAMAMLANDI, BİRİMLER VE SİPARİŞ TÜRÜNE GÖRE FİYAT
- ✅ **Veritabanı tek seferde elden geçti:** `kategoriler.urunler` jsonb sütunu silindi;
  `birimler` tablosu kuruldu ve mevcut porsiyon adlarından (Tam, Single, Double...)
  otomatik dolduruldu; `porsiyonlar`'a `birim_id`, `barkod`, `masa_fiyat`,
  `gelal_fiyat`, `paket_fiyat` eklendi, artık gereksiz `ad`/`birim` metin sütunları
  silindi. (RLS bilinçli olarak kapalı — tüm tablolara birden kurulacak bir iş.)
- ✅ **Porsiyonun adı yok, birimi var:** `UrunPaneli`'nde porsiyon satırı serbest metin
  yerine birim açılır listesi. "Tam"/"tam"/"TAM" karmaşası şemadan çözüldü.
- ✅ **Sipariş türüne göre fiyat:** porsiyon satırının altında katlanır detay —
  maliyet, barkod ve Masa / Gel Al / Paket fiyat kutuları. Kapalıyken panel eskisi
  gibi sade; tek fiyatlı ürün hiç kalabalıklaşmıyor.
- ✅ **Menü Stüdyosu'na üçüncü sekme: Birimler.** Düzenlenebilir liste + tek Kaydet.
  Kullanımdaki birim silinmek istenirse kaç porsiyonda geçtiği söylenip engelleniyor.
- ✅ **`porsiyonFiyat(porsiyon, tur)`** (`menu.ts`) — fiyat kuralının tek kaynağı;
  Sipariş ekranı, `UrunSecim` ve Menü Stüdyosu hepsi buradan geçiyor. Paket/gel-al
  akışı gelince sadece `tur` parametresi değişecek, hesap kodu değişmeyecek.
- ✅ Tarayıcı testi (Ramazan): birim ekleme/silme koruması, porsiyon birim seçimi,
  paket fiyatı kaydı, sipariş ekranında masa fiyatının doğru gelmesi — hepsi çalıştı.

### 1 AĞUSTOS (2. seans) — SIRALAMA, KOPYALAMA, GÖRÜNÜRLÜK, ARAMA
- ✅ **Ürün sırası kategori bazlı oldu:** `urun_kategorileri.sira` eklendi,
  `urunler.sira` silindi. Bir ürün iki kategorideyse her birinde ayrı sırada
  durabiliyor. Filtreleme + sıralama tek fonksiyonda: `menu.ts → kategoriUrunleri()`
  — Sipariş ekranı ve Menü Stüdyosu aynı kaynaktan besleniyor.
- ✅ **`SiralamaModal.tsx`:** ayrı modalda sürükle-bırak + "A-Z" düğmesi.
  Sürükleme pointer olaylarıyla yazıldı (tarayıcının `draggable`'ı dokunmatik
  ekranda çalışmıyor — POS için şart). Kategori ve ürün ikisinde de aynı modal.
- ✅ **Ürün kopyalama:** porsiyon/kategori/seçenek grupları kopyalanıyor; kod ve
  barkod kopyalanmıyor (ikisi de benzersiz). Kopya kaynağın **hemen altına**
  giriyor, panel açılmıyor, kısa süre vurgulanıyor.
- ✅ **Ürün kodu** (`urunler.kod`) + kısmi benzersizlik indeksi. Çakışırsa panel
  kapanmıyor, uyarı çıkıyor (`urunKaydet` artık hata mesajı döndürüyor).
- ✅ **Görünürlük anahtarları:** ürün ve kategoride Satış/Mutfak ekranında göster.
  Satış anahtarı **gerçekten iş görüyor** — kapalı ürün/kategori sipariş ekranına
  hiç girmiyor. Menü Stüdyosu'nda `gizli` / `satışta gizli` işaretiyle görünüyor.
  Mutfak anahtarı saklanıyor, KDS gelince devreye girecek.
- ✅ **Seçenek grubunda "zorunlu":** `UrunSecim`'de seçim yapılmadan "Ekle" pasif,
  kırmızı "Önce seçilmeli: …" uyarısı, grup başlığında `zorunlu` rozeti.
- ✅ **`Anahtar.tsx`** (ortak aç/kapa anahtarı) ve **`RenkSecici.tsx`** (palet +
  kendi renk çemberimiz) eklendi. Renk seçimi iki panelde tekrar ediyordu, teke indi.
- ✅ **Kategori adı 25 karakter + canlı sayaç.**
- ✅ **Ürün arama:** ad **veya ürün kodu** ile; kapsam seçici **Bu kategori /
  Tüm kategoriler**. "Tüm kategoriler + boş arama" = tüm menü tek listede →
  "Tüm kategorileri görüntüle" maddesi ayrıca iş gerektirmeden kapandı.
- ✅ Uzun ürün adı kart taşırma hatası düzeltildi (Menü Stüdyosu'nda kesilir,
  Sipariş ekranında alta sarar — garson ne seçtiğini görmek zorunda).

### 2 AĞUSTOS — TOPLU DÜZENLEME TABLOSU
- ✅ **Menü Stüdyosu'na dördüncü sekme: Toplu Düzenle** (`TopluDuzenle.tsx`).
  Excel benzeri tablo: her satır bir **porsiyon**, ürün adı/kodu/kategorisi ve
  anahtarlar porsiyonlar boyunca birleşik hücrede (`rowSpan`). Düzenlenebilen
  alanlar: ürün adı, kod, birim, fiyat, maliyet, Masa/Gel Al/Paket fiyatları,
  satışta göster, mutfakta göster, favori.
- ✅ **Tek Kaydet, sadece değişenler yazılıyor** (`menu.ts → topluKaydet`).
  Dokunulan hücre kaydedilene kadar mercan çerçeveli duruyor; altta "N üründe
  değişiklik var" sayacı, yanında Vazgeç. 200 ürünlük menüde tek tuş 200 istek
  atmıyor.
- ✅ **Üst çubuk:** arama (ad/kod), kategori seçici, "A-Z" ve "Tür fiyatları"
  düğmeleri. Tür fiyatları kapalıyken tablo dar kalıyor.
- ✅ **`porsiyonlar.id` modele girdi** (`MenuPorsiyon.id`) — tek porsiyon satırını
  güncelleyebilmek için. *(Ürün panelindeki sil-yeniden yaz yöntemi 2 Ağu ikinci
  seansında kaldırıldı.)*
- ✅ **Kaydetmeden çıkış koruması:** `cikisKilidi.ts` — ekran kendini kaydediyor,
  `Duzen` sol menüden sayfa değiştirmeden önce soruyor. Sekme değişimi de aynı
  şekilde korunuyor.
- ✅ **`Bildirim.tsx`** (toast) eklendi: sağ altta yeşil ✓, ~2,6 sn sonra kendi
  kapanıyor. "3 üründeki değişiklik kaydedildi."
- ✅ **Doğrulamalar:** boş ürün adı, aynı ürün kodu iki üründe, aynı ürünün iki
  porsiyonunda aynı birim — hepsi kaydetmeden önce uyarıyla durduruluyor.

### 2 AĞUSTOS (2. seans) — SEÇENEKLER PORSİYONA TAŞINDI, MENÜ STÜDYOSU ÜST DÜZENİ
- ✅ **Seçenek grupları artık porsiyona bağlı:** `urun_secenek_gruplari` silindi,
  yerine `porsiyon_secenek_gruplari` kuruldu; mevcut bağlantılar her ürünün tüm
  porsiyonlarına kopyalanarak taşındı. Aynı ürünün "Tam" ve "Yarım" porsiyonu
  farklı seçenek taşıyabiliyor. Grup seçimi ürün panelinin altından çıkıp her
  porsiyonun katlanır detayına girdi; detay kapalıyken satırda "2 seçenek" rozeti.
- ✅ **Ürün kaydetme id bazlı oldu:** porsiyonlar silinip yeniden yazılmıyor,
  var olan güncelleniyor / yeni eklenen insert ediliyor / çıkarılan siliniyor.
  Zorunluydu — seçenek bağlantıları porsiyon id'sine asılı, eski yöntem her
  kayıtta hepsini uçururdu.
- ✅ **Seçenek sıralama:** grup panelinde "⇅ Sırala" → `SiralamaModal`. Sıra
  grup kaydedilirken yazılıyor, ayrı kaydetme adımı yok.
- ❌ **Seçenekte varsayılan işareti yapıldı ve geri alındı** (Ramazan'ın kararı):
  hazır seçili gelen seçenek, garsonun yoğun saatte asıl sorması gerekeni sormadan
  "Ekle"ye basmasına yol açıyor — zorunlu grup korumasını fiilen etkisiz kılıyordu.
  `secenekler.varsayilan` sütunu da düşürüldü.
- ✅ **Kuruşlu fiyat hatası düzeldi:** para kuralları `para.ts`'e alındı
  (`paraMetin`/`paraSayi`/`paraYaz`); `UrunPaneli` ve `TopluDuzenle` aynı kaynaktan
  besleniyor. Virgül de kabul ediliyor ("12,5" = "12.5").
- ✅ **Menü Stüdyosu üst düzeni:** dört ayrı kutu yerine tek sekme şeridi
  (`.ms-sekmeler`), başlığın altında sola dayalı, yazılar tek satır. Sekme sırası
  Kategori ve Ürünler → Toplu Düzenle → Seçenek Grupları → Birimler; ilk sekmenin
  adı artık yaptığı işi söylüyor. Toplu Düzenle'ye geçince sayfa genişliğinin
  1100→1500px atlaması kaldırıldı (tablo zaten kendi içinde yana kayıyor).
- ✅ Sol gezinme şeridi genişledi (66→80px, açıkken 190→205px); menü bağlantısının
  adı "Menü" değil **"Menü Stüdyosu"**.

### 2 AĞUSTOS (3. seans) — ALT KATEGORİ (KATEGORİ AĞACI)
- ✅ **`kategoriler.ust_id` eklendi** (kendine bağlı, boş olabilir). Ağaç iki
  seviye: ana kategori → alt kategori, daha derini yok. Kategori formunda
  "Üst kategori" açılır listesi; kendini ve altında kategori olanı seçemiyor.
- ✅ **Sıra kardeşler arasında** — `kardesSonSira()` ile yeni kayıt kendi
  seviyesinin sonuna giriyor; üst kategori değiştirilirse kayıt yeni
  kardeşlerinin sonuna alınıyor (eski sıra orada çakışırdı).
- ✅ **`menu.ts` yardımcıları:** `altKategoriler`, `kategoriAgaci` (liste sırası:
  her ana kategori + kendi altları; üstü silinmiş/gizlenmiş alt kategori kök
  sayılır), `agacUrunleri` (üst + altların ürünleri, tekrarsız).
- ✅ **Silme kuralı genişledi:** altında kategori olan kategori silinemiyor —
  "dolu kategori silinemez" kuralının aynısı.
- ✅ **Arayüz iki kez elendi.** Önce hepsi girintili tek liste (karışık), sonra
  ürünlerin üstünde "Tümü + alt kategori çipleri" şeridi (daha da karışık: çip
  içinde ✎/×, ikinci "kendi ürünleri" çipi, şeritte ayrı ⇅). İkisi de Ramazan
  tarafından reddedildi. Kalan çözüm: **alt kategoriler yalnızca üstü seçiliyken
  onun altında açılıyor**, yeni kavram yok — düzenleme/silme/sıralama eskisi
  gibi kendi satırında. Aynı desen sipariş ekranındaki kategori şeridinde de var.
- ✅ **Alt satırın görünümü:** daha dar kutu (girinti 18px, iç boşluk 7px, yazı
  13px, renk noktası 9px) + `↳` karakteri yerine CSS ile çizilmiş mercan dirsek
  (seçiliyken beyaz). Karakter yazı tipine göre kayıyordu.
- ✅ **Sıralama modalında A-Z düzeltildi:** uzun başlık ("… — alt kategori sırası")
  butonu eziyordu; buton artık daralmıyor, başlık alt satıra iniyor.

### 3 Ağu 2026 — KDV grupları, kampanyalı menü, birim varsayılanı
- ✅ **Birimlerde varsayılan işareti.** Yeni ürünün ilk porsiyonu listedeki ilk
  birimi alıyordu ("Double" gibi alakasız bir birim gelebiliyordu). Artık yıldızlı
  birim → yoksa "Tam" → yoksa ilk birim. Yıldıza tekrar basmak işareti kaldırıyor.
  Birimler kaydedilince bildirim çıkıyor (eskiden sessizdi).
- ✅ **KDV grupları** — `kdv_gruplari` tablosu, Menü Stüdyosu'nda KDV sekmesi
  (en fazla 8 tanım, yıldızlı olan varsayılan), ürün panelinde KDV seçimi ve
  Toplu Düzenle'de KDV sütunu. Silinen grubu kullanan ürünler varsayılana döner.
- ✅ **Kampanyalı menü** — `menu_gruplari` + `menu_satirlari`; Menü Stüdyosu'nda
  kendi sekmesi, sipariş ekranında şeridin tepesinde kendi maddesi ve seçim
  penceresi (yıldızlı seçim hazır gelir, ek fiyatlar toplanır, eksik seçimle
  eklenemez).
- ✅ **Ürün panelinde düzen değişti:** fiyat/porsiyon bölümü en üste alındı; kod,
  KDV, renk ve anahtarlar aşağı indi. Kategori seçimi çip yığını yerine katlanır
  ağaç oldu (panel açılırken kapalı, üstünde seçili alt kategori sayacı).
- ✅ **Hesap hataları düzeltildi (tarayıcıda test edilerek bulundu):** grupta
  "2 seç" yazsa bile yalnızca yıldızlı satır sayılıyordu; maliyet girilmemiş
  ürünlerde "₺0" yazıyordu; menü pahalıyken "kazanç ₺0" görünüyordu.
- ⚠️ **Sessiz hata dersi:** kategori seçimi kaldırılırken kaydedilen nesneden
  `kategoriIdler` düştü, `as MenuUrun` zorlaması da bunu derlemede gizledi —
  "Kaydet'e basınca hiçbir şey olmuyor" haline geldi. Tip zorlaması kaldırıldı.

### 3 Ağu 2026 (2. seans) — Excel'e aktar / Excel'den içeri al
- ✅ **Menü Stüdyosu'na "İçe/Dışa Aktar" sekmesi.** Gerçek `.xlsx` dosyası
  (`write-excel-file` / `read-excel-file`, ikisi de yalnız bu sekme açılınca
  yükleniyor — ana paket büyümedi). Önce CSV yapılmıştı; LibreOffice her açılışta
  içe aktarma penceresi sorduğu için xlsx'e geçildi.
- ✅ **Sütunlar:** Ürün No · Ana Kategori · Alt Kategori · Ürün Adı · Ürün Kodu ·
  Barkod · Birim · KDV Oranı · Fiyat · Masa · Gel-Al · Paket · Maliyet.
  Satır = ürün × kategori × porsiyon. Kampanyalı menüler tabloya girmiyor.
- ✅ **Ürün No = kimlik.** Adisyo'nun indirdiği dosyada aynı iş "entegrasyon kodu"
  sütunuyla yapılıyor (canlı hesaba bakılarak doğrulandı; Adisyo'nun boş
  şablonunda bu sütun yok, indirilen menüde var). Bu sütun sayesinde Excel'den
  ürün adı değiştirilebiliyor — yoksa program yeni ürün açardı.
  No boşsa sırayla ürün kodu → ürün adı; ad iki ürüne uyuyorsa satır atlanır.
- ✅ **Kategori Excel'den açılabiliyor** (Ramazan'ın kararı). Menüde olmayan ad
  yeni kategori olur, alt kategori de öyle. Yazım hatasına karşı onay ekranında
  "açılacak kategoriler" listesi var; liste yalnızca gerçekten yazılacak
  satırlardan çıkıyor.
- ✅ **Değişmemiş ürün yazılmıyor.** İlk hâlde tek fiyat için 17 ürün baştan
  yazılıyordu; `urunKaydet` ürün başına on küsur istek attığı için işlem
  dakikalarca sürüyordu. Artık dosyadaki hâli menüdekiyle birebir aynı olan
  ürün atlanıyor, özette "değişmemiş" sayısı gösteriliyor.
- ✅ **Çakışma kontrolü (A yolu).** Ürün birden fazla kategorideyse satırları da
  birden fazla; o satırlar farklı fiyat/ad/KDV söylerse ürün yazılmaz, çelişki
  satır numaralarıyla gösterilir. Alternatifler (tekrar satırını boş bırakmak,
  tek kategori göstermek, değişeni otomatik seçmek) tartışılıp elendi.
- ✅ **Silme tek yönlü:** dosyadan satır silmek ürünü/porsiyonu silmez, ama
  kategori bağını kaldırır — "ürünü bu kategoriden çıkar" demenin başka yolu yok.
- ✅ Yazma sırasında ilerleme çubuğu (kategoriler de birer adım), yazarken
  Vazgeç kapalı. Tablo sırası menü sırası: kategoriler soldaki listedeki
  sırayla, içlerinde ürünler kendi sırasıyla, kategorisizler en sonda.
- ⚠️ **Test durumu:** indirme, sıra, yeni kategori açma ve ilerleme çubuğu
  Ramazan tarafından denendi. Son eklenen çakışma kontrolü henüz denenmedi.

### 📌 SONRAKİ ADIMLAR
**Menü Stüdyosu'nda kalanlar (Adisyo paritesi hedefi):**
- ~~KDV grubu~~ ✅ 3 Ağu 2026 — tanım + ürüne bağlama. Fiyata uygulanması (KDV
  hariç anahtarı, tahsilatta döküm) ayrı madde olarak sıraya girdi.
- ~~Seçenek grubunun porsiyon bazına taşınması~~ ✅ 2 Ağu 2026 (2. seans).
  Reçete stok modülüne bırakıldı.
- ~~Menü/kampanya ürünü~~ ✅ 3 Ağu 2026 — kendi sekmesinde, indirimden hesaplanan
  fiyatla; sipariş ekranında seçim penceresiyle birlikte.
- Mutfak grubu alanı (anlamı KDS gelince oluşur)
- ~~**Toplu ürün işlemleri**~~ ✅ 2 Ağu 2026 — Toplu Düzenle sekmesi. KDV/mutfak
  grubu/stok sütunları o alanlar veri modeline girince eklenecek.
- ~~**Ürünleri Excel'e aktar / Excel'den içeri al**~~ ✅ 3 Ağu 2026 (2. seans) —
  İçe/Dışa Aktar sekmesi, gerçek xlsx, Ürün No kimliğiyle.

*(Sürükle-bırak sıralama, ürün kopyalama, ürün kodu, ürün arama, "tüm kategorileri
görüntüle" ve aktif/pasif ürün — 1 Ağu 2026 ikinci seansında tamamlandı.)*

**31 Tem 2026 — Adisyo Menü/Ürünler derin turunda çıkan yeni eksikler**
*(Tüm ⋮ menüleri ve kapalı anahtarlar açılarak bulundu. Ayrıntılı döküm: `pos-yol-haritasi.md` → "Menü/Ürünler Modülü — Derin Tur".)*

*Veri modelini etkileyenler (önce karar, sonra kod):*
- ~~**Sipariş türüne göre fiyat**~~ ✅ 1 Ağu'da yapıldı (tek fiyat + üç opsiyonel tür fiyatı).
- ~~**Birimler merkezi liste**~~ ✅ 1 Ağu'da yapıldı (`birimler` tablosu + Birimler sekmesi).
- ~~**Seçenek grubu bağlama porsiyon bazlı**~~ ✅ 2 Ağu (2. seans). Reçete, malzeme/stok tablosu gelene kadar bekliyor.
- ~~**Alt kategori (kategori ağacı)**~~ ✅ 2 Ağu (3. seans) — iki seviye, üstü
  seçiliyken açılan liste.
- **KDV grupları** — `{ ad, oran, varsayılan mı, sıra }`, en fazla 8 tanım.
- **Mutfak grubunda opsiyonel KDS aşamaları** (Pişirme / Paketleme) — İstasyon ekranındaki kanban kolonları sabit olamaz, gruba göre değişir.

*Arayüz eksikleri:*
- ~~Ürün ve kategoride **Satış / Mutfak Ekranında Göster**~~ ✅ 1 Ağu (2. seans)
- ~~Seçenek grubunda **"zorunlu"** anahtarı~~ ✅ 1 Ağu (2. seans)
- ~~Serbest renk girişi~~ ✅ 1 Ağu (2. seans) — hex yerine **kendi renk çemberimiz**
- ~~Kategori adında **karakter sınırı + sayaç**~~ ✅ 1 Ağu (2. seans)
- ~~Aramada **kapsam seçici**~~ ✅ 1 Ağu (2. seans)
- Kalan ürün anahtarları: **KDV hariç olsun**, **Özellik ve Porsiyon Otomatik Sorulsun**, **Stok takibi yap**
- Kategori bazlı **toplu işlem** modalı (kategorideki tüm ürünlere mutfak grubu / KDV / zorunlu seçim / stok / satılabilir uygulama)
- ~~Seçenek sıralama~~ ✅ 2 Ağu (2. seans). Seçenekte **varsayılan işareti bilinçli olarak yapılmadı** — gerekçe bölüm 6, karar 30.
- Ürün kartından **panele girmeden hızlı renk değiştirme**
- ~~**Menü/kampanya tanımı**~~ ✅ 3 Ağu 2026 — yapıldı; ayrıntı bölüm 6, kararlar 34-38.

**Sonra:**
- Sipariş ekranı eksikleri — arama, not, ikram/iptal, misafir sayısı, turlar
- Masa taşıma/birleştirme
- Performans: Supabase sunucu bölgesi, salon verisi önbelleği

**Kapsam notu:** Adisyo'nun tamamına göre kabaca yolun beşte birindeyiz. Hiç başlanmayanlar: paket/gel-al, KDS + yazıcılar, stok/reçete, kurye, veresiye, ekip & yetkiler, kasa defteri, raporlar, çoklu şube, entegrasyonlar. Hedef sıra: önce tek şubeli cafe döngüsü (salon → sipariş → tahsilat → menü → kasa kapanışı) tamamlanıp kendi işletmede Adisyo yerine kullanılabilir hale gelmek.

## 6. TASARIM KARARLARI (kod seviyesi)
1. **Bir adisyonun tek indirimi vardır.** Sipariş ekranından da tahsilat panelinden de aynı değer düzenlenir; ayrı "panel indirimi" kavramı yoktur. *(29 Tem 2026)*
2. **Tahsilat kaydı hangi kalemlerin ödendiğini de taşır** — tutardan geri hesaplama yapılmaz. *(29 Tem 2026 kararı, 30 Tem'de uygulandı)*
3. **Paneller kendi içinde kaydırılmaz.** Tahsilat gibi sabit yükseklikli panellerde içerik ekrana sığacak şekilde ölçülendirilir. *(30 Tem 2026)*
4. **Para sütunları hep sağa hizalı ve `tabular-nums`.** *(30 Tem 2026)*
5. **Gezinme sol sabit şerit, hamburger overlay değil.** Şerit daralıp genişler ama hep görünür ve içeriği kapatmaz. *(30 Tem 2026)*
6. **Ürünler kategoriden ayrı tabloda; bağlantı çoktan-çoğa.** Bir ürün birden fazla kategoride görünebilir; ikinci kez yazılmaz. *(30 Tem 2026)*
7. **Seçenek grupları ortak tanımlanır, ürüne bağlanır.** "Şeker" grubu bir kez yazılır, 20 ürüne bağlanır; bir yerden değişince hepsinde değişir. *(30 Tem 2026)*
8. **Her ürünün bir varsayılan porsiyonu vardır.** Tek fiyatlı ürün de "Tam" adlı tek porsiyonla temsil edilir — sipariş ekranı tek kural işletir. *(30 Tem 2026)*
9. **Dolu kategori silinemez.** Yanlışlıkla menü kaybını önler; önce ürünler taşınır veya silinir. *(30 Tem 2026)*
10. **Uzun formlarda bölümler katlanır.** Ürün panelinde porsiyon/kategori/seçenek blokları açılıp kapanır; varsayılan olarak yalnızca porsiyonlar açık. *(30 Tem 2026)*
11. **İngilizce ad alanı yapılmayacak.** Kullanıcının Adisyo'daki iki dilli menüsü deneme amaçlıydı, gerçek ihtiyaç değil. *(30 Tem 2026)*
12. **Kart listelerinde aksiyon simgesi hep görünür, etiketi üstüne gelince çıkar.** Ürün/grup kartlarında `⧉` ve `×` simgeleri her zaman duruyor; fareyle üstüne gelince simgenin üstünde küçük balonda adı beliriyor (kopyalama koyu, silme **kırmızı** — tehlike renkten anlaşılsın). Düzenleme panellerindeki kırmızı kutulu "Sil" butonu ise yazılı kalıyor. *(31 Tem 2026, 1 Ağu'da balon ipucuyla güncellendi)*
13. **Onay/uyarı için tarayıcının `confirm()`/`alert()`'i kullanılmaz.** Her zaman kendi `OnayModal.tsx` bileşenimiz kullanılır — stillenemeyen, siteye yabancı duran native popup'lar yasak. *(31 Tem 2026)*
14. **Porsiyonun adı yoktur, birimi vardır.** Porsiyon adı serbest metin değil, merkezi `birimler` tablosundan seçilir; aynı şeyin farklı yazımı (Tam/tam/TAM) şemadan engellenir. Kullanımdaki birim silinemez — dolu kategori kuralının aynısı. *(1 Ağu 2026)*
15. **Fiyat = tek fiyat + isteğe bağlı tür fiyatları.** Porsiyonda `fiyat` her zaman doludur; masa/gel al/paket sütunları boşsa tek fiyat geçerlidir. Fiyat okuma tek fonksiyondan geçer (`porsiyonFiyat`), ekranlar kendi kuralını yazmaz. *(1 Ağu 2026)*
16. **Menüyle ilgili her tanım Menü Stüdyosu'nda.** Adisyo birimleri ayrı sol menü maddesine koymuş; bizde sekme olarak aynı ekranda (Kategoriler / Seçenek Grupları / Birimler). Gezinme sığ kalıyor. *(1 Ağu 2026)*
17. **Nadir kullanılan alanlar katlanır detayda durur.** Porsiyon satırında maliyet, barkod ve tür fiyatları kapalı başlar; tek fiyatlı ürün ekleyen kullanıcı onları hiç görmez. *(1 Ağu 2026)*
18. **Ürün sırası kategori bazlıdır.** Sıra `urun_kategorileri.sira`'da; bir ürün iki kategorideyse her birinde ayrı yerde durabilir. Global `urunler.sira` silindi — iki sıra kaynağı olsaydı hangisinin geçerli olduğu belirsiz kalırdı. *(1 Ağu 2026)*
19. **Sıralama ayrı modalda yapılır, listeye gömülmez.** Liste satırına tıklamanın kendi anlamı var (kategori seçme, panel açma); sürüklemeyle çakışırsa yanlışlıkla sıra bozulur. Modalda ayrıca "A-Z" var. Sürükleme pointer olaylarıyla yazıldı — tarayıcının `draggable` özelliği dokunmatik ekranda çalışmıyor, POS'ta bu kabul edilemez. *(1 Ağu 2026)*
20. **Yeni gelen kayıt kısa süre vurgulanır.** Kopyalanan ürün kaynağının hemen altında beliriyor, açılma animasyonu + ~2 sn mercan halka alıyor; panel açılmıyor ki arka arkaya kopya çıkarmak akışı kesmesin. Aynı desen yeni kategori/birim eklemede de kullanılacak. *(1 Ağu 2026)*
21. **Benzersiz alanlar kopyalanmaz.** Ürün kopyalanırken kod ve barkod boş gelir; çakışan benzersiz alan sessizce kaydı düşürür. Çakışma olursa panel kapanmaz, kullanıcıya sebebi söylenir. *(1 Ağu 2026)*
22. **Renk seçimi kendi çemberimizle yapılır.** Kullanıcı hex kodu bilmek zorunda değil: `＋` kutusu bizim çizdiğimiz renk çemberini açar (açı = renk, merkeze uzaklık = canlılık, altında açıklık kaydırıcısı). Tarayıcının sistem renk penceresi kullanılmaz — `confirm()` yasağının aynı gerekçesi. *(1 Ağu 2026)*
23. **Görünürlük anahtarı gerçekten uygulanır.** "Satış ekranında göster" kapalıysa ürün/kategori sipariş ekranına hiç girmez; ama Menü Stüdyosu'nda `gizli` işaretiyle görünmeye devam eder — kullanıcı kapattığını unutup "ürünüm kayboldu" demesin diye. *(1 Ağu 2026)*
24. **Filtrelenmiş listede sıralama yapılamaz.** Arama açıkken veya "Tüm kategoriler" kapsamındayken ⇅ Sırala pasif — görünen sırayı kaydetmek gerçek sırayı bozardı. *(1 Ağu 2026)*
25. **Toplu düzenleme tablosunda bir satır = bir porsiyon.** Fiyat porsiyonda
   durduğu için satırın birimi porsiyondur; ürüne ait alanlar (ad, kod, kategori,
   anahtarlar) porsiyonlar boyunca birleşik hücrede tek kez görünür. Tablodan
   porsiyon **eklenip silinemez** — yeni porsiyon fiyat/varsayılan/barkod kararı
   gerektirir, o ürün panelinin işi. *(2 Ağu 2026)*
26. **Düzenlenirken para alanı metin olarak tutulur.** Her tuşta sayıya çevirip
   geri yazmak "12.5"in noktasını siliyor, kuruş girilemiyor. Taslakta metin,
   kaydederken sayı. Kural tek dosyada: `para.ts` (`paraMetin`/`paraSayi`/
   `paraYaz`); virgül de kabul edilir. *(2 Ağu 2026)*
27. **Kaydedilmemiş değişiklik varken sayfadan çıkış sorulur.** Ekran kendini
   `cikisKilidi.ts`'e kaydeder, sol menü geçmeden önce oraya bakar. Tek ortak
   kilit — sonraki ekranlar aynı yerden faydalanır. *(2 Ağu 2026)*
28. **Biten işlem bildirimle söylenir, onay modalıyla değil.** Sağ altta kendi
   kapanan `Bildirim.tsx`; "Tamam"a bastırmak akışı boşuna keser. Modal yalnızca
   karar ve uyarı için. *(2 Ağu 2026)*
29. **Seçenek grupları porsiyona bağlanır, ürüne değil.** Fiyat, barkod ve seçenek
   aynı yerde — porsiyonda — duruyor. Bunun bedeli, ürün kaydederken porsiyonların
   silinip yeniden yazılamamasıdır: bağlantılar porsiyon id'sine asılı, id her
   kayıtta değişemez. *(2 Ağu 2026)*
30. **Sipariş ekranında hiçbir seçenek hazır seçili gelmez.** "Varsayılan seçenek"
   yapıldı ve geri alındı: yoğun saatte hazır seçim, garsonun asıl sorması gerekeni
   sormadan "Ekle"ye basmasına yol açıyor ve zorunlu grup korumasını etkisiz
   kılıyor. Bir tıklık kazanç, yanlış giden siparişten ucuz değil. *(2 Ağu 2026)*
31. **Sekme değiştirmek sayfanın ölçüsünü değiştirmez.** Toplu Düzenle'ye geçince
   sayfa 1100→1500px genişliyordu, içerik ortalandığı için her şey kayıyordu. Geniş
   içerik kendi kutusunda yana kayar; çerçeve sabit kalır. *(2 Ağu 2026)*
32. **Kategori ağacı iki seviye ve aynı anda tek dal açık.** Alt kategoriler her
   zaman görünse liste uzuyor, ayrı bir çip şeridine alınsa yeni kavram (Tümü,
   kendi ürünleri, çip içi düzenleme) geliyordu — ikisi de denendi, ikisi de
   karışık bulundu. Şimdi yalnızca **seçili kategorinin** altları girintili
   açılıyor; düzenleme, silme ve sıralama satırın kendi yerinde kalıyor. Ekranda
   yeni hiçbir öğe yok, sadece bir satır grubu açılıp kapanıyor. *(2 Ağu 2026)*
33. **Menü Stüdyosu'nda her satır kendi ürünlerini gösterir; sipariş ekranında üst
   kategori altındakileri de gösterir.** Menüyü düzenlerken karışık liste sırayı
   bozar (sıralama tek kategoride yapılabiliyor); satış yaparken ise garson tek
   dokunuşta hepsini görmeli. Kategori satırındaki sayı da listelenen ürün
   sayısıyla birebir aynı — sayı 24 deyip liste 6 ürün göstermez. *(2 Ağu 2026)*

34. **Kampanyalı menü ayrı bir sekmede yönetilir, ürün panelinde değil.** Önce
   ürün paneline "Menü içeriği" bölümü olarak yapıldı; panel şişti ve normal ürün
   düzenlerken göz yoruyordu. Menü ayrı bir kavram olduğu için Menü Stüdyosu'nda
   kendi sekmesine alındı (sol liste + sağ düzenleme). Ürün paneli eski sadeliğine
   döndü. *(3 Ağu 2026)*
35. **Kampanyalı menünün kategorisi yoktur.** Satış ekranında kategori şeridinin
   en üstündeki kendi maddesinde duruyor; ayrıca bir kategoriye bağlansa aynı şey
   iki yerde görünürdü. Hiç kampanya yoksa madde de görünmez. Aynı sebeple
   kampanyalar Toplu Düzenle tablosuna da girmiyor. *(3 Ağu 2026)*
36. **Kampanya fiyatı elle girilmez, indirimden hesaplanır.** Menü kurulduktan
   sonra yüzde ya da tutar olarak indirim girilir; satış fiyatı = içeriğin normal
   toplamı − indirim. İndirimsiz ya da normal toplamdan pahalı menü kaydedilemez —
   kampanya tanımı gereği ucuz olmalı. Karşılaştırma "tipik seçim" üzerinden
   yapılır: her gruptan önce yıldızlılar, sayı yetmiyorsa kalan satırlar
   (`grubunVarsayilanSecimi()`). *(3 Ağu 2026)*
37. **Menü içine menü konulamaz.** İçerik listesinde kampanyalı menüler ve ürünün
   kendisi görünmez; iç içe menü fiyat ve maliyet hesabını belirsizleştirirdi.
   *(3 Ağu 2026)*
38. **Bilinmeyen maliyet 0 değildir.** İçerik ürünlerinde maliyet girilmemişse
   özet kutusunda "₺0" değil "—" gösterilir ve menüye maliyet yazılmaz; 0 yazmak
   "maliyetsiz ürün" gibi okunup kâr raporunu bozardı. *(3 Ağu 2026)*

39. **Kapanan adisyon silinmez, `durum = kapali` olur.** Gün sonu, ciro ve denetim
   raporlarının tek dayanağı bu. Adisyon artık `adisyonlar` / `turlar` /
   `adisyon_kalemleri` / `tahsilatlar` tablolarında duruyor; masada tek açık
   adisyon kuralını kısmi tekil indeks (`where durum = 'acik'`) zorluyor.
   *(6 Ağu 2026)*
40. **Her kalemin kendi kimliği vardır.** Sepetten çıkarma, tahsilatta "hangi
   kalem ödendi" ve kalem işlemleri hep bu kimliğe bağlı — sıra numarasına
   bağlıyken araya kalem girip çıkınca işaretler kayıyordu. Ekranda yeni açılan
   kalem negatif geçici kimlik taşır, kayıtta gerçeğiyle değişir. *(6 Ağu 2026)*
41. **Yeni gelen kalemler kendi turuna yazılır.** Kaydetme sırasında var olan
   kalemler yerinde güncellenir, yalnız yeniler yeni tura girer; kimlikler
   korunsun ve "ne zaman ne söylendi" kaybolmasın diye. *(6 Ağu 2026)*
42. **İkram ve iptal kalemi silmez.** İkisi de adisyonda görünür (iptal üstü
   çizili, ikram soluk), tutarları ara toplama ve KDV dökümüne girmez, tahsilat
   listesinde etiketli ve tıklanamaz durur. İptal geri alınabilir. *(6 Ağu 2026)*
43. **Kalem işlemi adedin bir kısmına uygulanabilir.** "2 salebin biri ikram"
   deyince satır ikiye bölünür; adedi panelin kendi Adet alanı belirler, ayrı bir
   "işlem adedi" alanı yoktur (denendi, fazladan kavram olarak reddedildi).
   Durum geri alınınca satırlar tekrar birleşir — ödemesi işlenmiş kalem hariç.
   *(6 Ağu 2026)*
44. **Adisyon ödeme bitince kendiliğinden kapanmaz.** Kalan sıfırlanınca tahsilat
   panelindeki düğme "Adisyonu Kapat"a döner; kapatma kararı kullanıcınındır.
   Önce otomatik kapanıyordu, Ramazan tarafından reddedildi. *(6 Ağu 2026)*
45. **Alt kategoriler kendiliğinden açılmaz.** Hem satış ekranında hem Menü
   Stüdyosu'nda kategori kutusunun sağ ucundaki mercan okla açılır, aynı anda tek
   dal açık kalır. 32 numaralı kararın "seçili kategorinin altları açılır" kısmı
   bununla değişti — seçmek ile açmak ayrı işler. *(6 Ağu 2026)*
46. **Seçili kategori mercan dolguludur.** Satış ekranı ve Menü Stüdyosu aynı
   görünümü kullanır; dolgu üstünde kategorinin kendi renkli kenarlığı kalkar,
   ok beyaza döner (mercan üstünde mercan ok kayboluyordu). *(6 Ağu 2026)*
47. **Açıklama metinleri soluk küçük punto değil, ikonlu kutudur.** Ortak
   `Bilgi.tsx`: yuvarlak "i" ikonu + normal punto, normal renk. Eski `.ipucu`
   sınıfı tamamen kaldırıldı. Arayüz metni ürünü satın alacak işletmeciye
   yazılır; okunmayacak kadar soluk yazı profesyonel durmuyor. *(6 Ağu 2026)*
48. **Silik yazı hiçbir ekranda kullanılmaz.** İkincil metin de okunur tonda
   (`--soluk: #6b7578`); gövde 14px'in, başlık 17px'in altına inmez, 12px altı
   punto yok. Ramazan'ın tekrar eden şikâyeti buydu: "bundan sonra asla silik
   yazı görmek istemiyorum". Kural CLAUDE.md'ye de yazıldı. *(6 Ağu 2026)*
49. **Yazı tipi Poppins, pakete gömülü.** `@fontsource/poppins` ile geliyor,
   Google Fonts'tan çekilmiyor — kasa çevrimdışıyken de yazı tipi doğru
   görünmeli. Sistem fontu (`Segoe UI`) sert ve dar duruyordu. *(6 Ağu 2026)*
50. **Ana ekranlarda tek vurgu rengi: mercan.** Bölgelere pastel renk verip
   masaları o renge boyama denemesi reddedildi ("çok çirkin, kendi rengimizi
   kullan"). Renk seçici yalnızca kategori/ürün gibi kullanıcının kendi
   etiketlediği yerlerde kalır. Salonda dolu masa dolgun mercan, boş masa
   beyaz — durum farkı renk yoğunluğundan okunur. *(6 Ağu 2026)*
51. **Her düğme, başlık ve durum işareti ikon taşır.** `lucide-react`; düz
   karakter simgeleri (× ← ✓ ⌫ ⧉ ⇅ ✎) kullanılmaz. İkon yazının soluna gelir,
   hizalama `index.css`'te "İkonlu düğmeler" bölümünde toplu durur — her düğmeye
   ayrı yazılmaz. Kullanıcının kendi tanımladığı kayıtlarda (ödeme tipleri) sabit
   liste olmaz: ada bakıp eşleştirilir, tanınmayan için nötr varsayılan verilir
   (`src/odemeIkon.tsx`). Kayıtlı bir kaydı silen düğme çöp kutusu, formdaki
   kaydedilmemiş satırı çıkaran düğme X. *(7 Ağu 2026)*
52. **Salon planı bölge bazlı ve işletmecinin açtığı bir seçenektir.**
   `bolgeler.plan_modu` varsayılan kapalı; masaya konum yazılmış olması tek başına
   görünümü değiştirmez. Ayarlardaki plan görünümü bir çalışma tezgâhıdır, düzen
   çizilir ve beğenilirse anahtarla yayına alınır. Kapalıyken masalar ızgarada
   dizilir. *(7 Ağu 2026 — Ramazan planı otomatik açılınca "masalarım neden
   bozuldu" dedi; karar kullanıcının olmalı.)*
53. **Masa birleştirme ve adisyon aktarma tek maddedir.** Adisyo'da "Masaları
   Birleştir" ve "Adisyon Aktar" ayrı iki menü maddesi ama ikisi de aynı işi
   yapıyor; Garso'da menü iki satır: "Masayı taşı" (boş masaya) ve "Adisyonu
   birleştir" (dolu masaya). *(7 Ağu 2026)*
54. **İkram ve iptal anahtar değil, düğmedir.** Kalem panelinde basar basmaz
   uygulanır; "Uygula" yalnız adet, fiyat, porsiyon ve notu yazar, kalemin
   durumuna dokunmaz. Geri alma da kendi düğmesiyle. *(7 Ağu 2026)*
55. **Panelde tek açıklama satırı durur.** Kalem panelinde üç bilgi kutusu üst
   üste diziliyordu, panel ders kitabına dönüyordu. Duruma göre en gerekli olan
   tek kutu çıkar, hiçbiri geçerli değilse hiç çıkmaz. *(7 Ağu 2026)*
56. **Masa kartı sabit boyutludur ve ödeme durumunu renkle anlatır.** Kart
   yüksekliği 130px'e sabitlendi; içerik değiştikçe kartların boyu oynuyor,
   ızgara satır satır kayıyordu. Düzen her dolu masada aynı: üstte garson adı,
   altında masa adı + süre rozeti (saat ikonlu, her masada var), en altta
   **Toplam / Ödenen / Kalan** üç sütunu — ödeme alınmamış masada da aynı üç
   sütun durur, rakam ₺0 olur. Tahsilat tamamlanmışsa son sütun "Ödendi" olur.
   Renkler trafik lambası mantığında: **yeşil** hiç ödeme yok, **sarı** kısmi
   ödeme, **kırmızı** tamamı ödendi (kalkması bekleniyor). Yazılar siyah, tek
   değişkenden (`--kart-yazi`) geliyor. *(7 Ağu 2026 — geçici karar, proje
   sonunda palet bütününde yeniden değerlendirilecek.)*
57. **Hızlı Öde ayrı ve sade bir akıştır.** Kalem seçimi ve numpad yok: tutar
   kutusu (boşsa kalanın tamamı), indirim kısayolu, "Öde ve kapat / Öde, açık
   kalsın" seçici ve ödeme tipi kartları. Tutar kalanı kapatmıyorsa "kapat"
   seçili olsa bile adisyon kapanmaz — yarım ödemeyle masa kapanırsa kalan
   kaybolur. Hepsi eklenirse Öde ekranının kopyası olacağından bilinçli olarak
   sınırlı tutuldu. *(7 Ağu 2026)*

58. **Bahşiş ödemenin kendi satırında durur.** Ayrı tahsilat kaydı açılmıyor;
   `tahsilatlar.bahsis` sütunu hangi ödemeyle (nakit mi kart mı) geldiğini de
   saklıyor. Tahsilata kalanın kendisi yazılır, üstü bahşişe gider — böylece
   kalan hiç eksiye düşmez. *(8 Ağu 2026)*
59. **Ödeme düğmesinin yazı rengi zeminden hesaplanır.** Renk işletmecinin
   seçimi; yazı varsayılan siyah, yalnız siyah/füme/koyu gri gibi çok karanlık
   zeminlerde beyaza döner (`renk.ts`, parlaklık eşiği 90). *(8 Ağu 2026)*
60. **1/n ve indirim seçime göre davranır, yeni düğme açmaz.** Ürün seçiliyse
   aynı düğmeler seçili ürüne, seçim yoksa hesabın tamamına uygulanır; düğmenin
   üstündeki başlık hangisinde olduğunu söyler. Kalem payı kesirli tutulur,
   kuruş artığı son ödeyene kalır. *(8 Ağu 2026)*
61. **Gel Al ve Paket, salonun kendi dilinde durur.** Adisyo bunları ayrı ekrana
   ve sol kısayola koymuş; Garso'da bölge şeridinin sonunda sabit bir sekme ve
   masa kartıyla aynı düzende sipariş kartları var — garson ekran değiştirmiyor.
   Müşteri alanları isteğe bağlı, paket siparişte ödeme tipi baştan zorunlu
   değil. *(8 Ağu 2026)*

62. **Paket ve Gel Al iki adımda açılır.** Salon şeridinde sekme bölgelerden
   ayrı, en sağda durur. Sekmeye basınca liste değil iki büyük kart gelir
   (Paket / Gel Al, açık sipariş sayısıyla); türün içine girilince sipariş
   listesi ve "Yeni sipariş" çıkar. Tür karttan belli olduğu için yeni sipariş
   penceresinde tür seçici yok, yalnız düzenlemede var. *(9 Ağu 2026)*
63. **Salon sekmesi tarayıcıda saklanır.** Masaya girip dönünce veya sayfa
   yenilenince garson kendini başka bölgede bulmuyor; kayıtlı bölge silinmişse
   ilk bölgeye düşülür (`localStorage: salon.sekme`). *(9 Ağu 2026)*
64. **KDV dahil/hariç işletme geneli tek ayardır.** `isletme_ayarlari` tek
   satırlık tablo; ayar bir kez okunup önbellekte tutulur, hesaplar senkron
   çalışır. Açık adisyon varken değiştirilemez — tutarları kaydırırdı. Sonraki
   genel ayarlar (kuver, servis bedeli) aynı satıra sütun olarak girecek.
   *(9 Ağu 2026)*
65. **İndirim tutarıyla birlikte kaynağı da saklanır.** Ön tanımlı indirimler
   `indirim_tanimlari` tablosunda; uygulanınca adisyona/kaleme `indirim_tanim_id`
   ve `indirim_ad` yazılır. Ad da yazılıyor ki tanım sonradan silinse bile eski
   adisyon hangi indirimi aldığını unutmasın — rapor buradan çıkacak.
   *(9 Ağu 2026)*
66. **Ayar ekranları satır düzenindedir.** Her ayar için ikon başlıklı ayrı kart
   değil; tek kart içinde ince çizgiyle ayrılmış satırlar — solda mercan başlık
   ve tek cümlelik karşılığı, sağda kumandası. İki şıklı seçimler sayfayı
   kaplayan iki blok değil, kendi genişliği kadar duran segment
   (`.mod-sec.kompakt`). *(9 Ağu 2026)*
67. **Turlar adisyonda saatiyle görünür.** Sepette tur değişince "2. tur · 14:55"
   başlığı girer (tek turlu adisyonda çıkmaz). Aynı ürün ikinci turda tekrar
   istendiyse satırlar birleşmez ve kaydedilmiş tura eklenmez — hangi partide ne
   geldiği kaybolmasın. Kaydedilmemiş kalemler listenin **başında** "Yeni"
   başlığı altında durur, kaydedilince kendi turuna, sona geçer. *(9 Ağu 2026)*
68. **Ekranda görünen her tutar kuruşludur.** Tek biçimlendirici
   (`para.ts → paraGoster`): "₺1.110,00". Toplam ile döküm arasında biçim farkı
   olmuyor. *(9 Ağu 2026)*

69. **Yetki role verilir, kişiye istisna tanımlanır.** Temel her zaman rolden
   gelir; `personel_yetkileri` yalnızca "bu kişide farklı olsun" denen satırları
   tutar (`izin = true` verildi, `false` alındı). Kayıt yoksa rol geçerli.
   Adisyo'da bu katman yok — bizim farkımız. *(12 Ağu 2026)*
70. **Roller ve yetkiler hazır dolu gelir.** Kurulumda 6 rol (Yönetici, Müdür,
   Kasa, Garson, İstasyon, Kurye) ve her rolün makul yetkileri yüklü geliyor;
   işletmeci boş matrisle karşılaşmıyor, gerekmeyenin tikini kaldırıyor. Hazır
   yetki yalnızca **hiç yetkisi olmayan** role yazılır, elle yapılan ayar
   bozulmaz. *(12 Ağu 2026)*
71. **Personel silinmez, pasifleştirilir.** Geçmiş adisyonlar personele bağlı
   kaldığı için "Personel listesinde görünsün" kapatılır; Sil düğmesi yalnız
   yanlış açılmış kayıt için var ve onay penceresi doğru yolu hatırlatır.
   *(12 Ağu 2026)*
72. **Telefon giriş bilgisidir: zorunlu ve benzersiz.** Yalnız rakam olarak
   saklanıyor ("0555 111 22 33" = "05551112233"), iki personelde aynı numara
   olamaz. Şifre de zorunlu; en az 6 karakter, harf + rakam, yaygın şifre değil
   (NIST çizgisi: uzunluk esas, karmaşıklık dayatması değil). Şifre ve PIN
   veritabanına SHA-256 özetiyle yazılıyor. *(12 Ağu 2026)*
73. **Mutfak değil "İstasyon".** Mutfağın yanı sıra bar, tatlı, ızgara gibi
   hazırlık noktalarını da kapsıyor; Adisyo'nun "Mutfak" adı bu ekipleri
   dışarıda bırakıyordu. *(12 Ağu 2026)*
74. **Uzun tabloda başlıklar ve kaydetme yerinde durur.** Yetki matrisi kendi
   çerçevesinde kayıyor: görev sütunları üstte, işlem adı solda sabit.
   Kaydetme, sayfa altında beliren şeritte (Geri al + Kaydet) — kaydetmek için
   başa dönmek gerekmiyor. *(12 Ağu 2026)*
75. **Programa giriş her zaman şifreyledir; PIN yalnızca kilit ekranında
   çalışır.** PIN kapalı programı açan bir anahtar değil, zaten açık olan
   oturumun içinde kimin çalıştığını değiştiren kısayoldur. Böylece "bu PIN
   hangi işletmenin personeline ait" sorusu hiç doğmuyor — oturum zaten bir
   işletmeye ait. Adisyo'nun kasa modeli de bu (giriş e-posta/telefon + şifre,
   ayrıca Kilit Ekranı). Mobilde kilit ekranı yok: kişisel cihaz, telefonun
   kendi kilidi yeterli. *(13 Ağu 2026)*
76. **Kilit ekranında oturumu kapatma yoktur.** Garson kilidi aşıp oturumu
   düşürmesin; çıkışı, kilidi kendi PIN'iyle açan yönetici yan menüden yapar.
   *(13 Ağu 2026)*
77. **Kilit oturumu kapatmaz, üstünü örter.** Açık adisyonlar ve ekranın
   bulunduğu yer korunur; kilit tarayıcıya yazıldığı için sayfa yenilense de
   kalkmaz. *(13 Ağu 2026)*
78. **Giriş alanı tektir: telefon veya e-posta.** İçinde `@` varsa e-posta
   olarak aranıyor (harf duyarsız), yoksa telefon. Kullanıcıya "hangisini
   giriyorsun" sorulmuyor. "Beni hatırla" işaretsizse oturum sekmeyle birlikte
   biter. *(13 Ağu 2026)*
79. **Çok işletmeli yapı satıştan önce değil, şimdi kuruluyor.** Her tabloda
   `isletme_id` var (`yetkiler` hariç — o sistemin ortak tanımları). Gerekçe:
   uygulama büyüdükçe geçiş maliyeti artıyor, kasa ve raporlar en baştan doğru
   yazılsın. Satır güvenliği (RLS) tek başına yetmiyor; anonim anahtarla
   bağlanan istemcide gerçek kimlik doğrulama şart. *(13 Ağu 2026)*
80. **Personel numarasıyla giriyor, kimlik perde arkasında e-posta.**
   Supabase Auth e-posta ile çalışıyor, telefon yolu SMS servisi ve masraf
   istiyor. Numaradan adres üretiliyor: `05551112233@garso.app`. Kullanıcı bu
   adresi hiç görmüyor; gerçek e-postası olan onunla da girebiliyor
   (`eposta_hesabi`). Numara değişirse hesap adresi de güncelleniyor. *(13 Ağu 2026)*
81. **Hesabı yönetici açar, personel kendi şifresini belirlemez.** Personel
   ekranında telefon ve şifre zaten giriliyor; kaydedince `personel_hesabi_yaz`
   hesabı açıyor veya güncelliyor. Yetki denetimi veritabanında
   (`tanim.personel`); tek istisna ilk kurulumda ilk hesabın açılması.
   *(13 Ağu 2026)*
82. **Kilit ekranında kişi değişir, kimlik bileti değişmez.** Auth oturumu
   kasayı açan hesapta kalıyor, PIN'le geçen kişi uygulama katmanında tutuluyor
   — ortak terminalin çalışma şekli bu. "Kim yaptı" kayıtları bu kişiye
   yazılacak. *(13 Ağu 2026)*
83. **Yetkisiz işlemin düğmesi hiç görünmez.** Gri düğme veya "yetkin yok"
   uyarısı yerine düğme ekrandan kalkıyor; müdür PIN'i isteyen onay penceresi
   fikri de elendi. Gerekçe: kasadaki kişi yapamayacağı işle hiç karşılaşmasın,
   müdür gerekiyorsa zaten kendi PIN'iyle geçiyor. *(14 Ağu 2026)*
84. **Yeni satır ile kaydedilmiş satır ayrı şey.** Kaydedilmemiş kalem
   (kimliği negatif) yanlış dokunuşun kendisidir — mutfağa da hesaba da
   gitmedi, herkes çıkarabilir. Kaydedilmiş kalemi çıkarmak satışa müdahaledir,
   `siparis.urun_cikar` istiyor. Aynı düğme, iki farklı anlam. *(14 Ağu 2026)*
85. **Yetki kontrolü rotanın önünde, tek listede.** Menüden gizlemek koruma
   değil: adres elle yazılabiliyor, kişi değişince tarayıcı öncekinin
   sayfasında kalıyor. `src/rotaYetkileri.ts` hem menünün ne göstereceğini hem
   hangi sayfanın açılacağını belirliyor; kapı `App.tsx`'te, sayfa hiç
   kurulmadan çeviriyor. `/ayarlar` için taban kural var — sonradan eklenen bir
   ayar ekranı listeye yazılmayı unutulsa bile korumasız kalmıyor.
   *(14 Ağu 2026)*
86. **Yeni satırın işletmesini kod değil veritabanı yazıyor.** `isletme_id`
   varsayılanı `oturum_isletmesi()`. 25 tablonun her ekleme noktasını tek tek
   düzeltmek yerine kural tek yerde; unutulan bir yer hatalı işletmeye
   düşemiyor. *(14 Ağu 2026)*
87. **Telefon bütün sistemde tek, PIN işletme içinde tek.** Giriş adresi
   numaradan üretildiği için iki işletmede aynı numara olamaz — kontrol satır
   güvenliğini aşan `telefon_kullanimda()` fonksiyonundan geçiyor. PIN ise
   yalnız kendi kasandaki kişiyi seçtiği için işletme içinde tek olması yeterli.
   *(14 Ağu 2026)*
88. **İşletme parametreleri tek tek kaydediliyor, altta "Kaydet" şeridi yok.**
   Her satır kendi başına anlamlı bir açma/kapama; dokununca kaydediliyor ve
   ne olduğunu söyleyen bir bildirim çıkıyor ("Paket kapatıldı"). Onay sorusu
   sorulmuyor — yanlış basan tekrar basıp geri alıyor. *(14 Ağu 2026)*
89. **Misafir sayısı zorunluysa soru masaya girer girmez çıkar.** Kaydetme
   anında uyarmak geç: garson siparişi yazmış, gitmek üzere. Kendi küçük
   penceresi var (1-8 hazır tuş + kalabalık masa kutusu); vazgeçen salona
   dönüyor, çünkü sayı girilmeden o masada satış yapılamıyor. *(14 Ağu 2026)*
90. **Kasa günü ile vardiya ayrı kavramlar.** Kasa günü raporların tarih aralığı
   (Genel ayarlardaki saatler); vardiya kasanın fiilen açık olduğu süre. Bir kasa
   gününde birden fazla vardiya olabilir — devir teslimde kasa kapanıp yenisi
   açılır. Adisyo turunda ikisinin karıştığı görüldü, `kasa_vardiyalari` bu yüzden
   kasa gününe bağlı değil. *(11 Ağu 2026)*
91. **Kasa ekranı sayfa değil pencere.** Salon şeridinin sağ ucunda durumu
   üstünde yazan bir düğme ("Kasa kapalı" / "Kasa açık · 4 sa 12 dk"), tıklayınca
   pencere açılıyor. Kasanın başındaki kişi işin ortasında masayı kaybetmiyor.
   Yetkisi (`kasa.ac_kapat`) veya ayarı olmayan düğmeyi hiç görmüyor. *(11 Ağu 2026)*
92. **Kasadan para alma, gider girişinden ayrı bir işlem.** Gider işletmenin
   harcaması; para hareketi kasadaki nakdin fiziksel giriş/çıkışı (bankaya
   götürme, bozukluk getirme). Ayrı yetki (`kasa.para`, yalnız Yönetici ve
   Müdür'de) ve ayrı işletme ayarı var. *(11 Ağu 2026)*
93. **Açık adisyon varken kasa kapatılmıyor.** Kapatmaya çalışan kaç adisyonun
   açık olduğunu söyleyen bir uyarı alıyor. Adisyo'da da böyle; ödemesi
   alınmamış hesap varken sayım anlamsız. *(11 Ağu 2026)*
94. **Ayar satırında açıklama cümlesi yok, ayarın solunda "i" işareti var.**
   Her satırın altına bir cümle yazmak satırı iki katına çıkarıyor ve sayfayı
   metin yığınına çeviriyordu. Açıklama imleç üstüne gelince balonda çıkıyor;
   işaret solda sabit sütunda durduğu için satırlar hizalı kalıyor. Açıklamalar
   ayarın **ne olduğunu** anlatır, o anki seçimini değil — ve işletmeye göre
   değişen sabit örnek (saat, KDV oranı, ülke) vermez. *(11 Ağu 2026)*
95. **İki şıklı ayarlar segment değil anahtar.** "Açık | Kapalı" iki düğmelik
   segment satır başına ~264px yer kaplıyordu; anahtar 40px. Gerçekten seçenek
   olanlar (KDV dahil/hariç, kilit süresi, çalışma tipleri) segment kaldı.
   Ayrıca satır başlıkları artık mercan değil: on satırda on vurgu olunca vurgu
   diye bir şey kalmıyordu, mercan yalnızca seçili kontrolde. *(11 Ağu 2026)*
96. **Arama kutusunun yeri ekrana göre değişir, kutusu aynıdır.** Ortak bileşen
   `AramaKutusu`; Genel ve Satış'ta açıklama şeridinin sağ ucunda, Personel'de
   "Personel ekle" düğmesinin solunda, Genel Yetkiler'de başlıkla aynı hizada
   ortalarda. Arama ad ve açıklamada birlikte arıyor ("kdv" yazan "Menü
   fiyatları"nı bulur), Türkçe harf ve şapka farkını yok sayıyor. *(11 Ağu 2026)*
97. **Nakit gider kasadan düşer, kartla ödenen düşmez.** Vardiyanın beklenen
   tutarı: açılış + nakit satış + para girişi − para çıkışı − **nakit gider**.
   Gider ekranı kasadan bağımsız çalışıyor (kasa takibi kapalı işletmenin de
   faturası var), ama nakit ödenen gider açık vardiyanın kasasına işliyor.
   *(12 Ağu 2026)*
98. **Gider türleri hazır şablonla başlar.** Ekran boşken "Hazır türleri ekle"
   ile sekiz tür (Faturalar, Vergi, Personel, Temizlik, Gıda ve İçecek, Teknik
   Servis, Kira, Diğer) tek tuşla geliyor, sonra kullanıcı kendine göre
   düzenliyor. Aynı desen roller ve ödeme tiplerinde de var. Gider kaydı türün
   adını da taşıyor — tanım silinse bile eski gider ne için yapıldığını
   unutmuyor. *(12 Ağu 2026)*
99. **Kasa kapanış hatırlatması ertelenebilir, ısrarcı olabilir.** Kapanış saati
   geçtiği hâlde kasa açıksa düğme mercana döner ve pencere çıkar; "Sonra"
   ısrar kapalıyken 15, açıkken 2 dakika erteler. **Satışı hiçbir durumda
   durdurmuyoruz** — akşam yoğunluğunda yanlış ayarlanmış bir saat yüzünden
   işletme kilitlenmesin. Eşik, vardiyanın açılışından sonraki ilk kapanış
   saatidir; gece 01:00'de kapanan işletmede hatırlatma gece çıkar. *(12 Ağu 2026)*
100. **Kendiliğinden çıkan uyarı penceresi başlık ve ikon taşır.** Kullanıcının
   istemediği yerde beliren pencerede çıplak metin bloğu amatör duruyordu;
   `OnayModal` artık isteğe bağlı `baslik` + `ikon` alıyor (mercan zeminli
   yuvarlak ikon, 17px başlık, gövde yazısı **koyu tonda** — soluk değil).
   Kullanıcının kendi bastığı düğmeden çıkan onaylar sade hâlinde kalıyor.
   *(12 Ağu 2026)*
101. **Rapor kapsamı: Adisyo'nun tamamı + fazlası.** Adisyo'da olan hiçbir rapor
   eksiltilmeyecek; sıralama modüllere bağlı, kapsam kısıtı değil. Stok Durum ve
   Fire stok modülüyle, Açık Hesap Hareketleri ve Ödenmezler cari hesapla, kanal
   raporları entegrasyonla gelir. Rapor iskeleti (tek ekran + ortak filtre +
   ortak liste) baştan bunlar takılabilecek şekilde kurulur. *(12 Ağu 2026)*
102. **Raporlar tek ekran, üstte sekmeler.** Adisyo'da aynı adisyon listesi üç
   ayrı raporda tekrarlanıyor; bizde tek liste var, "masa siparişleri" ya da
   "vardiya raporu" ayrı ekran değil **filtre**. Sekmeler: Özet · Adisyonlar ·
   Ürünler · Personel · Giderler · Denetim. Filtre sekmeler arasında korunur.
   *(12 Ağu 2026)*
103. **Özetin başrolü günün cirosu.** Rapor açıldığında ilk görülen şey o;
   Adisyo'nun eşit ağırlıklı kart yığını yerine önce ciro, sonra kırılımlar.
   *(12 Ağu 2026)*

## 7. KOD PAYLAŞIM DÜZENİ
- Kod GitHub'da: `github.com/ramazann1/garso` (şimdilik Public — final'de Private yapılacak)
- **Claude'un repoya erişim yöntemi:** seans başında bash ile tarball indirilir:
  ```
  curl -sL "https://codeload.github.com/ramazann1/garso/tar.gz/refs/heads/main" -o garso.tar.gz && tar xzf garso.tar.gz
  ```
  (`raw.githubusercontent.com` doğrudan çekilemiyor, GitHub tree sayfaları robots ile kapalı, `api.github.com` rate limit'e giriyor — tarball çalışan tek yol.)
- **Claude tarayıcıda test edebiliyor:** Claude in Chrome ile `localhost:5173` (bugün 5174) açılıp uygulama tıklanarak test ediliyor. Dev server açık olmalı (`npm.cmd run dev`).
- **Not:** Birden fazla terminalde dev server açık kalırsa Vite farklı porta geçiyor (5174, 5175...) ve eski sekme güncellenmemiş kodu gösteriyor. Tek terminal kuralı.
- **Ctrl+H notu:** "bul" metnindeki boşluk/satır farkları eşleşmeyi bozuyor. Küçük dosyalarda tamamını vermek daha güvenli.
- Her seans sonunda kullanıcı: `git add .` → `git commit -m "aciklama"` → `git push`
- VS Code'da dosya yanındaki **M** işareti = henüz push edilmemiş değişiklik.
- `node_modules` `.gitignore` ile hariç (normal)

---

## 6. SATIŞ ÇEKİRDEĞİ — EKSİK ENVANTERİ (4 Ağu 2026)
*Adisyo satış ekranı canlı gezildi (`pos-yol-haritasi.md` → bölüm 7), ardından
kendi kodumuz baştan sona okundu. Menü modülü için yaptığımızın satış tarafındaki
karşılığı. Uyarlama ilkesi: **işlevi alıyoruz, arayüzü kendimiz kuruyoruz.***

### 6.1 Bizde BOZUK olanlar (eksik değil, hatalı)
1. **Masa süresi her kayıtta sıfırlanıyor.** `Siparis.tsx` kaydederken `acilis`
   göndermiyor; `adisyonlar.ts` boş gelince `new Date()` yazıyor. Salon'daki
   açık kalma süresi fiilen çalışmıyor.
2. **Sepetten çıkarma ada göre.** `sepettenCikar(ad)` aynı ürünün farklı
   porsiyonunda yanlış satırı azaltıyor; sepet satırının React anahtarı da
   (`key={k.ad}`) çakışıyor.
3. **Ödenmiş kalem takibi kayabiliyor.** `Tahsilat.kalemler` sepet **indeksine**
   bağlı; ödeme sonrası kalem silinirse "ödendi" işareti başka ürüne geçiyor.
4. **Kapanan adisyon siliniyor** (`adisyonKaydet` → `delete`). Gün sonu ve
   denetim raporu bu yapıyla yapılamaz.
5. **Adisyon masa adına bağlı** (`masa_ad` metni) — masa taşıma/birleştirme imkânsız.
6. **Sipariş ekranında çıkış koruması yok** (Menü Stüdyosu'nda var).
7. **Garson adı kodda sabit** ("Ramazan").

### 6.2 Bizde HİÇ olmayanlar
- **Kalem düzeyi:** adet artırma, birim fiyat düzenleme, ürün notu, porsiyon
  değiştirme, **ikram**, kalem iptali, başka adisyona taşıma.
- **Adisyon düzeyi:** adisyon no, adisyona serbest isim, kişi sayısı, adisyon
  notu, müşteri, servis grubu (kurs), **turlar (saat damgalı gruplama)**, durum.
- **Ürün bulma:** arama, barkod, favoriler, kartta adisyondaki adet rozeti.
- **Masa:** taşıma, birleştirme, adisyon aktarma, masa iptali, yazdırma;
  bölge/masa tanımları hâlâ `ornekVeri.ts` içinde koda gömülü.
- **Sipariş türü:** Gel Al ve Paket akışı (fiyat altyapısı hazır, akış yok).
- **Tahsilat:** Hızlı Öde, Öde-ve-Kapat/Yazdır, bahşiş (üstünü tamamla),
  ürün bazlı 1/n, ürün bazlı indirim, ÖKC/klasik ayrımı, kalem bazlı Ödenen/Kalan.
- **Genel:** kapanmış adisyonlar listesi, ekran kilidi, canlı yenileme.

### 6.3 Bizde olup Adisyo'da olmayan (koruyacağız)
Tahsilatta KDV dökümü · kampanyalı menü seçim penceresi · kategori ağacının
sipariş şeridinde açılması · kendi onay modalımız.

### 6.4 Uyarlama kararları (Adisyo'yu kopyalamıyoruz)
- **Kalem detayı** ortadaki kutu değil, bizim **sağdan panel** desenimiz.
- **Tur başlığında garson adı** — Adisyo her kalemin altında tekrar ediyor,
  bir turu genelde tek kişi girdiği için gürültü.
- **Favoriler**, sol dikey şeridin tepesinde kampanyalı menülerin üstüne girer;
  yeni kavram değil, var olan desenin devamı.
- **Ödeme tipleri** iki başlık halinde değil tek liste + ÖKC olanlarda küçük
  işaret; ÖKC'siz işletmede ayrım hiç görünmez.
- **Hızlı Öde** aynen alınır (operasyon gerçeği, tasarım tercihi değil).
- **Bahşiş "üstünü tamamla"** fikri alınır, yerleşim bizim panelimize göre.
- **Alınmayacaklar:** üst bardaki 7 ikonluk kalabalık (takvim ikonu "sipariş
  açıklaması" çıkıyor), kategori sekmelerinin sayfalara bölünmesi, "Çoklu Seçim"
  gibi hiçbir şey anlatmayan başlıklar.
- **Terminoloji bizim:** Özellik→Seçenek, Misafir Sayısı→Kişi Sayısı,
  Sipariş Grubu→Servis, Ödenmezler→Protokol.

---

## 7. SEANS GÜNLÜĞÜ — 4 AĞU 2026

### Yapılanlar
- ✅ **Toplu Düzenle'ye "Hepsine uygula" şeridi.** Ayrı bir "kategori toplu işlem"
  penceresi açmak yerine var olan sekme genişletildi — o sekme zaten aynı alanları
  (KDV, satışta/mutfakta göster, favori) düzenliyordu, eksik olan tek şey hepsini
  tek hamlede ayarlamaktı. Şerit **süzülmüş** ürünlere işliyor (kategori seçici +
  arama neyi gösteriyorsa o), değişiklik taslakta kalıyor, alttaki tek Kaydet ile
  yazılıyor, Vazgeç geri alıyor.
- ✅ **KDV hesabı satışa girdi** (`kdv.ts`): `kdvAyir` (dahil fiyatın içinden
  vergiyi çıkarır), `kdvDokumu` (adisyonu oran oran toplar). İndirim kalemlere
  tutarları oranında dağıtılıyor — yoksa tahsil edilmemiş ciro üzerinden vergi
  yazılırdı; yuvarlama artığı en büyük satıra yazılıyor ki döküm toplamı adisyon
  toplamını tutsun. **KDV oranı satış anında kaleme yazılıyor**
  (`SepetKalemi.kdvOran`) — ürünün grubu sonradan değişse bile kesilmiş adisyonun
  dökümü oynamıyor. Oranı olmayan eski adisyonlar varsayılan gruba düşüyor.
- ✅ **`KdvDokum.tsx`** — adisyon özetinde ve tahsilat panelinde aynı bileşen.
  Üç deneme sonunda son hâli: kutu değil, diğer özet satırlarıyla aynı hizada tek
  soluk satır (`KDV (dahil) ⌄  ₺158,78`), üstüne basınca oran dökümü açılıyor.
  İlk iki hâl (kenarlıklı kutu, mercan renkli tutarlar) Ramazan tarafından
  "KDV en önemli şey gibi duruyor" denerek reddedildi. Satır sırası da değişti:
  Ara Toplam → İndirim → KDV → Ödenen → Kalan → Toplam; üst blok hesabın neyden
  oluştuğunu, alt blok ne kadarının tahsil edildiğini anlatıyor.
- ✅ **Kategorisiz ürün görünürlüğü.** Ürün satırına "kategorisiz" işareti,
  kapsam seçicisine üçüncü düğme: `Kategorisiz (N)` — yalnız öylesi varken
  görünüyor, sonuncusu silinince kapsam kendiliğinden "Bu kategori"ye dönüyor.
  (Ramazan'ın 6 kalıntı ürünü bu seanstan önce zaten silmişti; iş, ürünü satın
  alacak işletmecinin Excel'den yanlışlıkla açtığı kategorisiz ürünü bulabilmesi
  için yapıldı — öyle bir ürün sipariş ekranında hiçbir yerde görünmüyor.)
- ✅ **Adisyo satış ekranı canlı gezildi** ve iki dosyaya işlendi:
  `pos-yol-haritasi.md` bölüm 7 (ne gördük) ve bu dosyada bölüm 6 (bizde ne eksik,
  neyi nasıl uyarlayacağız). Kendi satış kodumuz da baştan sona okundu; çıkan
  **7 gerçek hata** 6.1'de.

### Kararlar
- **KDV dahil/hariç ürün bazında değil işletme geneli tek ayar olacak**
  (Ramazan'ın kararı). Şimdilik her şey "dahil" kabul ediliyor, anahtar
  İşletme Ayarları ekranıyla gelecek — o ekran henüz yok.
- **Adisyo kopyalanmayacak:** işlev alınır, arayüz bizim. Ayrıntılı uyarlama
  kararları 6.4'te.
- **Salon ekranının yeniden tasarımı masa/bölge tanımlarıyla aynı maddede**
  yapılacak; masalar koda gömülüyken tasarım yapmak iki kez iş demek.
- **İkon seti (lucide-react) Salon tasarımıyla eşzamanlı** giriyor, ayrı madde değil.

### Not
Bu seansta Adisyo'nun canlı sisteminde hiçbir kayıt değiştirilmedi: denenen
"Grup Ekle" ve sepete eklenen ürün kaydedilmeden geri alındı, ödeme alınmadı.

---

## 8. SEANS GÜNLÜĞÜ — 6 AĞU 2026

### Yapılanlar
- ✅ **Adisyon veri modeli gerçek tablolara taşındı** (`sql/2026-08-04-adisyon-modeli.sql`):
  `adisyonlar` / `turlar` / `adisyon_kalemleri` / `tahsilatlar`. Eski tek satırlık
  jsonb yapısı `adisyonlar_eski` adıyla duruyor, açık adisyonlar betikle aktarıldı.
  `adisyonlar.ts` baştan yazıldı: kaydetmede mevcut kalemler yerinde güncelleniyor,
  yeniler yeni tura giriyor, tahsilatlar kalem kimlikleriyle yeniden yazılıyor.
  Bu adım 6.1'deki **1, 2, 3, 4 numaralı hataları** kapattı.
- ✅ **Hızlı kazançlar:** ürün arama (ad + kod, kategori sınırını kaldırıyor),
  favoriler şeridi (yıldız ikonlu, favori yoksa görünmüyor), ürün kartında
  adisyondaki adet rozeti, sipariş ekranına kaydetmeden çıkış koruması
  (`cikisKilidi.ts` + kendi onay modalı).
- ✅ **Kalem paneli** (`components/KalemPaneli.tsx`): adet, birim fiyat, porsiyon
  değiştirme, ürün notu, ikram, iptal ve iptali geri alma. Adisyon satırı
  tıklanabilir oldu (mercan ayar simgesi + üstüne gelince zemin).
- ✅ **lucide-react kuruldu**, ilk ikonlar girdi: favori yıldızı, katlama okları
  (satış şeridi, Menü Stüdyosu, ürün paneli), kalem panelindeki artı/eksi,
  bilgi kutusu ikonu.
- ✅ **`Bilgi.tsx`** — 14 yerdeki soluk `ipucu` satırı ikonlu bilgi kutusuna
  çevrildi, eski `.ipucu` stili silindi.
- ✅ **Menü Stüdyosu kategori listesinden ürün sayısı kaldırıldı** (Ramazan'ın
  isteği); alt kategoriler artık okla açılıyor.

### Kararlar
Bu seansta çıkan kararlar bölüm 6'ya 39–47 numaralarla işlendi. Öne çıkanlar:
kapanan adisyon silinmiyor, her kalemin kendi kimliği var, ikram/iptal kalemi
silmiyor ve adedin bir kısmına uygulanabiliyor, adisyon kendiliğinden kapanmıyor,
açıklamalar ikonlu kutuya geçti.

### Sonraki seansın ilk işi
Masa ve bölgelerin veritabanına taşınması + Salon ekranının yeniden tasarımı +
ikon setinin oraya tam uygulanması (0. bölümdeki 1. madde).

---

## 9. SEANS GÜNLÜĞÜ — 6 AĞU 2026 (ikinci oturum)

### Yapılanlar
- ✅ **Masa ve bölgeler veritabanına** (`sql/2026-08-06-masalar.sql`): `bolgeler`
  ve `masalar` tabloları, mevcut Bahçe/Salon masaları başlangıç verisi olarak
  yazıldı. `adisyonlar` artık masaya **adıyla değil kimliğiyle** bağlı
  (`masa_id`); masa yeniden adlandırılınca üstündeki adisyon kopmuyor. Rota
  `/siparis/:masaId` oldu, `src/ornekVeri.ts` silindi.
- ✅ Masaya **kapasite ve şekil** (kare/daire) alanları; salon planı için
  `konum_x`, `konum_y`, `genislik`, `yukseklik` kolonları şimdiden açıldı —
  sürükleyip yerleştirme editörü sonra gelecek, tablo ikinci kez elden geçmesin.
- ✅ **İşletme Ayarları ekranı** (`pages/IsletmeAyarlari.tsx`): bölge çip şeridi
  (sola/sağa taşı, düzenle), masa ızgarası, sağdan açılan düzenleme panelleri,
  **toplu masa ekleme** (ön ek + adet + şekil, canlı önizlemeli). Kaydetme
  anında; sayfanın altında bekleyen Kaydet düğmesi yok. Açık adisyonu olan masa
  veya bölge silinemiyor.
- ✅ **Salon ekranı yeniden tasarlandı**: eski "Garso / Salon Görünümü" başlığı
  kalktı, bölgeler sekme oldu (doluluk rozetli, "Tümü" en sonda), masa kartı
  yeniden yazıldı — dolu masa dolgun mercan + beyaza yakın yazı, boş masa beyaz
  ve tek satır, üstüne gelince "Adisyon aç" beliriyor. 2 saati geçen adisyonun
  süresi rozetleniyor. Süreler dakikada bir kendiliğinden ilerliyor.
- ✅ **Adisyo Tanımlamalar modülünün tamamı canlı hesapta gezildi** — on ekran,
  bulgular `pos-yol-haritasi.md` bölüm 8'e işlendi, Garso ile kıyas tablosu ve
  yedi yeni faz maddesi çıkarıldı.
- ✅ **Tipografi elden geçti:** yazı tipi **Poppins** (`@fontsource/poppins`,
  pakete gömülü), `--soluk` okunur tona çekildi (`#6b7578`), 10-11px puntolar
  kaldırıldı, `input/button/select/textarea` için global `font-family: inherit`
  eklendi (form öğeleri sayfa fontunu miras almıyordu — Menü Stüdyosu ve
  İşletme Ayarları'ndaki "eski font" şikâyetinin sebebi buydu).

### Denenip vazgeçilenler
- **Bölgelere renk verme** (pastel palet, dolu masa bölge rengini alsın):
  Ramazan reddetti — "çok çirkin, kendi rengimizi kullan". Veritabanı kolonu,
  renk seçici ve stiller geri alındı. Karar 50 numarayla işlendi.
- **Masa kartında adet rozeti**: kaldırıldı, kart kalabalık duruyordu.

### Kararlar
Bölüm 6'ya **48, 49, 50** numaralarla işlendi: silik yazı yasağı, Poppins,
ana ekranlarda tek vurgu rengi. Silik yazı kuralı ayrıca CLAUDE.md'ye
"Görünüm kuralları" başlığıyla girdi.

### Sonraki seansın ilk işi
Salon ekranının kalan parçaları: masa taşıma / birleştirme / adisyon aktarma
(üç nokta menüsü) ve masa yerleşim editörü.

## 10. SEANS GÜNLÜĞÜ — 7 AĞU 2026

### Yapılanlar
- ✅ **Masa taşıma / birleştirme** — dolu masa kartında üç nokta menüsü
  (`components/MasaSecim.tsx` yeni). `masaTasi` adisyonun `masa_id`'sini
  değiştiriyor; `masaBirlestir` kaynağın **turlarını** hedef adisyona bağlıyor,
  tur sıraları hedefin sonundan devam ediyor, tahsilatlar taşınıyor, indirimler
  toplanıyor, boşalan adisyon siliniyor. Kalem kimlikleri kaymadığı için ödeme
  eşleşmeleri bozulmuyor.
- ✅ **Kalemi başka adisyona taşıma** — `kalemTasi`. Kalem hedefte yeni bir tura
  giriyor, kısmi adet destekli, hedef masa boşsa orada adisyon açılıyor, kaynak
  boşalırsa siliniyor. Taşımadan önce adisyon sessizce kaydediliyor (ekrandaki
  yeni kalemin diskte karşılığı olmadan taşınamaz). **Ödemesi işlenmiş kalem
  taşınmaz** — düğme kapalı, gerekçesi yazıyor.
- ✅ **Masa yerleşim editörü** (`components/MasaPlani.tsx` yeni) — 1000×640
  birimlik sabit oranlı tuval, pointer olaylarıyla sürükleme ve sağ alt köşeden
  boyutlandırma (fare + dokunmatik aynı kod), 10 birimlik ızgaraya oturma,
  bırakışta kaydetme. İşletme Ayarları'nda **Liste / Plan** geçişi, "Otomatik
  diz" düğmesi, ilk açılışta konumsuz masaların dizilmesi. Salon salt okunur
  modda aynı bileşeni kullanıyor ve tuvali kullanılan alana göre kırpıyor.
- ✅ **Kalem paneli yeniden tasarlandı** — tutar mercan başlığa çıktı (adet/fiyat
  değiştikçe canlı), alanlar "etiket solda / kontrol sağda" satırlarına döndü,
  adet seçici birleşik parça oldu, ikram/taşı/iptal ayrı işlem bölümünde
  toplandı, üç bilgi kutusu bire indi.
- ✅ **Bütün arayüz ikona geçti** — kalem paneli, tahsilat paneli (ödeme tipleri
  ada göre eşleşen ikonlarla, `src/odemeIkon.tsx` yeni), indirim penceresi,
  sipariş alt barı, Menü Stüdyosu (kopyala/sil/düzenle/sırala/ekle), Birimler,
  KDV, aktarım sekmesi, bildirim. Düz karakter simgesi kalmadı.

### Veritabanı
- `sql/2026-08-07-bolge-plan.sql`: `bolgeler.plan_modu boolean not null default false`.

### Denenip vazgeçilenler
- **Yerleşimi otomatik yayına almak:** "masaların hepsinde konum varsa Salon plan
  çizsin" kuralı, ayarlarda plana bakmak Salon'u değiştirdiği için reddedildi.
  Yerine bölge bazlı açık anahtar geldi (karar 52).

### Kararlar
Bölüm 6'ya **51-55** numaralarıyla işlendi: her yerde ikon, bölge bazlı plan
modu, birleştirme/aktarma tek madde, ikram-iptal düğme oldu, panelde tek
açıklama satırı. "Her yerde ikon" kuralı Claude'un kalıcı hafızasına da yazıldı.

### Sonraki seansın ilk işi
Tahsilat zenginleştirme: Hızlı Öde, bahşiş (üstünü tamamla), ödeme tipi
ÖKC/klasik ayrımı, ürün bazlı 1/n ve ürün bazlı indirim.

---

## 11. SEANS GÜNLÜĞÜ — 7 AĞU 2026 (ikinci oturum)

### Yapılanlar
- ✅ **Hızlı Öde** (`components/HizliOde.tsx` yeni) — sipariş ekranının alt
  barından ve Salon'da masa üç nokta menüsünden açılıyor. Tutar kutusu (boşsa
  kalanın tamamı), indirim kısayolu, "Öde ve kapat / Öde, açık kalsın" seçici,
  ödeme tipi kartları. Kısmi tutarda adisyon kapanmıyor (karar 57).
- ✅ **`adisyonOzeti()`** (`adisyonlar.ts`) — ara toplam / toplam / ödenen /
  kalan tek yerden. Salon ile sipariş ekranı farklı sayı göstermesin diye.
- ✅ **Salon ödemeyi görüyor** — `tumAdisyonlar()` artık tahsilatları da çekip
  masa başına `tutar / odenen / kalan` döndürüyor (`MasaOzeti`). Öncesinde
  ödeme alınmış masa ile hiç ödenmemiş masa aynı görünüyordu.
- ✅ **Masa kartı yeniden düzenlendi** — sabit yükseklik, üç rakam sütunu, süre
  rozeti, durum renkleri (karar 56). Kartın odak çerçevesi düzeltildi:
  tarayıcının varsayılan beyaz halkası tıklanan kartta asılı kalıyordu, artık
  yalnız klavyeyle gezende mercan halka çıkıyor.
- ✅ **Adisyonu kapat** — tahsilatı tamamlanmış masanın üç nokta menüsünde
  "Hızlı Öde" yerine bu çıkıyor, onay modalıyla adisyon kapalıya çekiliyor.

### Kararlar
Bölüm 6'ya **56-57** numaralarıyla işlendi: masa kartı düzeni ve durum renkleri
(geçici), Hızlı Öde'nin bilinçli sadeliği.

### Sonraki seansın ilk işi
Tahsilat zenginleştirmenin kalanı: bahşiş (üstünü tamamla), ödeme tipi
ÖKC/klasik ayrımı, ürün bazlı 1/n ve ürün bazlı indirim.

## 12. SEANS GÜNLÜĞÜ — 8 AĞU 2026

### Yapılanlar
- ✅ **Bahşiş** — kalandan fazla girilen tutar reddedilmiyor; onay modalı çıkıp
  üstünü `tahsilatlar.bahsis` alanına yazıyor. Kalan hesabı bozulmuyor
  (`sql/2026-08-08-bahsis.sql`).
- ✅ **Ödeme tipleri ekranı** — İşletme Ayarları'nda yeni bölüm: ad, düğme
  rengi, sınıf (klasik / yazarkasa), cari hesap anahtarı, görünürlük anahtarı,
  sıra. Veri katmanı `odemeTipleri.ts`'e taşındı.
- ✅ **ÖKC/klasik ayrımı** — `odeme_tipleri.sinif`; ödeme ekranında düğmeler iki
  başlık altında gruplanıyor, ÖKC tipi tanımlı değilse başlık hiç çıkmıyor.
  Dokuz hazır ÖKC tipi gizli olarak yüklendi.
- ✅ **Ürün bazlı 1/n** — 1/2–1/4 düğmeleri ürün seçiliyse o ürünün tutarını
  bölüyor; kalem payı kesirli yazılıyor ("yarısı ödendi"), kuruş artığı son
  ödeyene kalıyor.
- ✅ **Ürün bazlı indirim** — `adisyon_kalemleri.indirim`; tahsilatta ürün
  seçiliyken indirim seçili satırlara payına göre dağıtılıyor, KDV kendi
  oranından düşüyor. Kalem panelinde rozet ve kaldırma düğmesi.
- ✅ **Gel Al / Paket akışı** — `adisyonlar.tip` + müşteri alanları; salon
  şeridinde "Paket & Gel Al" sekmesi, "+ Yeni sipariş" kartı, `/adisyon/:id`
  yolu. Fiyat sipariş türüne göre okunuyor.
- ✅ **Sol menü açılır alt başlıklar** — İşletme Ayarları ve Menü Stüdyosu
  bölümleri hem menüde hem sayfa üstündeki şeritte; sekmeler adrese bağlandı
  (`/menu/kdv`, `/ayarlar/odeme-tipleri`). Menünün açık/kapalı hâli tarayıcıda
  saklanıyor, sayfa değişince kapanmıyor.

### Kararlar
Bölüm 6'ya **58-61** numaralarıyla işlendi.

### Sonraki seansın ilk işi
**Paket & Gel Al revizyonu.** Ramazan bu bölümde değişiklik istiyor, ne
olduğunu henüz söylemedi — seansa girer girmez sor.

## 13. SEANS GÜNLÜĞÜ — 9 AĞU 2026

### Yapılanlar
- ✅ **Paket & Gel Al revizyonu** — sekme bölgelerden ayrılıp şeridin en sağına
  alındı; sekmeye girince iki büyük kart (Paket / Gel Al), türün içinde sipariş
  listesi ve "Yeni sipariş". Tür seçici yeni siparişten kalktı (karar 62).
- ✅ **Salon sekmesi hatırlanıyor** — masaya girip dönünce veya sayfa
  yenilenince seçili bölge sıfırlanıyordu; `localStorage`'a alındı (karar 63).
- ✅ **KDV dahil / hariç ayarı** — `isletme_ayarlari` tablosu, İşletme
  Ayarları'nda yeni **Satış** sekmesi. Hariç modda vergi adisyon toplamının
  üstüne biniyor; `kdv.ts` ve `adisyonOzeti` ayarı okuyor (karar 64).
- ✅ **Ön tanımlı indirimler** — `indirim_tanimlari`; Satış sekmesinden tanım,
  indirim penceresinde hazır düğmeler. Uygulanan indirimin kaynağı adisyona ve
  kaleme yazılıyor, rapor için veri hazır (karar 65).
- ✅ **Satış ayar ekranı yeniden tasarlandı** — ikon başlıklı iki kart yerine
  tek kart içinde ayar satırları; soluk yazı temizlendi (karar 66).
- ✅ **Seçenek grubunda en az seçim ve varsayılan seçenek** — `secenek_gruplari.en_az`,
  `secenekler.varsayilan`. Grup panelinde sayı alanı ve satır yıldızı; satışta
  yıldızlı seçenek işaretli geliyor, "en az 2" tutmadan Ekle açılmıyor.
- ✅ **Turlar arayüze çıktı** — sepette "2. tur · 14:55" başlıkları; birleştirme
  kuralları tura göre düzeltildi, yeni kalemler listenin başında (karar 67).
- ✅ **Adisyon paneli toparlandı** — genişlik 280 → 360px, kalem satırları ve
  alt bölüm daraltıldı, üç ödeme düğmesi tek satıra indi, Ara Toplam açılır
  kapanır KDV kapağı oldu, tüm tutarlar kuruşlu (karar 68).
- ✅ **Ürün panelinde seçenek grupları** — akordeon oldu, çip yığını yerine alt
  alta işaretleme listesi. Kategori şeridi 190 → 240px.

### Kararlar
Bölüm 6'ya **62-68** numaralarıyla işlendi. Yol haritasına da kritik karar 7
eklendi: garson iki düzeyde tutulur (masayı açan / turu yazan).

### Sonraki seansın ilk işi
**Adisyon düzeyi alanlar** — adisyon no, serbest isim, kişi sayısı, adisyon
notu, müşteri.

## 14. SEANS GÜNLÜĞÜ — 12 AĞU 2026

### Yapılanlar
- ✅ **Personel modülü** — `personel`, `roller`, `yetkiler`, `rol_yetkileri`,
  `personel_bolgeleri` tabloları (`sql/2026-08-11-personel.sql`), veri katmanı
  `src/personel.ts`, ekran `pages/Personel.tsx`. Form: ad, görev, telefon,
  e-posta, şifre, bölge ataması, PIN ile hızlı geçiş, "girişi engellensin",
  "listede görünsün". Telefon ve PIN benzersizliği kaydederken denetleniyor.
- ✅ **Yetki ekranları** — `sql/2026-08-12-kisi-yetkileri.sql`, `src/yetkiler.ts`,
  `pages/Yetkiler.tsx`. İki bölüm: **Genel Yetkiler** (satır = işlem, sütun = rol,
  Yönetici sütunu kilitli) ve **Kişiye Özel Yetkiler** (her yetki üç durumlu:
  Rolden / Verildi / Kaldırıldı). `etkinYetkiler()` satış tarafı için hazır.
- ✅ **Hazır yetki şablonları** — `sql/2026-08-12-hazir-yetkiler.sql`. Müdür tam
  yetki; Kasa satış + tahsilat + kasa günü; Garson sipariş + ödeme + yalnız ön
  tanımlı indirim; Kurye paket + tahsilat; İstasyon boş.
- ✅ **Ayarlar gezinmesi iki kademeye çıktı** — üst şeritte "Personel ve Yetkiler"
  tek başlık (Bölgeler ve Masalar'ın hemen altında), altında üç sekme. Sol menüde
  de açılır oklu üçüncü kademe. Şerit tek yerde toplandı: `components/AyarBasligi.tsx`
  (önce üç ekranda kopyaydı).
- ✅ **Yetki matrisi tasarım geçişi** — tarayıcı tik kutusu yerine kendi kutumuz,
  Yönetici sütununda kilit ikonu, grup başlıkları sola yaslı şerit, sabit
  başlıklar, altta beliren kaydetme şeridi.

### Denenip vazgeçilenler
- **"En az bir giriş yolu" kuralı** (e-posta + şifre *veya* PIN): Ramazan reddetti,
  telefon ve şifre her personelde zorunlu olacak. PIN isteğe bağlı kaldı.
- **Şifrede ad/telefon yasağı ve 8 karakter**: 6 karaktere indirildi, ad/telefon
  kontrolü kaldırıldı.
- **Yetkiler için Adisyo'dan farklı düzen önerileri** (rol odaklı liste, hazır
  paketler, yönetici PIN onayı): Ramazan matrisi Adisyo gibi istedi; kişiye özel
  katman eklendi. Yönetici PIN onayı Adım 3'e bırakıldı.

### Kararlar
Bölüm 6'ya **69-74** numaralarıyla işlendi. Ayrıca hafızaya "tasarımda Claude izi
olmasın" geri bildirimi yazıldı: kalıp form, her alanın altında açıklama kutusu ve
eşit boy kart yığını yapma; düzene önce karar ver.

### Sonraki seansın ilk işi
**Yetkilerin satışta işletilmesi** — personel oturumu (telefon + şifre, ortak
ekranda PIN), `turlar.garson_id`, işlem denetimi.

---

## 15. SEANS GÜNLÜĞÜ — 14 AĞU 2026

### Yapılanlar
- ✅ **Auth geçişi kapandı.** Giriş, telefon değişimi ve "şifre boş bırakılırsa
  değişmez" davranışı canlıda doğrulandı. `personel.sifre_hash` kaldırıldı
  (`sql/2026-08-14-sifre-hash-kaldir.sql`); "bu kişinin girişi var mı" sorusunun
  cevabı artık `auth_id`. Personel formundaki alan "Giriş şifresi" oldu.
- ✅ **Satır güvenliği (RLS)** — `sql/2026-08-14-satir-guvenligi.sql`. 25 tabloda
  `isletme_id = oturum_isletmesi()` politikası, yalnız `authenticated` rolüne.
  `isletmeler` kendi satırı, `yetkiler` herkese okunur/yazılamaz. `isletme_id`
  varsayılanı `default 1` yerine `oturum_isletmesi()`. Giriş ekranının açılışta
  sorduğu "hesap var mı" sorusu `giris_kuruldu()` fonksiyonuna taşındı,
  telefon benzersizliği `telefon_kullanimda()` ile sistem geneline çıktı.
  `isletme_ayarlari` tek satırlık tablodan işletme başına bir satıra geçti.
- ✅ **"Kim yaptı"** — `sql/2026-08-14-kim-yapti.sql`: `adisyonlar.acan_id`,
  `turlar.garson_id`. Masa kartında adisyonu açan, sepetteki tur başlığında turu
  yazan görünüyor (`2. tur · 14:30 · Ramazan A.`). Ad kısaltma `kisaAd()` ile
  tek yerde — yan menü de onu kullanıyor.
- ✅ **Yetki denetimi satışta.** İkram, kalem iptali, ürün taşıma, masa taşıma/
  birleştirme, fiyat değiştirme ve indirim yetkiye bağlandı; yetkisiz kişi
  düğmeyi görmüyor. Fiyat kutusu yetkisizde düz rakama dönüyor. İndirim
  penceresinde `odeme.indirim` yoksa numpad ve kaydet düğmesi yok, yalnız hazır
  tanımlar seçilebiliyor.
- ✅ **Rota koruması** — `src/rotaYetkileri.ts`. Menü gizleme yetmiyordu; adres
  elle yazılınca ekran açılıyordu (Ramazan yakaladı: Deneme Garson'la
  `/ayarlar/yetkiler` açık geldi). Kapı `App.tsx`'te, sayfa kurulmadan çeviriyor.
- ✅ **İşletme parametreleri** — `sql/2026-08-14-isletme-parametreleri.sql`:
  kasa günü başlangıç/bitiş, misafir sayısı zorunlu, ekran kilit süresi
  (Kapalı/15sn/30sn/1dk/5dk), para üstü, çalışma tipleri. İşletme Ayarları'na
  **Genel** sekmesi eklendi. Kapatılan sipariş türü Salon'dan tümüyle kalkıyor,
  tek tür kalırsa sekme adını o tür alıyor ve tür seçim adımı atlanıyor.
  Boşta kalan kasa kendiliğinden kilitleniyor, Hızlı Öde'de para üstü çıkıyor.
- ✅ **Misafir sayısı penceresi** (`components/MisafirSayisi.tsx`) — zorunluysa
  masaya girer girmez soruyor.
- ✅ Garson rolünün ön tanımlı yetkilerinden `siparis.urun_cikar` ve
  `odeme.indirim_tanimli` çıkarıldı (Ramazan'ın kararı).

### Denenip vazgeçilenler
- **Yetkisiz düğmeyi gri gösterme / müdür PIN'i isteyen onay penceresi:**
  ikisi de elendi, düğme tümden gizleniyor (karar 83).
- **Yan menüde ismi küçük puntoyla yazma:** silik yazı kuralına aykırı; onun
  yerine soyad baş harfe indi (`Ramazan A.`).
- **Misafir sayısı penceresinin ilk iki tasarımı:** ikon kutulu başlık ve alt
  açıklama fazla geldi; sade tek satır başlık + kare rakam tuşlarında karar
  kılındı.

### Ortam notu
Node.js makineden silinmişti, `npm.cmd` çalışmıyordu; yeniden kuruldu (v24).

### Kararlar
Bölüm 6'ya **83-89** numaralarıyla işlendi.

### Sonraki seansın ilk işi
**Kasa + gider modülü** — bölüm 0, madde 1'de planı duruyor.

---

## 16. SEANS GÜNLÜĞÜ — 11 AĞU 2026

### Yapılanlar
- **Adisyo'nun kasa ve gider tarafı canlı turlandı** (yol haritası bölüm 10).
  Kasa modülü Adisyo'da varsayılan kapalı geliyor; ekranı görebilmek için
  Parametreler'deki anahtar geçici açıldı, tur bitince geri kapatıldı.
- **Kasa çekirdeği yazıldı** (`sql/2026-08-11-kasa.sql`, `src/kasa.ts`,
  `src/components/Kasa.tsx`): `kasa_vardiyalari` ve `kasa_hareketleri` tabloları,
  satır güvenliği, `kasa.para` yetkisi, salon şeridindeki kasa düğmesi ve
  penceresi (açma · para ekle/çıkar · kapanış ve fark).
- **Beklenen kasa tutarı** = açılış + nakit satış + giriş − çıkış. Hangi ödeme
  tipinin kasaya para koyduğu `odeme_tipleri.kasaya_girer` ile belirleniyor;
  ödeme tipi formuna anahtarı eklendi, kurulumda adı "nakit" geçenler işaretlendi.
- **Dört yeni işletme ayarı:** kasa takibi, kasadan para alma, kasa kapanışı
  zorunlu, kasa kapanış uyarı saati. İlk ikisinin arayüzü var; son ikisi
  veritabanında hazır ama mantığı yazılmadığı için ekrana konmadı.
- **Ayar ekranlarının düzeni yeniden kuruldu:** satır altı açıklamalar kalktı,
  yerine soldaki "i" işareti ve balon geldi (`Ipucu`, `AyarSatiri`); ikili
  ayarlar anahtara döndü; satır yüksekliği yarıya indi; sayfa 1100px'ten 880px'e
  daraldı; satır başlıklarındaki mercan kaldırıldı.
- **Arama kutusu** dört ekrana eklendi (`AramaKutusu`, `src/arama.ts`): Genel,
  Satış, Personel, Genel Yetkiler.

### Turda planı değiştiren bulgular
1. Kasa günü ile vardiya ayrı kavramlar — ikisini tek tabloda birleştirecektik.
2. Kasa ekranı ayrı sayfa değil, satış ekranından açılan pencere.
3. Para giriş/çıkış diye gider dışında bir işlem var.
4. Gider ödeme tipi satışın ödeme tipleriyle aynı liste değil, sabit beş seçenek.
5. Açık adisyon varken kasa kapanmıyor (Adisyo'da denendi, engelledi).

### Denenip vazgeçilenler
- **Ayar satırlarını 320px sabit kolona hizalama:** iri duruşu çözmedi, asıl
  sorun satır altı açıklamalarmış.
- **Açıklamaları tümden atmak:** bilgi kaybı oldu; "i" işareti + balon ile geri
  getirildi.
- **Arama kutusunu dört ekranda da başlık şeridine koymak:** her ekranın kendi
  doğal yeri varmış (karar 96).

### Kararlar
Bölüm 6'ya **90-96** numaralarıyla işlendi.

### Sonraki seansın ilk işi
**Kasa Geçmişi + Giderler** — bölüm 0, madde 1'de planı duruyor.

## 17. SEANS GÜNLÜĞÜ — 12 AĞU 2026

### Yapılanlar
- **Kasa Geçmişi** (`src/pages/KasaGecmisi.tsx`, `src/components/KasaBasligi.tsx`,
  `src/kasa.ts`): vardiya listesi ve detay penceresi. `vardiyaGecmisi()` her
  vardiyanın beklenen tutarını ve farkını yeniden hesaplıyor (kapanışta ayrıca
  saklanmıyor); hareketler ve tahsilatlar tek sorguda çekilip vardiyalara
  dağıtılıyor. `vardiyaHareketleri()` detay penceresinin döküm listesi.
- **Giderler** (`sql/2026-08-15-giderler.sql`, `src/masraflar.ts`,
  `src/pages/Giderler.tsx`): `masraf_tipleri` + `masraflar` tabloları, satır
  güvenliğiyle. Dönem seçimli liste (dönem toplamı + nakit toplamı), gider
  ekleme/düzenleme paneli, gider türü penceresi (ekle/adını değiştir/sil +
  hazır türlerden eksikleri ekle). Gider ödeme tipi sabit beş seçenek, kayıtta
  `zaman` tek `timestamptz` — nakit gideri kasadan düşerken saat de gerekiyor.
- **Nakit gider kasaya bağlandı**: `KasaDurumu` ve `VardiyaOzeti` içine
  `nakitGider` girdi, beklenen tutar formülü güncellendi, kasa penceresi ve
  vardiya detayında "Nakit giderler" satırı çıkıyor (karar 97).
- **Kasa kapanış hatırlatması** (karar 99): Genel ayarlara "Kasa kapanış saati"
  ve "Kapanış hatırlatması ısrarcı olsun" satırları; saat seçilmeden ısrar
  anahtarı açılmıyor. `kapanisGecikti()` eşiği vardiyanın açılışından sonraki
  ilk kapanış saatine kuruyor. Hatırlatmadan "Kasayı kapat" denince pencere
  doğrudan sayım formunda açılıyor.
- **OnayModal başlık + ikon aldı** (karar 100), stil `index.css`'te.
- **Menü ve rotalar:** sol menüye "Kasa" başlığı (Kasa Geçmişi · Giderler).
  `rotaYetkileri.ts` kasa takibi kapalıyken yalnızca **Kasa Geçmişi**'ni
  gizliyor; Giderler kasadan bağımsız kalıyor.
- **Adisyo Raporlar modülü baştan sona turlandı** — yol haritası bölüm 11
  (altı rapor, bütün sekmeler, adisyon detay penceresi, sipariş geçmişi,
  filtre paneli). Turdan 12 karar maddesi çıktı (11.8).

### Kararlar
Bölüm 6'ya **97-103** numaralarıyla işlendi.

### Sonraki seansın ilk işi
**Raporlar ekranı — iskelet** (bölüm 0, madde 1). Tek ekran + sekmeler, ortak
filtre, özette günün cirosu. Turun ayrıntısı `pos-yol-haritasi.md` bölüm 11'de;
oradan okunmadan başlanmamalı.


---

## 18. SEANS GÜNLÜĞÜ — 31 AĞU 2026

Mobil arayüz turunun ilk durağı: masa kartı. Tur ekran ekran ilerliyor, bu
seansta masa kartı bitti; sipariş ekranı sıradaki durak.

### Masa kartı — durum renkleri

Kart artık masanın durumunu renkle anlatıyor, hem masaüstünde hem mobilde aynı
dille. Sıra en acilden en sakine:

| Renk | Anlamı |
|---|---|
| Gri | Hesabı tamamen ödendi, masa henüz kalkmadı |
| Kırmızı | Hesap fişi çıkarıldı, ödeme bekleniyor |
| Mor | Bir süredir sipariş vermiyor |
| Sarı | Kısmi tahsilat alındı |
| Yeşil | Olağan dolu masa |

**Durgunluk süresi işletme ayarı** (`masa_durgunluk_dk`, varsayılan 45 dk;
Ayarlar → Genel). Ölçü açılış değil **son sipariş**: yeni ürün girilince sayaç
sıfırlanıyor. Kural `masalar.ts:durgunMu()` içinde, iki arayüz de oradan
soruyor. Masaüstündeki ölü `gecikti` (2 saat) kuralı silindi — Gel Al / Paket
kartındaki çalışan hâli duruyor.

**Hesap fişi işareti.** Fiş *gerçekten basıldıysa* (kuyruğa girmesi yetmiyor)
ve sonrasında yeni sipariş girilmediyse kartta duruyor. Veri zaten vardı,
`yazdirma_kuyrugu` masa özetine bağlandı. Mobilde masa adının altında beyaz
şerit; **yeri her kartta ayrılıyor**, fişi olmayan masada görünmüyor ama yerini
tutuyor ki ızgaradaki bütün kartların satırları aynı hizada kalsın.

### İptal fişi

Masadan ürün düşünce tezgâha "bunu yapma" kâğıdı gidiyor. Üç yoldan tetikleniyor:
kalem iptali, kalemin sepetten silinmesi, adedin azaltılması (fişte azalan
miktar yazıyor). Ayrıca adisyon iptalinde masanın tamamı.

- **Yazıcı eşlemesi mutfak fişiyle aynı** — sipariş hangi yazıcıdan çıktıysa
  iptali de oradan. Ortak gövde `yazicilar.ts:istasyonlaraYaz()`.
- **Gönderilmemiş ürünün fişi basılmıyor**: tezgâh o siparişi hiç görmedi.
- Fişte **İPTAL** başlığı en büyük punto ve Fiş Tasarımı'ndan ayarlanmıyor —
  her işletmede aynı. Kâğıda göre uyarlanıyor: 80 mm'de 40, 58 mm'de 26 punto.
- **İptal eden kişinin adı** fişte yazıyor (masayı açan garson değil).
- İçerik artık **yazıcı başına** üretiliyor; aynı istasyona iki farklı kâğıt
  bağlıysa her biri kendine sığanı alıyor.

**Fiş Tasarımı'na 58/80 mm anahtarı eklendi.** Önizleme sabit 80 mm çiziyordu;
dar kâğıt kullanan işletme neyin sığdığını göremiyordu.

### Güvenlik: PIN'le geçen kişi sayfa yenilenince kayboluyordu

Ramazan yakaladı. PIN'le Mert'e geçiliyor, sayfa yenilenince ekranda yönetici
Ramazan çıkıyor ve yönetici arayüzü açılıyordu. Sunucu tarafı doğruydu
(`oturum_kisileri` tablosu), tarayıcı sormuyordu: doğrudan kimlik biletinin
sahibini yüklüyordu. Artık `oturum_personeli()` RPC'siyle "şu an kim çalışıyor"
sunucuya soruluyor. Bağlantı yoksa eski davranış sürüyor (cihazdaki kopya).

### Görünüm kuralları — bu seansta oturanlar

- **İkon asla ezilmez:** `svg { flex-shrink: 0 }` tek yerde. Önceden 30+ ayrı
  yerde tek tek yazılıyordu, unutulan yerde ikon dar ekranda yok oluyordu.
- **İkonun yanındaki metin kırpılır, ikon kırpılmaz.** Ama kırpma son çare:
  önce ikonu bol yerin olduğu satıra taşı.
- **Kart içinde mutlak konum yalnız gerçekten üste binmesi gereken şey için.**
  Bilgi taşıyan öğe akışta durur ya da hepsi aynı ölçüyle köşeye oturur —
  ikisi karışınca çakışıyorlar.
- **Yazı rengi kart zemininden gelir**, sabit beyaz yazılmaz: zemin duruma göre
  değişiyor, sabit beyaz açık zeminlerde okunmuyor.

### iOS'ta katman tuzağı — iki kez ısırdı

`-webkit-overflow-scrolling: touch` iPhone'da kendi katman bağlamını açıyor.
İçerik kutusunda durduğu için alttan açılan pencereler o kutunun içinde kalıyor,
`z-index` dışarıdaki sekme çubuğuna karşı işe yaramıyordu: menünün son satırı
("Adisyonu iptal et") çubuğun arkasında kayboluyordu. Bilgisayarın telefon
görünümünde bu davranış yok — hata orada hiç görünmüyordu.

Satır iOS 13'ten beri gereksiz; altı yerden birden kaldırıldı, `.m-icerik`e
sebebini anlatan not bırakıldı. Aynı seansta `vh` de `dvh` ile değiştirildi:
telefon tarayıcısında `vh` adres çubuğunu saymıyor.

**Sekme çubuğuna açık katman verildi** (`z-index: 30`) — yazılmadığında sıralama
tarayıcının insafına kalıyordu.

### Alttan açılan pencereler

Yeni ortak bileşen: `mobil/AltSayfa.tsx`. Açılış animasyonunu CSS yapabiliyor
ama kapanışı yapamıyor — React pencereyi anında kaldırıyor. Bileşen kapatma
isteğini bekletiyor, ters animasyon oynuyor, sonra pencere kalkıyor. Şimdilik
iki işlem menüsünde; diğer pencerelere yayılabilir.

İşlem menüsü yeniden tasarlandı: tutamak, büyük masa adı + hesap özeti, sade
yuvarlak kapatma düğmesi, çizgisiz satırlar, **ikonlar kendi renginde daire
içinde** (para yeşil, yazdırma mavi, taşıma mor, ikram pembe, iptal kırmızı).
Geri alınamayan işler ayırıcının altında ayrı bölümde. Menü sekme çubuğunun
üstünde bitiyor, onu örtmüyor.

### Denenip vazgeçilenler

- **Yazıcı ikonu tutar satırında** — dar telefonda tutarı taşırıp kartın dışına
  çıkıyordu. Metni kırpmak denendi, o da yanlıştı: bilgi kaybı hatayı gizliyor.
  Çözüm ikonu bol yerin olduğu yere taşımak oldu.
- **Kişi sayısını alt satırın akışına almak** — çakışmayı çözüyordu ama Ramazan
  beğenmedi, geri alındı. Şimdi süre ve kişi ikisi de köşelere aynı ölçüyle
  oturuyor.

### Küçük düzeltmeler

- Konsoldaki 401 yığını: bağlantı yoklaması REST kapısına kimliksiz gidiyordu,
  sağlık adresine çevrildi.
- Telefon simgesi her ekranda görünüyor (önce yalnız dar ekranda) ve **hangi
  sayfada olursa olsun** mobile geçiriyor (önce yalnız kök adreste çalışıyordu).
- Mobil menüye **"Adisyonu ikram et"** eklendi (masaüstünde vardı).
- Yazdırma kuyruğu ve `adisyon_kalemleri` canlı yayına eklendi.

### Bu seansta yapılan hata

CSS'te bir bloğu değiştirirken arama dizesi daha önce geçen benzer bir seçiciye
takıldı ve **17 bin karakterlik kural silindi** — sepet sayfası, adisyon
kalemleri, tur başlıkları, sayfa çubukları. Ramazan ekranda fark etti, `git`ten
geri alındı. Ders: metin kesip biçerken sınır dizeleri **eşsiz** olmalı; olacak
gibi değilse önce silinecek aralık ekrana yazdırılıp bakılmalı.

### Sonraki seansın ilk işi

**Mobil turun devamı: sipariş ekranı** (bölüm 0). Ürün kartı, sepet şeridi,
uzun basmanın gizli kalması, adisyon notu ve müşteri seçme.

## 19. SEANS GÜNLÜĞÜ — 21 AĞU 2026

Mobil turun ikinci durağı: sipariş ekranı. Ekran baştan aşağı elden geçti,
araya bir de gerçek bir kusur çıktı.

### Mağazaya çıkış — teknoloji kararı

**Capacitor.** React Native, Flutter ya da native yeniden yazım demek; tek
kişilik ekiple sürdürülemez. Capacitor'la çıkan uygulama mağazada normal bir
uygulama olarak duruyor, ekranlar sunucudan gelebildiği için düzeltmeler onay
beklemeden yayınlanıyor. Kabuğa yazıcı/bildirim gibi gerçek telefon özellikleri
konacak — yoksa Apple "boş kabuk" diye reddedebiliyor.

Sıra: **önce PWA canlıya** → gerçek kullanımda pişir → sonra iki mağazaya. İlk
ayların yoğun düzeltme trafiği web'de yaşanmalı.

Baştan doğru kurulması gerekenler (sonradan düzeltilemiyor): **paket adı** ilk
yayında konur ve asla değişmez, **geliştirici hesabı** işletmenin kendi adına
açılır, **veritabanı uygulamadan ayrı kalır** (Supabase'de zaten öyle). Adisyo'nun
eski uygulamasını emekliye ayırıp yenisine geçmesinin sebebi büyük ihtimalle bu
üçünden biriydi.

(Adisyo'nun mobili native yazılmış — uygulama boyutu 78 MB. Kararı değiştirmiyor:
arkalarında üç ayrı kod tabanını taşıyan bir ekip var.)

### Terim birliği: "misafir"

Aynı bilgi üç ayrı isimle geçiyordu — ayarlarda "Misafir sayısı", kasada "Kaç
kişi?", mobilde "Kaç kişi?". Hepsi **misafir**de birleşti. Sayı birimi olarak
"4 kişi" doğal Türkçe olduğu için fişte ve kartta olduğu gibi kaldı; değişen
kavramın adı.

Pencere başlığı **"Misafir Sayısı ?"**, mercan renginde, kişi ikonlu.

### Misafir sayısı penceresi

Mobildeki pencere kasadakinin fakir kopyasıydı — artı/eksi sayaç, çıkış yolu
yok. Kasadaki desene hizalandı: **1-8 hazır tuşları** (sayaç altı kişilik masada
altı kez bastırıyordu), kalabalık masa için altta kutu, **sağ üstte çarpı**.
Çarpı salona döndürüyor ve masa kilidini bırakıyor — sayı verilmeden o masada
satış yapılamadığı için garsonun tek çıkışı buydu.

### Sipariş ekranı

- **Kategoriler tek sıra, yana kayıyor.** Üç sütunlu ızgara 132px yer kaplıyordu.
  Alt kategorisi olanın yanında ok var; seçilince altında ikinci sıra açılıyor,
  başında "Tümü" duruyor. Kasadaki desenin mobil hâli.
- **Ürün kartı rozeti yalnız bu turu sayıyor.** Eskiden adisyondaki toplamı
  gösteriyordu; saat önce gönderilmiş çay karışınca rozet "şu an ne giriyorum"
  sorusuna cevap vermiyordu. Gönderince sıfırlanıyor.
- **Şerit gönderilmeyi bekleyen kalemlerin hepsini gösteriyor**, yalnız sonuncuyu
  değil. Şeride gölge geldi, ürün ızgarasıyla aynı tonda olduğu için ayrı bir
  katman olduğu anlaşılmıyordu.
- **Adisyon penceresi:** başlık fiş ikonlu ve mercan, tur başlıkları okunur tona
  çıkıp ayraç çizgisi kazandı ("Yeni" mercan rozet), alttaki toplam solda alt
  alta. **Yeni tur artık en üstte** — garson az önce girdiğini görmek için uzun
  adisyonu sonuna kadar kaydırmıyor.
- **Pencere `AltSayfa` kabuğuna alındı.** Kabuk projede zaten vardı, işlem
  menüleri kullanıyordu; adisyon penceresi kullanmadığı için kapanışta animasyon
  oynamadan yok oluyordu.
- **Masa adı:** sayıdan ibaret masa başlıkta "5" diye duruyordu, artık "Masa 5".
  Adı zaten yazılı olanlar ("Bahçe 3") olduğu gibi kalıyor. Hem sipariş hem
  hesap ekranında.

### Kilitli masa kartı

Meşgul rozeti mobilde kartın **satır akışına giriyordu**: garson adı, tutar ve
süre bir satır aşağı kayıyordu. Kilitli kart sadeleşti — **masa adı ve ortada
kilit ikonu + içerideki kişi**, başka hiçbir şey. Gerekçe: içeride biri varken o
rakamlar zaten değişiyor, yanlış rakam göstermektense hiç göstermemek doğru.

Kart masanın **kendi durum rengini koruyor**; griye çekilmedi çünkü gri
"ödendi"ye ayrılmış.

### Kusur: hesap ekranı masayı üstüne almıyordu

Ramazan fark etti: kilit yalnız yeşil masalarda geliyordu. Sebep — `useMasayiTut`
yalnız sipariş ekranlarında çağrılıyordu (`mobil/Siparis.tsx`, `pages/Siparis.tsx`).
Kasada ödeme sipariş ekranının içinde olduğu için orası sağlamdı; açıkta kalan
tek yer **mobil hesap ekranıydı**. Biri tahsilat alırken masa kimseye meşgul
görünmüyordu — **iki kişi aynı hesaptan habersiz ödeme alabiliyordu.**

`mobil/Adisyon.tsx` artık masayı üstüne alıyor, devralınırsa uyarı verip masalara
dönüyor. Ders: masa üzerinde iş yapan **her** ekran işareti tutmalı; kural ekran
başına değil, masaya dokunan iş başına.

### Şerit çipleri ve ürün notu

Şeritteki bekleyen kalem çipleri **mercandan beyaza** döndü (siyah yazı, ince
çerçeve) ve **yana kaymak yerine alt satıra geçiyor**. Mercan çip kalabalık
turda göz yoruyordu. Şeridin boyu artık değişken olduğu için ürün ızgarasının
alt boşluğu sabit sayıdan değil, şeridin ölçülen yüksekliğinden geliyor
(`--serit-boy`).

**Ürün notu penceresi** genişledi: dört satırlık alan, ikonlu başlık, 200
karakter sayacı. Tek satırlık kutuda uzun tarif yazılırken başı kayboluyordu.

**Mercan kullanımı gözden geçirildi ve yeterli bulundu** — Gönder düğmesi,
seçili alt kategori, "Yeni" tur rozeti, pencere başlıkları. Ayrı bir azaltma
işi açılmadı.

### Sonraki seansın ilk işi

**Sipariş ekranı turunun kalanı** (bölüm 0): uzun basmanın gizli kalması, ürün
kartında kategori rengi, adisyon notu ve müşteri seçme.

---

## 22 Ağu 2026: Mobil sipariş turunun kapanışı ve hesap ekranı

**Sipariş ekranı turu bitti.**

- **Uzun basma kaldırıldı.** Ürün kartı düz `onClick`. Gerekçe Ramazan'dan:
  seçimi olan üründe kısa dokunuş zaten pencereyi açıyor, ikinci bir gizli
  hareket tutmanın anlamı yok.
- **Ürün kartında renk şeridi**: sol kenarda 4px, ürünün kendi rengi yoksa
  kategorisininki, ikisi de yoksa şerit çıkmıyor. Kartın tamamını boyamak
  ızgarayı alacalı yapıyordu.
- **Adisyon bilgileri** ⋮ menüsüne girdi (ad, hesap notu, müşteri adı,
  telefon). Ekranda duruyor, **Gönder** ile sepetle aynı kayıtta yazılıyor;
  bilgi değişince de Gönder yanıyor (`bilgiImza`).
- **Şerit düğmesi duruma göre**: gönderilmemiş kalem varsa Gönder, hepsi
  gönderilmişse Hesap/Öde (yetkiye göre) ve adisyon ekranına gidiyor, adisyon
  boşsa düğme yok.

**Buçuklu adet.** Veritabanı zaten `numeric(10,3)`ti, engel arayüzdeydi.
Mobil kalem penceresinde rakam artık yazı kutusu: −/+ birer birer, rakama
dokununca ondalık tuş takımı açılıyor (`inputMode="decimal"`, virgül kabul).
Yeni ortak yardımcı **`adetGoster`** (`para.ts`): tamsayıda "1", buçukluda
"0,5". Adedin yazıldığı her yer buradan geçiyor — kasa adisyonu, mobil adisyon,
sepet şeridi, istasyon kartları, tahsilat paneli, fiş.

### Hesap ekranı — bozuk düzen ve eksikler

Ramazan'ın ekran görüntüsü işi çözdü: sorun tasarım değil, **bozuk sütun
tanımıydı**. `.m-adisyon .m-kalem` iki sütun tanımlıydı ama satırda üç öğe var;
adet bütün genişliği kaplıyor, tutar alt satıra düşüyordu. Üç sütuna çevrildi
(adet · ad · tutar). Kalemler **tek kartın içinde**, aralarında ince çizgi —
her satırın kendi çerçevesi ekranı kutu yığınına çeviriyordu.

- **Kalan satırı** alınan ödemelerin altına eklendi (mercan).
- **Ödeme satırları üç sütunlu ızgara**: tip · tutar (sağa yaslı) · geri alma.
  Esnek dizilimde rakamlar alt alta tutmuyordu.
- **Ödemeyi geri alma** mobile geldi: satırın ×'i sebep soran onaya düşüyor,
  kaydedilmiş tahsilatın kimliği denetime gidiyor. Yalnız `odeme.iade`.
- **Alt çubuk sadeleşti**: "Kaydet" kalktı (ödemeler zaten anında yazılıyor),
  küçük "Tutar gir" + geniş "₺X öde".
- **İndirim** başlıktaki "%" kutusundan çıkıp dökümün içine girdi: kesikli
  mercan çerçeveli, "İndirim uygula ›" yazan satır. Yeri toplamın **üstü** —
  toplam ondan sonra çıkıyor.

### Kusur: fiş kısmi ödemeyi göstermiyordu

Kısmen ödenmiş hesabın fişinde alınan para ne satırda görünüyor ne toplamdan
düşülüyordu; müşteri ikinci kez tamamını ödemeye kalkıyordu. `fis.ts` artık
TOPLAM'ın altına her tahsilatı (`Ödendi · Nakit  -₺100,00`) ve kalın **KALAN**
satırını basıyor. Hesap tamamen ödendiyse bu satırlar çıkmıyor.

### Kusur: mobilde KDV hiç görünmüyordu

Satır `ozet.kdv > 0` şartına bağlıydı; **KDV dahil** çalışan işletmede bu değer
sıfır olduğu için satır büsbütün kayboluyordu. Vergi artık kasadaki gibi
`kdvDokumu` ile ayrıca hesaplanıp iki modda da yazılıyor — dahilse
"KDV (fiyata dahil)" etiketiyle, toplamı değiştirmeden.

**Açık kalan:** sipariş ekranının sepet dökümü hâlâ eski davranışta (KDV dahil
modda satır çıkmıyor). Kuver/garsoniyeyi **o hesaba özel açma-kapama** ne
kasada ne mobilde var — okunup geri yazılıyor ama elle değiştirilemiyor.

---

## 22 Ağu 2026 (2. seans): Canlıya çıkış öncesi güvenlik denetimi

Ramazan "canlıya geçersek açık var mı" diye sordu; seans baştan sona denetim
ve düzeltme oldu. Sıradaki iş listesindeki madde bu seansta işlenmedi.

### Denetimin sonucu: yapı sağlam, kapılar açık kalmıştı

Kod incelemesi + Supabase panelinin canlı denetimi yapıldı. Temel doğru
kurulmuştu: **45 tablonun 45'inde de RLS açık**, açık depolama kovası yok,
`auth` şeması dışarıya kapalı, `service_role` anahtarı hiçbir yerde geçmiyor,
`innerHTML`/`eval` yok, köprü dinleyen bir port açmıyor.

**Boşa çıkan şüphe:** göç dosyalarında 4 Ağu'daki `using (true)` politikaları
(`adisyonlar_hepsi`, `tahsilatlar_hepsi`…) hiç düşürülmemiş görünüyordu. Canlıda
yoktular — bir noktada elle silinmişler. `pg_policies` sorgulanmadan karar
verilmemeli; dosyalar canlının aynası değil.

**Yanlış çıkan tespit:** "köprü şifreyi düz metin saklıyor" denmişti; köprü
zaten Windows DPAPI ile şifreliyor (`kopru/elektron/kimlik.js`). Görülen düz
metin dosya geliştirme makinesindeki `kopru/ayarlar.json`'du.

### Kapatılan açıklar

**`sql/2026-09-01-guvenlik-sikilastirma.sql`**
- `adisyonlar_eski` tablosunda `public` rolüne verilmiş, koşulu `true` olan bir
  politika duruyordu: anonim anahtarla okunup yazılabiliyordu. Kapatıldı.
- `personel_hesabi_yaz` personelin hangi işletmeden olduğuna bakmıyordu —
  yetkisi olan biri **başka işletmenin** personelinin şifresini değiştirip onun
  yerine girebilirdi. İşletme kontrolü eklendi.
- Yirmi beş tanımlayıcı fonksiyonun tamamı `anon` rolüne açıktı (Postgres'te
  yetki yazılmayan fonksiyon herkese açık doğuyor). Hepsi kapatılıp gerçekten
  gerekenler tek tek açıldı.

**İki tuzak:** toplu kapatmada köprünün çağırdığı beş fonksiyon (`kuyruktan_al`,
`kuyruk_sonuc`, `kopru_bildir`, `kopru_kapandi`, `yazici_durum_bildir`) ve
`siradaki_no` unutulsaydı sırasıyla fiş basılmaz, hiçbir adisyon açılmazdı.
`siradaki_no`'yu çağıran üç tetikleyici tanımlayıcı değil — kaydı yapan kişinin
yetkisiyle koşuyorlar.

### PIN sertleştirildi — `sql/2026-09-02-pin-sertlestirme.sql`

30 Ağu'da doğrulama sunucuya taşınmıştı ama **özet hâlâ tarayıcıya iniyordu**:
personel listesi `pin_hash` sütununu da çekiyordu. Satır güvenliği satırı korur,
sütunu korumaz. Özet tuzsuz SHA-256'ydı; 4 haneli, sıfırla başlamayan PIN'de
9.000 ihtimal saniyeler içinde çözülüyordu — yani bir garson yöneticinin PIN'ini
bulup onun yerine geçebilirdi.

- `pin_hash` **sütun yetkisiyle** gizlendi. Tablo yetkisi geri alınıp diğer
  sütunlar döngüyle verildi; sütun listesi elle yazılmıyor.
- Ekranın ihtiyacı olan evet/hayır için türetilmiş `pin_var` sütunu.
- Özet **bcrypt**'e geçti. `pin_ile_gec` eski SHA-256 özetini de kabul ediyor ve
  doğru PIN girildiği anda kaydı sessizce çeviriyor — kimse PIN'ini yeniden
  kurmadı.
- `pin_ata` ve `pin_kullanimda` fonksiyonları; `ozet()` istemciden silindi.

**Reddedilen öneri:** 5 yanlış denemeden sonra 2 saniye gecikme. Ramazan
istemedi ("sistemi kilitleyebilir" endişesi — tasarımda kilit yoktu, yalnız
gecikme vardı). PIN denemesi şu an sınırsız; bilinçli karar.

### Şifre kuralları sunucuya taşındı — `sql/2026-09-03-sifre-kurallari.sql`

Kurallar yalnız `sifreKurallari` içinde, yani tarayıcıdaydı: kural değil tavsiye
oluyordu. `sifre_gecerli(text)` aynı dört maddeyi veritabanında işletiyor;
`isletme_kur` ve `personel_hesabi_yaz` çağırıyor (ikincisinde hiç kural yoktu).

Kayıt ekranı yalnız uzunluğa bakıyordu — işletmeyi kuran yöneticinin şifresi
sonradan eklediği garsonunkinden zayıf kalabiliyordu. Artık aynı kural listesini
kullanıyor ve tikli listeyi gösteriyor.

**Uzunluk 6'da kaldı** (Ramazan'ın kararı; 8'e çıkarılmıştı, geri alındı).
Supabase panelindeki şifre ayarları bu üründe zaten işlemiyor: hesaplar Auth'un
kayıt akışından değil, kendi SQL fonksiyonumuzdan açılıyor.

### Kasa köprüsünün kendi hesabı — `sql/2026-09-04-yazici-hesabi.sql`

Köprü işletmecinin **yönetici hesabıyla** giriyordu. İki sakıncası vardı: kasaya
ulaşan biri (DPAPI aynı Windows kullanıcısı için çözülüyor) yönetici oluyordu; ve
işletmeci şifresini değiştirdiği gün köprü sessizce susuyordu.

- Yetkisiz bir hesap yetiyor: köprünün çağırdığı beş fonksiyonun **hiçbiri yetki
  sormuyor**. Hesabın rolü yok — `oturum_yetkisi` rolü olmayana hep false diyor.
- `yazici_hesabi_kur(telefon)` hesabı açıyor ya da şifresini yeniliyor, şifreyi
  **bir kez** döndürüyor. Saklanmıyor: saklasak "şifre kasada duruyor" sorununu
  ekranın içine taşırdık.
- Yeni yetki kodu **`yazici.hesap`** ("Kasa köprüsü şifresi oluşturma").
  Yazıcı tanımlamakla kasaya girebilen bir hesabın şifresini üretmek aynı
  ağırlıkta işler değil. Başlangıçta yalnız Yönetici'de; dağıtımı işletmeye ait
  — Ramazan'ın isteği.
- `personel.sistem` sütunu bu kaydı Personel listesinden gizliyor: "Kasa
  Köprüsü" bir insan değil, telefonu olmayan bir kayıt listede soru doğuruyor ve
  yanlışlıkla siliniyor. Yönetimi Yazıcılar sekmesinde.
- **Köprünün giriş ekranı değişmedi** — yine telefon + şifre. Numarayı işletmeci
  kendisi yazıyor (Ramazan'ın kararı; işletme kodundan üretme seçeneği elendi).

### Salon ekranı her canlı tazelemede zıplıyordu

Ramazan fiş basınca "ekran üç kere gidip geliyor" dedi. Sebep: bir fiş basılırken
kuyruk satırı üç kez değişiyor (kuyruğa düştü → köprü aldı → basıldı) ve Salon bu
tabloyu dinliyor. `salonuOku` her çağrıldığında `setYukleniyor(true)` yapıyordu,
yani ekran boşalıp yeniden çiziliyordu.

Bu seansın işlerinden gelmiyordu; **her** canlı tazelemede oluyordu — başka bir
garson kalem eklediğinde de. Halka artık yalnız ilk açılışta ve "Yeniden dene"de
çıkıyor. Mobil masalar ekranında sorun yoktu (orada "veri yoksa halka" yazılmış).

### Zil varsayılanı değişti

Yeni yazıcıda **"Fiş çıkarken zil çalsın" açık geliyor**. Önceki gerekçe
"kasadaki adisyon yazıcısı her fişte ötmesin"di; Ramazan'ın gözlemi daha güçlü
çıktı: yazıcı takılıyor, fiş çıkıyor ama ses çıkmıyor ve **sessizlik arıza gibi
görünüyor**. İstemeyen kasa yazıcısında anahtarı kapatıyor. Kayıtlı yazıcılar
kendi ayarlarıyla geliyor.

### Bağımlılık

`react-router` CSRF açığı (GHSA-qwww-vcr4-c8h2) kapandı — `npm audit fix`,
0 zafiyet.

### Panelden okunan durum (22 Ağu 2026)

CAPTCHA **kapalı**, sızmış şifre kontrolü **kapalı** (Free planda yok, Pro
gerekiyor), giriş hız sınırı 5 dakikada 30 (IP başına), dışarı açılan şemalar
`public` + `graphql_public`, açık kova yok, realtime yayınında 10 tablo.
