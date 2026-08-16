-- Cari hesap modülünün veri modeli: müşteriler, adresleri ve hesap hareketleri.
--
-- Bugüne kadar müşteri diye bir kayıt yoktu: Gel Al / Paket adisyonlarında ad,
-- telefon ve adres serbest metin olarak duruyordu. Aynı müşteri her siparişte
-- yeniden yazılıyor, borcu takip edilemiyordu.
--
-- 19 Ağu'da alınan karar burada karşılığını buluyor: tanınan müşterinin borcu
-- "Açık Hesap" ödeme tipiyle carisine yazılır; tanınmayanınki eksik kapatma
-- olarak denetim kaydında kalır. Bu göç birincisinin altyapısı.

-- Müşteri numarası işletme koduyla aynı mantıkta: kullanıcı yazmıyor,
-- veritabanı atıyor. Konuşurken "12 numaralı müşteri" denebilsin diye 1'den
-- başlıyor ve işletme içinde tekil.
create table if not exists musteriler (
  id           bigint generated always as identity primary key,
  isletme_id   bigint not null references isletmeler (id) on delete cascade,
  no           int    not null,
  ad           text   not null,
  soyad        text,
  telefon      text,
  telefon2     text,
  -- Açık hesap anahtarı kapalıysa müşteri kayıtlı ama veresiye alamaz.
  -- Adisyo'da da ayrı bir anahtar: her müşteriye borç açılmıyor.
  acik_hesap   boolean not null default false,
  notlar       text,
  aktif        boolean not null default true,
  olusturma    timestamptz not null default now(),
  unique (isletme_id, no)
);

-- Numarayı tetikleyici veriyor: işletme içinde en büyük numaranın bir fazlası.
-- Dizi kullanılmıyor, çünkü numara işletmeye göre tekil — her işletme 1'den
-- başlasın isteniyor.
create or replace function musteri_no_ver()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.no is null or new.no = 0 then
    select coalesce(max(no), 0) + 1 into new.no
      from musteriler where isletme_id = new.isletme_id;
  end if;
  return new;
end $$;

drop trigger if exists musteri_no_ver on musteriler;
create trigger musteri_no_ver
  before insert on musteriler
  for each row execute function musteri_no_ver();

-- Bir müşterinin birden fazla adresi olur (ev, işyeri). Paket servis gelince
-- kurye fişi buradan basılacak.
create table if not exists musteri_adresleri (
  id          bigint generated always as identity primary key,
  isletme_id  bigint not null references isletmeler (id) on delete cascade,
  musteri_id  bigint not null references musteriler (id) on delete cascade,
  baslik      text   not null default 'Ev',
  adres       text   not null,
  tarif       text,
  varsayilan  boolean not null default false
);

create index if not exists musteri_adresleri_musteri
  on musteri_adresleri (musteri_id);

-- Hesap ekstresinin tek kaynağı. Bakiye müşteri satırında SÜTUN OLARAK
-- TUTULMUYOR: iki yerde para tutulursa er geç birbirini tutmaz. Bakiye her
-- zaman hareketlerin toplamı (borç - alacak).
--
-- tip:
--   satis    — adisyon açık hesaba aktarıldı (borç)
--   tahsilat — müşteriden para alındı (alacak)
--   duzeltme — bakiye elle düzeltildi (fark borç ya da alacak olabilir)
--   acilis   — müşteri kaydedilirken devreden bakiye (borç)
create table if not exists cari_hareketler (
  id          bigint generated always as identity primary key,
  isletme_id  bigint not null references isletmeler (id) on delete cascade,
  musteri_id  bigint not null references musteriler (id) on delete cascade,
  tip         text   not null check (tip in ('satis', 'tahsilat', 'duzeltme', 'acilis')),
  -- Borç ve alacak ayrı sütun: ekstre iki sütun halinde okunuyor, tek sütunda
  -- eksi değerle tutulsa her ekranda işaret çevirmek gerekirdi.
  borc        numeric(12,2) not null default 0 check (borc   >= 0),
  alacak      numeric(12,2) not null default 0 check (alacak >= 0),
  -- Tahsilatın hangi ödeme tipiyle alındığı; satış hareketinde boş.
  odeme_tipi  text,
  adisyon_id  bigint references adisyonlar (id) on delete set null,
  -- Açık hesaba aktarılan satış, adisyondaki tahsilat satırının karşılığı.
  -- Bağlantı "cascade": tahsilat silinirse müşterinin borcu da kendiliğinden
  -- düşer, yoksa ödemesi geri alınan hesap müşteride borç olarak kalırdı.
  tahsilat_id bigint references tahsilatlar (id) on delete cascade,
  aciklama    text,
  personel_id bigint references personel (id) on delete set null,
  olusturma   timestamptz not null default now()
);

