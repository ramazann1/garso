# GARSO — Teknik Tasarım: Veri Modeli & Ekran Haritası
*Restoran ve cafe'ler için bulut tabanlı satış ve işletme yönetim sistemi.*

## 0. SIRADAKİ İŞ (1 Ağu 2026'da devam)

*Ramazan seansa "devam edelim" diye giriyor — sıradaki iş bu listenin en üstündeki
maddedir. Seans sonunda bu liste güncellenir: biten madde silinir, kalanlar
yukarı kayar, yeni çıkanlar sıraya girer.*

1. **Şema tamamlama (Ramazan'ın onayıyla çalıştırılacak).** Veritabanına tek
   seferde dokunmak için üç iş birlikte yapılır:
   - `alter table kategoriler drop column urunler;` — jsonb sütunu artık
     kullanılmıyor (ürünler kendi tablosunda), sipariş ekranı yeni menüye
     bağlandığı için silinebilir durumda.
   - `porsiyonlar` tablosuna eksik alanlar: `birim`, `maliyet`.
   - **Karar gerekiyor:** porsiyon fiyatı sipariş türüne göre ayrılacak mı
     (masa / gel al / paket)? Adisyo ayırıyor. Sonradan dönmek pahalı olduğu
     için şemaya dokunmuşken karara bağlanmalı. *(31 Tem 2026 bulgusu)*
2. **Sürükle-bırak sıralama** (kategori ve ürün). Adisyo ayrı modalda yapıyor
   + "A-Z" düğmesi sunuyor; bizim yöntemimiz ayrıca kararlaştırılacak.
3. **Ürün kopyalama, ürün kodu / barkod.**
4. **Arayüz eksikleri paketi** (model değişmiyor): satış/mutfak ekranında
   göster anahtarları, seçenek grubunda "zorunlu", serbest hex renk, kategori
   adında karakter sayacı, aramada kapsam seçici.
5. **Toplu ürün işlemleri tablosu** (Excel benzeri tek ekran + tek Kaydet).

*(30-31 Tem'de yapılanlar bölüm 5'te; menü modülünün tam eksik listesi
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

### Menü — 30 Tem 2026'da prototipte kuruldu
```sql
kategoriler          (id, ad, renk, sira)
urunler              (id, ad, renk, kod, favori, aktif, sira)
porsiyonlar          (id, urun_id, ad, birim, fiyat, maliyet, varsayilan, sira)
urun_kategorileri    (urun_id, kategori_id)           -- çoktan-çoğa: ürün birden fazla kategoride
secenek_gruplari     (id, ad, tekli, zorunlu, sira)   -- Servis, Şeker, Aroma...
secenekler           (id, grup_id, ad, ek_fiyat, sira)
urun_secenek_gruplari(urun_id, grup_id)               -- grup bir kez tanımlanır, ürünlere bağlanır
```
Kalıcı modelde ayrıca gelecek: `stations` (Mutfak/Bar/Nargile — KDS ve yazıcı hedefi), `tax_groups` (KDV oranları), `birimler`, menü/kampanya ürünü.

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

**Gezinme (30 Tem 2026 kararı):** Sol dikey şerit, daralt/genişlet düğmesiyle 66px ↔ 190px. Kapalıyken sadece ikon, açıkken ikon + yazı. Adisyo'nun içeriği karartıp kapatan 312px overlay çekmecesi kullanılmıyor — Garso'nun şeridi içeriği hiç kapatmaz. Sipariş ekranında şerit gizlenir (tam ekran odak).

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

### 📌 SONRAKİ ADIMLAR
**Menü Stüdyosu'nda kalanlar (Adisyo paritesi hedefi):**
- `kategoriler.urunler` sütununu veritabanından silmek (yukarıda 0. bölümde, onay bekliyor)
- Sürükle-bırak sıralama (kategori ve ürün) — Adisyo bunu **ayrı sıralama modalında** yapıyor, listeye gömmüyor; modalda ayrıca **"A-Z" tek tıkla alfabetik sıralama** var
- Ürün kopyalama
- Ürün kodu / barkod, birim, maliyet, KDV grubu
- Menü/kampanya ürünü (birden fazla ürün tek fiyata)
- Mutfak grubu alanı (anlamı KDS gelince oluşur)
- Ürün arama, aktif/pasif ürün
- **Toplu ürün işlemleri** — Excel benzeri düzenlenebilir tablo: tüm ürünlerin fiyat/KDV/mutfak grubu/satılabilir alanları tek ekranda, tek "Kaydet" ile. Zam döneminde tek tek düzenlemeye göre çok hızlı. *(31 Tem 2026'da Adisyo'da keşfedildi)*
- **Ürünleri Excel'e aktar / Excel'den içeri al**
- **"Tüm kategorileri görüntüle"** — ürünleri kategori ayrımı olmadan tek listede görme

**31 Tem 2026 — Adisyo Menü/Ürünler derin turunda çıkan yeni eksikler**
*(Tüm ⋮ menüleri ve kapalı anahtarlar açılarak bulundu. Ayrıntılı döküm: `pos-yol-haritasi.md` → "Menü/Ürünler Modülü — Derin Tur".)*

*Veri modelini etkileyenler (önce karar, sonra kod):*
- **Sipariş türüne göre fiyat** — porsiyon fiyatı tek sayı değil: Tek Fiyat / Masa / Gel Al / Paket. Paket servis fiyatı masadan farklı olabiliyor. `porsiyonlar.fiyat` tek sütun olarak kalırsa sonradan dönmek pahalı.
- **Barkod, reçete ve seçenek grubu bağlama porsiyon bazlı** — bizde seçenek grupları ürüne bağlı (`urun_secenek_gruplari`). Adisyo porsiyona bağlıyor.
- **Birimler merkezi liste** — porsiyon adı serbest metin değil, ortak `birimler` tablosundan seçiliyor ("Tam" / "tam" / "TAM" karmaşasını önlüyor).
- **Alt kategori (kategori ağacı)** — kategori formunda opsiyonel üst kategori.
- **KDV grupları** — `{ ad, oran, varsayılan mı, sıra }`, en fazla 8 tanım.
- **Mutfak grubunda opsiyonel KDS aşamaları** (Pişirme / Paketleme) — İstasyon ekranındaki kanban kolonları sabit olamaz, gruba göre değişir.

*Arayüz eksikleri (model değişmiyor):*
- Ürün anahtarları: **Satış Ekranında Göster**, **Mutfak Ekranında Göster**, **KDV hariç olsun**, **Özellik ve Porsiyon Otomatik Sorulsun**, **Stok takibi yap**
- Kategori anahtarları: Satış Ekranında Göster, Mutfak Ekranında Göster
- Kategori bazlı **toplu işlem** modalı (kategorideki tüm ürünlere mutfak grubu / KDV / zorunlu seçim / stok / satılabilir uygulama)
- Seçenek grubunda **"zorunlu"** anahtarı (alan veri modelimizde zaten var, arayüzde yok) + seçenekte **varsayılan** işareti + seçenek sıralama
- Ürün kartından **panele girmeden hızlı renk değiştirme**; renk seçiminde **serbest hex** girişi
- Kategori adında **karakter sınırı + sayaç**
- Aramada **kapsam seçici** (tüm kategoriler / aktif kategori)
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
12. **Silme aksiyonları her zaman görünür, hover'a bağlı değil.** Liste satırlarında "Sil ×" yazı+ikon olarak duruyor; düzenleme panellerinde ayrı kırmızı kutulu bir "Sil" butonu var. *(31 Tem 2026)*
13. **Onay/uyarı için tarayıcının `confirm()`/`alert()`'i kullanılmaz.** Her zaman kendi `OnayModal.tsx` bileşenimiz kullanılır — stillenemeyen, siteye yabancı duran native popup'lar yasak. *(31 Tem 2026)*

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
