-- Kapanmış adisyonu yeniden açma yetkisi.
--
-- Hesap kapandıktan sonra "bir çay daha" gelmesi gündelik bir durum; masayı
-- sıfırdan açmak yerine adisyon aktif ediliyor. Ama kapanmış hesabı geri açmak
-- ciroyu değiştiren bir iş, o yüzden garsonun elinde olmuyor.

insert into yetkiler (kod, ad, grup, sira)
select 'siparis.aktif_et', 'Kapanmış adisyonu yeniden açma', 'Sipariş', 12
where not exists (select 1 from yetkiler y where y.kod = 'siparis.aktif_et');

-- Yönetici ve Müdür sonradan eklenen yetkileri de alır; ilk göçteki cross join
-- yalnızca o gün var olan satırları kapsamıştı.
--
-- İşletme sütunu elle yazılıyor: olağan akışta oturumdan geliyor ama göç SQL
-- editöründen çalıştırılıyor, orada oturum yok. Rolün kendi işletmesi doğru
-- kaynak — yetki hangi işletmenin rolüne veriliyorsa o işletmeye yazılır.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'siparis.aktif_et'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