create index if not exists cari_hareketler_musteri
  on cari_hareketler (isletme_id, musteri_id, olusturma);

-- Tablo daha önce bu dosyanın eski bir hâliyle kurulmuş olabilir: create table
-- yalnız tablo yokken çalışıyor, sonradan eklenen sütunlar bu satırlarla
-- tamamlanıyor. Dosya kaç kez çalıştırılırsa çalıştırılsın sonuç aynı.
alter table cari_hareketler add column if not exists tahsilat_id bigint
  references tahsilatlar (id) on delete cascade;
alter table cari_hareketler add column if not exists personel_id bigint
  references personel (id) on delete set null;
alter table cari_hareketler add column if not exists odeme_tipi text;

-- Gel Al / Paket adisyonlarında müşteri bugüne kadar serbest metindi. Kayıtlı
-- müşteri seçilirse adisyon ona bağlanıyor; serbest metin alanları duruyor,
-- kaydı olmayan misafir eskisi gibi elle yazılabilsin.
alter table adisyonlar add column if not exists musteri_id bigint
  references musteriler (id) on delete set null;

-- Satır güvenliği: isletme_id sütunu olan her tabloda aynı kural. Koşulu
-- "true" olan politika bırakılmıyor — 19 Ağu'da bütün işletmelerin birbirini
-- görmesine o sebep olmuştu.
do $$
declare t text;
begin
  foreach t in array array[
    'musteriler', 'musteri_adresleri', 'cari_hareketler'
  ] loop
    execute format(
      'alter table %I alter column isletme_id set default oturum_isletmesi()', t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_isletme', t);
    execute format(
      'create policy %I on %I for all to authenticated
         using (isletme_id = oturum_isletmesi())
         with check (isletme_id = oturum_isletmesi())', t || '_isletme', t);
  end loop;
end $$;

-- Üç ayrı yetki: müşteriyi görmek, kaydını değiştirmek ve parasına dokunmak
-- farklı ağırlıkta işler. Garson müşteriyi görüp siparişe bağlayabilmeli ama
-- bakiyesini düzeltememeli.
insert into yetkiler (kod, ad, grup, sira)
select v.kod, v.ad, v.grup, v.sira
from (values
  ('cari.gor',      'Müşterileri görüntüleme',       'Cari', 1),
  ('cari.duzenle',  'Müşteri ekleme ve düzenleme',   'Cari', 2),
  ('cari.tahsilat', 'Cari tahsilat ve bakiye düzeltme', 'Cari', 3)
) as v(kod, ad, grup, sira)
where not exists (select 1 from yetkiler y where y.kod = v.kod);

-- Göç SQL editöründen çalıştığı için oturum yok: isletme_id elle yazılıyor,
-- kaynağı yetkinin verildiği rolün kendi işletmesi.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where y.kod in ('cari.gor', 'cari.duzenle', 'cari.tahsilat')
  and (
    r.ad in ('Yönetici', 'Müdür')
    -- Garson müşteriyi yalnız görür: siparişi doğru kişiye bağlaması için
    -- yeterli, parasına dokunmak onun işi değil.
    or (r.ad = 'Garson' and y.kod = 'cari.gor')
  )
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
