-- Yetki envanteri: eksik iki yetki ve bozuk sıralama.
--
-- Ekrandaki liste `sira` sütununa göre diziliyordu ama numaralar zamanla
-- çakışmıştı: Sipariş grubunda üç satır 13, Tanım grubunda iki satır 6
-- numaralıydı. Çakışan satırların yeri her açılışta değişebiliyordu.
--
-- Numaralar artık gruplara yüzlük bloklar halinde veriliyor (Sipariş 100,
-- Ödeme 200, Kasa 300...). Böylece hem grup sırası hem grup içi sıra sabit
-- kalıyor ve araya yeni yetki eklemek için yer var.

-- Eksik yetkiler ----------------------------------------------------------
--
-- Fiş yazdırma: salon, mobil masa listesi ve sipariş ekranındaki "Yazdır"
-- herkese açıktı. Mutfak fişi bu yetkinin dışında — o siparişle birlikte
-- kendiliğinden basılıyor, elle bastırılan bir çıktı değil.
--
-- Çekmece: kasa ekranındaki "Çekmeceyi aç" yalnızca kasayı açıp kapatma
-- yetkisine bakıyordu. Çekmeceyi açmak paraya dokunmaktır, kasa gününü
-- yönetmekten ayrı bir iş.

insert into yetkiler (kod, ad, grup, sira)
select v.kod, v.ad, v.grup, v.sira
from (values
  ('siparis.fis_yazdir', 'Hesap fişi yazdırma',      'Sipariş', 116),
  ('kasa.cekmece',       'Para çekmecesini açma',    'Kasa',    303)
) as v(kod, ad, grup, sira)
where not exists (select 1 from yetkiler y where y.kod = v.kod);

-- İstasyon ekranı kendi grubunda ------------------------------------------
-- "İstasyon ekranını kullanma" Sipariş grubunda duruyordu; mutfak ve bar
-- işi, satış yetkilerinin arasında yeri yok.
update yetkiler set grup = 'İstasyon' where kod = 'mutfak.ekran';

-- Sıralama ----------------------------------------------------------------
update yetkiler y set sira = v.sira, grup = v.grup
from (values
  ('siparis.al',            'Sipariş', 101),
  ('siparis.urun_cikar',    'Sipariş', 102),
  ('siparis.miktar',        'Sipariş', 103),
  ('siparis.fiyat',         'Sipariş', 104),
  ('siparis.ikram',         'Sipariş', 105),
  ('siparis.adisyon_ikram', 'Sipariş', 106),
  ('siparis.iptal',         'Sipariş', 107),
  ('siparis.aktif_et',      'Sipariş', 108),
  ('siparis.tasi',          'Sipariş', 109),
  ('siparis.kalem_tasi',    'Sipariş', 110),
  ('masa.devral',           'Sipariş', 111),
  ('siparis.servis',        'Sipariş', 112),
  ('siparis.gelal',         'Sipariş', 113),
  ('siparis.paket',         'Sipariş', 114),
  ('siparis.kapali_gor',    'Sipariş', 115),
  ('siparis.fis_yazdir',    'Sipariş', 116),

  ('odeme.al',              'Ödeme',   201),
  ('odeme.indirim',         'Ödeme',   202),
  ('odeme.indirim_tanimli', 'Ödeme',   203),
  ('odeme.acik_hesap',      'Ödeme',   204),
  ('odeme.iade',            'Ödeme',   205),
  ('odeme.eksik_kapat',     'Ödeme',   206),
  ('odeme.tip_duzelt',      'Ödeme',   207),

  ('kasa.ac_kapat',         'Kasa',    301),
  ('kasa.para',             'Kasa',    302),
  ('kasa.cekmece',          'Kasa',    303),
  ('kasa.gider',            'Kasa',    304),

  ('cari.gor',              'Cari',    401),
  ('cari.duzenle',          'Cari',    402),
  ('cari.tahsilat',         'Cari',    403),

  ('rapor.tumu',            'Rapor',   501),
  ('rapor.gun_sonu',        'Rapor',   502),

  ('mutfak.ekran',          'İstasyon', 601),

  ('tanim.masa',            'Tanım',   701),
  ('tanim.menu',            'Tanım',   702),
  ('tanim.ayar',            'Tanım',   703),
  ('tanim.odenmez',         'Tanım',   704),
  ('tanim.personel',        'Tanım',   705),
  ('yazici.yonet',          'Tanım',   706),
  ('yazici.hesap',          'Tanım',   707)
) as v(kod, grup, sira)
where y.kod = v.kod;

-- Yeni yetkilerin rollere dağıtımı ----------------------------------------
--
-- Hazır yetki dosyası yalnız hiç yetkisi olmayan role dokunuyor; çalışan bir
-- kurulumda roller doluyken yeni satır kimseye gitmez. Burada iki yeni yetki
-- adı adına dağıtılıyor, elle yapılmış ayarlar bozulmadan.
--
-- Yönetici rolü de listede: ekranda kilitli görünüyor ama sunucu gerçek
-- satıra bakıyor (`oturum_yetkisi`), yazılmazsa yönetici de yapamaz.
-- İşletme sütunu rolden alınıyor; göç SQL editöründen çalışıyor, orada oturum
-- yok ve sütunun varsayılanı dolmuyor.

-- Yönetici ve Müdür her şeyi yapar.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r join yetkiler y on y.kod in ('siparis.fis_yazdir', 'kasa.cekmece')
where r.ad in ('Yönetici', 'Müdür')
  and not exists (
    select 1 from rol_yetkileri v where v.rol_id = r.id and v.yetki_id = y.id
  );

-- Kasa: fiş de basar, çekmeceyi de açar.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r join yetkiler y on y.kod in ('siparis.fis_yazdir', 'kasa.cekmece')
where r.ad = 'Kasa'
  and not exists (
    select 1 from rol_yetkileri v where v.rol_id = r.id and v.yetki_id = y.id
  );

-- Garson hesabı masaya götürüyor: fiş var, çekmece yok.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r join yetkiler y on y.kod = 'siparis.fis_yazdir'
where r.ad = 'Garson'
  and not exists (
    select 1 from rol_yetkileri v where v.rol_id = r.id and v.yetki_id = y.id
  );
