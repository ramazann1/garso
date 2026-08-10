-- İşletme parametreleri.
-- Adisyo'nun 25 anahtarlık parametre listesinden bize uyanlar. Hepsi tek satırda
-- duruyor (işletme başına bir satır); ekranlar açılışta okunan önbellekten
-- bakıyor, satış sırasında veritabanına gidilmiyor.

alter table isletme_ayarlari
  -- Kasa günü gece yarısında değil, işletmenin açılış saatinde başlıyor: 03:00'te
  -- satılan çay dünün hesabına yazılsın. Gün sonu ve raporlar bu aralığı kullanacak.
  add column if not exists kasa_gunu_baslangic time not null default '08:00',
  add column if not exists kasa_gunu_bitis     time not null default '07:55',

  -- Misafir sayısı boş bırakılamasın; kişi başı ciro raporu buna dayanıyor.
  add column if not exists kisi_sayisi_zorunlu boolean not null default false,

  -- Kasa bu kadar saniye kullanılmazsa kilit ekranı kendiliğinden gelir.
  -- 0 = kapalı; ortak kasada 60-120 saniye makul.
  add column if not exists kilit_suresi int not null default 0,

  -- Hızlı Öde'de müşterinin verdiği tutar girilince para üstü hesaplansın.
  add column if not exists para_ustu boolean not null default true,

  -- Çalışma tipleri: işletme paket servis yapmıyorsa o akış arayüzde hiç
  -- durmasın. Masa kapatılamıyor — masasız çalışan işletme bu programı
  -- kullanmaz, kapatılırsa geriye satış yapacak ekran kalmaz.
  add column if not exists gelal_acik boolean not null default true,
  add column if not exists paket_acik boolean not null default true;
