-- İstasyon ekranı (KDS) için hazır durumu.
--
-- Mutfak "ne hazırlanacak"ı zaten kalemlerden okuyor; eksik olan tek şey
-- hazırlananın işaretlenmesi. Bunun için ayrı tablo açılmıyor: hazır olma
-- kalemin kendi hâli, iki sütun yetiyor. Sütun boşsa kalem tezgâhta bekliyor,
-- doluysa hazırlanmış — üçüncü bir durum yok.
--
-- Aşamalı istasyonlar (pişirme/paketleme) sonraki işin konusu; o geldiğinde
-- buraya aşama sütunu eklenecek, bu iki sütun yerinde kalacak.

alter table adisyon_kalemleri
  add column if not exists hazir_at   timestamptz,
  add column if not exists hazir_kisi bigint;

-- Personel silinse de kalem ayakta kalmalı; adı düşer, hazırlanma anı durur.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'adisyon_kalemleri_hazir_kisi_fkey'
  ) then
    alter table adisyon_kalemleri add constraint adisyon_kalemleri_hazir_kisi_fkey
      foreign key (hazir_kisi) references personel (id) on delete set null;
  end if;
end $$;

-- Ekran "bekleyenler"i sorguluyor; tarama hazır olmayanların üstünden gitsin.
create index if not exists adisyon_kalemleri_bekleyen
  on adisyon_kalemleri (tur_id) where hazir_at is null;

-- Sipariş düşer düşmez ekranda belirsin. Yoklamayla beklemek mutfakta
-- hissedilen bir gecikme; köprü kuyruğunda aynı karara varılmıştı.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'adisyon_kalemleri'
  ) then
    alter publication supabase_realtime add table adisyon_kalemleri;
  end if;
end $$;

-- Kartın kenar şeridi bu süreye bakıyor: kaç dakika bekleyen sipariş geciken
-- sayılıyor. İşletmeye göre değişiyor — kahvaltıcıda 10 dakika geç, kebapçıda
-- normal. 0 = şerit hiç renk değiştirmez.
alter table isletme_ayarlari
  add column if not exists mutfak_gecikme_dk int not null default 15;

-- İstasyon ekranını açma yetkisi. Mutfaktaki kişinin satış ekranında işi yok;
-- ayrı yetki olması ona yalnız bu ekranı verebilmeyi sağlıyor.
insert into yetkiler (kod, ad, grup, sira)
select 'mutfak.ekran', 'İstasyon ekranını kullanma', 'Sipariş', 13
where not exists (select 1 from yetkiler y where y.kod = 'mutfak.ekran');

insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'mutfak.ekran'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
