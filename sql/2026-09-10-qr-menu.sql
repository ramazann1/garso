-- QR menü: müşterinin masadaki karekodu okutup telefonunda gördüğü menü.
--
-- Menü zaten bizim veritabanımızda; dışarıya açılan sayfa canlı veriyi
-- okuyor, fiyat değişince menü aynı anda değişiyor. Ama menü tablolarına
-- "herkes okuyabilir" izni VERİLMİYOR: dışarıdaki ziyaretçi sadece aşağıdaki
-- işlevi çağırabiliyor, o da satışta görünür kategori/ürün ve fiyattan başka
-- hiçbir şey döndürmüyor (maliyet, stok, personel, ciro dışarı sızmıyor).

-- Menünün adresi ve anahtarı ayarlarda duruyor.
alter table isletme_ayarlari add column if not exists qr_menu_acik boolean not null default false;
alter table isletme_ayarlari add column if not exists qr_menu_kod text;
alter table isletme_ayarlari add column if not exists qr_menu_adres text not null default '';

comment on column isletme_ayarlari.qr_menu_acik is
  'Kapalıyken karekodu okutan müşteri menü yerine "menü şu an kapalı" görüyor.';
comment on column isletme_ayarlari.qr_menu_kod is
  'Menü sayfasının adresindeki kod (/m/<kod>). Tahmin edilemesin diye rastgele.';
comment on column isletme_ayarlari.qr_menu_adres is
  'İşletmenin açık adresi; menü sayfasının altında görünüyor.';

-- Kod işletmeye özel: iki işletmenin kodu çakışırsa hangi menünün açılacağı
-- belirsiz kalır.
create unique index if not exists isletme_ayarlari_qr_kod
  on isletme_ayarlari (qr_menu_kod)
  where qr_menu_kod is not null;

-- Menüyü kim güncellerse güncellesin kod tahmin edilebilir olmasın diye
-- rastgele üretiliyor: 12 haneli, karışan harfler (0/O, 1/l) yok.
create or replace function qr_menu_kodu_uret()
returns text
language sql
as $$
  select string_agg(
    substr('abcdefghjkmnpqrstuvwxyz23456789', floor(random() * 31)::int + 1, 1),
    ''
  )
  from generate_series(1, 12);
$$;

-- Dışarıya açılan tek kapı. `security definer` ile satır güvenliğini aşıyor
-- çünkü çağıran giriş yapmamış bir ziyaretçi; ama gördüğü şey aşağıdaki
-- JSON'dan ibaret.
create or replace function qr_menu(p_kod text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_isletme bigint;
  v_ad text;
  v_adres text;
  v_sonuc jsonb;
begin
  select a.isletme_id, a.qr_menu_adres
    into v_isletme, v_adres
    from isletme_ayarlari a
   where a.qr_menu_kod = p_kod
     and a.qr_menu_acik;

  -- Kod yanlış ya da menü kapalı: ikisini de aynı cevapla karşılıyoruz,
  -- deneyerek geçerli kod aramanın anlamı kalmasın.
  if v_isletme is null then
    return jsonb_build_object('acik', false);
  end if;

  select i.ad into v_ad from isletmeler i where i.id = v_isletme;

  with kategori as (
    select k.id, k.ad, k.sira
      from kategoriler k
     where k.isletme_id = v_isletme
       and k.satista_gorunur
  ),
  urun as (
    select uk.kategori_id,
           uk.sira,
           u.ad,
           -- Porsiyonu olmayan ürün menüde fiyatsız durmasın diye eleniyor.
           (select jsonb_agg(
                     jsonb_build_object('ad', coalesce(b.ad, ''), 'fiyat', coalesce(p.masa_fiyat, p.fiyat))
                     order by p.sira
                   )
              from porsiyonlar p
              left join birimler b on b.id = p.birim_id
             where p.urun_id = u.id) as porsiyonlar
      from urunler u
      join urun_kategorileri uk on uk.urun_id = u.id
     where u.isletme_id = v_isletme
       and u.satista_gorunur
  )
  select jsonb_build_object(
           'acik', true,
           'isletme', coalesce(v_ad, ''),
           'adres', coalesce(v_adres, ''),
           'kategoriler', coalesce(jsonb_agg(
             jsonb_build_object(
               'ad', k.ad,
               'urunler', coalesce((
                 select jsonb_agg(
                          jsonb_build_object('ad', r.ad, 'porsiyonlar', r.porsiyonlar)
                          order by r.sira, r.ad
                        )
                   from urun r
                  where r.kategori_id = k.id
                    and r.porsiyonlar is not null
               ), '[]'::jsonb)
             )
             order by k.sira, k.ad
           ), '[]'::jsonb)
         )
    into v_sonuc
    from kategori k;

  return v_sonuc;
end;
$$;

-- Giriş yapmamış ziyaretçi (`anon`) yalnız bu işlevi çağırabiliyor.
revoke all on function qr_menu(text) from public;
grant execute on function qr_menu(text) to anon, authenticated;
