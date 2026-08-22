-- Kasa köprüsünün kendi hesabı.
--
-- Köprü fiş basmak için Garso'ya giriş yapıyor ve bugüne kadar işletmecinin
-- kendi yönetici hesabıyla giriyordu. İki sakıncası vardı:
--
--   1. Şifre kasadaki bilgisayarda duruyor (kapalı hâlde, Windows'un DPAPI
--      servisiyle — ama o makinede oturan biri için çözülebilir). Eline geçen
--      kişi yönetici oluyordu: ciro, adisyon iptali, personel şifresi.
--   2. İşletmeci şifresini değiştirdiği gün köprü fiş basmayı bırakıyordu ve
--      sebebi hiçbir ekranda yazmıyordu.
--
-- Köprünün ihtiyacı çok dar: yazıcı listesini okumak ve beş fonksiyonu
-- çağırmak. O fonksiyonların hiçbiri yetki sormuyor, yani yetkisiz bir hesap
-- yetiyor. Bundan sonra köprü onunla giriyor.
--
-- Köprünün giriş ekranı değişmiyor: yine telefon ve şifre istiyor. Numarayı
-- işletmeci Yazıcılar sekmesinde kendisi yazıyor, şifreyi program üretiyor.

-- 1) Sistem kayıtları personel listesinde görünmüyor ----------------------
--
-- "Kasa Köprüsü" bir insan değil; Personel ekranında görünürse "bu kim,
-- neden telefonu yok" sorusu doğuruyor ve yanlışlıkla silinebiliyor.
-- Yönetimi Yazıcılar sekmesinde.

alter table personel add column if not exists sistem boolean not null default false;

-- 2) Şifre üretmenin kendi yetkisi ---------------------------------------
--
-- Yazıcı tanımlamakla, kasaya girebilen bir hesabın şifresini üretmek aynı
-- ağırlıkta işler değil. Ayrı kod olunca yönetici kime vereceğine kendisi
-- karar veriyor — müdüre de verir, vermez de.

insert into yetkiler (kod, ad, grup, sira)
select 'yazici.hesap', 'Kasa köprüsü şifresi oluşturma', 'Tanım', 6
where not exists (select 1 from yetkiler y where y.kod = 'yazici.hesap');

-- Başlangıçta yalnız Yönetici'de. Dağıtımı işletmeye kalıyor.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad = 'Yönetici'
  and y.kod = 'yazici.hesap'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );

-- 3) Şifre üretici --------------------------------------------------------
--
-- Şifre işletmeciden istenmiyor: bu hesabı kimse ezberlemeyecek, bir kere
-- köprüye yazılıp unutulacak. Program üretince zayıf olma ihtimali de
-- kalmıyor.
--
-- Harf ve rakam karışık, 14 karakter. Karıştırılması kolay olanlar (l, I, 1,
-- O, 0) listede yok — işletmeci bunu ekrandan okuyup köprüye elle yazacak.

create or replace function yazici_sifresi_uret()
returns text language sql volatile set search_path = public, extensions as $$
  select string_agg(
           substr('abcdefghijkmnpqrstuvwxyz23456789',
                  1 + floor(random() * 32)::int, 1),
           ''
         )
    from generate_series(1, 14);
$$;

-- 4) Hesabı kur / şifresini yenile ---------------------------------------
--
-- Aynı fonksiyon iki işi de yapıyor: hesap yoksa açıyor, varsa şifresini
-- yeniliyor. İkisi de aynı düğmeden çıkıyor ve sonuç aynı — köprüye yazılacak
-- yeni bir şifre.
--
-- Şifre yalnız burada, bir kez dönüyor. Saklanmıyor: saklandığı an "kasada
-- şifre duruyor" sorununu ekranın içine taşımış oluruz.

create or replace function yazici_hesabi_kur(p_telefon text)
returns text language plpgsql volatile security definer
set search_path = public, extensions as $$
declare
  isletme  bigint;
  numara   text;
  kisi_id  bigint;
  hesap    uuid;
  adres    text;
  yeni     text;
begin
  if not oturum_yetkisi('yazici.hesap') then
    raise exception 'Kasa köprüsü şifresi oluşturma yetkin yok.';
  end if;

  isletme := oturum_isletmesi();
  numara  := regexp_replace(coalesce(p_telefon, ''), '\D', '', 'g');

  if length(numara) < 10 then
    raise exception 'Telefon numarası eksik görünüyor.';
  end if;

  adres := hesap_epostasi(numara);

  -- Numara bütün sistemde tek: giriş adresi ondan üretiliyor. Başkasının
  -- numarasıysa buradan dönülüyor, yoksa o hesabın şifresi ezilirdi.
  select id into kisi_id
    from personel
   where isletme_id = isletme and sistem
   limit 1;

  if exists (
    select 1 from personel
     where telefon = numara
       and (kisi_id is null or id <> kisi_id)
  ) then
    raise exception 'Bu telefon numarası başka bir kayıtta kullanılıyor.';
  end if;

  yeni := yazici_sifresi_uret();

  -- Hesap yoksa personel kaydıyla birlikte açılıyor. Rolü yok: yetkisi de
  -- olmasın isteniyor, `oturum_yetkisi` rolü olmayana hep false diyor.
  if kisi_id is null then
    insert into personel (isletme_id, ad, telefon, rol_id, aktif, giris_engelli, sistem)
    values (isletme, 'Kasa Köprüsü', numara, null, true, false, true)
    returning id into kisi_id;
  else
    update personel set telefon = numara, aktif = true, giris_engelli = false
     where id = kisi_id;
  end if;

  select auth_id into hesap from personel where id = kisi_id;

  if hesap is not null then
    update auth.users
       set email = adres,
           encrypted_password = crypt(yeni, gen_salt('bf')),
           updated_at = now()
     where id = hesap;

    update auth.identities
       set identity_data = jsonb_build_object('sub', hesap::text, 'email', adres),
           updated_at = now()
     where user_id = hesap and provider = 'email';

    return yeni;
  end if;

  hesap := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', hesap, 'authenticated', 'authenticated',
    adres, crypt(yeni, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', '', '', '', '', ''
  );

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
  ) then
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    values (gen_random_uuid(), hesap,
            jsonb_build_object('sub', hesap::text, 'email', adres),
            'email', hesap::text, now(), now());
  else
    insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at)
    values (gen_random_uuid(), hesap,
            jsonb_build_object('sub', hesap::text, 'email', adres),
            'email', now(), now());
  end if;

  update personel set auth_id = hesap where id = kisi_id;
  return yeni;
end $$;

-- 5) Ekranın okuduğu durum ------------------------------------------------
--
-- Şifre dönmüyor — hiçbir yerde saklanmıyor zaten. Yalnız hesap kurulmuş mu
-- ve hangi numarayla, o kadar. Bölümü görmek için şifre yetkisi gerekmiyor:
-- müdür numarayı görüp köprünün neyle girdiğini anlayabilsin.

create or replace function yazici_hesabi_durumu()
returns table (telefon text, kurulu boolean)
language sql stable security definer set search_path = public as $$
  select p.telefon, p.auth_id is not null
    from personel p
   where p.isletme_id = oturum_isletmesi() and p.sistem
   limit 1;
$$;

-- 6) Yetkiler -------------------------------------------------------------

revoke all on function yazici_hesabi_kur(text) from anon, public;
revoke all on function yazici_hesabi_durumu() from anon, public;
revoke all on function yazici_sifresi_uret() from anon, authenticated, public;
grant execute on function yazici_hesabi_kur(text) to authenticated;
grant execute on function yazici_hesabi_durumu() to authenticated;
