-- Masayı devralma yetkisi.
--
-- Masada biri varken içeri girmek onu masadan çıkarıyor; bu, başkasının işini
-- bölen bir karar. Herkeste açık olursa garson garsonu masadan atar ve kimse
-- neden çıktığını bilmez. Uyarıyı herkes görüyor, devralmayı yalnız yetkisi
-- olan yapabiliyor.

insert into yetkiler (kod, ad, grup, sira)
select 'masa.devral', 'Başkasının açtığı masayı devralma', 'Sipariş', 13
where not exists (select 1 from yetkiler y where y.kod = 'masa.devral');

-- Varsayılan olarak Yönetici ve Müdür'de. İşletme sütunu elle yazılıyor: göç
-- SQL editöründen çalışıyor, orada oturum yok.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'masa.devral'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
