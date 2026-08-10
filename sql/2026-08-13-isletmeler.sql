-- Çok işletmeli yapıya geçişin ilk adımı.
-- Şimdiye kadarki bütün tablolar "tek işletme var" varsayımıyla yazılmıştı;
-- burada işletme kavramı veritabanına giriyor ve mevcut veri 1 numaralı
-- işletmeye bağlanıyor. Program bu göçten sonra da aynı şekilde çalışır;
-- kod tarafı ile satır güvenliği sonraki adımlarda geliyor.

create table if not exists isletmeler (
  id        bigint generated always as identity primary key,
  ad        text not null,
  olusturma timestamptz not null default now()
);

-- Var olan veriyi taşıyacak ilk kayıt. Adı sonradan Ayarlar'dan değiştirilebilir.
insert into isletmeler (id, ad)
  overriding system value
  values (1, 'İşletmem')
  on conflict (id) do nothing;

-- Kimlik dizisi elle verilen 1'in üstünden devam etsin; ikinci işletme 2 olsun.
select setval(pg_get_serial_sequence('isletmeler', 'id'), (select max(id) from isletmeler));

-- Kolon her tabloya aynı biçimde ekleniyor: önce boş, sonra mevcut satırlar
-- 1 numaraya yazılıp zorunlu hâle getiriliyor. Böylece bundan sonra işletmesiz
-- satır oluşturulamıyor. İndeks, işletme sayısı artınca sorgular yavaşlamasın diye.
--
-- 'yetkiler' listede yok: o tablo sistemin kendi tanımları (indirim yapabilir,
-- adisyon iptal edebilir...) ve her işletmede aynı. Hangi rolün neyi yapacağı
-- ise işletmeye özel olduğu için 'rol_yetkileri' listede var.
do $$
declare
  t text;
  tablolar text[] := array[
    'adisyonlar', 'turlar', 'adisyon_kalemleri', 'tahsilatlar',
    'bolgeler', 'masalar',
    'kategoriler', 'urunler', 'urun_kategorileri', 'porsiyonlar',
    'secenek_gruplari', 'secenekler', 'porsiyon_secenek_gruplari',
    'birimler', 'kdv_gruplari', 'menu_gruplari', 'menu_satirlari',
    'odeme_tipleri', 'indirim_tanimlari', 'isletme_ayarlari',
    'roller', 'rol_yetkileri', 'personel', 'personel_bolgeleri', 'personel_yetkileri'
  ];
begin
  foreach t in array tablolar loop
    if to_regclass(t) is null then
      raise notice 'Tablo bulunamadı, atlandı: %', t;
      continue;
    end if;

    execute format(
      'alter table %I add column if not exists isletme_id bigint references isletmeler (id)', t
    );
    execute format('update %I set isletme_id = 1 where isletme_id is null', t);
    execute format('alter table %I alter column isletme_id set not null', t);
    execute format('alter table %I alter column isletme_id set default 1', t);
    execute format('create index if not exists %I on %I (isletme_id)', t || '_isletme_idx', t);
  end loop;
end $$;

-- Not: varsayılan 1 geçici. Kod tarafı isletme_id'yi kendi yazmaya başlayınca
-- (adım 4) bu varsayılanlar kaldırılacak, yoksa hatalı bir ekleme sessizce
-- 1 numaralı işletmeye düşer.
