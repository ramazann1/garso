-- Tahsilat fiş numarası.
--
-- Müşteri detayındaki "Ödemeler" sekmesinde satırlar "3 Ağustos · Nakit · ₺250"
-- diye duruyordu; hangi ödeme olduğu konuşulamıyordu. Müşteri "ben o parayı
-- ödemiştim" dediğinde elindeki fişle eşleşecek bir numara gerekiyor.
--
-- Numara adisyon ve sipariş numarasıyla aynı yoldan geliyor (2026-08-23-numaralar):
-- sayaç işletmenin kendi satırında, numarayı tetikleyici veriyor. Böylece hangi
-- yoldan tahsilat açılırsa açılsın numarasız satır kalmıyor ve her işletme kendi
-- numarasını görüyor.
--
-- 9000'den başlıyor ki konuşurken adisyon (3000'ler) ve sipariş (50000'ler)
-- numaralarıyla karışmasın.

alter table isletmeler add column if not exists son_tahsilat_no bigint not null default 8999;

alter table cari_hareketler add column if not exists fis_no bigint;

-- Numarayı veren fonksiyona üçüncü tür ekleniyor. Diğer iki tür aynen duruyor.
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
  elsif p_tur = 'tahsilat' then
    update isletmeler set son_tahsilat_no = son_tahsilat_no + 1
     where id = oturum_isletmesi()
     returning son_tahsilat_no into yeni;
  else
    update isletmeler set son_siparis_no = son_siparis_no + 1
     where id = oturum_isletmesi()
     returning son_siparis_no into yeni;
  end if;

  return yeni;
end;
$$;

-- Yalnız tahsilat satırı numara alıyor. Satış hareketinin kendi adisyon
-- numarası zaten var, düzeltme ve açılış ise müşteriye fiş verilen işlemler
-- değil — hepsine numara dağıtmak numarayı anlamsızlaştırırdı.
create or replace function tahsilat_no_ver()
returns trigger language plpgsql as $$
begin
  if new.tip = 'tahsilat' and new.fis_no is null then
    new.fis_no := siradaki_no('tahsilat');
  end if;
  return new;
end;
$$;

drop trigger if exists tahsilat_no_tetik on cari_hareketler;
create trigger tahsilat_no_tetik before insert on cari_hareketler
  for each row execute function tahsilat_no_ver();

-- Duran tahsilatlar. Bu dosya SQL düzenleyicisinden çalıştığı için oturum yok;
-- siradaki_no() burada kullanılamaz, numaralar elle dağıtılıyor. Sıra ödemenin
-- alındığı zamana göre: eski ödeme küçük numara alsın.
with sirali as (
  select h.id,
         8999 + row_number() over (
           partition by h.isletme_id order by h.olusturma, h.id
         ) as no
    from cari_hareketler h
   where h.tip = 'tahsilat' and h.fis_no is null
)
update cari_hareketler h set fis_no = s.no from sirali s where h.id = s.id;

-- Sayaç dağıtılan son numaranın üstüne kuruluyor, yoksa aynı numara ikinci kez
-- verilirdi.
update isletmeler i
   set son_tahsilat_no = greatest(
         i.son_tahsilat_no,
         coalesce((select max(fis_no) from cari_hareketler
                    where isletme_id = i.id and tip = 'tahsilat'), 8999));

-- Aynı işletmede iki tahsilat aynı fiş numarasını taşıyamaz.
create unique index if not exists cari_hareketler_fis_no_tekil
  on cari_hareketler (isletme_id, fis_no) where fis_no is not null;
