-- Adisyon numarası ve sipariş numarası ayrıldı, ikisi de işletmeye özel oldu.
--
-- İki sorun vardı:
-- 1) Adisyon numarası bütün işletmeler için tek bir sayaçtan geliyordu; başka
--    bir işletme sipariş aldığında buradaki numara atlıyordu. Satılacak bir
--    üründe her işletme kendi numarasını görmeli.
-- 2) Mutfak fişinde de adisyon numarası yazıyordu: bir masa üç kez sipariş
--    verdiğinde mutfağa aynı numaralı üç fiş gidiyordu, hangisinin hangi
--    sipariş olduğu ayırt edilemiyordu. Artık her sipariş turunun kendi
--    numarası var.
--
-- Numaralar işletmenin kendi satırında tutuluyor: dizi (sequence) kullanılsaydı
-- her yeni işletme için ayrı dizi açmak gerekirdi.

alter table isletmeler add column if not exists son_adisyon_no bigint not null default 2999;
alter table isletmeler add column if not exists son_siparis_no bigint not null default 49999;

alter table turlar add column if not exists siparis_no bigint;

-- Numarayı veren tek yer. Satır güncellenirken kilitleniyor, iki kasa aynı anda
-- sipariş kaydetse bile aynı numarayı almıyor.
create or replace function siradaki_no(p_tur text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  yeni bigint;
begin
  if p_tur = 'adisyon' then
    update isletmeler set son_adisyon_no = son_adisyon_no + 1
     where id = oturum_isletmesi()
     returning son_adisyon_no into yeni;
  else
    update isletmeler set son_siparis_no = son_siparis_no + 1
     where id = oturum_isletmesi()
     returning son_siparis_no into yeni;
  end if;

  return yeni;
end;
$$;

-- Numara programdan değil veritabanından geliyor: hangi yoldan kayıt açılırsa
-- açılsın numarasız satır kalmıyor.
create or replace function adisyon_no_ver()
returns trigger language plpgsql as $$
begin
  if new.adisyon_no is null then new.adisyon_no := siradaki_no('adisyon'); end if;
  return new;
end;
$$;

create or replace function siparis_no_ver()
returns trigger language plpgsql as $$
begin
  if new.siparis_no is null then new.siparis_no := siradaki_no('siparis'); end if;
  return new;
end;
$$;

alter table adisyonlar alter column adisyon_no drop default;
alter table adisyonlar alter column adisyon_no drop not null;

drop trigger if exists adisyon_no_tetik on adisyonlar;
create trigger adisyon_no_tetik before insert on adisyonlar
  for each row execute function adisyon_no_ver();

drop trigger if exists siparis_no_tetik on turlar;
create trigger siparis_no_tetik before insert on turlar
  for each row execute function siparis_no_ver();

-- Duran kayıtlar. Bu dosya SQL düzenleyicisinden çalıştığı için oturum yok;
-- siradaki_no() burada kullanılamaz, numaralar elle dağıtılıyor.
with sirali as (
  select t.id,
         t.isletme_id,
         49999 + row_number() over (partition by t.isletme_id order by t.id) as no
    from turlar t
   where t.siparis_no is null
)
update turlar t set siparis_no = s.no from sirali s where t.id = s.id;

-- Sayaç dağıtılan son numaranın üstüne kuruluyor, yoksa aynı numara ikinci kez
-- verilirdi.
update isletmeler i
   set son_siparis_no = greatest(i.son_siparis_no,
         coalesce((select max(siparis_no) from turlar where isletme_id = i.id), 49999)),
       son_adisyon_no = greatest(i.son_adisyon_no,
         coalesce((select max(adisyon_no) from adisyonlar where isletme_id = i.id), 2999));

-- Aynı işletmede iki kayıt aynı numarayı taşıyamaz.
create unique index if not exists adisyonlar_no_tekil on adisyonlar (isletme_id, adisyon_no);
create unique index if not exists turlar_siparis_no_tekil on turlar (isletme_id, siparis_no);
