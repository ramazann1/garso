-- Yeni işletme kaydı.
--
-- Satır güvenliği açıldığından beri giriş yapmamış bağlantı hiçbir satır
-- yazamıyor. Bu doğru davranış ama bir kapıyı da kapatıyor: hiç hesabı olmayan
-- yeni bir işletme kendi ilk yöneticisini oluşturamıyor — hesap açmak için
-- giriş, giriş için hesap gerekiyor.
--
-- Çözüm tek bir kurulum fonksiyonu. Güvenliği aşarak çalışan tek uç bu olduğu
-- için başka hiçbir şey yapmıyor: yalnız yeni bir işletme ve onun ilk
-- yöneticisini açıyor, var olan hiçbir satıra dokunmuyor.

-- Auth'un jeton sütunları boş metin bekliyor; NULL kalırsa giriş servisi
-- çöküyor ve kullanıcı "bilgiler doğru değil" görüyor. Hesap açan her yer
-- bunu çağırıyor. Sütun adları sürümden sürüme değiştiği için varlıkları
-- tek tek soruluyor.
create or replace function auth_jetonlarini_duzelt(p_hesap uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s text;
  sutunlar text[] := array[
    'confirmation_token', 'recovery_token', 'email_change',
    'email_change_token_new', 'email_change_token_current',
    'phone_change', 'phone_change_token', 'reauthentication_token'
  ];
begin
  foreach s in array sutunlar loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'auth' and table_name = 'users' and column_name = s
    ) then
      execute format(
        'update auth.users set %I = '''' where id = $1 and %I is null', s, s
      ) using p_hesap;
    end if;
  end loop;
end $$;

-- Örnek menü. Yeni işletme boş bir satış ekranıyla karşılaşmasın: birkaç
-- kategori ve ürünle sipariş akışını hemen deneyebiliyor, sonra silip kendi
-- menüsünü kuruyor. Fiyatlar yuvarlak — gerçek fiyat gibi görünmesinler.
create or replace function ornek_menu_kur(p_isletme bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  kdv    bigint;
  birim  bigint;
  kat    bigint;
  urun   bigint;
  grup   bigint;
  satir  record;
begin
  select id into kdv   from kdv_gruplari where isletme_id = p_isletme and varsayilan limit 1;
  select id into birim from birimler     where isletme_id = p_isletme and varsayilan limit 1;

  for satir in
    select * from (values
      ('Sıcak İçecekler', '#e8b4b4', 1, 'Çay',           25),
      ('Sıcak İçecekler', '#e8b4b4', 1, 'Türk Kahvesi',  60),
      ('Sıcak İçecekler', '#e8b4b4', 1, 'Filtre Kahve',  70),
      ('Sıcak İçecekler', '#e8b4b4', 1, 'Latte',         85),
      ('Soğuk İçecekler', '#9fc5d8', 2, 'Limonata',      70),
      ('Soğuk İçecekler', '#9fc5d8', 2, 'Ayran',         30),
      ('Soğuk İçecekler', '#9fc5d8', 2, 'Su',            15),
      ('Atıştırmalık',    '#e0c9a6', 3, 'Tost',          90),
      ('Atıştırmalık',    '#e0c9a6', 3, 'Sandviç',      110),
      ('Tatlılar',        '#c9b8d8', 4, 'Cheesecake',   120),
      ('Tatlılar',        '#c9b8d8', 4, 'Sufle',        130)
    ) as v(kategori, renk, kat_sira, urun_ad, fiyat)
  loop
    select id into kat from kategoriler
     where isletme_id = p_isletme and ad = satir.kategori;

    if kat is null then
      insert into kategoriler (isletme_id, ad, renk, sira, satista_gorunur, mutfakta_gorunur)
      values (p_isletme, satir.kategori, satir.renk, satir.kat_sira, true, true)
      returning id into kat;
    end if;

    insert into urunler (isletme_id, ad, kdv_id, renk, favori, satista_gorunur, mutfakta_gorunur)
    values (p_isletme, satir.urun_ad, kdv, satir.renk, false, true, true)
    returning id into urun;

    insert into urun_kategorileri (isletme_id, urun_id, kategori_id, sira)
    values (p_isletme, urun, kat, 1);

    insert into porsiyonlar (isletme_id, urun_id, birim_id, fiyat, varsayilan, sira)
    values (p_isletme, urun, birim, satir.fiyat, true, 1);

    kat := null;
  end loop;

  -- Örnek seçenek grupları. Sipariş ekranındaki seçim akışı ancak gerçek bir
  -- grupla denenebiliyor: "Şekerli mi?" tekli ve zorunlu, "Ekstralar" çoklu ve
  -- ücretli — iki farklı davranış da bir arada görünsün.
  insert into secenek_gruplari (isletme_id, ad, tekli, zorunlu, en_az, sira)
  values (p_isletme, 'Şeker', true, true, 1, 1)
  returning id into grup;

  insert into secenekler (isletme_id, grup_id, ad, ek_fiyat, sira, varsayilan)
  values (p_isletme, grup, 'Şekersiz',  0, 1, true),
         (p_isletme, grup, 'Az şekerli', 0, 2, false),
         (p_isletme, grup, 'Şekerli',    0, 3, false);

  -- Kahvelerin porsiyonlarına bağlanıyor; çay ve suya sorulmasın.
  insert into porsiyon_secenek_gruplari (isletme_id, porsiyon_id, grup_id)
  select p_isletme, p.id, grup
    from porsiyonlar p
    join urunler u on u.id = p.urun_id
   where u.isletme_id = p_isletme and u.ad in ('Türk Kahvesi', 'Filtre Kahve', 'Latte');

  insert into secenek_gruplari (isletme_id, ad, tekli, zorunlu, en_az, sira)
  values (p_isletme, 'Ekstralar', false, false, 0, 2)
  returning id into grup;

  insert into secenekler (isletme_id, grup_id, ad, ek_fiyat, sira, varsayilan)
  values (p_isletme, grup, 'Ekstra peynir', 20, 1, false),
         (p_isletme, grup, 'Sucuk',         30, 2, false),
         (p_isletme, grup, 'Acılı sos',     10, 3, false);

  insert into porsiyon_secenek_gruplari (isletme_id, porsiyon_id, grup_id)
  select p_isletme, p.id, grup
    from porsiyonlar p
    join urunler u on u.id = p.urun_id
   where u.isletme_id = p_isletme and u.ad in ('Tost', 'Sandviç');
end $$;

create or replace function isletme_kur(
  p_isletme_ad  text,
  p_yonetici_ad text,
  p_telefon     text,
  p_sifre       text
)
returns bigint language plpgsql security definer
set search_path = public, extensions as $$
declare
  isletme_ad  text := trim(coalesce(p_isletme_ad, ''));
  yonetici_ad text := trim(coalesce(p_yonetici_ad, ''));
  numara      text := regexp_replace(coalesce(p_telefon, ''), '\D', '', 'g');
  adres       text;
  yeni_id     bigint;
  rol_id      bigint;
  bolge_id    bigint;
  kisi_id     bigint;
  hesap       uuid;
begin
  if isletme_ad = '' then
    raise exception 'İşletme adı gerekiyor.';
  end if;
  if yonetici_ad = '' then
    raise exception 'Adınızı yazın.';
  end if;
  if length(numara) < 10 then
    raise exception 'Telefon numarası eksik görünüyor.';
  end if;
  if length(coalesce(p_sifre, '')) < 6 then
    raise exception 'Şifre en az 6 karakter olmalı.';
  end if;

  adres := hesap_epostasi(numara);
  if exists (select 1 from auth.users where email = adres) then
    raise exception 'Bu telefon numarası zaten kayıtlı. Giriş yapmayı deneyin.';
  end if;

  insert into isletmeler (ad) values (isletme_ad) returning id into yeni_id;

  -- Hazır roller: işletmeci sıfırdan rol kurmak zorunda kalmasın. Sıralama ve
  -- adlar mevcut işletmedekiyle aynı.
  insert into roller (isletme_id, ad, sira, hazir)
  values
    (yeni_id, 'Yönetici', 1, true), (yeni_id, 'Müdür',    2, true),
    (yeni_id, 'Kasa',     3, true), (yeni_id, 'Garson',   4, true),
    (yeni_id, 'İstasyon', 5, true), (yeni_id, 'Kurye',    6, true);

  select id into rol_id from roller where isletme_id = yeni_id and ad = 'Yönetici';

  -- Roller yetkileri dolu geliyor: işletmeci sıfır kutucukla karşılaşmasın,
  -- gerekirse tik kaldırsın. Şablon 2026-08-12-hazir-yetkiler.sql'deki ile aynı.
  -- 'yetkiler' işletmeye bağlı değil, sistemin kendi tanım listesi.
  insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
  select yeni_id, r.id, y.id
    from roller r
    join yetkiler y on
      -- Yönetici ve Müdür her şeyi yapar.
      (r.ad in ('Yönetici', 'Müdür'))
      -- Kasa: satış ve tahsilatın tamamı, kasa günü ve gün sonu; tanım yok.
      or (r.ad = 'Kasa' and y.kod in (
        'siparis.al', 'siparis.urun_cikar', 'siparis.miktar', 'siparis.tasi',
        'siparis.kalem_tasi', 'siparis.gelal', 'siparis.paket', 'siparis.kapali_gor',
        'odeme.al', 'odeme.indirim', 'odeme.indirim_tanimli', 'odeme.acik_hesap',
        'kasa.ac_kapat', 'kasa.gider', 'rapor.gun_sonu'
      ))
      -- Garson sipariş ve ödeme alır. Hesabın tutarını değiştiren her şey
      -- (indirim, ikram, fiyat, iptal) müdürde.
      or (r.ad = 'Garson' and y.kod in (
        'siparis.al', 'siparis.miktar', 'siparis.tasi',
        'siparis.kalem_tasi', 'siparis.gelal', 'siparis.paket',
        'odeme.al'
      ))
      -- Kurye: paket siparişi alır, kapıda tahsilat yapar.
      or (r.ad = 'Kurye' and y.kod in ('siparis.paket', 'odeme.al'))
      -- İstasyon (mutfak, bar, ızgara) satış ekranına girmiyor; yetkisiz başlar.
   where r.isletme_id = yeni_id;

  -- Varsayılan ayar satırı: bütün sütunların kendi varsayılanı var, anahtar
  -- işletmenin kendisi.
  insert into isletme_ayarlari (isletme_id) values (yeni_id);

  -- Ödeme tipleri kurulu geliyor, hepsi tanımlı. Nakit ve kart açık; kalanlar
  -- kapalı duruyor ki tahsilat penceresi dolmasın — işletme kullandıklarını
  -- Ayarlar → Ödeme Tipleri'nden açıyor, sıfırdan tanımlamak zorunda kalmıyor.
  insert into odeme_tipleri (isletme_id, ad, renk, sira, sinif, acik_hesap, aktif, kasaya_girer)
  values
    (yeni_id, 'Nakit',             '#a8d5c2',  1, 'klasik', false, true,  true),
    (yeni_id, 'Kredi Kartı',       '#9fc5d8',  2, 'klasik', false, true,  false),
    (yeni_id, 'Yemek Kartı',       '#c9b8d8',  3, 'klasik', false, false, false),
    (yeni_id, 'Havale / EFT',      '#b8d4a8',  4, 'klasik', false, false, false),
    (yeni_id, 'Açık Hesap',        '#e0c9a6',  5, 'klasik', true,  false, false),
    (yeni_id, 'ÖKC Nakit',         '#a8d5c2',  1, 'okc',    false, false, true),
    (yeni_id, 'ÖKC Kredi Kartı',   '#9fc5d8',  2, 'okc',    false, false, false),
    (yeni_id, 'ÖKC Multinet',      '#c9b8d8',  3, 'okc',    false, false, false),
    (yeni_id, 'ÖKC Sodexo',        '#e8b4b4',  4, 'okc',    false, false, false),
    (yeni_id, 'ÖKC Edenred',       '#d8b8c4',  5, 'okc',    false, false, false),
    (yeni_id, 'ÖKC SetCard',       '#e0c9a6',  6, 'okc',    false, false, false),
    (yeni_id, 'ÖKC Metropol',      '#d4b896',  7, 'okc',    false, false, false),
    (yeni_id, 'ÖKC Paye',          '#b8d4a8',  8, 'okc',    false, false, false),
    (yeni_id, 'ÖKC Havale',        '#9fc5d8',  9, 'okc',    false, false, false);

  insert into birimler (isletme_id, ad, sira, varsayilan)
  values (yeni_id, 'Tam',   1, true),  (yeni_id, 'Yarım', 2, false),
         (yeni_id, 'Adet',  3, false), (yeni_id, 'Kg',    4, false);

  insert into kdv_gruplari (isletme_id, ad, oran, varsayilan, sira)
  values (yeni_id, 'KDV %10', 10, true, 1), (yeni_id, 'KDV %20', 20, false, 2);

  -- Örnek salon: menü tek başına denenemiyor, sipariş bir masaya açılıyor.
  insert into bolgeler (isletme_id, ad, sira) values (yeni_id, 'Salon', 1)
  returning id into bolge_id;

  insert into masalar (isletme_id, bolge_id, ad, sira, kapasite, aktif)
  select yeni_id, bolge_id, 'Masa ' || n, n, 4, true
    from generate_series(1, 6) as n;

  perform ornek_menu_kur(yeni_id);

  insert into personel (isletme_id, ad, telefon, rol_id, aktif, sira)
  values (yeni_id, yonetici_ad, numara, rol_id, true, 1)
  returning id into kisi_id;

  -- Auth hesabı: personel_hesabi_yaz'ın açtığıyla aynı biçim. Orası yetki
  -- sorduğu için buradan çağrılamıyor, kayıt anında henüz kimse yok.
  hesap := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', hesap, 'authenticated', 'authenticated',
    adres, crypt(p_sifre, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
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

  -- Giriş servisi jeton sütunlarında NULL görünce hata veriyor ve giriş
  -- "bilgiler yanlış" gibi görünüyor. Yeni hesapta bunlar boş metin olmalı.
  perform auth_jetonlarini_duzelt(hesap);

  update personel set auth_id = hesap where id = kisi_id;

  return yeni_id;
end $$;

-- Giriş yapmamış ziyaretçi çağırabilmeli — kaydın bütün amacı bu.
grant execute on function isletme_kur(text, text, text, text) to anon, authenticated;

-- Aynı eksik personel hesaplarında da vardı (Personel ekranından açılanlar).
-- Fonksiyonu tek tek düzeltmek yerine kural tabloya bağlanıyor: hangi yoldan
-- açılırsa açılsın yeni hesabın jeton sütunları boş metinle başlıyor.
create or replace function auth_yeni_hesap_duzelt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform auth_jetonlarini_duzelt(new.id);
  return new;
end $$;

drop trigger if exists auth_yeni_hesap_duzelt_trg on auth.users;
create trigger auth_yeni_hesap_duzelt_trg
  after insert on auth.users
  for each row execute function auth_yeni_hesap_duzelt();
