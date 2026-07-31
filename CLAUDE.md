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

## Teknoloji

React + TypeScript + Vite, Supabase (PostgreSQL), react-router-dom.

## Proje dosyaları

- **garso-tasarim.md** — veri modeli, ekran haritası, tasarım kararları,
  geliştirme durumu ve sıradaki adımlar. Bir işe başlamadan önce oku.
- **pos-yol-haritasi.md** — Adisyo özellik envanteri, faz planı ve rakip
  analizi. "Sırada ne var, Adisyo bunu nasıl yapmış" sorularının kaynağı.

## Kaynak kontrolü

Repo: github.com/ramazann1/garso
Seans sonunda: `git add .` → `git commit -m "aciklama"` → `git push`
