# GARSO — Teknik Tasarım: Veri Modeli & Ekran Haritası
*Restoran ve cafe'ler için bulut tabanlı satış ve işletme yönetim sistemi.*

## 0. SIRADAKİ İŞ (2 Ağu 2026 üçüncü seansının sonunda güncellendi)

*Ramazan seansa "devam edelim" diye giriyor — sıradaki iş bu listenin en üstündeki
maddedir. Seans sonunda bu liste güncellenir: biten madde silinir, kalanlar
yukarı kayar, yeni çıkanlar sıraya girer.*

1. **KDV grupları** — `{ ad, oran, varsayılan mı, sıra }`, en fazla 8 tanım.
   Geldiğinde Toplu Düzenle tablosuna da sütun olarak eklenecek.
2. **Menü/kampanya ürünü** — yapısı netleşti: menü grubu = başlık + seçilebilir
   ürün sayısı + satırlar `{ ürün, porsiyon, miktar, ek fiyat, varsayılan }`;
   maliyet içerikten otomatik.
3. **Ürünün kategorisini listeden taşıma** — ürünü panele girmeden başka
   kategoriye/alt kategoriye alma (alt kategori gelince ihtiyaç belirginleşti).

*Reçete bilinçli olarak ertelendi: malzeme/stok tablosu olmadan boş bir alandan
ibaret kalırdı, stok modülüyle (Faz 3) birlikte yapılacak. (2 Ağu 2026)*

*(30 Tem – 2 Ağu'da yapılanlar bölüm 5'te; menü modülünün tam eksik listesi
bölüm 5'in sonundaki "SONRAKİ ADIMLAR" başlığında.)*

---

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
urunler              (id, ad, kod UNIQUE*, renk, favori, satista_gorunur, mutfakta_gorunur)
birimler             (id, ad UNIQUE, sira)            -- Tam, Yarım, Adet, Kg... porsiyon adının tek kaynağı
porsiyonlar          (id, urun_id, birim_id, fiyat, maliyet, barkod,
                      masa_fiyat, gelal_fiyat, paket_fiyat, varsayilan, sira)
urun_kategorileri    (urun_id, kategori_id, sira)     -- çoktan-çoğa + ürünün O kategorideki sırası
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

Kalıcı modelde ayrıca gelecek: `stations` (Mutfak/Bar/Nargile — KDS ve yazıcı hedefi), `tax_groups` (KDV oranları), menü/kampanya ürünü, reçete.

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

### 📌 SONRAKİ ADIMLAR
**Menü Stüdyosu'nda kalanlar (Adisyo paritesi hedefi):**
- KDV grubu
- ~~Seçenek grubunun porsiyon bazına taşınması~~ ✅ 2 Ağu 2026 (2. seans).
  Reçete stok modülüne bırakıldı.
- Menü/kampanya ürünü (birden fazla ürün tek fiyata)
- Mutfak grubu alanı (anlamı KDS gelince oluşur)
- ~~**Toplu ürün işlemleri**~~ ✅ 2 Ağu 2026 — Toplu Düzenle sekmesi. KDV/mutfak
  grubu/stok sütunları o alanlar veri modeline girince eklenecek.
- **Ürünleri Excel'e aktar / Excel'den içeri al**

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
- **Menü/kampanya tanımının yapısı** netleşti: menü grubu = başlık + *seçilebilir ürün sayısı* + satırlar `{ ürün, porsiyon, miktar, ek fiyat, varsayılan }`; maliyet içerikten otomatik hesaplanıyor

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
