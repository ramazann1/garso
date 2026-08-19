# Adisyon & POS Sistemi — Master Plan
*Referans ürün: Adisyo (bulut tabanlı restoran/cafe POS). Bu doküman projenin tek doğruluk kaynağıdır.*

---

## 1. ADISYO ÖZELLİK ENVANTERİ (Tam Liste)

### A. Satış & Adisyon Çekirdeği
- Masa siparişi, paket servis ve gel-al siparişlerinin tek panelden yönetimi
- Adisyon açma/kapama, ürün ekleme/çıkarma
- İndirim, ikram, iade, iptal işlemleri
- Parçalı ödeme ve hesap bölme
- ÖKC (yazarkasa POS) uyumlu ödeme akışı
- Kasa yönetimi (gider girişi, ciro takibi)
- Bulut tabanlı: telefon, tablet ve bilgisayardan erişim (iOS + Android mobil uygulama)

### B. Menü & Ürün Yönetimi
- Kategori → ürün → varyant/seçenek yapısı
- Kampanyalı/seçenekli ürün tanımlama
- QR menü (dijital menü, anlık fiyat/ürün güncelleme, uygulama gerektirmez)
- Tablet menü

### C. Mutfak Yönetimi (KDS)
- Siparişler oluşturulduğu anda mutfak ekranına düşer
- Hazırlanan/hazırlanmayan siparişlerin ayrı görüntülenmesi
- "Hazır" bildirimi → garsona anlık haber
- Ekran yerine termal yazıcı seçeneği (otomatik mutfak fişi)
- **Ürün bazlı yazdırma**: her ürün istenen yazıcıya yönlendirilebilir (yemek→mutfak, içecek→bar)
- Birden fazla mutfak ekranı/yazıcı (bölüm bazlı)
- Mutfak performans ölçümü (hazırlık süreleri)

### D. Stok & Maliyet Yönetimi
- Anlık stok miktarı ve hareket takibi
- Satışla otomatik stok düşümü
- Tükenen/kritik stok uyarı sistemi
- Reçete ve maliyet takibi, ürün bazlı karlılık

### E. Paket Servis & Kurye
- Kurye yönetimi, siparişe kurye atama (harita üzerinden)
- Kuryelerin canlı harita takibi
- Teslimat istatistikleri (kurye performansı, bölge yoğunluğu)
- Teslim edilen/iptal edilen sipariş raporları

### F. Müşteri Yönetimi
- Cari hesap / veresiye takibi, geciken ödeme kontrolü
- Müşteri kayıtları ve sipariş geçmişi
- Sadakat programı (puan, kampanya, segmentasyon)
- Garson çağrı sistemi

### G. Raporlama & Analiz
- Gün sonu raporu
- Ürün satış raporları, ürün bazlı karlılık
- Saat bazlı ciro analizi
- Vardiya ve personel performansı
- Stok hareket raporları
- Ödeme yöntemi dağılımı
- Şube/marka/ürün bazlı karşılaştırmalı raporlar

### H. Çoklu Şube (Zincir Yönetimi)
- Tüm şubeleri tek hesaptan yönetim
- Merkezi menü/fiyat güncellemesi, ürünleri seçili şubelere dağıtma
- Merkez-şube ürün transferi (kayıp/kaçak önleme)
- Karşılaştırmalı şube raporları
- Dakikalar içinde yeni şube açma

### I. Entegrasyonlar
- **Yemek platformları:** Yemeksepeti, Getir, Trendyol Go, Migros Yemek, Fuudy
- **Otel sistemleri:** HotelRunner, HMS, Hotelier 101, Butik Soft (misafir ekstresi otomatik odaya işlenir)
- **Muhasebe:** Bizim Hesap vb.
- **Ödeme/ÖKC:** Ingenico vb. yazarkasa POS cihazları
- **E-Dönüşüm:** e-Fatura, e-Arşiv, GİB uyumlu e-Adisyon altyapısı
- **Açık API:** developers.adisyo.com (dış geliştirici entegrasyonu)

### J. İş Modeli Notları
- SaaS abonelik: ~1.040₺/ay başlangıç paketi; entegrasyonlar ayrı ücretli (225₺+)
- 15 gün ücretsiz deneme, kurulumsuz/eğitimsiz başlangıç (self-service onboarding)
- Donanım satışı (POS terminal, fiş yazıcı) ek gelir kanalı
- Bayilik ağı ile satış
- Segment bazlı pazarlama: restoran, cafe, fast food, pizza, burger, otel, bulut mutfak, sezonluk işletme

---

## 2. YOL HARİTASI

### FAZ 0 — Temel & Mimari (1-2 hafta)
Amaç: Sonradan asla değişmeyecek kararları doğru vermek.
- [ ] Multi-tenant mimari (işletme → şube → kullanıcı hiyerarşisi)
- [ ] Veri modeli: Adisyon tipi baştan `masa | paket | gel-al` destekli
- [ ] Teknoloji: PostgreSQL + Node.js/NestJS (veya FastAPI) + React/TS (PWA)
- [ ] WebSocket altyapısı (gerçek zamanlı masa/mutfak senkronizasyonu)
- [ ] Rol/yetki sistemi (patron, müdür, kasiyer, garson, mutfak, kurye)
- [ ] Para hesaplamalarında kuruş hassasiyeti (integer kuruş, asla float değil)

### FAZ 1 — Satış Çekirdeği / MVP (4-6 hafta)
Amaç: Tek şubeli bir cafe'nin günlük operasyonu tamamen dönebilmeli.
**20 Ağu 2026'da tamamlandı.** Bir cafe'nin günlük operasyonu baştan sona
Garso'da dönüyor.
- [x] Masa haritası (bölge/salon desteği), masa açma-taşıma-birleştirme
- [x] Adisyon: ürün ekleme/çıkarma, not, ikram, indirim, iptal (yetki kontrollü)
- [x] Kategori/ürün/varyant/seçenek yönetimi
- [x] Ödeme: nakit, kart, parçalı ödeme, hesap bölme (ürün bazlı + tutar bazlı)
- [x] Kasa: açılış/kapanış, gider girişi, gün sonu (Z raporu mantığı)
- [x] Temel raporlar: gün sonu, ürün satışları, ödeme dağılımı — "Analiz" ekranı
- [x] Basit personel girişi (PIN ile hızlı kullanıcı değişimi)

### FAZ 2 — Operasyon (4-6 hafta)
Amaç: Yoğun bir restoranın mutfak-servis akışını taşıyabilmeli.
- [ ] KDS mutfak ekranı: sipariş kartları, hazır bildirimi, süre takibi
- [ ] Yazıcı yönetimi: ürün→yazıcı yönlendirme, mutfak fişi, adisyon çıktısı (ESC/POS)
- [ ] Paket servis + gel-al akışı, müşteri/adres kayıtları
- [ ] Kurye atama ve teslimat durumu takibi
- [ ] Garson mobil sipariş ekranı (PWA)
- [ ] Personel + PIN girişi; adisyonu açan garson masa kartında, turu yazan
      garson tur başlığında (`turlar.garson_id`) — karar 7
- [ ] Offline dayanıklılık: bağlantı kopunca kuyruklama, senkronizasyon.
      Üç aşamalı. **Aşama 1 (kabuk + bağlantı durumu) 20 Ağu 2026'da bitti:**
      service worker, `baglanti.ts`, çevrimdışı şeridi, sarılmış `fetch`.
      Aşama 2 yerel okuma önbelleği (menü/masa/ayar + oturumun cihazda
      hatırlanması), aşama 3 yazma kuyruğu. Ayrıntısı `garso-tasarim.md`'de.
- [x] **İşletme kaydı ekranı (yeni müşteri açılışı).** 19 Ağu 2026'da yapıldı —
      `isletme_kur` fonksiyonu ve `pages/Kayit.tsx`. Örnek salon ve menüyle
      birlikte kuruluyor. Kötüye kullanım koruması da eklendi.
      Aşağıdaki not neden gerektiğini anlatıyor.
      14 Ağu 2026'da satır
      güvenliği açılınca ortaya çıktı: artık giriş yapmamış bağlantı hiçbir
      satır yazamıyor, dolayısıyla hiç hesabı olmayan yeni bir işletme kendi
      ilk yöneticisini oluşturamıyor (hesap açmak için giriş, giriş için hesap
      gerekiyor). Çözüm: işletme adı + telefon + şifre alan bir kayıt ekranı ve
      bunu tek işlemde yapan, satır güvenliğini aşan bir veritabanı fonksiyonu
      (`isletme_kur`) — hem `isletmeler` satırını, hem ilk yönetici personelini,
      hem Auth hesabını açar. Kötüye kullanıma açık tek kapı burası olacağı için
      hız sınırı/doğrulama düşünülmeli. Ramazan'ın kendi kurulumu bundan
      etkilenmiyor; ürün satışa çıkmadan önce şart. **20 Ağu 2026'da kapandı:**
      IP başına hız sınırı (24 saatte 2, 7 günde 5 işletme) ve değişmez işletme
      kodu — ayrıntısı `garso-tasarim.md`'de.

### FAZ 3 — Büyüme Özellikleri (6-8 hafta)
- [ ] QR menü (public menü sayfası, anlık güncelleme)
- [ ] Stok: reçete, otomatik düşüm, kritik stok uyarıları, maliyet/karlılık
- [ ] Gelişmiş raporlar: saatlik ciro, personel performansı, karşılaştırmalı analizler
- [ ] Cari müşteri / veresiye modülü
- [ ] Sadakat programı (puan, kampanya)
- [ ] Çoklu şube: merkezi menü yönetimi, şube karşılaştırma raporları

### FAZ 4 — Entegrasyonlar & Ticarileşme (sürekli)
- [ ] Yemeksepeti / Getir / Trendyol Go entegrasyonları
- [ ] ÖKC / yazarkasa POS entegrasyonu (TSM firmaları ile)
- [ ] e-Fatura / e-Arşiv / e-Adisyon (GİB)
- [ ] Muhasebe entegrasyonları
- [ ] Kurye canlı harita takibi
- [ ] Public API + dokümantasyon
- [ ] Abonelik/faturalama sistemi, deneme süresi, self-service onboarding

---

## 3. KRİTİK TASARIM KARARLARI (Başa Dönmemek İçin)
1. **Adisyon = sipariş tipi bağımsız:** Masa, paket, gel-al hepsi aynı "Order" nesnesi; sadece tip ve kaynak alanı değişir. Platform siparişleri (Yemeksepeti vb.) de aynı nesneye map edilir.
2. **Her para hareketi immutable kayıt:** İptal/iade silme değil, ters kayıt olarak tutulur (denetim ve gün sonu tutarlılığı için).
3. **Multi-tenant + şube baştan:** tenant_id ve branch_id her tabloda gün 1'den itibaren.
4. **Yazdırma soyutlaması:** "Print job" kuyruğu → hedef yazıcı eşlemesi; KDS ekranı da aynı kuyruğun bir tüketicisi.
5. **Olay tabanlı senkron:** Sipariş olayları (eklendi, hazır, ödendi) WebSocket ile yayınlanır; KDS, garson ekranı, kasa hepsi aynı olay akışını dinler.
6. **Yetki matrisi:** İptal, indirim, ikram gibi hassas işlemler rol bazlı; her işlemde "kim yaptı" logu.
7. **Garson iki düzeyde tutulur:** Masa kartında görünen isim adisyonu **açan**
   garsondur (salonda "bu masa kimin" sorusunun cevabı, tek isim). Sonradan ürün
   yazan garson ise **turun** sahibidir — `turlar.garson_id` ile tutulur ve
   adisyondaki tur başlığında görünür ("2. tur · 00:42 · Ayşe"). Prim/hakediş
   raporu tur bazlı çıkar. Personel + PIN sistemiyle birlikte yapılacak, sütun
   şimdiden boş açılmıyor. *(9 Ağu 2026)*

---

## 4. AÇIK SORULAR (Netleştirilecek)
- İlk hedef müşteri profili: kendi işletmen mi, yoksa direkt satışa mı çıkacağız? (MVP kapsamını etkiler)
- Donanım stratejisi: mevcut Android POS cihazlarında mı çalışacak, tarayıcı yeterli mi?
- ÖKC zorunluluğu: hedef işletmeler yeni nesil yazarkasa kullanıyor mu? (Entegrasyon önceliğini belirler)

---

## 5. CANLI PANEL İNCELEMESİ (pos.adisyo.com — kendi işletme panelimizden)
*Adisyo 3.0 web POS'unda birebir gezilerek çıkarıldı.*

### Uygulama Yapısı & Rotalar (SPA, hash-router)
| Ekran | Rota |
|---|---|
| Kontrol/Masa ekranı | `/app/control-page` |
| Sipariş/adisyon ekranı | `/app/order/{tip}/{adisyonId}` |
| Ürün tanımlama | `/app/product-definition` → detay: `/app/product-detail/{şube}/{ürünId}` |
| Masa/Bölgeler | `/app/table-area-definition` |
| Özellikler (seçenek grupları) | `/app/features` |
| Mutfak grupları | `/app/kitchen-groups` |
| İndirimler | `/app/discounts` |
| Ödenmezler | `/app/restaurant-paidlesses` |
| Kuver/Garsoniye | `/app/service-operations` |
| Kullanıcılar / Yetkiler | `/app/users`, `/app/rights` |
| KDS Mutfak ekranı | `/app/kitchen` |
| Gün sonu raporu | `/app/report-settlement` |

