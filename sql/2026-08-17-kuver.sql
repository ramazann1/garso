-- Kuver ve garsoniye: adisyona kendiliğinden giren servis bedelleri.
--
-- Kuver kişi başına alınıyor (ekmek, çerez, servis takımı), garsoniye ise
-- hesabın belli bir yüzdesi ya da sabit tutarı. İkisi de ürün değil: mutfağa
-- düşmüyor, stoktan inmiyor, ürün raporunda satır tutmuyorlar. Bu yüzden sepete
-- kalem olarak girmiyorlar, adisyonun kendi sütunlarında duruyorlar.

alter table isletme_ayarlari
  -- Tek ana anahtar: kapalıyken tanımlar durur ama hiçbir hesaba servis girmez.
  -- Varsayılan kapalı — çoğu işletme kuver almıyor.
  add column if not exists servis_acik boolean not null default false,

  -- Tutar tipinde kişi sayısıyla çarpılıyor, yüzde tipinde indirim düşülmüş
  -- hesabın yüzdesi alınıyor.
  add column if not exists kuver_otomatik boolean not null default true,
  add column if not exists kuver_ad       text    not null default 'Kuver',
  add column if not exists kuver_tip      text    not null default 'tutar',
  add column if not exists kuver_deger    numeric(12,2) not null default 0,

  add column if not exists garsoniye_otomatik boolean not null default true,
  add column if not exists garsoniye_ad       text    not null default 'Garsoniye',
  add column if not exists garsoniye_tip      text    not null default 'yuzde',
  add column if not exists garsoniye_deger    numeric(12,2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'isletme_ayarlari_kuver_tip_check'
  ) then
    alter table isletme_ayarlari add constraint isletme_ayarlari_kuver_tip_check
      check (kuver_tip in ('tutar', 'yuzde'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'isletme_ayarlari_garsoniye_tip_check'
  ) then
    alter table isletme_ayarlari add constraint isletme_ayarlari_garsoniye_tip_check
      check (garsoniye_tip in ('tutar', 'yuzde'));
  end if;
end $$;

-- Adisyonun kendi tutarları. Hesaplanan değer kayıtta donuyor: ayar sonradan
-- değişse bile kapanmış adisyonun rakamı oynamasın, rapor da tek yerden okusun.
--
-- "uygula" sütunları boş kalınca ayarın dediği geçerli. Elle eklenen hesapta
-- true, elle kaldırılan hesapta false oluyor — böylece "bu masada kuver
-- istenmedi" bilgisi, ayarın otomatik olup olmamasından bağımsız duruyor.
alter table adisyonlar
  add column if not exists kuver_tutar      numeric(12,2) not null default 0,
  add column if not exists garsoniye_tutar  numeric(12,2) not null default 0,
  add column if not exists kuver_uygula     boolean,
  add column if not exists garsoniye_uygula boolean;

-- Servis bedelini kaldırmak parayı azaltan bir iş: garsonun kendi masasından
-- kuveri silebilmesi ayrı bir karar olmalı.
insert into yetkiler (kod, ad, grup, sira)
select 'siparis.servis', 'Kuver/garsoniye ekleme ve kaldırma', 'Sipariş', 14
where not exists (select 1 from yetkiler y where y.kod = 'siparis.servis');

-- İşletme sütunu elle yazılıyor: göç SQL editöründen çalıştığı için oturum yok,
-- doğru kaynak yetkinin verildiği rolün kendi işletmesi.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'siparis.servis'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
