-- Yönetici rolünün silinen yetkileri geri veriliyor.
--
-- Genel Yetkiler ekranında Yönetici sütunu kilitli çiziliyor ("bu role her şey
-- açık") ama bu yalnız arayüzdeki bir kuraldı: kaydedilen kümeye girmiyordu.
-- Kaydet ise önce bütün rollerin satırlarını silip işaretlileri geri yazıyor —
-- Yönetici satırları da o silmede gidiyordu. Ekranda kilit görünmeye devam
-- ettiği için fark edilmiyor, sunucu ise "bu kişinin yetkisi yok" diyordu:
-- yetki kaydetme 403, adisyon iptali ve ikram reddediliyordu.
--
-- Kodun kendisi de düzeltildi (yetkiler.ts: Yönetici satırları artık kaydın
-- içinde yazılıyor), bu dosya yalnız geçmişte silinmiş satırları geri koyuyor.
-- Birden çok kez çalıştırılabilir; var olan satırı ikinci kez eklemiyor.

insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r
cross join yetkiler y
where r.ad = 'Yönetici'
  and not exists (
    select 1 from rol_yetkileri ry
     where ry.rol_id = r.id and ry.yetki_id = y.id
  );

-- Kontrol: her işletmenin Yöneticisinde kaç yetki var, kaç tane olmalı.
select r.isletme_id,
       count(ry.yetki_id) as yonetici_yetkisi,
       (select count(*) from yetkiler) as olmasi_gereken
from roller r
left join rol_yetkileri ry on ry.rol_id = r.id
where r.ad = 'Yönetici'
group by r.isletme_id;
