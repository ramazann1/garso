-- Menünün zenginleşmesi: ürüne açıklama, medya ve künye alanları.
--
-- Bugüne kadar ürün satış için yeterliydi — ad, fiyat, KDV. QR menüde ürünü
-- gören kişi garson değil müşteri; ada bakıp ne olduğunu anlamıyor. Aşağıdaki
-- alanların hepsi isteğe bağlı: hiçbiri doldurulmadan da menü yayınlanıyor,
-- doldurulan kadarı sayfada görünüyor.

-- 1) Ürünün künyesi ------------------------------------------------------

alter table urunler add column if not exists aciklama text not null default '';
-- Hazırlanma süresi dakika, kalori kcal, gramaj gram; 0 = girilmemiş.
alter table urunler add column if not exists hazirlanma_dk int not null default 0;
alter table urunler add column if not exists kalori int not null default 0;
alter table urunler add column if not exists gramaj int not null default 0;
-- Alerjenler serbest metin değil liste: menüde tek tek rozet olarak çiziliyor.
alter table urunler add column if not exists alerjenler text[] not null default '{}';
-- Etiket ürünün üstünde küçük bir rozet olarak duruyor; boşsa rozet yok.
alter table urunler add column if not exists etiket text
  check (etiket is null or etiket in ('yeni', 'populer', 'sef', 'aci'));
-- Tükenen ürün menüden silinmiyor, "bugün yok" diye soluk görünüyor. Satışta
-- da kapatılabilsin diye ürünün kendi alanı — kategori görünürlüğünden ayrı.
alter table urunler add column if not exists tukendi boolean not null default false;

comment on column urunler.aciklama is
  'Müşterinin gördüğü tanıtım cümlesi; QR menüde adın altında duruyor.';
comment on column urunler.etiket is
  'yeni | populer | sef | aci — menüde rozet. Boşsa rozet çizilmiyor.';
comment on column urunler.tukendi is
  'Bugün yok. Ürün menüde kalıyor ama sipariş edilemez görünüyor.';

-- 2) Kategorinin tanıtımı ------------------------------------------------

alter table kategoriler add column if not exists aciklama text not null default '';
alter table kategoriler add column if not exists gorsel text;

comment on column kategoriler.gorsel is
  'Kategori başlığının arkasındaki görselin depodaki yolu; boşsa düz başlık.';

-- 3) İşletmenin kapağı ---------------------------------------------------

-- QR menünün en üstündeki tanıtım görselleri, sırayla dönüyor. Boşsa menü
-- doğrudan başlıkla açılıyor.
alter table isletme_ayarlari add column if not exists qr_menu_kapaklar text[] not null default '{}';

-- 4) Ürün medyası --------------------------------------------------------

-- Ayrı tablo: ürün başına birden çok görsel var, sıraları değişiyor ve
-- video da girebiliyor. Ürünün içine üç kolon açmak yerine liste.
create table if not exists urun_medya (
  id bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler(id) on delete cascade,
  urun_id bigint not null references urunler(id) on delete cascade,
  -- Depodaki yol; dosyanın kendisi Supabase Storage'ın menu kovasında.
  yol text not null,
  tur text not null default 'foto' check (tur in ('foto', 'video')),
  sira int not null default 1
);

create index if not exists urun_medya_urun on urun_medya (urun_id, sira);

-- Ürün başına en fazla üç medya. Sınır veritabanında: arayüzdeki kontrol
-- unutulursa ya da atlanırsa menü sayfası altı fotoğrafla dolmasın.
create or replace function urun_medya_siniri()
returns trigger language plpgsql as $$
begin
  if (select count(*) from urun_medya where urun_id = new.urun_id) >= 3 then
    raise exception 'Bir ürüne en fazla 3 görsel eklenebilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists urun_medya_sinir on urun_medya;
create trigger urun_medya_sinir before insert on urun_medya
  for each row execute function urun_medya_siniri();

-- Satır güvenliği diğer tanım tablolarıyla aynı: işletmesi kendiliğinden
-- yazılıyor, yalnız kendi işletmesi görüyor, yazmak menü yetkisi istiyor.
alter table urun_medya alter column isletme_id set default oturum_isletmesi();
alter table urun_medya enable row level security;
drop policy if exists urun_medya_isletme on urun_medya;
create policy urun_medya_isletme on urun_medya for all to authenticated
  using (isletme_id = oturum_isletmesi())
  with check (isletme_id = oturum_isletmesi());
