-- PIN özeti artık tarayıcıya hiç inmiyor ve bcrypt ile saklanıyor.
--
-- 30 Ağu'da PIN doğrulamasını sunucuya taşımıştık: kurcalanmış bir tarayıcı
-- istediği kişiye geçemesin diye. Ama özetin kendisi hâlâ dışarı çıkıyordu —
-- personel listesi çekilirken `pin_hash` sütunu da geliyordu. Satır güvenliği
-- satırı korur, sütunu korumaz.
--
-- İki sonucu vardı. Birincisi: kendi işletmesinde çalışan biri yöneticinin
-- özetini okuyabiliyordu. İkincisi: özet tuzsuz SHA-256'ydı, yani aynı PIN
-- herkeste aynı özeti veriyor ve yöntem kasten hızlı. Dört haneli, sıfırla
-- başlamayan PIN'de 9.000 ihtimal var; okunan bir özet saniyeler içinde
-- çözülüyordu.
--
-- Burada ikisi de kapanıyor: sütun yetkiyle gizleniyor, özet bcrypt'e
-- çevriliyor (her kişide ayrı tuz, kasten yavaş).

-- 1) "PIN'i var mı" bilgisi ayrı bir sütun -------------------------------
--
-- Personel ekranı listede "· PIN" rozetini gösteriyor ve düzenleme formunu
-- buna göre açıyor. Bunun için özetin kendisine ihtiyaç yok, evet/hayır
-- yeterli. Sütun türetilmiş: `pin_hash` değişince kendisi güncelleniyor,
-- ayrıca yazılmıyor.

alter table personel
  add column if not exists pin_var boolean
  generated always as (pin_hash is not null) stored;

-- 2) Sütunu tarayıcıdan gizle -------------------------------------------
--
-- Postgres'te sütun yetkisi ancak tablo yetkisi yoksa işe yarıyor: tablonun
-- tamamına verilmiş bir SELECT, bütün sütunları kapsıyor. Onun için önce
-- tablo yetkisi geri alınıyor, sonra `pin_hash` dışındaki sütunlar tek tek
-- veriliyor. Liste elle yazılmıyor — ileride sütun eklendiğinde burayı
-- güncellemeyi unutursak o sütun okunamaz hale gelir ve sebebi anlaşılmaz.

do $$
declare
  okunabilir text;
  yazilabilir text;
begin
  -- Türetilmiş sütunlar yazılamıyor; insert/update listesine girmemeleri
  -- gerekiyor.
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into okunabilir
    from information_schema.columns
   where table_schema = 'public' and table_name = 'personel'
     and column_name <> 'pin_hash';

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into yazilabilir
    from information_schema.columns
   where table_schema = 'public' and table_name = 'personel'
     and column_name <> 'pin_hash'
     and is_generated = 'NEVER';

  revoke select, insert, update on personel from authenticated;

  execute format('grant select (%s) on personel to authenticated', okunabilir);
  execute format('grant insert (%s) on personel to authenticated', yazilabilir);
  execute format('grant update (%s) on personel to authenticated', yazilabilir);
end $$;

-- Silme sütuna bağlı değil, tablo yetkisi olarak kalıyor; hangi satırın
-- silinebileceğine zaten satır güvenliği karar veriyor.

-- 3) PIN atama ----------------------------------------------------------
--
-- Özet artık tarayıcıda hesaplanmıyor, PIN'in düz hâli buraya geliyor ve
-- özet burada alınıyor. Tarayıcıya dönen bir şey yok.
--
-- Aynı PIN iki kişide olamaz: hızlı geçişte kimin işlem yaptığı belirsiz
-- kalırdı. Karşılaştırma her satırın kendi tuzuyla yapılıyor — bcrypt'te
-- aynı PIN iki kişide farklı özet veriyor, düz eşitlik çalışmıyor.

create or replace function pin_ata(p_personel_id bigint, p_pin text)
returns void language plpgsql volatile security definer
set search_path = public, extensions as $$
declare
  isletme bigint;
