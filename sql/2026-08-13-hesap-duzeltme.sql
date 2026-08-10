-- Elle açılan Auth kullanıcılarında giriş hatası düzeltmesi.
-- Supabase'in giriş servisi bu alanları metin olarak okuyor; boş (NULL)
-- kalırlarsa şifre doğru olsa bile giriş başarısız oluyor. Boş metin olmalılar.

update auth.users set
  confirmation_token          = coalesce(confirmation_token, ''),
  recovery_token              = coalesce(recovery_token, ''),
  email_change                = coalesce(email_change, ''),
  email_change_token_new      = coalesce(email_change_token_new, ''),
  email_change_token_current  = coalesce(email_change_token_current, ''),
  phone_change                = coalesce(phone_change, ''),
  phone_change_token          = coalesce(phone_change_token, ''),
  reauthentication_token      = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null;

-- Bundan sonra açılacak hesaplar da bu alanlarla doğsun.
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

  select * into kisi from personel where id = p_personel_id;
  if kisi is null then
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
