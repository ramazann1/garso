-- Rollerin ön tanımlı yetkileri. İşletmeci sıfır kutucukla karşılaşmasın:
-- her görev makul yetkilerle gelir, gerekirse tik kaldırılır veya eklenir.
-- Yalnızca hiç yetkisi olmayan role dokunuluyor; elle yapılan ayar bozulmasın.

-- Müdür: yöneticinin yaptığı her şeyi yapar.
insert into rol_yetkileri (rol_id, yetki_id)
select r.id, y.id
from roller r cross join yetkiler y
where r.ad = 'Müdür'
  and not exists (select 1 from rol_yetkileri v where v.rol_id = r.id);

-- Kasa: satış ve tahsilatın tamamı, kasa günü ve gün sonu; tanım ekranları yok.
insert into rol_yetkileri (rol_id, yetki_id)
select r.id, y.id
from roller r join yetkiler y on y.kod in (
  'siparis.al', 'siparis.urun_cikar', 'siparis.miktar', 'siparis.tasi',
  'siparis.kalem_tasi', 'siparis.gelal', 'siparis.paket', 'siparis.kapali_gor',
  'odeme.al', 'odeme.indirim', 'odeme.indirim_tanimli', 'odeme.acik_hesap',
  'kasa.ac_kapat', 'kasa.gider', 'rapor.gun_sonu'
)
where r.ad = 'Kasa'
  and not exists (select 1 from rol_yetkileri v where v.rol_id = r.id);

-- Garson: sipariş alır, ödeme alır; indirimde yalnızca hazır tanımları seçebilir.
-- İptal, ikram ve fiyat değiştirme müdüre bırakılıyor.
insert into rol_yetkileri (rol_id, yetki_id)
select r.id, y.id
from roller r join yetkiler y on y.kod in (
  'siparis.al', 'siparis.urun_cikar', 'siparis.miktar', 'siparis.tasi',
  'siparis.kalem_tasi', 'siparis.gelal', 'siparis.paket',
  'odeme.al', 'odeme.indirim_tanimli'
)
where r.ad = 'Garson'
  and not exists (select 1 from rol_yetkileri v where v.rol_id = r.id);

-- Kurye: paket siparişi alır ve kapıda tahsilat yapar.
insert into rol_yetkileri (rol_id, yetki_id)
select r.id, y.id
from roller r join yetkiler y on y.kod in ('siparis.paket', 'odeme.al')
where r.ad = 'Kurye'
  and not exists (select 1 from rol_yetkileri v where v.rol_id = r.id);

-- İstasyon (mutfak, bar, ızgara) satış ekranına girmiyor; yetkisiz başlıyor.
