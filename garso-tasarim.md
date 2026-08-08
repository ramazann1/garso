# GARSO — Teknik Tasarım: Veri Modeli & Ekran Haritası
*Restoran ve cafe'ler için bulut tabanlı satış ve işletme yönetim sistemi.*

## 0. SIRADAKİ İŞ (9 Ağu 2026 oturumunda güncellendi)

*Ramazan seansa "devam edelim" diye giriyor — sıradaki iş bu listenin en üstündeki
maddedir. Seans sonunda bu liste güncellenir: biten madde silinir, kalanlar
yukarı kayar, yeni çıkanlar sıraya girer.*

**Menü modülü, masa/bölge tanımları, salon çekirdeği, Hızlı Öde, tahsilat
zenginleştirmesi ve Gel Al / Paket akışı bitti.** Eksik envanteri bölüm 6'da,
Adisyo turları `pos-yol-haritasi.md` bölüm 7 ve 8'de.

1. **Adisyon düzeyi alanlar** — adisyon no, serbest isim, kişi sayısı, adisyon
   notu, müşteri. Tabloda `adisyon_no` var, ekranda kullanılmıyor.
2. **Kapanmış adisyonlar listesi** — kapanan adisyon `durum = kapali` olarak
   duruyor; onları gösteren ekran yok.
3. **Masa yazdırma ve adisyon iptali** — masa üç nokta menüsünde yerleri boş
   duruyor; yazdırma yazıcı altyapısına, iptal kapanmış adisyon ekranına bağlı.
4. **Personel + PIN, tur bazlı garson** — masa kartındaki isim adisyonu açan
   garson, tur başlığındaki isim o turu yazan garson (`turlar.garson_id`).
   Yol haritası kararı 7; personel sistemiyle birlikte yapılacak.

**Ödenmezler** ve **Kuver/Garsoniye** Faz 2'ye yazıldı (yol haritası bölüm 8);
bu listeye satış çekirdeği bitince girecekler.

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
