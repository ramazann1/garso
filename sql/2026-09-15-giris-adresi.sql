-- Ürün adı RayoPOS oldu; telefondan üretilen giriş adresi de yeni alan adına
-- geçiyor. Kod tarafı (src/oturum.ts, kopru/src/ayar.js) aynı adresi üretiyor,
-- ikisi birlikte değişmezse kimse giriş yapamaz.

create or replace function hesap_epostasi(telefon text)
returns text language sql immutable as $$
  select regexp_replace(telefon, '\D', '', 'g') || '@rayopos.com.tr';
$$;

-- Yalnız numaradan üretilmiş adresler taşınıyor; gerçek e-postayla açılmış
-- hesaba dokunulmuyor. Şifre ve hesap kimliği aynı kalıyor.
update auth.users
   set email = replace(email, '@garso.app', '@rayopos.com.tr'),
       updated_at = now()
 where email like '%@garso.app';

update auth.identities
   set identity_data = jsonb_set(
         identity_data, '{email}',
         to_jsonb(replace(identity_data->>'email', '@garso.app', '@rayopos.com.tr'))
       ),
       updated_at = now()
 where provider = 'email'
   and identity_data->>'email' like '%@garso.app';

-- Kontrol: ikisi de 0 dönmeli.
select
  (select count(*) from auth.users where email like '%@garso.app') as eski_hesap,
  (select count(*) from auth.identities where identity_data->>'email' like '%@garso.app') as eski_kimlik;
