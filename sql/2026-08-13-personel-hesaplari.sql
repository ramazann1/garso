-- Gerçek kimlik doğrulamaya geçiş.
-- Şimdiye kadar şifreyi kendimiz tutuyorduk (personel.sifre_hash) ve tarayıcı
-- karşılaştırıyordu. Bu, veritabanı seviyesinde hiçbir şey korumuyor: anonim
-- anahtarla bağlanan herkes her satırı okuyabiliyor. Artık kimlik Supabase
-- Auth'ta; satır güvenliği (sonraki adım) buna dayanacak.
--
-- Personel numarasıyla giriyor. Auth e-posta ile çalıştığı için numaradan
-- perde arkasında bir adres üretiliyor: 05551112233@garso.app. Kullanıcı bunu
-- görmüyor. Telefonla giriş Supabase'de SMS servisi (ve masraf) istiyordu,
-- bu yolla gerek kalmıyor.
--
-- Hesabı yönetici açıyor: Personel ekranında telefon ve şifre zaten giriliyor,
-- kaydedince buradaki fonksiyon çalışıyor.

alter table personel add column if not exists auth_id uuid unique;

-- Numara ile hesap adresi arasındaki çeviri tek yerde dursun; kod tarafı da
-- aynısını üretiyor.
create or replace function hesap_epostasi(telefon text)
returns text language sql immutable as $$
  select regexp_replace(telefon, '\D', '', 'g') || '@garso.app';
$$;

-- Giriş ekranında e-posta da yazılabiliyor; karşılığındaki hesap adresi
-- buradan bulunuyor. Satır güvenliği açıldıktan sonra da çalışsın diye
-- tanımlayıcı yetkisiyle koşuyor ve yalnızca tek alan dönüyor.
create or replace function eposta_hesabi(giris text)
returns text language sql stable security definer set search_path = public as $$
  select hesap_epostasi(telefon)
    from personel
   where lower(eposta) = lower(trim(giris))
     and aktif
     and not giris_engelli
   limit 1;
$$;

-- Kimin hangi işletmede olduğu satır güvenliğinde sürekli sorulacak; her
-- politikada personel tablosunu taramamak için tek yerden okunuyor.
create or replace function oturum_isletmesi()
returns bigint language sql stable security definer set search_path = public as $$
  select isletme_id from personel where auth_id = auth.uid();
$$;

-- Yetkinin veritabanı tarafındaki karşılığı: temel rolden gelir, kişiye özel
-- satır varsa onu ezer (yetkiler.ts'teki etkinYetkiler ile aynı kural).
create or replace function oturum_yetkisi(kod text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select py.izin
       from personel p
       join yetkiler y on y.kod = oturum_yetkisi.kod
       join personel_yetkileri py on py.personel_id = p.id and py.yetki_id = y.id
      where p.auth_id = auth.uid()),
    (select true
       from personel p
       join yetkiler y on y.kod = oturum_yetkisi.kod
       join rol_yetkileri ry on ry.rol_id = p.rol_id and ry.yetki_id = y.id
      where p.auth_id = auth.uid()),
    false
  );
$$;

-- Personel kaydedilirken çağrılıyor: hesabı yoksa açıyor, varsa numarasını ve
-- şifresini güncelliyor. Şifre buraya düz metin geliyor ama veritabanının
-- dışına çıkmıyor; Auth kendi yöntemiyle özetleyip saklıyor.
--
-- Kimler çağırabilir: personel tanımlama yetkisi olanlar. Bir istisna var —
-- ilk kurulumda henüz kimsenin hesabı yoktur, o zaman ilk hesabın açılmasına
-- izin veriliyor, yoksa sisteme kimse giremezdi.
create or replace function personel_hesabi_yaz(p_personel_id bigint, p_sifre text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  kisi     personel%rowtype;
  adres    text;
  hesap    uuid;
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
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', hesap, 'authenticated', 'authenticated',
    adres, crypt(p_sifre, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

  -- Şifreyle giriş için kimlik satırı da gerekiyor. Sütun adları Supabase
  -- sürümleri arasında değiştiği için provider_id varsa dolduruluyor.
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

-- Personel silinirse hesabı da gitsin; ortada sahibi olmayan giriş kalmasın.
create or replace function personel_hesabi_sil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.auth_id is not null then
    delete from auth.users where id = old.auth_id;
  end if;
  return old;
end $$;

drop trigger if exists personel_hesabi_sil_trg on personel;
create trigger personel_hesabi_sil_trg
  before delete on personel
  for each row execute function personel_hesabi_sil();
