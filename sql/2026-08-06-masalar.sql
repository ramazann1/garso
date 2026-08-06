-- Masa ve bölgeler koddan veritabanına. Adisyon artık masaya adıyla değil
-- kimliğiyle bağlanıyor; masa yeniden adlandırılınca üstündeki adisyon kopmuyor.

create table if not exists bolgeler (
  id   bigint generated always as identity primary key,
  ad   text not null,
  sira int  not null default 0
);

create table if not exists masalar (
  id        bigint generated always as identity primary key,
  bolge_id  bigint not null references bolgeler (id) on delete cascade,
  ad        text   not null,
  sira      int    not null default 0,
  kapasite  int,
  aktif     boolean not null default true
);
create index if not exists masalar_bolge on masalar (bolge_id);

alter table bolgeler enable row level security;
alter table masalar  enable row level security;

drop policy if exists bolgeler_hepsi on bolgeler;
drop policy if exists masalar_hepsi  on masalar;
create policy bolgeler_hepsi on bolgeler for all using (true) with check (true);
create policy masalar_hepsi  on masalar  for all using (true) with check (true);

-- Şimdiye kadar koda gömülü olan masalar başlangıç verisi olarak giriyor.
insert into bolgeler (ad, sira)
select 'Bahçe', 1 where not exists (select 1 from bolgeler);
insert into bolgeler (ad, sira)
select 'Salon', 2 where not exists (select 1 from bolgeler where ad = 'Salon');

insert into masalar (bolge_id, ad, sira)
select b.id, x.ad, x.sira
from bolgeler b
join (values ('B 1',1),('B 2',2),('B 3',3),('B 4',4),('B 5',5),('B 6',6)) as x(ad, sira) on true
where b.ad = 'Bahçe' and not exists (select 1 from masalar m where m.bolge_id = b.id);

insert into masalar (bolge_id, ad, sira)
select b.id, x.ad, x.sira
from bolgeler b
join (values ('S 1',1),('S 2',2),('S 3',3),('S 4',4)) as x(ad, sira) on true
where b.ad = 'Salon' and not exists (select 1 from masalar m where m.bolge_id = b.id);

-- Adisyonun masaya bağı: masa_ad yerine masa_id. Eski sütun geri dönüş için
-- duruyor ama artık kod onu okumuyor.
alter table adisyonlar add column if not exists masa_id bigint references masalar (id);

update adisyonlar a
set    masa_id = m.id
from   masalar m
where  a.masa_id is null and m.ad = a.masa_ad;

alter table adisyonlar alter column masa_ad drop not null;

-- Bir masada aynı anda tek açık adisyon kuralı artık kimlik üzerinden.
drop index if exists adisyonlar_acik_masa;
create unique index if not exists adisyonlar_acik_masa_id on adisyonlar (masa_id) where durum = 'acik';
create index if not exists adisyonlar_masa on adisyonlar (masa_id);

-- Salon planı: masanın bölge içindeki yeri ve boyutu. Editör salon ekranının
-- yeniden tasarımıyla gelecek; alanlar şimdiden duruyor ki masa verisi birikince
-- tabloyu tekrar elden geçirmek gerekmesin. Boşsa masa ızgarada sırasıyla dizilir.
alter table masalar add column if not exists konum_x   int;
alter table masalar add column if not exists konum_y   int;
alter table masalar add column if not exists genislik  int;
alter table masalar add column if not exists yukseklik int;
alter table masalar add column if not exists sekil     text not null default 'kare'
  check (sekil in ('kare', 'daire'));

