-- Şifre kuralları veritabanına taşınıyor.
--
-- Kurallar bugüne kadar yalnız `sifreKurallari` içinde, yani tarayıcıda
-- duruyordu: ekranda tikli liste gösteriyor ve kaydet düğmesini kilitliyordu.
-- Kullanıcıya yol göstermek için doğru yer orası, ama tek yer orası olunca
-- kural değil tavsiye oluyor — isteği elle kuran biri `123456` ile hesap
-- açabiliyordu.
--
-- PIN'de olduğu gibi kural asıl kararı verenin yanına geliyor. Ekrandaki liste
-- olduğu gibi kalıyor; kullanıcı hiçbir fark görmüyor.

-- 1) Kuralın kendisi ------------------------------------------------------
--
-- Dört madde de `sifreKurallari` ile birebir aynı. Değişirse iki yerde
-- birlikte değişmesi gerekiyor; ekrandaki liste ile buradaki denetim
-- ayrışırsa kullanıcı "hepsi yeşil" görüp hata alır.

create or replace function sifre_gecerli(p_sifre text)
returns boolean language sql immutable set search_path = public as $$
  select p_sifre is not null
     and length(p_sifre) >= 6
     -- Harf ve rakam. Türkçe harfler ayrıca yazılıyor: veritabanının
     -- dil ayarına göre [a-z] onları kapsamayabiliyor.
     and p_sifre ~* '[a-zçğıöşü]'
     and p_sifre ~ '[0-9]'
     -- Baştaki ve sondaki boşluk, kullanıcının göremediği bir fark yaratıp
     -- sonra "şifrem tutmuyor" olarak geri geliyor.
     and p_sifre = btrim(p_sifre)
     and lower(p_sifre) <> all (array[
       '123456', '1234567', '12345678', '123456789', '1234567890', 'password',
       'sifre1', 'sifre123', 'parola1', 'parola123', 'qwerty1', 'qwerty123',
       'asdasd1', 'asdasd123', '111111', 'abcd1234', 'admin123', 'garson123'
     ]);
$$;

-- 2) Yeni işletme kaydı ---------------------------------------------------
--
-- Kural kurulumun gövdesine değil dış kapısına konuyor: gövde iki yüz satır,
-- tek bir kontrol için kopyalanmasın. Kapı zaten kayıt sınırını da burada
-- işletiyor.

create or replace function isletme_kur(
  p_isletme_ad  text,
  p_yonetici_ad text,
  p_telefon     text,
  p_sifre       text
)
returns bigint language plpgsql security definer
set search_path = public, extensions as $$
declare
  yeni_id bigint;
begin
  if not sifre_gecerli(p_sifre) then
    raise exception 'Şifre kurallara uymuyor: en az 6 karakter, bir harf ve bir rakam.';
  end if;

  perform kayit_sinirini_kontrol_et();

  yeni_id := isletme_kur_uygula(p_isletme_ad, p_yonetici_ad, p_telefon, p_sifre);

  perform kayit_denemesi_yaz(p_telefon, p_isletme_ad);

  return yeni_id;
end $$;

-- 3) Personel hesabı ------------------------------------------------------
--
-- Burada hiç şifre kuralı yoktu. Gövde 1 Eyl'deki hâliyle aynı — işletme
-- kontrolü dahil — eklenen tek şey baştaki denetim.
--
-- Şifre boş gelirse mevcut şifre korunuyor demektir; o durumda kurala
-- bakılmıyor, yoksa adı veya rolü değişen personel kaydedilemezdi.

create or replace function personel_hesabi_yaz(p_personel_id bigint, p_sifre text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  kisi        personel%rowtype;
  adres       text;
  hesap       uuid;
  ilk_kurulum boolean;
begin
  select not exists (select 1 from personel where auth_id is not null) into ilk_kurulum;
  if not ilk_kurulum and not oturum_yetkisi('tanim.personel') then
    raise exception 'Personel hesabı açma yetkin yok.';
  end if;

  if coalesce(p_sifre, '') <> '' and not sifre_gecerli(p_sifre) then
    raise exception 'Şifre kurallara uymuyor: en az 6 karakter, bir harf ve bir rakam.';
  end if;

  select * into kisi from personel where id = p_personel_id;
  if kisi is null then
    raise exception 'Personel bulunamadı.';
  end if;

  if not ilk_kurulum and kisi.isletme_id is distinct from oturum_isletmesi() then
    raise exception 'Personel bulunamadı.';
  end if;

  if coalesce(kisi.telefon, '') = '' then
    raise exception 'Hesap açmak için telefon numarası gerekiyor.';
  end if;

  adres := hesap_epostasi(kisi.telefon);

  if kisi.auth_id is not null then
    update auth.users
       set email = adres,
           encrypted_password = case
             when p_sifre is null or p_sifre = '' then encrypted_password
             else crypt(p_sifre, gen_salt('bf'))
           end,
           updated_at = now()
     where id = kisi.auth_id;

    update auth.identities
       set identity_data = jsonb_build_object('sub', kisi.auth_id::text, 'email', adres),
           updated_at = now()
     where user_id = kisi.auth_id and provider = 'email';

    return kisi.auth_id;
  end if;

  if p_sifre is null or p_sifre = '' then
    raise exception 'Yeni hesap için şifre gerekiyor.';
  end if;

  hesap := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', hesap, 'authenticated', 'authenticated',
    adres, crypt(p_sifre, gen_salt('bf')), now(),
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

  update personel set auth_id = hesap where id = p_personel_id;
  return hesap;
end $$;

-- 4) Yetkiler -------------------------------------------------------------
-- `create or replace` yetkileri korur, ama `sifre_gecerli` yeni doğduğu için
-- herkese açık geliyor. 1 Eyl'deki kural: açıkça verilmeyen kapalı kalır.

revoke all on function sifre_gecerli(text) from anon, public;
revoke all on function isletme_kur(text, text, text, text) from public;
grant execute on function isletme_kur(text, text, text, text) to anon, authenticated;
