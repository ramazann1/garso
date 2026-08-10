-- "Kim yaptı" bilgisi.
-- Şimdiye kadar adisyonun kime ait olduğu tutulmuyordu; personel sistemi
-- kurulduğuna göre artık yazılabilir. Raporlar ve kapanmış adisyon ekranı
-- bu bilgiye dayanacak, o yüzden ekranlar gelmeden önce veri birikmeye
-- başlasın diye şimdi ekleniyor.
--
-- Personel silinirse adisyon ayakta kalmalı (satış kaydı iz bırakır), o yüzden
-- bağ 'set null': isim düşer, adisyon durur.

alter table adisyonlar add column if not exists acan_id bigint;
alter table turlar     add column if not exists garson_id bigint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'adisyonlar_acan_id_fkey') then
    alter table adisyonlar add constraint adisyonlar_acan_id_fkey
      foreign key (acan_id) references personel (id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'turlar_garson_id_fkey') then
    alter table turlar add constraint turlar_garson_id_fkey
      foreign key (garson_id) references personel (id) on delete set null;
  end if;
end $$;

create index if not exists adisyonlar_acan_idx on adisyonlar (acan_id);
create index if not exists turlar_garson_idx on turlar (garson_id);
