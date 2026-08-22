-- Canlıya çıkmadan önceki güvenlik denetiminin veritabanı düzeltmeleri.
--
-- Denetimde çıkan tablo: satır güvenliği bütün tablolarda açıktı, açık
-- depolama kovası yoktu, `auth` şeması dışarıya kapalıydı. Ama üç yerde
-- kapı açık kalmıştı ve üçü de aynı sebepten: bir fonksiyona ya da tabloya
-- erişim verilirken kimin kullanacağı yazılmamış, Postgres de yazılmayanı
-- "herkes" saymış.

-- 1) Geliştirme günlerinden kalan tablo ---------------------------------
--
-- `adisyonlar_eski` üzerinde "gelistirme erisimi" adlı, koşulu `true` olan
-- ve `public` rolüne verilmiş bir politika duruyordu. `public` demek anon
-- dahil herkes: anonim anahtarı olan biri tabloyu okuyabiliyor, yazabiliyor
-- ve silebiliyordu. Anonim anahtar tarayıcıdaki koda gömülü olduğu için
-- eline geçirmek de zor değil.
--
-- Tablo silinmiyor, yalnız kapısı kapanıyor: içinde eski deneme kayıtları
-- var, gerçekten gerekmediğine karar verilince ayrıca düşürülür.

drop policy if exists "gelistirme erisimi" on adisyonlar_eski;
revoke all on adisyonlar_eski from anon, authenticated;

-- 2) Hesap açma artık kendi işletmesiyle sınırlı -------------------------
--
-- `personel_hesabi_yaz` tanımlayıcı yetkisiyle çalışıyor, yani satır
-- güvenliğini atlıyor — hesabı açabilmesi için buna mecbur. Ama personelin
-- hangi işletmeden olduğuna bakmıyordu: yetkisi olan biri başka bir
-- işletmenin personel numarasını verip o kişinin şifresini değiştirebilir,
-- sonra onun yerine giriş yapabilirdi. Çok işletmeli bir üründe bu, bir
-- müşterinin diğerinin kasasına girmesi demek.
--
-- Gövdenin kalanı 13 Ağu'daki hâliyle aynı; değişen yalnız baştaki kontrol.

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

  -- İlk kurulumda ortada oturum yok, o yüzden kontrol atlanıyor. Onun
  -- dışında kişi çağıranın kendi işletmesinden olmak zorunda. "Başka
  -- işletmeden" demiyoruz — olmayan bir personel numarası ile başkasının
  -- numarası dışarıdan aynı görünsün.
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

-- 3) Giriş yapmamış ziyaretçi artık hiçbir fonksiyonu çağıramıyor --------
--
-- Postgres'te bir fonksiyona hiç yetki yazılmazsa herkese açık doğuyor.
-- Bu yüzden yirmi beş tanımlayıcı fonksiyonun tamamı `anon` rolüne, yani
-- anonim anahtarla gelen isteğe açıktı. Çoğu içeride oturum kontrolü
-- yaptığı için istismar edilemiyordu ama tek bir unutulmuş kontrol yeterdi.
--
-- Kural tersine çevriliyor: önce hepsi kapanıyor, sonra giriş ekranının
-- gerçekten ihtiyaç duyduğu üç tanesi tek tek açılıyor. Tetikleyicilerden
-- çağrılan fonksiyonlar bu yetkiye bakmıyor, onlar etkilenmiyor.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as imza
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from anon, public', f.imza);
  end loop;
end $$;

-- Giriş ekranı bunları giriş yapmadan çağırıyor:
-- "hiç hesap açılmış mı" (ilk kurulum mu), e-posta yazılırsa hesap adresi,
-- ve yeni işletme kaydı.
grant execute on function giris_kuruldu() to anon, authenticated;
grant execute on function eposta_hesabi(text) to anon, authenticated;
grant execute on function isletme_kur(text, text, text, text) to anon, authenticated;

-- 4) Giriş yapmış kullanıcının çağırabildikleri --------------------------
--
-- Yukarıdaki toplu kapatma `public` rolünü de kapsadığı için, üyeye açık
-- kalması gerekenler burada tek tek veriliyor. Liste programın gerçekten
-- çağırdıklarıyla sınırlı: fazlası kapalı kalıyor.

-- Ekranlardan doğrudan çağrılanlar.
grant execute on function personel_hesabi_yaz(bigint, text) to authenticated;
grant execute on function pin_ile_gec(text) to authenticated;
grant execute on function oturum_kisisini_birak() to authenticated;
grant execute on function oturum_personeli() to authenticated;
grant execute on function telefon_kullanimda(text, bigint) to authenticated;

-- Köprünün (yazıcı programı) çağırdıkları. Köprü de kendi hesabıyla giriş
-- yapıyor, yani onun için de `authenticated`. Bunlar unutulursa fiş basmaz.
grant execute on function kuyruktan_al(text, int) to authenticated;
grant execute on function kuyruk_sonuc(bigint, boolean, text) to authenticated;
grant execute on function kopru_bildir(text, text, text) to authenticated;
grant execute on function kopru_kapandi(text) to authenticated;
grant execute on function yazici_durum_bildir(bigint, text, boolean, text) to authenticated;

-- Satır güvenliği politikalarının içinden çağrılanlar. Politika, sorguyu
-- yapan kişinin yetkisiyle değerlendiriliyor; bu yetki alınırsa kimse
-- kendi satırlarını da göremez hale gelir.
grant execute on function oturum_isletmesi() to authenticated;
grant execute on function oturum_yetkisi(text) to authenticated;

-- Tetikleyicilerin içinden çağrılanlar. `oturum_isletmesi` ayrıca
-- isletme_id sütunlarının varsayılan değeri; varsayılan da kaydı yapan
-- kişinin yetkisiyle hesaplanıyor.
--
-- `siradaki_no` adisyon, sipariş ve tahsilat numarasını veriyor. Onu
-- çağıran üç tetikleyici tanımlayıcı değil, yani kaydı yapan kişinin
-- yetkisiyle koşuyorlar: bu satır olmazsa hiçbir adisyon açılamaz.
grant execute on function siradaki_no(text) to authenticated;

-- 5) Kurulum yardımcıları dışarıya kapalı --------------------------------
--
-- `ornek_menu_kur` ve `yazici_varsayilanlari_kur` işletme numarasını
-- dışarıdan alıyor ve tanımlayıcı yetkisiyle yazıyor: giriş yapmış biri
-- başka bir işletmenin numarasını verip onun menüsüne ürün doldurabilirdi.
-- İkisi de yalnız kurulum sırasında, `isletme_kur`un içinden çağrılıyor;
-- oradan çağrılmak için bu yetkiye ihtiyaçları yok.
--
-- Aynı sebeple kayıt sınırının yardımcıları ve kurulumun gövdesi de kapalı
-- kalıyor — gövde çağrılabilseydi kayıt sınırı atlanırdı.
--
-- (3. adımdaki toplu kapatma bunları zaten kapattı; burada açıkça
-- yazılmalarının sebebi, ileride biri yanlışlıkla yetki verdiğinde bu
-- satırların "bu bilerek kapalı" demesi.)

revoke all on function ornek_menu_kur(bigint) from anon, authenticated, public;
revoke all on function yazici_varsayilanlari_kur(bigint) from anon, authenticated, public;
revoke all on function isletme_kur_uygula(text, text, text, text) from anon, authenticated, public;
revoke all on function kayit_sinirini_kontrol_et() from anon, authenticated, public;
revoke all on function kayit_denemesi_yaz(text, text) from anon, authenticated, public;