select tanim_yetkisi_bagla('urun_medya', 'tanim.menu', 'Menüyü düzenleme yetkiniz yok.');

-- 5) QR menü yeni alanları da versin ------------------------------------

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
  v_kapaklar text[];
  v_sonuc jsonb;
begin
  select a.isletme_id, a.qr_menu_adres, a.qr_menu_kapaklar
    into v_isletme, v_adres, v_kapaklar
    from isletme_ayarlari a
   where a.qr_menu_kod = p_kod
     and a.qr_menu_acik;

  if v_isletme is null then
    return jsonb_build_object('acik', false);
  end if;

  select i.ad into v_ad from isletmeler i where i.id = v_isletme;

  with kategori as (
    select k.id, k.ad, k.aciklama, k.gorsel, k.sira
      from kategoriler k
     where k.isletme_id = v_isletme
       and k.satista_gorunur
  ),
  urun as (
    select uk.kategori_id,
           uk.sira,
           u.ad,
           u.aciklama,
           u.hazirlanma_dk,
           u.kalori,
           u.gramaj,
           u.alerjenler,
           u.etiket,
           u.tukendi,
           (select jsonb_agg(
                     jsonb_build_object('ad', coalesce(b.ad, ''), 'fiyat', coalesce(p.masa_fiyat, p.fiyat))
                     order by p.sira
                   )
              from porsiyonlar p
              left join birimler b on b.id = p.birim_id
             where p.urun_id = u.id) as porsiyonlar,
           (select jsonb_agg(
                     jsonb_build_object('yol', m.yol, 'tur', m.tur)
                     order by m.sira
                   )
              from urun_medya m
             where m.urun_id = u.id) as medya
      from urunler u
      join urun_kategorileri uk on uk.urun_id = u.id
     where u.isletme_id = v_isletme
       and u.satista_gorunur
  )
  select jsonb_build_object(
           'acik', true,
           'isletme', coalesce(v_ad, ''),
           'adres', coalesce(v_adres, ''),
           'kapaklar', to_jsonb(coalesce(v_kapaklar, '{}'::text[])),
           'kategoriler', coalesce(jsonb_agg(
             jsonb_build_object(
               'ad', k.ad,
               'aciklama', k.aciklama,
               'gorsel', k.gorsel,
               'urunler', coalesce((
                 select jsonb_agg(
                          jsonb_build_object(
                            'ad', r.ad,
                            'aciklama', r.aciklama,
                            'hazirlanmaDk', r.hazirlanma_dk,
                            'kalori', r.kalori,
                            'gramaj', r.gramaj,
                            'alerjenler', to_jsonb(r.alerjenler),
                            'etiket', r.etiket,
                            'tukendi', r.tukendi,
                            'porsiyonlar', r.porsiyonlar,
                            'medya', coalesce(r.medya, '[]'::jsonb)
                          )
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

revoke all on function qr_menu(text) from public;
grant execute on function qr_menu(text) to anon, authenticated;

-- 6) Dosya deposu --------------------------------------------------------

-- menu kovası: herkes okuyabiliyor (QR menüyü açan müşterinin hesabı yok),
-- yazmak için giriş şart ve dosya kendi işletmesinin klasörüne düşüyor.
insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do update set public = true;

drop policy if exists menu_medya_oku on storage.objects;
create policy menu_medya_oku on storage.objects for select
  using (bucket_id = 'menu');

-- Yol her zaman "<isletme_id>/dosya" biçiminde; başka işletmenin klasörüne
-- yazılamıyor, silinemiyor.
drop policy if exists menu_medya_yaz on storage.objects;
create policy menu_medya_yaz on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and (storage.foldername(name))[1] = oturum_isletmesi()::text);

drop policy if exists menu_medya_sil on storage.objects;
create policy menu_medya_sil on storage.objects for delete to authenticated
  using (bucket_id = 'menu' and (storage.foldername(name))[1] = oturum_isletmesi()::text);
