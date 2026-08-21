-- Masa kartı, üzerinden bir süre geçtiği hâlde yeni sipariş gelmeyen masayı
-- renk değiştirerek belli ediyor. Süreyi işletme kendi belirliyor: yoğun bir
-- kafede 30 dakika, oturmalı bir restoranda bir saat anlamlı olabiliyor.
-- 0 yazılırsa kural kapanıyor, kart durgunluğa göre renk değiştirmiyor.

alter table isletme_ayarlari
  add column if not exists masa_durgunluk_dk int not null default 45;
