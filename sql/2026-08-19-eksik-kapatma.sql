-- Eksik tahsilatla hesap kapatma.
--
-- "Adisyonu Kapat" bugüne kadar yalnız kalan sıfırlanınca çıkıyordu; parası
-- eksik kalan hesap hiç kapatılamıyordu. Oysa gündelik işte oluyor: müşteri
-- sonra ödeyecek, personelin hesabına yazılıyor, ya da para tahsil edilemiyor.
--
-- Borç için ayrı tablo açılmıyor. Cari hesap modülü geldiğinde borçlar oradan
-- beslenecek; bu iki alan o zaman cariye taşınacak veri.
alter table adisyonlar add column if not exists eksik_kisi  text;
alter table adisyonlar add column if not exists eksik_sebep text;

-- Kapanmış hesabın parası eksik kalıyor: ciroya yazılı ama kasada yok.
-- Garsonun kendi başına vereceği karar değil.
insert into yetkiler (kod, ad, grup, sira)
select 'odeme.eksik_kapat', 'Eksik tahsilatla hesap kapatma', 'Ödeme', 7
where not exists (select 1 from yetkiler y where y.kod = 'odeme.eksik_kapat');

-- İşletme sütunu elle yazılıyor: göç SQL editöründen çalıştığı için oturum yok,
-- doğru kaynak yetkinin verildiği rolün kendi işletmesi.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'odeme.eksik_kapat'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
