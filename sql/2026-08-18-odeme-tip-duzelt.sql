-- Kapanmış hesabın ödeme tipini düzeltme yetkisi.
--
-- Tutara dokunmuyor ama gün sonunda nakit ile kart dengesini değiştiriyor:
-- kasa sayımının doğruluğu buna bağlı. Garsonun elinde olmuyor, işlem
-- denetim defterine sebebiyle birlikte geçiyor.

insert into yetkiler (kod, ad, grup, sira)
select 'odeme.tip_duzelt', 'Kapanmış hesabın ödeme tipini düzeltme', 'Ödeme', 6
where not exists (select 1 from yetkiler y where y.kod = 'odeme.tip_duzelt');

-- İşletme sütunu elle yazılıyor: göç SQL editöründen çalıştığı için oturum yok,
-- doğru kaynak yetkinin verildiği rolün kendi işletmesi.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'odeme.tip_duzelt'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
