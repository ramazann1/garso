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
- [ ] Masa haritası (bölge/salon desteği), masa açma-taşıma-birleştirme
- [ ] Adisyon: ürün ekleme/çıkarma, not, ikram, indirim, iptal (yetki kontrollü)
- [ ] Kategori/ürün/varyant/seçenek yönetimi
- [ ] Ödeme: nakit, kart, parçalı ödeme, hesap bölme (ürün bazlı + tutar bazlı)
- [ ] Kasa: açılış/kapanış, gider girişi, gün sonu (Z raporu mantığı)
- [ ] Temel raporlar: gün sonu, ürün satışları, ödeme dağılımı
- [ ] Basit personel girişi (PIN ile hızlı kullanıcı değişimi)

### FAZ 2 — Operasyon (4-6 hafta)
Amaç: Yoğun bir restoranın mutfak-servis akışını taşıyabilmeli.
- [ ] KDS mutfak ekranı: sipariş kartları, hazır bildirimi, süre takibi
- [ ] Yazıcı yönetimi: ürün→yazıcı yönlendirme, mutfak fişi, adisyon çıktısı (ESC/POS)
- [ ] Paket servis + gel-al akışı, müşteri/adres kayıtları
- [ ] Kurye atama ve teslimat durumu takibi
- [ ] Garson mobil sipariş ekranı (PWA)
- [ ] Offline dayanıklılık: bağlantı kopunca kuyruklama, senkronizasyon

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

### KDS (Mutfak) Ekranı
- Giriş: mutfak grubu seçimi (Mutfak | Bar | Nargile) → her istasyon kendi ekranını açıyor.

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
