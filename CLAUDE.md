# Garso — Çalışma Kuralları

Garso, restoran ve cafeler için bulut tabanlı satış ve işletme yönetim sistemi.
Ramazan'ın kendi cafe/restoran işletmesi için geliştiriliyor; sonrasında başka
işletmelere satılacak ticari bir ürün olması hedefleniyor.

Referans ürün Adisyo (pos.adisyo.com) — şu an işletmede o kullanılıyor.
Ancak Garso birebir kopya olmayacak: kendi terminolojisi, kendi renk paleti ve
kendi arayüz kararları var. Bilinçli farklılaşmalar garso-tasarim.md'de.

## Kullanıcı hakkında

Ramazan yazılımda acemi. Her şeyi basit Türkçe ile, teknik terimleri
açıklayarak anlat. Adımların NEDEN yapıldığını da söyle.

Açıklamalar kısa tutulur — uzun paragraflar ve gereksiz teknik detay yok.
Açıklama gerekiyorsa en fazla bir-iki cümle.

## Çalışma düzeni

- **Seans başlangıcı:** Ramazan sadece "devam edelim" yazar. Bu şu demek:
  garso-tasarim.md ve pos-yol-haritasi.md'yi oku, tasarım dosyasının
  "0. SIRADAKİ İŞ" listesindeki **en üstteki maddeyi** al, planını anlat,
  onay bekle. Ne yapılacağını Ramazan'a sorma — liste zaten söylüyor.
- **Seans sonu:** "0. SIRADAKİ İŞ" listesi güncellenir — biten madde silinir,
  kalanlar yukarı kayar, o seansta çıkan yeni işler sıraya eklenir. Liste bir
  sonraki seansın tek giriş noktasıdır, güncel tutulmazsa akış kopar.
- Görevler TEK TEK verilir. Bir görev bitip Ramazan onaylamadan yenisine geçilmez.
- Değişiklik yapmadan önce planını anlat, onay bekle.
- Bir dosyayı değiştirirken hangi dosyada ne yaptığını ve neden yaptığını söyle.
- Önemli bir tasarım kararı alınırsa garso-tasarim.md'ye işlenmesi gerektiğini hatırlat.
- garso-tasarim.md her görev bitiminde değil, seans sonunda güncellenir (kaynak
  kontrolü adımlarıyla birlikte).
- Görev bitiminde oturum uzayıp ağırlaştıysa Ramazan'ı uyar ve yeni oturuma
  geçmesini öner. Görev ortasında kesmeyi önerme.

## Ortam

- Windows + PowerShell. `npm` yerine **`npm.cmd`** kullanılır.
- Dev server tek terminalde çalışır: `npm.cmd run dev`
  Birden fazla terminalde açık kalırsa Vite başka porta geçiyor (5174, 5175...)
  ve eski sekme güncellenmemiş kodu gösteriyor. Tek terminal kuralı.
- Test: Ramazan kendi yapıyor (usage tasarrufu için). Claude tarayıcıda kendi
  başına test etmez; değişiklik bitince Ramazan'a "şunu dene" diye net adımlar
  söyler, sonucu bekler.

## Kod stili

- Temiz, doğal, kendi projesiymiş gibi yazılmış görünmeli.
- Gereksiz yorum ve "yapay zeka izi" olmasın.
- Değişken ve fonksiyon adları Türkçe — mevcut koda uy.
- Para hesaplarında kuruş hassasiyeti; float kullanma.
- Onay/uyarı gerektiren durumlarda tarayıcının kendi `confirm()`/`alert()`/
  `prompt()` popup'ları KULLANILMAZ — stillenemiyorlar, siteye yabancı
  duruyorlar. Bunun yerine her zaman kendi modalımız kullanılır
  (`components/OnayModal.tsx` — onay için Vazgeç/Evet, uyarı için tek Tamam).

## Görünüm kuralları

- **Silik yazı yasak.** Hiçbir ekranda düşük kontrastlı gri metin olmaz.
  İkincil metin bile okunur tondadır (`--soluk`), gövde yazısı 14px'in,
  başlık 17px'in altına inmez. 12px altı punto kullanılmaz.
- **Yazı tipi Poppins** (`@fontsource/poppins`, pakete gömülü — kasa
  çevrimdışıyken de doğru görünsün diye internetten çekilmiyor).
- **Vurgu rengi mercan** (`--mercan`). Pastel veya çok renkli paletler ana
  ekranlarda kullanılmaz; renk seçici yalnızca kategori/ürün gibi kullanıcının
  kendi etiketlediği yerlerde vardır.
- Bir ekranın veya bölümün ne işe yaradığını anlatan açıklama cümleleri düz
  paragraf değil, `components/Bilgi.tsx` ile yazılır (yuvarlak "i" ikonlu kutu).

## Teknoloji

React + TypeScript + Vite, Supabase (PostgreSQL), react-router-dom.

## Proje dosyaları

- **garso-tasarim.md** — veri modeli, ekran haritası, tasarım kararları,
  geliştirme durumu ve sıradaki adımlar. Bir işe başlamadan önce oku.
- **pos-yol-haritasi.md** — Adisyo özellik envanteri, faz planı ve rakip
  analizi. "Sırada ne var, Adisyo bunu nasıl yapmış" sorularının kaynağı.

## Sürüm

Garso ile yazıcı programı (köprü) **tek sürüm numarasını** paylaşır. Her
seansın sonunda, kaynak kontrolünden önce numara artırılır:

- `npm.cmd run surum` — küçük parça artar (1.0.1 → 1.0.2), olağan seans
- `npm.cmd run surum orta` — yeni modül bittiğinde (1.0.2 → 1.1.0)
- `npm.cmd run surum buyuk` — büyük dönüşümde (1.1.0 → 2.0.0)

Komut beş dosyadaki numarayı birlikte değiştirir; sürüm elle yazılmaz.

## Kaynak kontrolü

Repo: github.com/ramazann1/garso
Seans sonunda: `git add .` → `git commit -m "aciklama"` → `git push`