begin
  if not oturum_yetkisi('tanim.personel') then
    raise exception 'Personel düzenleme yetkin yok.';
  end if;

  isletme := oturum_isletmesi();

  if not exists (
    select 1 from personel where id = p_personel_id and isletme_id = isletme
  ) then
    raise exception 'Personel bulunamadı.';
  end if;

  -- Boş gelirse PIN kaldırılıyor.
  if p_pin is null or p_pin = '' then
    update personel set pin_hash = null where id = p_personel_id;
    return;
  end if;

  if p_pin !~ '^[1-9][0-9]{3}$' then
    raise exception 'PIN dört haneli olmalı ve sıfırla başlayamaz.';
  end if;

  if exists (
    select 1 from personel
     where isletme_id = isletme
       and id <> p_personel_id
       and pin_hash is not null
       and pin_hash = crypt(p_pin, pin_hash)
  ) then
    raise exception 'Bu PIN başka bir kişide kullanılıyor.';
  end if;

  update personel
     set pin_hash = crypt(p_pin, gen_salt('bf'))
   where id = p_personel_id;
end $$;

-- Personel ekranı kaydetmeden önce soruyor ki hata mesajı alanın altında
-- çıksın, kaydet düğmesine basıldıktan sonra değil.
create or replace function pin_kullanimda(p_pin text, p_haric bigint default null)
returns boolean language plpgsql stable security definer
set search_path = public, extensions as $$
begin
  if not oturum_yetkisi('tanim.personel') then
    raise exception 'Personel düzenleme yetkin yok.';
  end if;

  return exists (
    select 1 from personel
     where isletme_id = oturum_isletmesi()
       and (p_haric is null or id <> p_haric)
       and pin_hash is not null
       and pin_hash = crypt(p_pin, pin_hash)
  );
end $$;

-- 4) Geçiş: eski özetler bozulmuyor -------------------------------------
--
-- Kimseye "PIN'ini yeniden kur" dedirtmemek için `pin_ile_gec` bir süre
-- eski SHA-256 özetini de kabul ediyor. Doğru PIN girildiği anda o kişinin
-- kaydı sessizce bcrypt'e çevriliyor; kasada çalışan kimse bir şey fark
-- etmiyor. Herkes bir kez PIN'ini kullandıktan sonra eski yöntem tabloda
-- kalmıyor ve aşağıdaki dal silinebilir.
--
-- Eski özetin uzunluğu 64 (onaltılık SHA-256), bcrypt ise '$2a$' ile
-- başlıyor; ayrım buradan yapılıyor.

create or replace function pin_ile_gec(pin text)
returns bigint language plpgsql volatile security definer
set search_path = public, extensions as $$
declare
  isletme bigint;
  bulunan bigint;
  eski    boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Oturum yok.' using errcode = '42501';
  end if;

  select isletme_id into isletme from personel where auth_id = auth.uid();
  if isletme is null then
    raise exception 'Oturum yok.' using errcode = '42501';
  end if;

  -- Önce bcrypt.
  select id into bulunan
    from personel
   where isletme_id = isletme
     and pin_hash is not null
     and pin_hash like '$2%'
     and pin_hash = crypt(pin, pin_hash)
     and aktif
     and not giris_engelli
   limit 1;

  -- Bulunamadıysa eski yöntem.
  if bulunan is null then
    select id into bulunan
      from personel
     where isletme_id = isletme
       and pin_hash = encode(digest(pin, 'sha256'), 'hex')
       and aktif
       and not giris_engelli
     limit 1;

    if bulunan is not null then
      eski := true;
    end if;
  end if;

  -- Yanlış PIN'de kim olmadığı söylenmiyor, yalnız olmadığı söyleniyor.
  if bulunan is null then
    raise exception 'PIN doğru değil.' using errcode = '42501';
  end if;

  -- Doğru girildi: kayıt yeni yönteme çevriliyor.
  if eski then
    update personel set pin_hash = crypt(pin, gen_salt('bf')) where id = bulunan;
  end if;

  insert into oturum_kisileri (auth_id, personel_id)
  values (auth.uid(), bulunan)
  on conflict (auth_id) do update
    set personel_id = excluded.personel_id, guncelleme = now();

  return bulunan;
end $$;

-- 5) Yetkiler -----------------------------------------------------------
-- 1 Eyl'deki sıkılaştırmanın kuralı geçerli: yeni fonksiyonlar yalnız giriş
-- yapmış kullanıcıya açılıyor, anon'a değil.

revoke all on function pin_ata(bigint, text) from anon, public;
revoke all on function pin_kullanimda(text, bigint) from anon, public;
grant execute on function pin_ata(bigint, text) to authenticated;
grant execute on function pin_kullanimda(text, bigint) to authenticated;
