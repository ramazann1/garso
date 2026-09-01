-- Yazarkasa (ÖKC) ana anahtarı.
--
-- Ödeme tipleri "okc" ve "klasik" diye ikiye ayrılıyor; ÖKC olanlar yazarkasaya
-- iletilecek şekilde kaydediliyor. Yazarkasa kullanmayan işletme bu tipleri tek
-- tek gizlemek zorunda kalıyordu. Anahtar kapalıyken ÖKC tipleri hiçbir ödeme
-- ekranında listelenmiyor; tanımlar silinmiyor, yeniden açınca geri geliyor.
--
-- Varsayılan açık: bugüne kadar ÖKC tipleri görünüyordu, ayar eklenince
-- kimsenin ekranı değişmesin.

alter table isletme_ayarlari add column if not exists okc_acik boolean not null default true;

comment on column isletme_ayarlari.okc_acik is
  'Kapalıyken yazarkasa (ÖKC) ödeme tipleri ödeme ekranlarında hiç görünmez.';