### Sol Menü Haritası (tam)
- Ana Sayfa (masa/bölge kontrol ekranı)
- Entegrasyon İşlemleri → Ürün Eşleştirme Ekranı, Entegrasyon İşlemleri
- Dijital Menü
- Tanımlamalar → Masa/Bölgeler, Menü/Ürünler, Birimler, Özellikler, KDV Oranları, İndirimler, Mutfak Grupları, Müşteriler, Ödenmezler, Kuver/Garsoniye
- Sipariş, Mutfak (KDS)
- İşlemler → Stok İşlemleri, Gider/Masraf, Zayi İşlemleri
- Kullanıcılar → Kullanıcılar, Yetkiler
- Raporlar → Ürün Satış, Gün Sonu, Vardiya Satış, Restaurant İstatistikleri, Stok Durum, Fire
- Uygulama Mağazası (ek modül satışı — bizim için de iyi gelir modeli)

### Kontrol (Masa) Ekranı
- Üst sekmeler: **Bölgeler | Siparişler**; bölge tabları kısaltma + doluluk sayacı (örn. `B 1/20`, `S 5/40`) — bölge başına masa listesi grid.
- Dolu masa kartı: garson adı, müşteri adı, masa etiketi, tutar, **açık kalma süresi** (örn. "7s 2dk") + üç nokta menüsü. Renk = durum.
- Sol kısayollar: **Gel Al** ve **Paket** sipariş açma (masasız adisyon tipleri ana ekrandan tek tık).
- Üst araçlar: Yaklaşan Ödeme uyarısı, **ÖKC** cihaz seçimi (bilgisayar başına ÖKC eşleme + aç/kapa), yayın/çağrı ikonları, yenile, **kilit** (ekran kilidi → PIN ile kullanıcı değişimi mantığı).

### Sipariş Ekranı (`/app/order`)
- Sol panel: adisyon kalemleri, "Adisyon: N", **Sipariş Durumu: Hazırlanıyor** (KDS ile senkron), Toplam Tutar, indirim etiketi butonu, **KAYDET**.
- Üst: masa adı (düzenlenebilir), adisyon notu, müşteri atama, **kişi sayısı (Misafir Sayısı) modalı** — masa açılırken kuver için kişi sayısı sorulyor.
- Orta: **Ürün Adı veya Barkod ile Arama** + renk kodlu kategori sekmeleri (2+ sayfa, ok ile geçiş). Kategoriler: Favori Ürünler ilk sırada (hız için favori sistemi).
- Ürün kartında fiyat görünür; ürüne özellik grubu bağlıysa seçim ekranı açılır.

### Ürün Veri Modeli (ürün formundan birebir)
`Ürün { kategoriler[], ad, renk, KDV grubu, mutfak grubu (yazıcı/KDS yönlendirme), ürün kodu, porsiyonlar[], stok takibi, menü tanımı }`
`Porsiyon { ad (birim listesinden), varsayılan mı, fiyat, maliyet tutarı, barkod, reçete, özellik grupları[] }`
→ **Düzeltme (31 Tem 2026):** barkod, reçete ve özellik grubu bağlama ürün seviyesinde değil, **porsiyon seviyesinde**. Aynı ürünün "Tam" ve "Yarım" porsiyonu ayrı barkod, ayrı reçete, ayrı özellik grubu taşıyabiliyor.
- Ürün kartı aksiyonları: favori, renk (palette), kopyala.
- **Özellikler** ayrı modül: `ÖzellikGrubu { ad, seçimTipi: Tekli|Çoklu, özellikler[] }` → ürünlere bağlanıyor. (Bizde örnek: "Kahve Özellikleri" tekli, "AROMALAR" çoklu.)
- Mutfak Grupları: ürün → grup → hedef KDS ekranı/yazıcı. (Bizde: Mutfak, Bar, Nargile — 3 ayrı KDS.)
- Kuver/Garsoniye: ad + tip (Yüzde/Tutar) + otomatik ekleme anahtarı.
- Ödenmezler: kişi listesi (Ad, Unvan) — protokol/personel hesabı yemeyen kişiler.
- İndirimler: ad + tür + tutar tablosu (ön tanımlı indirimler).

