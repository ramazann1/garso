-- Personel, roller ve yetki matrisi.
-- Yetki kullanıcıya değil role veriliyor: "Garson indirim yapamaz" kuralı bir
-- kez yazılır, işe giren her garson otomatik aynı kurala tabi olur.

create table if not exists roller (
  id      bigserial primary key,
  ad      text not null,
  sira    int not null default 0,
  hazir   boolean not null default false   -- kurulumla gelen rol; silinmesi engellenir
);

-- Yetki listesi kodla gelir, kullanıcı yeni yetki uyduramaz. Kod satış
-- ekranlarında kontrol edilen anahtar, ad ekranda görünen açıklama.
create table if not exists yetkiler (
  id    bigserial primary key,
  kod   text not null unique,
  ad    text not null,
  grup  text not null,
  sira  int not null default 0
);

create table if not exists rol_yetkileri (
  rol_id   bigint not null references roller (id) on delete cascade,
  yetki_id bigint not null references yetkiler (id) on delete cascade,
  primary key (rol_id, yetki_id)
);

-- Şifre ve PIN asla düz metin tutulmuyor; SHA-256 özeti saklanıyor.
-- Personel silinmiyor, "aktif" kapatılıyor — eski adisyonlar hangi garsonun
-- açtığını unutmasın diye.
create table if not exists personel (
  id             bigserial primary key,
  ad             text not null,
  telefon        text,
  eposta         text,
  sifre_hash     text,
  pin_hash       text,
  rol_id         bigint references roller (id) on delete set null,
  giris_engelli  boolean not null default false,
  aktif          boolean not null default true,
  sira           int not null default 0,
  son_giris      timestamptz
);

-- Garsonun hangi bölgelere bakacağı. Kayıt yoksa "tüm bölgeler" demek.
create table if not exists personel_bolgeleri (
  personel_id bigint not null references personel (id) on delete cascade,
  bolge_id    bigint not null references bolgeler (id) on delete cascade,
  primary key (personel_id, bolge_id)
);

-- Telefon karşılaştırılabilir olsun diye yalnız rakam saklanıyor; boşluklu
-- yazılmış eski kayıtlar da aynı biçime çekiliyor.
update personel set telefon = regexp_replace(telefon, '\D', '', 'g')
where telefon is not null and telefon <> regexp_replace(telefon, '\D', '', 'g');

-- Hazır roller: işletmeci sıfırdan rol kurmak zorunda kalmasın.
-- "İstasyon" mutfağın yanı sıra bar, tatlı, ızgara gibi hazırlık noktalarını da
-- kapsıyor; tek başına "Mutfak" demek bu ekipleri dışarıda bırakıyordu.
update roller set ad = 'İstasyon' where ad = 'Mutfak';

insert into roller (ad, sira, hazir)
select v.ad, v.sira, true
from (values
  ('Yönetici', 1), ('Müdür', 2), ('Kasa', 3),
  ('Garson', 4), ('İstasyon', 5), ('Kurye', 6)
) as v(ad, sira)
where not exists (select 1 from roller r where lower(r.ad) = lower(v.ad));

-- Yetki envanteri. Adım 2'deki yetki matrisi bu satırları okuyacak.
insert into yetkiler (kod, ad, grup, sira)
select v.kod, v.ad, v.grup, v.sira
from (values
  ('siparis.al',            'Sipariş alma',                      'Sipariş', 1),
  ('siparis.urun_cikar',    'Üründen çıkarma',                   'Sipariş', 2),
  ('siparis.miktar',        'Miktar değiştirme',                 'Sipariş', 3),
  ('siparis.fiyat',         'Ürün fiyatı değiştirme',            'Sipariş', 4),
  ('siparis.ikram',         'İkram yapma',                       'Sipariş', 5),
  ('siparis.iptal',         'Adisyon iptali',                    'Sipariş', 6),
  ('siparis.tasi',          'Masa taşıma ve birleştirme',        'Sipariş', 7),
  ('siparis.kalem_tasi',    'Ürün taşıma',                       'Sipariş', 8),
  ('siparis.gelal',         'Gel al siparişi alma',              'Sipariş', 9),
  ('siparis.paket',         'Paket siparişi alma',               'Sipariş', 10),
  ('siparis.kapali_gor',    'Kapanmış adisyonu görüntüleme',     'Sipariş', 11),
  ('odeme.al',              'Ödeme alma',                        'Ödeme', 1),
  ('odeme.indirim',         'Ödemede indirim',                   'Ödeme', 2),
  ('odeme.indirim_tanimli', 'Sadece ön tanımlı indirim',         'Ödeme', 3),
  ('odeme.acik_hesap',      'Açık hesaba aktarma',               'Ödeme', 4),
  ('odeme.iade',            'Ödeme iadesi',                      'Ödeme', 5),
  ('tanim.masa',            'Masa ve bölge tanımlama',           'Tanım', 1),
  ('tanim.menu',            'Menü ve ürün tanımlama',            'Tanım', 2),
  ('tanim.ayar',            'İşletme ayarlarını değiştirme',     'Tanım', 3),
  ('tanim.personel',        'Personel ve yetki işlemleri',       'Tanım', 4),
  ('kasa.ac_kapat',         'Kasa açma ve kapatma',              'Kasa', 1),
  ('kasa.gider',            'Gider girişi',                      'Kasa', 2),
  ('rapor.tumu',            'Tüm raporlar',                      'Rapor', 1),
  ('rapor.gun_sonu',        'Gün sonu raporu',                   'Rapor', 2)
) as v(kod, ad, grup, sira)
where not exists (select 1 from yetkiler y where y.kod = v.kod);

-- Yönetici her şeyi yapar; diğer rollerin yetkisi Yetkiler ekranından verilir.
insert into rol_yetkileri (rol_id, yetki_id)
select r.id, y.id
from roller r cross join yetkiler y
where r.ad = 'Yönetici'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
