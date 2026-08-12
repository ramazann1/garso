-- Adisyonun tamamına iptal ve ikram.
--
-- Bugüne kadar yalnız kalem bazında iptal/ikram vardı; yanlış açılan masa ya da
-- tamamı ikrama giden hesap için yol yoktu.
--
-- İptal edilen adisyon SİLİNMİYOR: durumu 'iptal' oluyor. Silinirse kayıp izi
-- kalmaz; Analiz'de sayısı ve tutarı görünmeli.
alter table adisyonlar add column if not exists iptal_sebep text;

-- Durum sütununda kısıt varsa 'iptal' de kabul edilsin.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'adisyonlar_durum_check' and conrelid = 'adisyonlar'::regclass
  ) then
    alter table adisyonlar drop constraint adisyonlar_durum_check;
    alter table adisyonlar add constraint adisyonlar_durum_check
      check (durum in ('acik', 'kapali', 'iptal'));
  end if;
end $$;

-- Adisyon iptali için yetki zaten tanımlı ('siparis.iptal', "Adisyon iptali");
-- yalnız adisyon ikramı yeni.
insert into yetkiler (kod, ad, grup, sira)
select 'siparis.adisyon_ikram', 'Adisyonun tamamını ikram etme', 'Sipariş', 13
where not exists (select 1 from yetkiler y where y.kod = 'siparis.adisyon_ikram');

-- İşletme sütunu elle yazılıyor: göç SQL editöründen çalıştığı için oturum yok,
-- doğru kaynak yetkinin verildiği rolün kendi işletmesi.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'siparis.adisyon_ikram'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