### Toplu Ürün İşlemleri (31 Tem 2026'da keşfedildi)
Kategori listesinin üstündeki ⋮ menüsünde gizli — ekranda göze çarpmıyor, ilk turda kaçmış. Dört madde:
**Toplu Ürün İşlemleri | Kategorileri Sırala | Ürünleri İndir | Ürünleri Yükle**
- **Toplu Ürün İşlemleri:** "seç → toplu aksiyon" değil, **Excel benzeri düzenlenebilir tablo**. Tüm ürünler alt alta; her satırda porsiyon/fiyat (+ "sipariş türüne göre özelleştir"), Ürün KDV Grubu, zorunlu özellik ve porsiyon seçimi, stok takibi, satılabilir, mutfak grubu. Üstte arama + kategori filtresi + **"Tüm Kategorileri Görüntüle"** + "Ürün adına göre sırala". Tek **Kaydet** ile hepsi birden yazılıyor.
- **Ürünleri İndir / Yükle:** menünün Excel ile dışa/içe aktarımı — ilk kurulumda ve toplu fiyat güncellemede kritik. *(3 Ağu 2026'da canlı hesapta incelendi.)* Ürünler ekranında sol üstteki ⋮ menüsünde: `Toplu Ürün İşlemleri`, `Kategorileri Sırala`, `Ürünleri İndir`, `Ürünleri Yükle`. Yükleme 3 adımlı sihirbaz (şablon indir → dosya seç → sonuç), girişte "günlük 400 ürün" limiti uyarısı. **Boş şablonun sütunları:** Ana Kategori · Alt Kategori · Ürün Adı · Ürün Kodu · Barkod · Barkod Tipi · Ürün Birimi · KDV Oranı · Masa/Gel-Al/Paket Fiyatı. **İndirilen menüde bir sütun fazla: `entegrasyon kodu`** — ürünün kimliği. Aynı isimli iki ürün (farklı kategorilerde "NATURAL SHISHA") bu kodla ayrılıyor; ürün iki kategorideyse iki satır çıkıp ikisinde de aynı kod duruyor. Maliyet, favori ve görünürlük Adisyo'nun Excel'inde yok. Not: `Barkod Tipi` sütununa birim ("Adet") yazılmış, Adisyo'nun kendi tutarsızlığı.
→ **Klon için:** zam dönemlerinde tek tek ürün açmak işkence; toplu düzenleme tablosu Menü Stüdyosu'nun en çok işe yarayacak eklentilerinden biri.
→ **Garso durumu (1 Ağu 2026):** "Kategorileri Sırala" ve "Ürünleri Sırala" karşılığı `SiralamaModal` ile yapıldı (sürükle-bırak + A-Z). **"Tüm Kategorileri Görüntüle"** arama kapsam seçicisinin bir modu olarak geldi. Kalan: toplu düzenleme tablosu ve Excel indir/yükle.
→ **Garso durumu (2 Ağu 2026):** Toplu düzenleme tablosu yapıldı — Adisyo'da ⋮ menüsünde gizliyken bizde Menü Stüdyosu'nun dördüncü sekmesi (**Toplu Düzenle**). Satır = porsiyon; ad, kod, birim, fiyat, maliyet, tür fiyatları ve görünürlük anahtarları tabloda. Kategori bazlı toplu işlem modalı ayrı iş olarak duruyor — o alanların (KDV, mutfak grubu, stok) veri modeli henüz yok. Kalan: Excel indir/yükle.
→ **Garso durumu (3 Ağu 2026, 2. seans):** Excel indir/yükle yapıldı — Menü Stüdyosu'nun **İçe/Dışa Aktar** sekmesi. Adisyo'dan ayrıldığımız yerler: (1) kimlik sütunu "entegrasyon kodu" değil **Ürün No**, açıkça anlatılıyor; (2) **maliyet** sütunu var; (3) tek sihirbaz yerine tek ekran, yazmadan önce **özet + atlanan satır listesi + açılacak kategoriler** gösteriliyor; (4) menüde olmayan kategori adı **açılıyor** (Adisyo'nun ne yaptığı bilinmiyor); (5) **değişmemiş ürün yazılmıyor**; (6) aynı ürünün satırları çelişirse ürün yazılmayıp çelişki gösteriliyor. Kalan: kategori bazlı toplu işlem modalı.

### Menü/Ürünler Modülü — Derin Tur (31 Tem 2026)
*Tüm ⋮ menüleri, dropdown'lar ve kapalı anahtarlar tek tek açılarak çıkarıldı.*

**Kategori seviyesi**
- **Alt kategori desteği:** kategori formunda opsiyonel "Üst Kategori" alanı, ⋮ menüsünde "Alt Kategori Ekle". Kategoriler düz liste değil, ağaç.
- **Kategori ⋮ menüsü:** Toplu İşlemler | Ürünleri Sırala | Yeni Ürün Ekle | Alt Kategori Ekle | Düzenle | Kategoriyi Sil.
- **Kategori bazlı Toplu İşlemler** (Excel tablosundan ayrı): o kategorideki *tüm* ürünlere tek seferde mutfak grubu, KDV grubu, "özellik ve porsiyon seçimi zorunlu", stok takibi, satış ekranında göster uygular. Üstte kırmızı uyarı bandı.
- Kategori parametreleri: **Satış Ekranında Göster**, **Mutfak Ekranında Göster**.
- Kategori adı **25 karakter sınırı + canlı sayaç**. Renk: 12 hazır ton + "renksiz" + **serbest hex girişi**.
- **Sıralama ayrı modal:** sürükle-bırak liste + numaralı sıra + **"A-Z" tek tıkla alfabetik sıralama**. Aynı desen hem kategoriler hem de her kategorinin ürünleri için ("Ürünleri Sırala").

**Ürün seviyesi (ürün detay sayfası)**
- **Sipariş türüne göre fiyat:** "Sipariş türüne göre özelleştir" linki fiyat alanını dörde bölüyor — **Tek Fiyat / Masa Siparişi / Gel Al Siparişi / Paket Siparişi**, hem de **porsiyon bazında**. Paket servis fiyatı masa fiyatından farklı olabiliyor.
- Sol paneldeki ürün anahtarları: Favori Ürün, Satış Ekranında Göster, **KDV hariç olsun**, **Özellik ve Porsiyon Otomatik Sorulsun**, **Mutfak Ekranında Göster**.
- Porsiyon bazlı açılır bölümler: **Reçeteli ürün kullan**, **Barkod Ekle**, **Özellik Tanımlama** (grup seçimi kart+checkbox modalından).
- Ürün bazlı: **Stok takibi yap**, **Menü Tanımla**.
- **Menü/kampanya modeli:** menü = "menü kategorisi" grupları. Her grup: menü başlığı + **seçilebilir ürün sayısı** (örn. 1) + satırlar `{ ürün, porsiyon, miktar, ek fiyat, varsayılan mı }`. Bir kategorinin tüm ürünleri tek linkle eklenebiliyor. Menü ürününün **maliyeti içeriğe göre sipariş anında otomatik** hesaplanıyor.
- Ürün kartı üstünden **panele girmeden hızlı renk değiştirme** (12 ton + renksiz + hex).
- Arama çubuğunda **kapsam seçici: Tüm Kategoriler / Aktif Kategori**.

**Komşu tanım ekranları**
- **Birimler** (`Porsiyon/Birim Yönetimi`): merkezi liste — Tam, Yarım, Bir buçuk, AD, Adet, Kg. Porsiyon adı serbest metin değil, **bu listeden seçiliyor**. Böylece aynı ürün farklı porsiyon seçenekleriyle satılabiliyor.
- **KDV Oranları:** satırlar `{ sıra, tanım adı (örn. Yiyecek/İçecek), oran (%0/%1/%10/%20), varsayılan mı }`, sürükle-bırak sıra, **en fazla 8 tanım**, tek Kaydet.
- **Mutfak Grupları:** grup adı + **"Pişirme aşaması"** ve **"Paketleme aşaması"** kutuları. Varsayılan durum akışı Hazırlanıyor → Hazırlandı; bu kutularla **her istasyonun KDS akışı ayrı ayrı uzatılabiliyor**.
- **Özellikler:** grup satırı açılınca özellikler chip olarak, ek fiyatlılar "+₺1,00" rozetiyle. Grup formunda: seçim tipi (Tekli/Çoklu), **Reçeteli ürün kullan**, **Özellik seçimi zorunlu olsun**; özellik satırında ad + ekstra tutar + **Varsayılan** + sıralama tutamacı.

→ **Klon için çıkarımlar:** (1) Sipariş türüne göre fiyat, veri modelinde porsiyon fiyatının tek sayı olmadığı anlamına geliyor — Garso'da baştan düşünülmeli. (2) Barkod/reçete/özelliğin porsiyon bazlı olması stok ve KDS tarafını doğrudan etkiliyor. (3) Birim listesinin merkezi olması yazım tutarlılığı sağlıyor ("Tam" / "tam" / "TAM" karmaşası olmuyor). (4) Mutfak grubu bazlı KDS aşamaları, kanban kolonlarımızın sabit olamayacağını gösteriyor.

→ **Garso durumu (1 Ağu 2026, 2. seans):** Bu bölümdeki maddelerden şunlar karşılandı — ürün kodu, ürün kopyalama, kategori/ürün sıralama modalı, kategori adı 25 karakter + sayaç, serbest renk (Adisyo hex kutusu veriyor, biz **renk çemberi** yaptık — kullanıcının kod bilmesi gerekmiyor), ürün ve kategoride satış/mutfak görünürlük anahtarları, seçenek grubunda zorunlu, arama + kapsam seçici. Ürün sırasını Adisyo global tutuyor; biz **kategori bazlı** yaptık (bir ürün iki kategoride farklı sırada durabiliyor). Kalan büyük başlıklar: alt kategori ağacı, KDV grupları, mutfak grupları + KDS aşamaları, menü/kampanya ürünü, reçete ve seçenek grubunun porsiyon bazına inmesi.

### Yetki Matrisi (6 rol × işlem bazlı onay kutuları)
Roller: **Garson, Mutfak, Kurye, Kasa, Müdür, Çağrı Merkezi**
Yetki kategorileri ve örnek izinler:
- *Tanım:* masa/bölge, genel tanımlar, kullanıcı işlemleri, yetkilendirme, stok girişi/sayımı, entegrasyon yönetimi, stok görüntüleme
- *Gider:* gider ekleme / düzenleme-silme (ayrı ayrı!)
- *Sipariş (en zengini):* sipariş alma, üründen çıkarma, ödeme sırasında indirim, sadece ön tanımlı indirim, ikram, ödeme alma, sipariş iptali, paket alma, gel-al alma, ürün taşıma, kapatılmış/iptal siparişi görüntüleme, açık hesaba aktarma, şube değiştirme, masa değiştirme/birleştirme/adisyon aktarma, ürün fiyatı değiştirme, miktar değiştirme, manuel sipariş yazdırma, manuel mutfak çıktısı, ÖKC kapatma, para çekmecesi açma, kuver/garsoniye ekleme
- *Mutfak:* KDS görüntüleme + sipariş hazırlama
- *Kurye:* kurye işlemleri, ödeme tipi değiştirme
- *Rapor:* tüm raporlar, gün sonu, gider işlemleri, kasa açılış/kapanış tutarı değiştirme
- *Ürün:* ürün/özellik/menü/reçete/birim tanımlama, fiyat düzenleme, entegrasyon ürünleri + fiyatları
→ **Klonda yetkiler tablo değil, işlem-bazlı granüler permission sistemi olmalı.**

### Gün Sonu Raporu Yapısı
- Rapor günü mantığı: takvim günü değil, **kasa günü** (örn. 08:45 → ertesi 08:40).
- Sekmeler: Özet, Tüm Adisyonlar, Yoğunluk Raporu, Masa Siparişleri, Gel Al, Paket, Açık Hesap Hareketleri, Ödenmezler, Garson Bazlı Satışlar, İptal/İadeler, Masraflar, Zayi Olan Ürünler, **Silinen Ürünler, Silinen Tahsilatlar** (kayıp/kaçak denetimi!)
- Özet kartları: Net Kâr, Alınan Ödemeler (Açık Hesap Tahsilatları + Adisyonlu Tahsilatlar ayrımı), Tahsil Edilmemiş Tutar, Toplam Masraf, Ödeme Tipi Detayı, İade Tutarı, Toplam Bahşiş (ciroya oran %), Kurye Başarı Yüzdesi, Kasa...
- Filtrele / İndir / Yazdır aksiyonları her raporda standart.

### KDS (Mutfak) Ekranı — 19 Ağu 2026 canlı turu

**Mutfak Grupları ayarı** (`#/app/kitchen-groups`)
- Tablo üç sütun: Grup Adı · Mutfak Durumu · Düzenle/Sil. İşletmede Mutfak, Bar,
  Nargile tanımlı.
- Düzenleme modalı çok sade: **ad + iki kutu** (Pişirme aşaması, Paketleme aşaması).
- Ekrandaki uyarı: varsayılan akış **Hazırlanıyor → Hazırlandı**. Kutular
  işaretlenirse o istasyonun akışı uzuyor. Yani aşama sayısı grup bazında,
  ekranın kolonları sabit değil.
- Ürün → mutfak grubu eşlemesi Menü/Ürünler ekranında yapılıyor; grup ekranı
  yalnızca tanımı tutuyor.

**KDS girişi** (`#/app/kitchen`)
- Tam ekran, arka planda bulanık salon görseli, ortada "Mutfak Grupları / Mutfak
  grubu seçiniz" kutusu. Seçilince `#/app/kitchen-detail/<grup id>`'ye gidiyor —
  her istasyon kendi ekranı, aynı anda birden çok cihazda açılabiliyor.

**KDS ana ekranı** (`#/app/kitchen-detail/40264`)
- Üst şerit: Geri Dön · **Sırala** · **Hazırlanıyor Aşaması** · **Hazırlanan
  Siparişler** · **Ayarlar**.
- Kartlar soldan sağa diziliyor, ızgara düzeni. Sayfalama yok, "Siparişler
  otomatik olarak yüklenecektir" — canlı akış, elle yenileme yok.
- **Sipariş kartı:** üstte sipariş türü ikonu (sarı daire), **personel adı /
  adisyon no**, altında **bölge / masa** (B / B 14), sağda **Tümü Hazır**.
- **Kalem satırı:** solda "Hazırlanıyor" etiketi + **süre sayacı**, ortada ürünü
  ekleyen kullanıcı ve **1 Tam - KÖFTE IZGARA** (miktar + porsiyon + ad),
  varsa altında **ürün notu kırmızıyla**, sağda **Hazır**.
- **Sayaç rengi süreye göre değişiyor:** yeni kalem soluk yeşil (00:00:11),
  bekleyen kalem koyu kırmızı (02:17:41). Eşik değeri ayarda görünmüyor.
- Aynı üründen iki adet girilince **iki ayrı satır** oluyor, miktar
  birleştirilmiyor — her porsiyon tek tek hazır işaretlenebilsin diye.
- **Yalnız kendi grubunun ürünleri düşüyor:** teste kola da eklendi, Mutfak
  ekranında görünmedi.

**Hazır akışı** (turda bizzat denendi, sonra sipariş iptal edildi)
- Kalemdeki **Hazır**'a basınca satır karttan anında siliniyor, onay sorulmuyor.
- **Tümü Hazır** kartın tamamını kapatıyor.
- Hazır olanlar **Hazırlanan Siparişler** panelinde toplanıyor: sağda açılan
  ikinci sütun, adisyon başlığı + **"Hazırlanma: 14:43:17"** saati + her kalemin
  yanında yeşil tik. Notlar burada da duruyor. Panel aç/kapa düğmesiyle
  gizleniyor, kapalıyken kartlar tüm genişliği kullanıyor.

**Aşama filtresi** — "Hazırlanıyor Aşaması" düğmesi "Mutfak Aşamaları" modalını
açıyor: hangi aşamaların ekranda görüneceğini seçtiriyorsun. Grup ayarındaki
kutular kapalıyken listede tek satır var (Hazırlanıyor Aşaması). Modalın kapatma
düğmesi yok, yalnız Kaydet ile çıkılıyor.

**KDS ayarları** (dişli, cihaz bazında)
- **Ürün yazı boyutu** — üç kademe (mutfak ekranı uzaktan okunuyor).
- **Ürünü ekleyen kullanıcıyı göster**
- **Hazır butonunu ürün bazında göster** — kapalıysa yalnız "Tümü hazır" kalıyor.
- **Ürün birimlerini göster** — "Tam", "Yarım" ifadeleri.

**Klon için çıkarımlar**
1. Ekran **iki bölgeli**: hazırlananlar (sol, geniş) + hazırlananlar (sağ, dar
   panel). Kanban kolonu değil; aşamalar grup bazında değiştiği için sabit kolon
   kurmak yanlış olur.
2. Süre sayacı ve renk eşiği KDS'in en operasyonel parçası — eşik bizde işletme
   parametresi olmalı, Adisyo'da sabit görünüyor.
3. Hazır'a onay sorulmaması bilinçli: mutfakta hız var. Bizde de onay modalı
   çıkmamalı; yanlışlıkla basılana **geri alma** daha doğru.
4. Miktarın satırlara bölünmesi veri modelini etkiliyor: adet değil **kalem
   bazlı hazır durumu** tutulmalı.
5. Ayarların cihaz bazında olması KDS'in tablet/TV'de açılacağını gösteriyor —
   sunucuda değil cihazda saklanmalı.
6. Ürün notu mutfağın en kritik bilgisi; kartta ayrı renkle duruyor.

### Klon İçin Yeni Çıkarımlar
1. Masa kartındaki "açık kalma süresi" ve bölge tabındaki doluluk sayacı küçük ama operasyonel olarak kritik detaylar.
2. "Favori Ürünler" kategorisi + ürün renklendirme = hız optimizasyonu; MVP'ye alınmalı.
3. Kişi sayısı (kuver) sipariş açılışında soruluyor — kuver ücreti otomasyonuyla bağlantılı.
4. "Silinen Ürünler / Silinen Tahsilatlar" raporları = personel suistimal denetimi; immutable kayıt kararımızı doğruluyor.
5. ÖKC eşlemesi cihaz (bilgisayar) bazında yapılıyor.
6. Ekran kilidi + hızlı kullanıcı değişimi kasa bilgisayarında tek oturum / çok kullanıcı modeliyle çalışıyor.
7. "Uygulama Mağazası" = modüllerin ayrı satılması (bizim Faz 4 gelir modeliyle örtüşüyor).

### İşlemler & Diğer Modüller (2. tur bulguları)
- **Stok İşlemleri** (`/app/stock-list`): iki işlem tipi — *Stok Sayımı* ve *Stok Girişi*; tablo: No, İşlem Tipi, Tarih, **Gelir Merkezi**, Kullanıcı. Tarih aralığı + işlem tipi filtresi, İndir.
- **Gider/Masraf** (`/app/restaurant-expenses`): Masraf Tipleri düzenlenebilir + masraf ekleme. Onboarding'de hazır gider grubu önerisi çıkıyor (Faturalar, Vergi, Personel, Temizlik, Gıda-İçecek, Teknik Servis, Kira, Diğer) — **hazır şablonla hızlı kurulum deseni, klonda da kullanılmalı.**
- **Zayi** (`/app/restaurant-wastages`): Ürün, Zayi Nedeni, Adet, Tarih + **Sorumlu Kişi** ataması ("Sorumluları Düzenle").
- **Müşteriler / Cari** (`/app/restaurant-customers`): müşteri kartı = ad + #müşteriNo + açık hesap bakiyesi; üstte Müşteri Sayısı ve **Toplam Bakiye** özeti. (Açık hesap sistemi = adisyondan "açık hesaba aktar" izniyle bağlantılı.)
- **Restaurant İstatistikleri** (`/app/restaurant-statistics`): sekmeler — Özet, Günlük Ciro, Grafik, Paket Siparişler, **Satış Kanalı Bazında**, Garson Bazlı, Ödenmez Bazlı. KPI kartları: toplam satış, günlük ortalama satış, adisyon sayısı, ortalama adisyon tutarı, **kişi başı ortalama** (kuverdeki kişi sayısı burada anlam kazanıyor!).
- Kontrol ekranı ek detayları: **Entegrasyon Yenilenme Süresi sayacı** (platform siparişlerini kaç sn'de bir çektiğini gösteriyor), Entegrasyon Durumları aç/kapa, **QR menü Aktif/Pasif** anahtarı, telefon çağrı ikonu (çağrı merkezi/CallerID entegrasyonu).

### Sipariş & Ödeme Akışı (B19 test adisyonunda birebir incelendi)
**Adisyon kalemi:** her satır = miktar + ürün + porsiyon + *sipariş giren kullanıcı* + seçilen özellikler (örn. "SOĞUK") + tutar. Özellik seçimi kalem adına ek olarak ve varsa ek ücretiyle yazılıyor: `SU (SOĞUK + ₺0,00)`.

**Kalem detay penceresi (üç nokta):**
- Adet artır/azalt, **birim fiyatı düzenle** (yetkiye bağlı)
- **Sipariş Grubu** (kurs/servis sırası gruplama — "Grup Yok" varsayılan)
- Ürünü Sil, **İkram Et**, **Ürünü Farklı Siparişe Taşı**
- Ürün Notu (mutfağa iletilen serbest metin)
- Porsiyon değiştirme (fiyat otomatik güncellenir)

**Üst bar (adisyon):** masa adı düzenleme, adisyon kopyala/aktar (add_to_photos), **manuel yazdır**, müşteri atama, kişi sayısı, adisyon notu (event_note). Adisyon no görünür. "Sipariş Durumu: Hazırlanıyor" = KDS durumu adisyon ekranına yansıyor.

**Alt aksiyonlar:** İndirim (local_offer), **ÖDE ₺tutar**, **HIZLI ÖDE** (tek dokunuş tahsilat), KAYDET.

**Ödeme ekranı (modal):**
- Üst aksiyonlar: Kaydet | **Öde ve Kapat** | **Öde ve Yazdır** | **Öde, Yazdır ve Kapat** → yazdırma/kapatma kombinasyonları ayrı butonlar (kasiyer hızı için).
- Sol: **Ödenmemiş Olanlar** listesi — her kalemde `Ödenen / Kalan` ayrı takip ediliyor; kaleme dokununca (touch_app) o kalem ödeme sepetine ekleniyor → **ürün bazlı hesap bölme**.
- Bölme modları: **Ürün Bazlı | 1/n (kişiye böl) | Ürün Bazlı İndirim | TOPLAM**
- Sağ: numpad (7-8-9 / Tüm, 1/n, İndirim kısayol tuşları, ondalık, backspace) + "Ödenecek Tutar".
- **TAHSİLAT GEÇMİŞİ**: adisyona yapılmış tüm parçalı ödemelerin dökümü.
- **Bahşiş ekle** ayrı buton.
- Ödeme tipleri İKİ grup: **ÖKC Ödeme Tipleri** (Ökc Nakit, Ökc Kredi Kartı, Ökc Edenred, Ökc Pluxee, Ökc Multinet, Ökc SetCard, Ökc Metropol, Ökc Paye, Ökc Havale — yazarkasaya iletilen) ve **Klasik Ödeme Tipleri** (Nakit, Kredi Kartı, Multinet, **Açık Hesap**). Açık Hesap = cari müşteri bakiyesine yazma.

**Klon için kritik çıkarımlar:**
1. Ödeme modeli: `Adisyon → Kalemler[] (her kalemde ödenenTutar) → Tahsilatlar[] (tip, tutar, ökc mi, bahşiş)` — kalem bazlı ödeme durumu tutulmalı.
2. "1/n" bölme kişi sayısını (kuver) kullanıyor — kişi sayısı boşuna sorulmuyor.
3. ÖKC'li ve ÖKC'siz ödeme tipi ayrımı Türkiye pazarında zorunlu tasarım kararı.
4. Yemek kartları (Edenred, Pluxee, Multinet, SetCard, Metropol, Paye) ayrı ödeme tipleri olarak birinci sınıf vatandaş.
5. "Öde ve Yazdır ve Kapat" tarzı birleşik aksiyonlar kasiyer için tık sayısını azaltıyor — UX'te aynen alınmalı.

---

## 6. MOBİL UYGULAMA İNCELEMESİ (iOS/Android, v1.0.198 — ekran görüntülerinden)

### Genel Mimari
- Alt navigasyon 4 sekme: **Masalar | Siparişler | Satışlar | Ayarlar**
- **Rol bazlı görünürlük:** Garson yalnızca Masalar+Siparişler görür; Satışlar ve Ayarlar yönetici iznine bağlı. Ayrıca ayrı bir **"Adisyo Patron"** uygulaması var (uzaktan işletme takibi) → operasyon ve patron yüzeyleri ayrılmış.
- Giriş: e-posta/telefon + şifre + Beni Hatırla (kasadaki PIN'li hızlı geçişten farklı; kişisel cihaz modeli).

### Masalar Sekmesi
- Bölgeler üstte yatay kaydırmalı chip'ler + doluluk sayısı: `B (0) | S (1) | IB (0) | DB (1)`
- Masalar 3 sütunlu grid; boş masa kartında **"+"** → tek dokunuşla adisyon açma.

### Siparişler Sekmesi (masasız adisyonlar)
- Aktif paket/gel-al listesi; sağ altta **FAB (+)** → alttan kayan sayfa: **Paket Sipariş | Gel Al Sipariş** iki büyük kart.

### Sipariş Ekranı (masaya girince)
- Üst bar: masa adı + **"Garson: <ad>"**, kalem düzenleme (kalem ikonu), **sepet ikonu** (adisyon görünümüne geçiş), üç nokta menü.
- Arama: "Ürün Adı veya Barkod ile Arama Yap".
- Kategoriler **renkli chip grid** (web'deki kategori renkleri mobile taşınmış), Favori Ürünler ilk sekme; altında seçili kategorinin ürün kartları (2'li/3'lü grid — Ayarlar'daki "Ürün Görünüm Sayısı" tercihine göre).
- Alt aksiyon barı: **Kaydet (koyu) | Öde (yeşil) | Hızlı Öde (mavi)** — üç ana eylem renk kodlu.
- Sağ altta FAB (+).

### Üç Nokta (adisyon) Menüsü — alttan kayan sayfa
**Not Ekle | Yazdır | Grup Ekle | Müşteri Seç | Misafir Sayısı | Siparişi İptal Et**
→ Web'deki üst bar ikonlarının mobil karşılığı; "Grup Ekle" = sipariş grubu (kurs) mobilde de var.

### Misafir Sayısı
- Alttan kayan sayfa: − / sayı / + ve Kaydet (web'deki modalın mobil hali).

### Sepet / Adisyon Görünümü (alttan kayan tam sayfa)
- Başlık: **Adisyon: <no>**; kalemler **saat damgalı tur başlıkları** altında gruplu (örn. "01:26" — hangi ürünler hangi turda eklendi görünüyor).
- Kalem satırı: adet kutusu + ürün adı + porsiyon ("Tam Porsiyon") + seçilmiş özellikler ("SOĞUK") + tutar + üç nokta (özellikli üründe ayrıca özellik-düzenleme ikonu).
- Altta: Toplam Tutar + indirim etiketi ikonu.

### Ödeme (iki farklı akış!)
1. **Hızlı Öde:** alttan sayfa — başlıkta tutar, açılır "Öde & Kapat" aksiyon seçici, altında **ödeme tipi kartları: Nakit, Kredi Kartı, Multinet, Açık Hesap** → tek dokunuşla tüm tutarı o tiple kapat. (Garsonun masada 3 saniyede hesap kapatması için.)
2. **Öde (tam ekran "Ödeme Al"):** üstte **Toplam Tutar / Kalan Tutar**; ortada tahsilat listesi alanı; altta İndirim Tutarı + Ödenecek Tutar göstergesi ve **büyük numpad**: rakamlar + **1/n | İndirim | Parçalı Öde | Öde** kısayolları. Web'deki dört bölme modunun mobil uyarlaması.

### Klon İçin Mobil Çıkarımları
1. Üç ana aksiyonun (Kaydet/Öde/Hızlı Öde) renk kodlu ayrımı ve "Hızlı Öde"nin ayrı basitleştirilmiş akış olması → garson UX'inin özü.
2. Adisyonda **tur bazlı (saat damgalı) kalem gruplama** mobilde birinci sınıf özellik — veri modelinde "sipariş turu" kavramı olmalı (aynı adisyona farklı zamanlarda eklenen kalemler ayrı tur).
3. Kategori renkleri tanım ekranından tüm istemcilere yayılıyor (tek kaynak).
4. Ürün grid yoğunluğu kullanıcı tercihi (2'li/3'lü) — cihaz bazlı ayar.
5. Mobilde yazıcı yönetimi de var → garson cihazından bile yazıcı tanımlanabiliyor.
6. Rol bazlı sekme görünürlüğü + ayrı Patron uygulaması → klonda tek PWA içinde role göre şekillenen navigasyon (tercihimiz) veya iki ayrı paket.

---

## 7. SATIŞ EKRANI — CANLI DERİN TUR (4 Ağu 2026)
*Adisyo 3.0 web POS'unda Kontrol → Sipariş → Ödeme ekranları bütün menüler,
üç nokta düğmeleri ve gizli modlar açılarak birebir gezildi. Canlı sistemde
hiçbir kayıt değiştirilmedi (açılan grup ve denenen ürün kaydedilmeden geri alındı).*

### Kontrol (Salon) ekranı
- Üst sekmeler **Bölgeler | Siparişler**. Bölge tabı = kısa kod + doluluk (`B 2/20`).
- Dolu masa kartında dört bilgi: **adisyon adı** (serbest metin, örn. "polısler"),
  garson adı, **masa etiketi** ("Tembel Masa"), tutar ve açık kalma süresi.
- Masa üç nokta menüsü: **Öde · Hızlı Öde · İptal · Yazdır · Masayı Değiştir ·
  Masaları Birleştir · Adisyon Aktar**.
- Sol kenarda **Gel Al** ve **Paket** kısayolları (masasız adisyon).
- **Siparişler sekmesi bir kanban:** Entegrasyon Siparişleri · Hazırlanıyor ·
  Bekleyen · Teslimata Çıkanlar · Açık Siparişler · **Tamamlanan (46)**.
  Kartta "Geciken Sipariş" rozeti, sipariş no (#101), saat, tutar, kart üstünde
  hızlı ikonlar (aç/yazdır/öde/servis). Tamamlanan kartlarda ödeme tipi yazıyor —
  **kapanan adisyon silinmiyor, listede kalıyor.**
- Üst araçlar: Yaklaşan Ödeme (Adisyo'nun kendi abonelik hatırlatması),
  **ÖKC cihaz eşleme** (bilgisayar başına, "Bu bilgisayarda ÖKC kullan" anahtarı),
  yayın, çağrı, yenile, ekran kilidi.

### Sipariş ekranı
- Sol panel başlığı: **Adisyon no** + **Sipariş Durumu: Hazırlanıyor** (KDS'ten geliyor).
- Kalemler **saat damgalı tur başlıkları** altında gruplu (23:34 / 19:34 / 19:17).
- Kalem satırı: adet · ürün adı · porsiyon · **siparişi giren kişi** · tutar · üç nokta.
- **Kalem detay penceresi:** − adet + · **Birim Fiyatı** (düzenlenebilir) ·
  **Sipariş Grubu** açılır listesi · **Ürünü Sil** · **İkram et** ·
  **Ürünü Farklı Siparişe Taşı** · **Ürün Notu** (serbest metin) ·
  **Porsiyonlar** (kart olarak, seçilince fiyat güncellenir).
- Üst bar (soldan): geri · adisyon adı + **kalem ikonu = adı düzenle** · sil ·
  **Grup Ekle** · yazdır · **müşteri** (arama + ad/soyad/2 telefon/tanımlı adresler) ·
  sağda **misafir sayısı** (− sayı +) ve **sipariş açıklaması** (takvim ikonu, yanıltıcı).
- **Grup Ekle** adisyon içine "Grup No: 1 — Toplam ₺0,00" satırı açıyor; grubun
  kendi düzenle/yazdır/sil düğmeleri var (kurs ayrımı + grup bazlı fiş).
- Orta: **Ürün adı veya barkod ile arama** — kategoriden bağımsız, tüm menüde.
- Kategori sekmeleri renk kodlu, yatay, **2 sayfa** (ok ile geçiş); ilk sekme
  **FAVORİ ÜRÜNLER**.
- **Ürün kartı adisyondaki adedi rozet olarak gösteriyor** (ÇAY → 5).
- Karta basınca kartın üstünde **+ / adet / −** mini sayacı beliriyor.
- Yeni eklenen kalem sepetin en üstünde vurgulu, yanında hızlı **+** ve **çöp**.
- **Kaydedilmemiş değişiklik varken ÖDE / HIZLI ÖDE gizleniyor**, sadece KAYDET kalıyor.
- Seçim penceresi ("Çoklu Seçim"): Porsiyonlar ve Özellikler katlanır bölümler,
  grup başlığında kural yazılı ("SULAR — Min. 1 Seçim"), seçenekler kart,
  ücretsizler "Ücretsiz" etiketli. Sağ üstte iki görünüm modu düğmesi.
- Alt aksiyonlar: indirim etiketi · **ÖDE ₺tutar** · **HIZLI ÖDE** · KAYDET.
- **Gel Al**: aynı ekran, "Adisyon: 0", sağ üstte Vazgeç, HIZLI ÖDE yok.
- **Paket**: alt düğme ÖDE değil **"ÖDEME TİPİ"** — kuryeye hangi tiple gideceği
  önden seçiliyor, tahsilat teslimatta kapanıyor.

### Ödeme ekranı
- Üstte **Masa Adı + Garson**, aksiyonlar tek sırada: Kaydet · **Öde ve Kapat** ·
  **Öde ve Yazdır** · **Öde, Yazdır ve Kapat** · Ödeme Ekranını Kapat.
- Sol sütun "PARÇALI ÖDE": her kalemde ürün + tutar + **Ödenen / Kalan** alt satırı
  + dokunma ikonu. Altta iki mod düğmesi:
  - **Ürün Bazlı 1/n** → her kalemin yanına 1/n düğmesi (tek ürünü n kişiye bölme).
  - **Ürün Bazlı İndirim** → kalemlerin yanına onay kutusu, seçilene indirim.
- Orta sütun: TOPLAM · **TAHSİLAT GEÇMİŞİ** · Ödenecek Tutar · numpad
  (rakamlar + **Tüm**, **1/n**, **İndirim**, geri sil).
- Sağ sütun iki sekme: **Ödeme Tipleri** ve **Bahşiş ekle**.
  - Ödeme tipleri iki başlık: **ÖKC** (Nakit, Kredi Kartı, Edenred, Pluxee/Sodexo,
    Multinet, SetCard, Metropol, Paye, Havale) ve **Klasik** (Nakit, Kredi Kartı,
    Multinet, **Açık Hesap**).
  - Bahşiş: **Serbest Tutar** veya **Üstünü Tamamla** — sipariş toplamına göre
    hazır yuvarlama kartları (₺2.760 / ₺2.800 / ₺3.000, altında bahşiş tutarı).
- İndirim penceresi: Yüzde | Tutar sekmeleri + numpad (bizimkiyle aynı).

### Bu turda çıkan yeni çıkarımlar
1. **Kapanan adisyon silinmiyor** — "Tamamlanan Siparişler" listesi gün sonu
   raporunun ekrandaki karşılığı. Bizim `delete` yaklaşımımız yanlış.
2. **Ürün kartındaki adet rozeti** küçük ama garsonun "kaç çay söylemiştim"
   sorusunu ekrana bakmadan çözüyor.
3. **Paket akışında ödeme tipi önden seçiliyor** — paket siparişin tahsilatı
   teslimatta kapandığı için ayrı bir durum; veri modelinde ödeme "planlanmış"
   olabilmeli.
4. **Kaydedilmemiş değişikliğe ödeme kapatılıyor** — yarım kalmış sepetle
   tahsilat alınmasını engelleyen basit ve doğru kural.
5. Adisyona **serbest isim** verilebilmesi ("polısler") masa adından bağımsız bir
   ihtiyaç: aynı masada iki grup, ya da isimle çağrılan müdavim.

---

## 8. TANIMLAMALAR MODÜLÜ — CANLI DERİN TUR (6 Ağu 2026)

Adisyo'nun Tanımlamalar menüsündeki on ekranın tamamı kendi işletme panelimizden
tek tek gezildi. Amaç kopyalamak değil, hangi ayarın gerçekten operasyonda
karşılığı olduğunu görmek.

### Ortak ekran deseni
Her tanım ekranı ortalanmış tek kart: sol üstte renkli ikon karesi, yanında
başlık ve **ne işe yaradığını anlatan bir cümle**, sağ üstte birincil aksiyon
(Yeni/Ekle). Basit kayıtlar modalla, çok alanlı olanlar (özellik grubu) sağdan
açılan panelle düzenleniyor. Açıklama cümlesi fikri iyi: işletmeci ekrana ilk
girdiğinde "burası ne" sorusunu okuyarak çözüyor.

### Masa/Bölgeler (`/app/table-area-definition`)
- Bölgeler üstte **sekme**, kısa kodla (`B`, `S`, `IB`, `DB`, `L`).
- Masalar **serbest yerleşimli**: kart sürüklenebiliyor ve sağ alt köşeden
  boyutlandırılıyor; değişince "Düzeni Kaydet" düğmesi beliriyor. Ayrıca
  "Bölge Düzenini Sıfırla" ile ızgaraya dönülüyor.
- Masa modalı yalnızca **ad + şekil (Kare/Daire)** — kapasite alanı yok.
- Bölge modalı: **ad + "Tüm Garsonlarda Göster"** (bölge–garson yetkisi).
- **Toplu Masa Ekleme**: ön ek + adet + şekil → "Masa 1…20". 20 masalı bölgeyi
  tek tek girmeye göre operasyonel olarak çok değerli.

### Özellikler (`/app/features`) — bizdeki Seçenek Grupları
Tablo: grup adı · seçim tipi · özellik sayısı (açılır) · Düzenle · Yeni özellik
ekle · Sil. Düzenleme sağdan panelde: seçim tipi, "Reçeteli ürün kullan",
"Özellik seçimi zorunlu olsun" + **Zorunlu Seçim Sayısı**, satırlar
(sürükle-sırala · ad · **ekstra tutar** · **varsayılan** · sil).

### Diğer ekranlar
- **Menü/Ürünler:** solda kategori listesi (renk noktası + ⋮), sağda ürün kartı
  ızgarası; kartta favori kalbi, renk paleti, kopyala.
- **Birimler:** düz liste (Tam, Yarım, Bir buçuk, Adet, Kg).
- **Kdv Oranları:** satır içi düzenleme, sürükle-sırala, varsayılan işareti,
  en fazla 8 tanım (bizdeki `KDV_SINIRI` ile aynı).
- **İndirimler:** ön tanımlı indirim listesi — ad + tip (Yüzde/Tutar) + değer.
  Satışta serbest indirim yerine listeden seçiliyor.
- **Mutfak Grupları:** ad + "Pişirme aşaması" / "Paketleme aşaması". Ürünün
  hangi mutfağa/yazıcıya düşeceğini ve KDS'de kaç aşamadan geçeceğini belirler.
- **Müşteriler:** ad/soyad, iki telefon, adresler, **açılış bakiyesi**, açık
  hesap işareti. Üstte müşteri sayısı ve toplam bakiye; Excel ile yükle/indir.
- **Ödenmezler:** ikram/personel yemeğinin kime yazıldığı (No · Ad Soyad ·
  Unvan), personel listesinden toplu aktarılıyor.
- **Kuver/Garsoniye:** üstte tek ana anahtar (kapalıyken tüm alanlar soluk), iki
  sütun; her biri "siparişe otomatik eklensin" + ad + tip (Tutar/Yüzde) + değer.

### Garso ile kıyas (6 Ağu 2026)
Bizde **var:** menü/ürünler (daha zengin — maliyet, kâr, kampanyalı menü, alt
kategori ağacı, favori, Excel aktarım), birimler, seçenek grupları, KDV grupları.
Bizde **yok ama sonraki fazın işi:** mutfak grupları (Faz 2 — KDS/yazıcı),
müşteriler (Faz 2/3 — paket servis, cari/veresiye).
Bizde **yok ve hiçbir fazda geçmiyordu** (bu turda eklendi): ödenmezler,
kuver/garsoniye, ön tanımlı indirimler.

### Bu turda çıkan yeni maddeler
1. **Ön tanımlı indirimler** — ad + tip + değer; satışta serbest tutar yerine
   listeden seçim. Yetki matrisindeki "sadece ön tanımlı indirim" kuralının
   önkoşulu. → Faz 1
2. **Ödenmezler** — ikramın/personel yemeğinin kime yazıldığı. Bizde ikram
   durumu var ama "kime" bilgisi yok; kayıp/kaçak denetimi bunsuz eksik. → Faz 2
3. **Kuver/Garsoniye** — adisyona otomatik kuver ücreti veya yüzdeli servis
   bedeli. Tek ana anahtarla kapatılabilir olmalı. → Faz 2
4. **Seçenek grubunda zorunlu seçim sayısı ve varsayılan seçenek** — bizde
   tekli/çoklu ve zorunlu var, "en az kaç tane" ile "önceden işaretli" yok. → Faz 1
5. **Bölge–garson yetkisi** ("Tüm Garsonlarda Göster") — rol sistemi kurulunca
   bölge tanımına eklenecek. → Faz 0/1 (rol/yetki)
6. **Toplu masa ekleme** ve **masa şekli** Garso'ya alındı; ayrıca Adisyo'da
   olmayan **masa kapasitesi** eklendi (kuver ve kişi sayısı için).
7. **Modüllerin eklenti olarak satılması** — Adisyo'da KDS, Stok/Reçete,
   Kuver&Garsoniye, Maliyet Analizi "Uygulama Mağazası"ndan ekleniyor, bazıları
   Pro Plan'a bağlı. Garso ticarileşirken paketleme modeli için örnek. → Faz 4

---

## 9. AYARLAR, KULLANICILAR & MÜŞTERİ CARİSİ — CANLI DERİN TUR (9 Ağu 2026)
*Adisyo panelinde ayar ve tanım tarafı baştan sona gezildi. Bölüm 8'de anlatılan
Tanımlamalar ekranları (masa/bölge, özellikler, mutfak grupları, kuver, ödenmezler)
burada tekrarlanmıyor; bu bölüm o turda hiç görülmemiş ekranları anlatıyor.*

### 9.1 Kullanıcılar (`/app/users`)
Liste: No · Ad/Soyad (sıralanabilir) · E-posta · Telefon (kopyalanabilir) · Görev ·
**Son Giriş / Çıkış tarihi**. Başlıkta "Kullanıcı Sayısı".

**Kullanıcı formu:** Görev*, Ad Soyad*, E-posta (isteğe bağlı), Telefon*, Şifre*,
**Bölge seçimi (çoklu onay kutusu)** — garsonun hangi bölgelere bakacağı; üç anahtar:
- *CallerID kullanıcısı*
- *Kullanıcı Girişi Engellensin* — "aktifken kullanıcı giriş yapamaz" (silmeden askıya alma)
- *Pin Kullanılsın* → açılınca **Pin Numarası (0 ile başlayamaz)** alanı çıkıyor, 4 hane.
  Açıklaması: "Birden fazla kullanıcının tek bir ekranı kullandığı durumlarda hızlıca
  geçiş yapmak için; mail ve şifre ile giriş zorunluluğu ortadan kalkar."

Düzenlemede aynı form + **Sil**. Görevler **sabit ve kapalı liste**: Garson, Mutfak,
Kurye, Kasa, Müdür, Çağrı Merkezi (üst plan) ve **Teknik** ("yazıcı kullanımı için,
kullanıcı limitine dahil değildir"). Hesap sahibi ayrıca "Yönetici" olarak görünüyor.
→ **Garso kararı:** roller kapalı liste değil, `roles` tablosu olacak; ama kurulumda
bu 6 rol hazır gelecek (hazır şablon deseni).

### 9.2 Yetki / İzin ekranı (`/app/rights`)
Tek tablo: satır = izin, sütun = 6 rol, tek **Kaydet**. Kullanıcıya değil **role**
veriliyor. Gruplar ve satır sayıları:
- **Restaurant Tanım (11):** masa/bölge, genel tanımlamalar, genel kullanıcı işlemleri,
  yetkilendirme, stok girişi/sayımı, paket entegrasyon durumu, B2B sipariş, stok
  miktarı görüntüleme, merkezi entegrasyon, merkezi eşleştirme, entegrasyon ekranı
- **Gider (2):** gider ekleme / düzenleme-silme (ayrı!)
- **Sipariş (22):** sipariş alma · üründen çıkarma · ödemede indirim · **sadece ön
  tanımlı indirim** · ikram · ödeme alma · sipariş iptali · **sipariş iadesi** · paket
  alma · gel-al alma · ürün taşıma · **kapatılmış/iptal siparişi görüntüleme** · açık
  hesaba aktarma · şube değiştirme · masa değiştirme-birleştirme-adisyon aktarma ·
  ürün fiyatı değiştirme · miktar değiştirme · manuel sipariş yazdırma · manuel mutfak
  çıktısı · ÖKC kapatma · para çekmecesi açma · kuver/garsoniye ekleme
- **Mutfak (1)**, **Kurye (2):** kurye işlemleri, ödeme tipini değiştirme
- **Rapor (4):** tüm raporlar, gün sonu, gider, **kasa açılış/kapanış tutarını değiştirme**
- **Ürün (4):** ürün/özellik/menü/reçete/birim tanımlama, fiyat düzenleme, entegrasyon
  ürünleri ve fiyatları

### 9.3 Restaurant Ayarları (`/app/settings`) — hesap menüsünde, sol menüde DEĞİL
Hesap menüsü: Profil · **Restaurant Ayarları** · Hesap Bilgileri · Sosyal Medya · Çıkış.
Ekran 6 sekme, tek **Güncelle** düğmesi:

**a) Genel Ayarlar:** Restaurant Adı · **Gün Başlangıç / Gün Bitiş** (08:45 → 08:40 =
kasa günü) · Bildirim Sesi + "Dene" · **Ekran kilit süresi (sn, 0 = kapalı)** ·
**Çalışma Tipleri** (Masa/Paket/Gel Al — kullanılmayan tip arayüzden kalkıyor) ·
"Konumu Kaydet" · **Gelir Merkezlerini Düzenle** (satış kanalı tanımı; varsayılan
"Ana Kanal", raporlarda ve stok hareketlerinde sütun olarak çıkıyor).

**b) Ödeme Tipleri:** hazır katalog (Nakit, Kredi Kartı, Multinet, SetCard, Smart
Ticket, Pluxee, Ticket Kupon, Getir Online, YemekSepeti Vale, Paye...) her biri
**aç/kapa anahtarı + sürükleyerek sıralama**; ayrıca "Ödeme Tiplerini Düzenle" →
**Dinamik Ödeme Tipleri** (işletmenin kendi tanımladığı tipler).

**c) Parametreler — 25 anahtar.** Tam liste:
1. Kasa açılış/kapanış işlemleri kullanıcı tarafından yönetilsin
2. Gün sonu çıktısı alabilmek için açıkta sipariş olmasın
3. Perakende Modülü
4. Sipariş hazır olduğunda zili çal (mutfak→garson sesli+yazılı bildirim)
5. **Misafir sayısı girişi zorunlu olsun**
6. **Adisyon gruplama aktif** — aynı masada birden fazla adisyon (ayrı ödeyen gruplar)
7. Siparişi marşlı şekilde gönderme (mutfağa hazırlama sırası bilgisi)
8. Her işlemden sonra kilit ekranı otomatik açılsın
9. Pin ile girişi engelle
10. Telefon çaldığında müşteri ekranına gitsin (CallerID)
11. Sipariş durum ekranı kullanılsın (gel-al için TV ekranı)
12. Mutfak yazıcısı için manuel yazdırma yapılsın
13. Ödemesi alınmış siparişleri otomatik kapat ("hazır" komutunda)
14. Gel Al siparişte direkt kapatma pasif olsun
15. Adisyon fişleri cihaz özelinde çıksın
16. **Yazıcı ve sipariş ekranında ürün fiyatı KDV hariç gösterilsin**
17. Kuryeler sadece kendilerine atanan siparişleri görebilsin
18. Yazar kasadan ödemesi alınan gel-al siparişler otomatik kapansın
19. Müşteri ekranlarında KVKK/e-posta/SMS izin durumlarını göster
20. **Ödeme alındığında para çekmecesi açılsın**
21. **Hızlı ödemede para üstü kullanılsın**
22. Garson ve Kurye satış raporlarını sadece mobilde görebilsin
23. Kurye atanmamış siparişlerde adres mobilde gizlensin
24. **Eksi stoğa izin verilsin**
25. Sipariş kaydedildiğinde kasa yazıcısından da fiş çıksın — **Masa / Paket / Gel Al
    için ayrı ayrı anahtar**

**d) Döviz Ayarları:** "Döviz ile ödeme aktif" + para birimi başına kur.
**e) Adres Bilgileri:** ülke/şehir/ilçe/mahalle/sokak/bina no/posta kodu.
**f) Entegrasyon:** Mobil App Key, Web App Key, App Secret (dış entegrasyon).

**Ekran İşlemleri (üst ⋮):** Tam Ekran · **Uzantıyı Yükle** (yazıcı köprüsü) ·
**Kilit Ekranı**. **Profil:** Kullanıcı Bilgileri (ad, soyad, telefon, e-posta,
**kendi PIN'i**) · Parola Değişikliği · Gizlilik ve Güvenlik · Dil ve Bölge · Hesap Ayarları.

### 9.4 Müşteriler ve cari hesap (`/app/restaurant-customers`)
Liste başlığında **Müşteri Sayısı + Toplam Bakiye**; Excel **Yükle/İndir**; arama;
**Filtreler: "Yalnızca açık hesap müşterileri" / "Yalnızca borcu olanlar"**.
Sütunlar: No (#) · Ad Soyad · Telefon · Adres · **Açık Hesap Müşterisi** · Bakiye.

**Müşteri formu:** Ad*, Soyad, Telefon, **Telefon 2**, **Açılış Bakiyesi**, çoklu adres.
**Adres formu:** Başlık (Ev/İşyeri/Diğer, en fazla 15 karakter)*, Adres*, **Adres
Tarifi/Notu**, İl / İlçe / Mahalle (bağlı açılır listeler), **Varsayılan Adres**.

**Müşteri Detay (`/app/customer-detail/{id}`) — cari kartın kalbi.**
Üst aksiyonlar: Geri · İndir · **Bakiye Güncelle** · **Ödeme Al**.
Sol sütun: **Açık Hesap anahtarı**, ad, **Toplam Tutar / Ödenen Tutar / Kalan Bakiye**,
telefon, adres, Sil / Düzenle. Sağda 4 sekme:
- **Aktiviteler** — zaman çizelgesi; her satır tarih + olay ("Bakiye Güncellendi =>
  Eski Bakiye: 3044,00 - Yeni Bakiye: 0,00", "818 tutarında Açık Hesap ödemesi alındı").
  Üstte **serbest not ekleme** kutusu var (müşteriye elle not düşülüyor).
- **Adisyonlar** — Adisyon No (tıklanabilir) · Ödeme Tarihi · Ödeme Tipi · Tutar;
  üstte "Sadece açık hesap tahsilatları gösterilsin" kutusu.
- **Yapılan Ödemeler** — Tahsilat No · Tarih · Ödeme Tipi ("Açık Hesap Alacak Fişi") · Tutar.
- **Hesap Ekstresi** — üstte **BORÇ / ALACAK / BAKİYE**; satırlar: Tarih · Hareket
  (Satış, Bakiye Güncelleme) · Ödeme Tipi · Borç · Alacak · **yürüyen bakiye**.

**Tahsilat fişi yok (20 Ağu 2026 canlı turu).** Adisyo açık hesap tahsilatını
kâğıda basmıyor: müşteri detayının üst şeridinde yazıcı düğmesi yok, Ödeme Al
modalında yazdırma seçeneği yok, Yapılan Ödemeler satırında yazıcı ikonu yok
(Tahsilat No'ya tıklamak ödemeyi *düzenleme* penceresi açıyor) ve Çıktı
Tasarımı'nda yalnız Adisyon ve Mutfak çıktısı var. "Açık Hesap Alacak Fişi"
kâğıt değil, kaydın türünün adı. Garso da basmıyor — fiş numarası kaydı
konuşabilmek için var.
**Ödeme Al modalı:** Toplam Tutar (borç) · **İndirim Tutarı + "Uygula"** · Ödenecek
Tutar · Ödeme Tipi · Kaydet. **Bakiye Güncelleme modalı:** tek alan "Yeni Bakiye";
fark ekstreye "Açık Hesap Alacak Fişi" olarak düşüyor.

### 9.5 KAPANMIŞ ADİSYON DETAYI — aradığımız ekran burasıymış
Adisyon numarasına tıklanınca açılan pencere (müşteri kartından ve raporlardan aynı
pencere açılıyor). Üst aksiyonlar: **Geri · Siparişe git · Siparişi İade Et ·
Siparişi Aktif Et (kapanmış adisyonu yeniden açma) · Sipariş geçmişi · Yazdır.**
Üç sütun:
1. **Sipariş Bilgileri** — katlanır "Zaman Bilgileri" (Siparişin Eklendiği Zaman,
   Güncelleme Zamanı), Sipariş Türü, Entegrasyon Tipi, Müşteri, **Durum (Kapandı)**,
   Sipariş Notu, Müşteri Adresi, **İndirim Adı**.
2. **Ürünler** — her satır: adet · porsiyon · **tarih-saat (ürünü giren kullanıcı)** ·
   ürün adı · tutar. Altında Ara Toplam / **Brüt Tutar** / KDV / Toplam Tutar.
3. **Tahsilatlar** — ödeme tipi (açık hesapsa müşteri adı) + tutar, TOPLAM TAHSİL EDİLEN.

**Sipariş geçmişi** ayrı bir zaman çizelgesi: "Sipariş Açıldı (Hülya Hn)" → "Yeni ürün
veya ürünler eklendi (Hülya Hn)" + **Ürünler** bağlantısı (o turda eklenenler balonda
"(1) COCA-COLA") → "Ödeme işlemi yapıldı (Açık Hesap - 818) (İLYAS AKTAŞ)" →
"Sipariş kapatıldı". Yani `audit_log` tasarımımızın birebir arayüz karşılığı.

### 9.6 Gider / Masraf (`/app/restaurant-expenses`)
İlk açılışta **hazır gider grubu seçtirme modalı** (Faturalar, Vergi ve Resmi Giderler,
Personel, Temizlik ve Hijyen, Gıda ve İçecek, Teknik Servis ve Bakım, Kira ve Aidat,
Diğer) + "Manuel Tanımla". Liste: tarih aralığı (varsayılan **kasa günü**) + 2 filtre +
"Tümünü Göster"; sütunlar: Masraf Tipi · Masraf Tarihi · **Eklenme Tarihi** · Kullanıcı ·
Ödeme Tipi · Tutar · Masraf Detayı · İşlemler. **Masraf Ekle:** masraf tipi*, ödeme
tipi*, tarih*, saat*, tutar*, açıklama*.

### 9.7 Bu turda çıkan kararlar ve Garso'ya alınacaklar
1. **Kapanmış adisyon ayrı bir liste ekranı değil, ortak bir "adisyon detay penceresi".**
   Müşteri kartından, raporlardan, ileride masa geçmişinden hep aynı pencere açılır.
   Garso'da da tek bileşen olacak. → Faz 1
2. **"Siparişi Aktif Et"** — yanlışlıkla kapatılan adisyonu geri açma. Bizim
   `durum = kapali → acik` dönüşümümüz; iptal etmekten daha çok işe yarıyor. → Faz 1
3. **Sipariş geçmişi zaman çizelgesi** — audit_log'un kullanıcıya görünen yüzü.
   Kim açtı, kim ürün ekledi, kim ödedi, kim kapattı. Personel sistemiyle birlikte. → Faz 1
4. **Kalem satırında ürünü giren kullanıcı ve saat** — bizde tur bazında var, Adisyo
   kalem bazında gösteriyor. `turlar.garson_id` bunu zaten karşılayacak. → Faz 1
5. **İşletme ayarlarımıza alınacak parametreler** (bizde İşletme Ayarları → Satış
   sekmesi zaten var): kasa günü başlangıç/bitiş saati, misafir/kişi sayısı zorunlu,
   ekran kilit süresi, para üstü, çalışma tipleri (kullanılmayan sipariş türünü
   gizleme), adisyon gruplama. Yazıcı ve ÖKC'ye bağlı olanlar Faz 2'ye. → Faz 1
6. **Hazır şablon deseni her yerde:** gider grupları, roller, ödeme tipleri hazır
   listeyle geliyor, kullanıcı seçip başlıyor. Garso'nun ilk kurulum akışı da böyle
   olacak. → Faz 1
7. **Cari/açık hesap modülünün gerçek kapsamı** bu turda netleşti: müşteri kartı +
   ekstre (borç/alacak/yürüyen bakiye) + tahsilat + bakiye düzeltme + aktivite notu.
   Adisyondaki "açık hesaba aktar" bunun tetikleyicisi. → Faz 2/3
8. **Kullanıcı silmek yerine girişi engelleme** — geçmiş kayıtlar kullanıcıya bağlı
   kaldığı için silme değil pasifleştirme doğru yol. Garso'da da böyle olacak. → Faz 1
9. **Bölge–kullanıcı ataması** kullanıcı formunda çoklu seçim olarak duruyor; bizde
   bölge tanımı var, kullanıcı tarafı personel modülüyle gelecek. → Faz 1

---

## 10. KASA & GİDER — CANLI DERİN TUR (11 Ağu 2026)
*Adisyo'nun kasa ve gider tarafı canlı hesapta baştan sona gezildi.*

Kasa modülü Adisyo'da **varsayılan olarak kapalı geliyor**. Ayarlar → Restaurant
Ayarları → Parametreler → *"Kasa açılış/kapanış işlemleri kullanıcı tarafından
yönetilsin"* açılmadan hiçbir yerde görünmüyor: ne menüde, ne üst çubukta, ne de
raporda. Kasa Raporu ekranı bile boş açılıp "bu parametreyi aktif edin" diyor.
Tur için parametre geçici olarak açıldı, tur bitince geri kapatıldı.

### 10.1 Parametre ve alt ayarları
Anahtar açılınca altında dört ayar beliriyor:
- **Kasa kapanışı zorunlu olsun** — kapanışı mecburi kılar.
- **Kasa kapanış uyarı saati** — 15 dakikalık aralıklı saat listesi. Parametre
  açıksa bu alan **boş bırakılamıyor**, kaydetmeye çalışınca hata veriyor.
- **Para giriş ve çıkışı kullanılmasın** — kasadan para alma/koyma işlemini kapatır.
- **Aktif vardiya varken gün sonu çıktısı alınamasın**.

### 10.2 Kasa İşlemleri penceresi
Sol menüde **yok**. Salon ekranının üst çubuğunda **₺ ikonu** ("Kasa İşlemleri"),
tıklayınca ayrı sayfa değil **modal pencere** açılıyor. Üstte "Vardiya Raporuna git"
bağlantısı ve duruma göre "Kasayı Aç" / "Kasayı Kapat" düğmesi.

**Kasa kapalıyken:** "İşlem yapabilmeniz için kasayı açmanız gerekiyor". Kasa Açılış
Tutarı ve Kasada Olması Gereken Tutar ₺0,00; Para Ekle / Para Çıkar düğmeleri ölü.

**Kasayı Aç** (sağ panel olarak açılıyor): Kasa Açılış Tutarı · **Önceki kasa kapanış
tutarı** (salt bilgi, dünden devreden para) · Açıklama.

**Kasa açıkken:** "Kasa, Ramazan tarafından 11.08.2026 tarihinde açıldı." Alt kalemler
canlanıyor: **Nakit Girişi · Nakit Çıkışı · Nakit Satışlar**. Nakit Satışlar yalnızca
kasa açıldıktan sonraki nakit tahsilatları sayıyor — kasa açılmadan önce alınan nakit
bu toplama girmiyor.

**Para Ekle / Para Çıkar:** ikisi de aynı küçük form — Tutar* + Açıklama. Bu bir gider
değil; kasadaki nakdin fiziksel giriş/çıkışı.

**Kasayı Kapat:** Sayılan Tutarı Giriniz · Kasada olması gereken nakit tutar ·
**Aradaki fark** (tutar girilir girilmez beliriyor, sıfırsa yeşil) · Açıklama.

### 10.3 Kritik iş kuralı
**Açık adisyon varken kasa kapatılamıyor.** Denendi, engelledi:
*"Açıkta bekleyen 9752,10₺ tutarındaki siparişiniz var, kasayı kapatamazsınız."*
Masalar kapatılınca kapanış sorunsuz geçti.

### 10.4 Kasa Raporu
Raporlar → **Vardiya Satış Raporu** altında üç sekme: Ödeme Raporu · Adisyon Raporu ·
**Kasa Raporu**. Sütunlar: Kullanıcı Adı · Açılış Tarihi · Kapanış Tarihi · Durum
("Aktif Vardiya") · Ödeme Tipi ("0 Adet Tahsilat", tıklanabilir) · Sipariş Sayısı ·
Toplam Satış · Açıklama.

Satıra tıklayınca **Vardiya Detayı** penceresi: Vardiya No + Vardiya Bilgileri
(sahibi, açılış saati, kapanış saati, durum) ve Tutar Bilgileri (Kasa Açılış Tutarı,
**Beklenen (Kapanış) Tutarı, Sayılan Tutar, Aradaki Fark**).

### 10.5 Gider / Masraf (9.6'nın doğrulaması)
İlk açılışta hazır gider grubu modalı çıkıyor (8 grup + "Manuel Tanımla" +
"Seçilenleri Ekle"). Liste üstünde İndir · **Masraf Tiplerini Düzenle** · Masraf Ekle.

**Masraf Tiplerini Düzenle** ayrı bir ekran değil, küçük bir pencere: tek alan
"Masraf Grupları*" + *"+ Ön Tanımlı Masraf Gruplarından Ekle"* bağlantısı. Masraf tipi
tek seviyeli düz bir liste, alt kırılımı yok.

**Masraf Ekle:** Masraf tipi* (aranabilir liste + "Yeni masraf tipi ekle veya düzenle")
· Ödeme Tipi* · Masraf tarihi* · Masraf saati* · Fiyat ₺* · Açıklama*.

**Gider ödeme tipi, satışın ödeme tipleriyle aynı liste DEĞİL.** Sabit beş seçenek:
Nakit · Kredi Kartı · Havale · Çek-Senet · Diğer.

### 10.6 Bu turda çıkan kararlar ve Garso'ya alınacaklar
1. **"Kasa günü" ile "vardiya" iki ayrı kavram.** Kasa günü rapor aralığı (08:45–08:40,
   Genel Ayarlar'da); vardiya ise açılış/kapanış kaydı. Birbirine bağlı değiller —
   bir kasa gününde birden fazla vardiya olabilir. Garso'da da ayrı tutulacak. → Faz 1
2. **Kasa ekranı sayfa değil pencere.** Satış ekranından çıkmadan açılıyor; kasanın
   başındaki kişi masayı kaybetmiyor. Bizde de aynı desen. → Faz 1
3. **Para giriş/çıkış ayrı bir işlem.** Gider değil, kasadaki nakdin hareketi. Gider
   ekranıyla karıştırılmamalı; kasa penceresinin kendi işlemi. → Faz 1
4. **Açık adisyon varken kapanış engellenir.** Bizde de aynı kural, kendi
   modalımızla ("Açık N adisyon var, önce onları kapatın"). → Faz 1
5. **Gider ödeme tipi ayrı ve sabit liste.** `odeme_tipleri`ne bağlanmayacak. → Faz 1
6. **Fark hesabı kapanış anında görünür.** Beklenen–sayılan farkı kullanıcı tutarı
   girer girmez, kaydetmeden önce görünüyor. → Faz 1
7. **Modül kapatılabilir olmalı.** Kasa takibi yapmayan işletme için arayüzde hiç
   durmasın — Adisyo'nun parametre deseni doğru. Bizde de işletme ayarı. → Faz 1
8. **Kasa kapanış uyarı saati** parametre açıkken zorunlu alan. Bizde de aynı
   zorunluluk kurulacak, boş bırakılırsa kaydetme engellenecek. → Faz 1

---

## 11. RAPORLAR — CANLI DERİN TUR (12 Ağu 2026)
*Adisyo'nun Raporlar menüsündeki altı raporun tamamı, bütün sekmeleriyle gezildi.
Kapanmış adisyon detay penceresi de buradan açılıyor — 9.5'in doğrulaması ve
eksiklerinin tamamlanması.*

Menüde altı rapor var: **Ürün Satış Raporu · Gün Sonu Raporu · Vardiya Satış
Raporu · Restaurant İstatistikleri · Stok Durum Raporu · Fire Raporu.**
Hepsinde ortak desen: solda rapor içindeki **sekme listesi**, sağ üstte
**Filtrele · İndir · Yazdır** (bazı raporlarda Yazdır yok), başlığın yanında
parantez içinde **aralık** ("11.08.2026 08:45 - 12.08.2026 08:40" — kasa günü).

### 11.1 Filtreler penceresi (her raporda aynı)
Sağdan açılan panel: **Tarih** (hazır liste: Bugün · Dün · Bu Hafta) ·
Başlangıç Tarihi · Bitiş Tarihi · **Başlangıç Saati · Bitiş Saati** + Filtrele
düğmesi. Saatler kasa gününden geliyor (08:45 / 08:40), elle değiştirilebiliyor.
Yani her rapor hem gün hem saat aralığıyla süzülüyor.

### 11.2 Gün Sonu Raporu (`/app/report-settlement`)
Sol sekmeler (14 adet): Özet · **Tüm Adisyonlar** · Yoğunluk Raporu ·
Masa Siparişleri · Gel Al Siparişler · Paket Siparişler · Açık Hesap Hareketleri ·
Ödenmezler · Garson Bazlı Satışlar · İptal / İadeler · Masraflar ·
Zayi Olan Ürünler · Silinen Ürünler · Silinen Tahsilatlar.

- **Özet:** kart ızgarası — Net Kâr · Alınan Ödemeler (altında "Açık Hesap
  Tahsilatlar / Adisyonlu Tahsilatlar" kırılımı) · Tahsil Edilmemiş Tutar ·
  Toplam Masraf (Ödeme Tipi Detayı bağlantısı) · İade Tutarı · Toplam Bahşiş
  (ciroya oran %) · Kurye Başarı Yüzdesi. Altında iki grafik: **Sipariş Tipine
  Göre Satışlar (Adet)** ve **Ödeme Tipi İstatistikleri (₺)**.
- **Tüm Adisyonlar:** başlık "ADİSYONLU TAHSİLATLAR ((58) ADET ADİSYON
  BULUNUYOR.)". Sütunlar: **#Adisyon No** (kırmızı, tıklanınca detay penceresi) ·
  Sipariş No · Açılış ⇅ · Kapanış ⇅ · Sipariş Tipi · Misafir Sayısı · Masa Adı ·
  Durum · Kullanıcı · İndirim(₺) · Bahşiş(₺) · Tutar(₺).
- **Yoğunluk Raporu:** satır = gün, sütun = saat (01:00…24:00), hücre = o saatteki
  sipariş adedi; dolu hücreler pembe zeminli ısı tablosu.
- **Masa Siparişleri:** Tüm Adisyonlar'ın masaya süzülmüş hâli + ek **Tahsilat**
  sütunu: "₺1.916,00 - Nakit" gibi; birden fazla ödeme varsa "**2 Adet Tahsilat**".
- **Gel Al / Paket:** aynı düzen, tipe göre süzülmüş. Paket'te ayrıca "Kurye Bazlı
  Ödeme Tipleri" ve platform bazlı (Getir, Trendyol, Yemek Sepeti…) satış grafiği.
- **Açık Hesap Hareketleri:** üç ayrı tablo — Tahsilat Hareketleri (cari
  müşterilerden yapılan tahsilatlar) · **Borç Hareketleri** (cari hesaba aktarılan
  adisyonlar) · **Bakiye Güncelleme Hareketleri** (Borç Fişi / Alacak Fişi).
- **Ödenmezler:** #Adisyon No · Açılış · Sipariş Tipi · Masa · **Ödenmez** ·
  Tutar · Tahsilat.
- **Garson Bazlı Satışlar:** garson başlık satırı (Toplam Satış adet · Toplam
  Bahşiş · Toplam Tutar · Toplam Ürün Bazlı İndirim), altında o garsonun **ürün
  kırılımı** (ürün · adet · bahşiş · tutar · indirim).
- **İptal / İadeler:** #Adisyon No · **Sipariş Durumu** (İptal) · Satış Tarihi ·
  İşlem Tarihi · Sipariş Tipi · Kullanıcı · Sipariş Ödeme Tipi · **İade Ödeme
  Tipi** · İndirim · Tutar · **İade / İptal Sebebi** + Toplam satırı.
- **Masraflar:** "Yapılan Masraf Detayları" — filtre seçilmeden boş, "LÜTFEN
  FİLTRELEME YAPINIZ" diyor.
- **Silinen Ürünler:** Sipariş numarası · **Sipariş Detay No** · Ürün Adı ·
  Ürün Tutarı · Miktar · **İptal Eden Kullanıcı** · **İptal Nedeni**.
- **Silinen Tahsilatlar:** Sipariş numarası · Ödeme Tipi · Tutar · İptal Eden
  Kullanıcı · İptal Tarihi. → İkisi birlikte **kayıp/kaçak denetimi**.

### 11.3 Adisyon detay penceresi (9.5'in tamamlanmış hâli)
Adisyon numarasına tıklayınca açılan geniş pencere. Üst çubuk: **Geri ·
Siparişe git · Siparişi İade Et · Siparişi Aktif Et · Sipariş geçmişi · Yazdır**
(geçmiş açıkken "Sipariş geçmişi" düğmesi yerini kırmızı **Kapat**'a bırakıyor).

Üç sütun:
1. **Sipariş Bilgileri** — katlanır **Zaman Bilgileri** (Siparişin Eklendiği
   Zaman · **Güncelleme Zamanı**, kalem ikonuyla) · Sipariş Türü · Entegrasyon
   Tipi · Müşteri · **Durum (Kapandı)** · Sipariş Notu · Müşteri Adresi ·
   **İndirim Adı**.
2. **Ürünler** — her satır: adet · porsiyon ("Tam") · **tarih-saat (ürünü giren
   kullanıcı)** · ürün adı · altında seçenek/not (ORTA, SADE, "ikiside mantarsız")
   · tutar. Altında hesap dökümü: **Ara Toplam · İndirim Tutarı · Brüt Tutar ·
   Kdv · Toplam Tutar**. (Brüt + KDV = Ara Toplam; Toplam = Ara Toplam − İndirim.)
3. **Tahsilatlar** — ödeme tipi + tutar, **TOPLAM TAHSİL EDİLEN**. Ödeme tipinin
   yanındaki ok **düzenleme** açıyor: "Tahsilat Tipi" listesi + onay/vazgeç —
   yani **kapanmış adisyonun ödeme tipi sonradan düzeltilebiliyor**.

**Sipariş geçmişi:** dikey, sağ-sol dönüşümlü zaman çizelgesi. Her düğümde
tarih-saat, **kullanıcı adı büyük punto**, altında olay: "Sipariş Açıldı" →
"Yeni ürün veya ürünler eklendi" (+ **Ürünler** bağlantısı; tıklayınca balonda
"( 3 ) ÇAY" — o turda eklenenler) → "**Sipariş çıktısı alındı**" → "Ödeme işlemi
yapıldı (Kredi Kartı - 2762,90)" → "Sipariş kapatıldı".

### 11.4 Ürün Satış Raporu (`/app/report-sales-products`)
Sekmeler: **Bölge Bazında · Kategori Bazında · Ürün Bazında · Reçeteli Ürün
Bazında · Menü Bazında · Özellik Bazında.**
- Bölge: Bölge · **Müşteri Sayısı** · İndirim · Tutar · **Oran(%)** + TOPLAM.
- Kategori: Kategori · Miktar · İndirim · Tutar · Oran · **Detay**.
- Ürün: Ürün Kodu · Ürün Adı · Miktar ⇅ · Birim · Kategori · **Birim Fiyatı** ⇅ ·
  **İkram(₺)** · **Maliyet(₺)** · Toplam Tutar ⇅ · Oran(%) · Detay.
- **Detay → "Ürün Detay Raporu":** o ürünün Tarih · **Saat Aralığı** (0-1, 1-2…) ·
  Satış Adedi kırılımı + "Geri Dön". Yani ürünün saatlik satış dağılımı.
- Özellik Bazında: seçenek gruplarının (AROMALAR, ICE TEA, Kahve Özellikleri…)
  miktar ve oranı; grup adının yanındaki okla alt seçimlere açılıyor.

### 11.5 Vardiya Satış Raporu (`/app/shift-sales`)
Üç sekme, **hepsi kullanıcı (vardiya) bazlı** ve burada **Yazdır yok**, sadece
Filtrele + İndir.
- **Ödeme Raporu:** kullanıcı kırılımlı iki grafik — Sipariş Tipine Göre Satışlar
  (Adet) ve Ödeme Tipi İstatistikleri (₺). Her çubuk kullanıcıya bölünmüş.
- **Adisyon Raporu:** Gün Sonu'ndaki listenin **zenginleştirilmiş** hâli.
  Sütunlar: #Adisyon No · Açılış ⇅ · Kapanış ⇅ · Sipariş Tipi · Masa Adı · Durum ·
  Kullanıcı · **Entegrasyon Adı · Entegrasyon Sipariş No · Kuver Ücreti ·
  Garsoniye Ücreti** · İndirim · Tutar · Tahsilat (Toplam satırında "Sipariş
  Ödemeleri" ve "Açık Hesap Borç" ayrı ayrı).
- **Kasa Raporu:** parametre kapalıyken boş açılıyor ve kendi metniyle
  yönlendiriyor: *"Bu rapordaki değerler, Gün başı - Gün Sonu işlemlerini manuel
  yapan işletmeler için görüntülenebilir… Parametreler ekranındaki 'Gün başı -
  gün sonu manuel yapılsın' seçeneğini aktif ederek…"* Sütunlar: Kullanıcı Adı ·
  Açılış Tarihi · Kapanış Tarihi · Durum · Ödeme Tipi · Sipariş Sayısı ·
  Toplam Satış · Açıklama (10.4'te dolu hâli görülmüştü).

### 11.6 Restaurant İstatistikleri (`/app/restaurant-statistics`)
Sekmeler: Özet · Günlük Ciro Verileri · Grafik Verileri · Paket Siparişler ·
Satış Kanalı Bazında Satışlar · Garson Bazlı Satışlar · Ödenmez Bazlı Satışlar.
- **Özet:** 12 KPI kartı — satış toplamı (altında KDV tutarı) · günlük ortalama
  satış · toplam adisyon sayısı · **bir güne düşen ortalama adisyon tutarı** ·
  **kişi başı ortalama adisyon tutarı** · günlük ortalama adisyon sayısı ·
  toplam indirim (altında "Ürün Bazlı / Adisyon Bazlı" kırılımı) · toplam bahşiş ·
  **ağırlanan misafir sayısı** · masraflar çıkarılmış net kâr · toplam masraf ·
  tahsil edilmemiş / edilmiş tutar · Toplam Alacak Fişi · Toplam Borç Fişi.
- **Günlük Ciro Verileri:** ödeme tipi çubuk grafiği + gün gün tablo
  (Günlük Ciro · Nakit · Kredi Kartı · Multinet · Toplam Satış · Açık Hesap Borç).
  Ödeme tipleri **sütun olarak** çıkıyor — tanımlı her tip bir sütun.
- **Grafik Verileri:** garson bazlı satış (tutar + adet) · Sipariş Tipine Göre
  Satışlar · **Masa Bazlı Satışlar**.
- **Satış Kanalı Bazında:** #No · Sipariş Tipi · Sipariş Sayısı · Toplam İndirim ·
  Toplam Sipariş Tutarı · Oran(%).

### 11.7 Stok Durum ve Fire
- **Stok Durum Raporu:** #No · Ürün Kodu · Kategori ⇅ · Ürün Adı ⇅ · **Mutfak
  Grubu** · Stok Miktarı ⇅ (eksiye düşebiliyor) · **Kritik Stok Miktarı** ·
  Stok Birimi · Birim Tutarı · Toplam Tutar · Detay.
- **Fire Raporu:** **satın alınmamış modül** — ekran raporu değil tanıtımı
  gösteriyor ("Fire Tanımı Nedir? / Nasıl Aktif Edilir?" + satış iletişimi).
  Kapalı modüle boş ekran yerine açıklama gösterme deseni.

### 11.8 Bu turda çıkan kararlar ve Garso'ya alınacaklar
1. **Rapor = sol sekmeli tek sayfa.** Her rapor kendi içinde sekmelere ayrılıyor,
   üstte tek bir aralık ve Filtrele/İndir/Yazdır şeridi duruyor. Garso'da da
   Raporlar tek başlık, altında rapor listesi; rapor içi sekmeler solda. → Faz 1
2. **Filtre her yerde aynı bileşen:** hazır aralık (Bugün/Dün/Bu Hafta) + tarih +
   **saat**. Kasa günü saatleri varsayılan geliyor. Garso'da tek `RaporFiltre`
   bileşeni yazılacak. → Faz 1
3. **Adisyon detay penceresi raporun içinden açılıyor** ve her yerden aynı
   bileşen. Bizde de `AdisyonDetay` tek bileşen; Gün Sonu → Tüm Adisyonlar
   listesi onun ilk giriş noktası olacak. → Faz 1
4. **Ürünler sütununda kalem bazında "saat (kullanıcı)"** duruyor; bizde tur
   bazında var (`turlar.garson_id` + `olusturma`), gösterimde kalem satırına
   yazılacak. → Faz 1
5. **Hesap dökümü beş satır:** Ara Toplam · İndirim · Brüt (KDV hariç matrah) ·
   KDV · Toplam. Bizim `adisyonOzeti` bunu zaten üretiyor, ekranda aynı sırayla
   gösterilecek. → Faz 1
6. **Kapanmış adisyonun ödeme tipi düzeltilebiliyor.** Yanlış tipe basılan
   tahsilatı düzeltmek gerçek bir ihtiyaç; yetkiye bağlanacak ve **sipariş
   geçmişine "ödeme tipi değiştirildi" olarak düşecek**. → Faz 1
7. **Sipariş geçmişi olay listesi netleşti:** açıldı · ürün eklendi (o turun
   ürünleri balonda) · **çıktı alındı** · ödeme yapıldı (tip + tutar) · kapatıldı.
   Bizde `turlar` + `tahsilatlar` + `adisyonlar.acan_id` bunların çoğunu zaten
   veriyor; "çıktı alındı" yazıcı işiyle, "ödeme tipi değişti" madde 6 ile
   gelecek. Tam denetim kaydı (audit_log) yerine **türetilmiş zaman çizelgesi**
   ile başlıyoruz. → Faz 1
8. **Silinen Ürünler + Silinen Tahsilatlar ayrı iki rapor.** İptal edilen kalemi
   kimin sildiği ve nedeni tutuluyor. Bizde kalem `durum='iptal'` olarak duruyor
   ama **kimin iptal ettiği ve sebebi yok** — eklenecek. → Faz 1
9. **İptal/İade raporunda "İade Ödeme Tipi" ayrı sütun.** İade, satışın ödeme
   tipinden farklı bir yolla yapılabiliyor (nakit satılıp karta iade). → Faz 2
10. **Yoğunluk (gün × saat ısı tablosu)** ve **ürünün saatlik satış dağılımı**
    küçük ama işletmeciye vardiya planlatan iki rapor. → Faz 2
11. **Kuver ve Garsoniye adisyonun kendi sütunları.** Faz 2'ye yazılmıştı, rapor
    tarafında da yer tutuyorlar — veri modeline eklenirken rapor sütunları da
    düşünülecek. → Faz 2
12. **Satın alınmamış/kapalı modül ekranı boş bırakılmıyor**, ne işe yaradığı
    anlatılıp açma yolu gösteriliyor (Fire, Kasa Raporu). Garso'da kapalı
    modüller için aynı desen kullanılacak. → Faz 1

## 12. YAZICI MODÜLÜ — CANLI DERİN TUR (20 Ağu 2026)
*Adisyo'nun yazıcı tarafı baştan sona gezildi: Uygulama Mağazası'ndaki modül
kartı, web panelindeki Yazıcılar ekranı, yazıcı tanım penceresi, Çıktı Tasarımı
ve kasada çalışan **Adisyo Bulut** programının dört ekranı (Ramazan'ın ekran
görüntülerinden). Faz 2'nin ilk modülü.*

**Yazıcı ayarları ana menüde durmuyor** — `Uygulama Mağazası → Termal Yazıcı`
modülü eklenince sol menüde "Yazıcılar" maddesi oluşuyor. Modül kartının kendi
açıklaması: *"Özelliği eklediğinizde ana menüde 'Yazıcılar' adında yeni bir menü
alanı oluşacaktır."*

### 12.1 Bağlantı modeli — ürünün en kritik çatalı
Modül kartı iki yolu karşılaştırmalı sunuyor:
- **Birden Fazla Yazıcı (USB veya Ethernet):** ürün bazlı yazdırma (mutfak, bar),
  tek PC'den birden fazla yazıcı, **yalnız Windows**. Kasada *Adisyo Bulut*
  programı şart. Ingenico yazar kasa, para çekmecesi ve CallerID kullanacaksan da
  bu yol gerekiyor.
- **USB Bağlantılı Tek Yazıcı:** driver ve ek uygulama gerektirmez, macOS /
  Windows / Android, **tarayıcı üzerinden doğrudan erişim** → WebUSB. Yazıcılar
  ekranındaki *"Bu ekranda WebUSB ile bağlanan yazıcılar görüntülenmez"* uyarısı
  bundan.

### 12.2 Yazıcılar ekranı
Tablo: **Yazıcı Adı · Yazıcı Türü · Online (yeşil nokta) · İşlemler
(düzenle/sil)**. İşletmede dört tanım: MUTFAK · BAR · NARGİLE (#Mutfak) ve
KASA (#Adisyon). Sağ sütun: **Yazıcı Modeli** seçimi (yukarıdaki iki yol),
**Keşfet** (Ethernet / USB tanımlama videoları) ve **Kuruluma Başla**:
1) Bulut Yazıcı Programını İndir, 2) Yeni Yazıcı Ekle.

Başlangıç rehberindeki kurulum sırası: **teknik kullanıcı oluştur** (rolü
"Teknik"; *kullanıcı limitine dahil değil*) → bulut programını indir, o
kullanıcıyla giriş yap → yazıcıları ekle.

### 12.3 Yazıcı tanım penceresi
- **Yazıcı Adı**
- **Bulunan Yazıcılar** — açılır liste; içinde XP-80, XP-80C (copy 1),
  Xprinter XP-80, KASA… yani **Windows'a kurulu yazıcı adları**. IP, port ve
  kağıt boyutu **hiç sorulmuyor**; o işi Windows sürücüsü yapıyor.
- **Yazıcı Türü** (anahtar): Adisyon · Mutfak · Abiyer (*diğer türle aynı anda
  seçilemez*) · Kurye. "En az bir yazıcı türü seçilmelidir."
- **Gelir Merkezi:** Ana Kanal
- **Mutfak Grubu:** Mutfak · Bar · Nargile anahtarları — **yalnız "Mutfak" türü
  açıkken beliriyor.** Bir yazıcı birden fazla gruba açılabiliyor.

Yönlendirme zinciri: **ürün → mutfak grubu → yazıcı.** Mutfak grubu ürünün kendi
alanı (`Tanımlamalar → Mutfak Grupları`: yalnız ad + "Pişirme aşaması" /
"Paketleme aşaması" anahtarları). Ürün kartında ayrıca "Mutfak Ekranında Göster".

### 12.4 Çıktı Tasarımı
İki ayrı şablon sekmesi: **Adisyon Çıktısı** ve **Mutfak Çıktısı**. Her biri üç
sütun — Parametreler · Yazı Boyutları · canlı **Önizleme** (son 5 gerçek sipariş
arasından seçilerek).
- **Adisyon parametreleri:** ürün listesi başlıkları · KDV bilgisi · KDV grubu ·
  hesabı paylaş alanı · bahşiş alanı · döviz kuru · sipariş numarası · ürün
  birimleri · **karekod** (işletme adı, tarih, tutar) · logo.
- **Mutfak parametreleri** ayrı bir set: ürün fiyatları · sipariş toplamları ·
  müşteri bilgileri · müşteri sayısı — mutfak fişinde fiyat varsayılan kapalı.
- **Yazı boyutları alan alan punto:** restoran adı 25, ürün listesi 20 (mutfakta
  24), toplam 25, sipariş notu 15, üst boşluk, masa kart no…
- Altta serbest **alt metin** ("Afiyet Olsun.").
- Mutfak fişinde fiyat/toplam yok; **sipariş numarası büyük punto**, ürün +
  seçenek satırı (SU • SOĞUK) var.

### 12.5 Yazdırmayı yöneten parametreler (Ayarlar → Parametreler)
- **Mutfak yazıcısı için manuel yazdırma yapılsın** — kapalıyken sipariş
  kaydedilince fiş otomatik çıkar; açıkken yalnız mutfak ekranında "Hazır"
  denince basılır.
- **Adisyon fişleri cihaz özelinde çıksın**
- **Yazıcı ve sipariş ekranında ürünlerin fiyatı KDV hariç gösterilsin**
- **Siparişi marşlı şekilde gönderme** — ürünlerin hangi sırayla hazırlanacağı
  mutfağa gider (bizim `check_items.servis_grubu` alanının karşılığı).

Müşteri adisyonu elle basılıyor: masa üç nokta menüsünde **Yazdır** (Öde · Hızlı
Öde · İptal · Yazdır · Masayı Değiştir · Masaları Birleştir · Adisyon Aktar).

### 12.6 Adisyo Bulut programı (kasada çalışan köprü) — v2.6.2.0
Dört ekranı görüldü:
1. **Giriş:** e-posta/telefon + parola. Altta **Kimlik No:
   `DESKTOP-JGCK52N:AC45EF32F636`** — bilgisayar adı + MAC. Cihaz kimliği böyle
   üretiliyor. Sol altta "Prod" yazıyor (geliştirici artığı, müşteride durmamalı).
2. **Tepsi menüsü:** Giriş Yapıldı (telefon) · Restoran: 37104 (kopyala) ·
   Bağlantı Durumu (kırmızı nokta) · Cihaz Ayarları · Çıkış. Program pencere
   değil, saat yanında yaşayan bir hizmet.
3. **Bağlantı Durumu:** beş kutu — İnternet (IP) · **Adisyo Hub
   (`hub.adisyo.com`)** · Ingenico Cihazı (Port: COM4, dişli ile ayar) · Yazıcı ·
   CallerID. Üç durum: **Bağlı / Bağlantı yok (yeniden deneniyor) /
   Kullanılmıyor.** Altta **"Bilgileri Kopyala"** (destek hattına yapıştırmak
   için) ve "Bağlantı kesildiğinde bildirim göster".
4. **Cihaz Ayarları:** *Para Çekmecesi* sekmesi — Bağlantı Türü: Yazıcı
   Bağlantısı / USB Bağlantısı / GPIO Port Bağlantısı; ayrıca *CallerID* sekmesi.

**Yani bu program yalnız yazıcı köprüsü değil, yerel donanım köprüsü:** yazıcı,
para çekmecesi, ÖKC (seri port) ve CallerID aynı programdan geçiyor.

### 12.7 Garso'ya çıkan kararlar
1. **Tarayıcı yerel ağa ham TCP açamaz.** Ethernet yazıcıya (IP:9100) Garso'nun
   sayfası doğrudan basamaz, bulut sunucusu da işletmenin iç ağına ulaşamaz.
   Köprüsüz çözüm yok — Adisyo'nun da köprü yazmasının sebebi bu. → Faz 2
2. **Karar: Garso Kasa Köprüsü.** Garso'nun tamamı masaüstü uygulamasına
   taşınmıyor (iki sürüm bakım maliyeti + her güncellemede dağıtım). İndirilen
   tek parça köprü olacak. Baştan **"yazıcı programı" değil "kasa köprüsü"**
   olarak tasarlanıyor: ilk sürümde yazıcı + para çekmecesi, sonra ÖKC ve
   CallerID kendi modülleri gelince eklenir. Node ile yazılırsa Windows'a
   mahkûm olmaz (Adisyo'nun çoklu yazıcı yolu yalnız Windows). → Faz 2
3. **Ethernet yazıcıda Adisyo'dan ileri gidiyoruz.** Adisyo yazıcının Windows'a
   kurulu olmasını şart koşuyor; bizim köprü **doğrudan IP:9100'e ESC/POS**
   gönderebilecek, sürücü gerekmeyecek. USB tarafında işletim sisteminin yazıcı
   listesi kullanılır. → Faz 2
4. **WebUSB kurulumsuz giriş yolu olarak kalıyor:** tek USB yazıcılı küçük
   işletme hiçbir şey kurmadan çalışsın; ikinci yazıcı gerekince köprüye geçiş
   yolu açık olsun. → Faz 2
5. **Ayarlar bulutta, sürücü köprüde.** Yazıcı tanımı, eşleme ve fiş şablonu
   bulutta durur; köprü yalnız basar. İşletme kaç kasa kullanırsa kullansın ayar
   tek yerdedir. Cihaz kimliği = **işletme kodu + cihaz kimliği**. → Faz 2
6. **Yazdırma kuyruğu — Adisyo'da yok, bizde olacak.** Bulut programının hiçbir
   ekranında kuyruk/başarısız iş görünmüyor; yazıcı kapalıyken gönderilen fişe ne
   olduğu belli değil. Bizde fiş kuyruğa alınır, yazıcı gelince basılır,
   basılamayan "başarısız" olarak görünür ve **yeniden bas** denebilir. Mutfağa
   düşmeyen sipariş bir restoranda en pahalı hatadır. → Faz 2
7. **Bağlantı Durumu ekranı kopyalanıyor** (destek çağrılarının yarısını kendi
   kendine çözer), üstüne **her cihaz için "Dene" düğmesi** konuyor: test fişi
   bas, çekmeceyi aç. Adisyo üç çekmece bağlantı türü sunuyor ama hangisinin
   çalıştığını denemenin yolu yok. → Faz 2
8. **Mutfak grubu kategoriye de bağlanabilecek.** Adisyo'da yalnız ürünün alanı;
   200 ürünlük menüde tek tek seçtirmek işkence. Bizde kategori grubu belirler,
   ürün gerekirse ezer. → Faz 2
9. **Fiş şablonu ekranı canlı önizlemeli olacak** (Adisyo'nun en iyi yaptığı iş):
   gerçek bir siparişle, alan alan punto ve görünürlük anahtarlarıyla. Adisyon ve
   mutfak fişi ayrı şablon. → Faz 2
10. **"Çıktı alındı" olayı sipariş geçmişine düşecek** — 11. bölümdeki madde 7'de
    yazıcı işine bırakılmıştı, bu modülle kapanıyor. → Faz 2

