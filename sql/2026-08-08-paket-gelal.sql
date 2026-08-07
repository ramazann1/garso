-- Masasız adisyonlar: gel al (müşteri gelip alıyor) ve paket (kuryeyle gidiyor).
-- Aynı adisyon nesnesi kullanılıyor, yalnız tip ve müşteri bilgisi ekleniyor;
-- masa_id boş kalıyor.
alter table adisyonlar
  add column if not exists tip text not null default 'masa';

alter table adisyonlar drop constraint if exists adisyonlar_tip_check;
alter table adisyonlar
  add constraint adisyonlar_tip_check check (tip in ('masa', 'gelal', 'paket'));

alter table adisyonlar add column if not exists musteri_ad       text;
alter table adisyonlar add column if not exists musteri_telefon  text;
alter table adisyonlar add column if not exists adres            text;

-- Masasız adisyonlar salon ekranında ayrı sekmede listeleniyor; sorgu tipe göre
-- geldiği için indeks tipin üstünde.
create index if not exists adisyonlar_tip on adisyonlar (tip) where durum = 'acik';
