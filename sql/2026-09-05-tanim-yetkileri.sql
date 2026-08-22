-- Tanım tabloları da yetki soruyor.
--
-- 28 Ağu'da para ve hesap tarafı sunucuya bağlanmıştı: tahsilat, kalem ve
-- adisyon yazarken yetki soruluyor. Tanım tarafı dışarıda kalmıştı — menü,
-- masa, ayar, yazıcı ve personel tabloları yalnızca "aynı işletmeden mi" diye
-- bakıyordu. İşletmeye giriş yapmış herkes o tablolara yazabiliyordu.
--
-- Ekrandaki koruma burada yetmiyor: personel ekranı garsona kapalı ama
-- tarayıcının geliştirici konsolundan aynı isteği atmak serbestti. En ağırı
-- personel tablosuydu — kendi rolünü yönetici yapan bir satır, geri kalan
-- bütün yetkileri açardı.
--
-- Yetki kodları arayüzdekilerle aynı (rotaYetkileri.ts): hangi ekrandan
-- yönetiliyorsa o ekranın yetkisi.

-- Ortak tetikleyici. Yetki kodu ile hata mesajı tetikleyici tanımında
-- veriliyor, böylece her tablo için ayrı fonksiyon yazmak gerekmiyor.
create or replace function tanim_yetkisi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform yetki_iste(tg_argv[0], tg_argv[1]);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Tabloyu yetkisine bağlayan yardımcı; aşağıdaki liste bunu çağırıyor.
create or replace function tanim_yetkisi_bagla(tablo text, kod text, mesaj text)
returns void language plpgsql as $$
begin
  if to_regclass(tablo) is null then
    raise notice 'Tablo bulunamadı, atlandı: %', tablo;
    return;
  end if;
  execute format('drop trigger if exists %I on %I', tablo || '_yetki', tablo);
  execute format(
    'create trigger %I before insert or update or delete on %I
       for each row execute function tanim_yetkisi(%L, %L)',
    tablo || '_yetki', tablo, kod, mesaj
  );
end;
$$;

do $$
declare
  s record;
begin
  for s in
    select * from (values
      -- Menü ------------------------------------------------------------
      ('kategoriler',               'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('urunler',                   'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('urun_kategorileri',         'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('porsiyonlar',               'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('secenek_gruplari',          'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('secenekler',                'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('porsiyon_secenek_gruplari', 'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('birimler',                  'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('kdv_gruplari',              'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('menu_gruplari',             'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),
      ('menu_satirlari',            'tanim.menu',     'Menüyü düzenleme yetkiniz yok.'),

      -- Masa ve bölge ----------------------------------------------------
      ('bolgeler',                  'tanim.masa',     'Masa düzenini değiştirme yetkiniz yok.'),
      ('masalar',                   'tanim.masa',     'Masa düzenini değiştirme yetkiniz yok.'),

      -- İşletme ayarları --------------------------------------------------
      ('isletme_ayarlari',          'tanim.ayar',     'Ayarları değiştirme yetkiniz yok.'),
      ('odeme_tipleri',             'tanim.ayar',     'Ayarları değiştirme yetkiniz yok.'),
      ('indirim_tanimlari',         'tanim.ayar',     'Ayarları değiştirme yetkiniz yok.'),
      ('odenmezler',                'tanim.odenmez',  'İkram listesini düzenleme yetkiniz yok.'),

      -- Personel ve yetkiler ----------------------------------------------
      --
      -- Buradaki asıl mesele yetki yükseltme: rolünü ya da yetki satırını
      -- değiştirebilen kişi kendini yönetici yapar. Okuma açık kalıyor
      -- (ekranlar personel adını göstermek için okuyor), yazma kapanıyor.
      ('personel',                  'tanim.personel', 'Personel düzenleme yetkiniz yok.'),
      ('personel_bolgeleri',        'tanim.personel', 'Personel düzenleme yetkiniz yok.'),
      ('personel_yetkileri',        'tanim.personel', 'Yetki düzenleme yetkiniz yok.'),
      ('roller',                    'tanim.personel', 'Yetki düzenleme yetkiniz yok.'),
      ('rol_yetkileri',             'tanim.personel', 'Yetki düzenleme yetkiniz yok.'),

      -- Yazıcı ve istasyon -------------------------------------------------
      ('yazicilar',                 'yazici.yonet',   'Yazıcı ayarlarını değiştirme yetkiniz yok.'),
      ('mutfak_gruplari',           'yazici.yonet',   'İstasyon ayarlarını değiştirme yetkiniz yok.'),
      ('yazici_mutfak_gruplari',    'yazici.yonet',   'Yazıcı ayarlarını değiştirme yetkiniz yok.'),
      ('fis_sablonlari',            'yazici.yonet',   'Fiş tasarımını değiştirme yetkiniz yok.'),

      -- Gider tanımları ----------------------------------------------------
      ('masraf_tipleri',            'kasa.gider',     'Gider düzenleme yetkiniz yok.')
    ) as v(tablo, kod, mesaj)
  loop
    perform tanim_yetkisi_bagla(s.tablo, s.kod, s.mesaj);
  end loop;
end $$;

-- Yardımcı dışarıya kapalı: işletme numarası almıyor ama tetikleyici kurup
-- kaldırabiliyor, giriş yapmış birinin elinde olmasının anlamı yok.
revoke all on function tanim_yetkisi_bagla(text, text, text) from anon, authenticated, public;

-- İlk kurulum istisnası --------------------------------------------------
--
-- İşletme kurulumu anon bağlantıdan geçtiği için yukarıdaki denetim orada
-- zaten çalışmıyor (yetki_iste, auth.uid() boşken geçiyor). Ama hesabı
-- sonradan bağlanan bir kurulumda giriş yapmış ama henüz personel kaydına
-- oturmamış bir kullanıcı olabilir: o anda kimsenin yetkisi yok ve kurulum
-- kendi kendini kilitler. Hiç hesap açılmamışsa personel tarafı serbest.
create or replace function personel_yetkisi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from personel where auth_id is not null) then
    perform yetki_iste(tg_argv[0], tg_argv[1]);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['personel', 'personel_bolgeleri', 'personel_yetkileri', 'roller', 'rol_yetkileri'] loop
    execute format('drop trigger if exists %I on %I', t || '_yetki', t);
    execute format(
      'create trigger %I before insert or update or delete on %I
         for each row execute function personel_yetkisi(%L, %L)',
      t || '_yetki', t, 'tanim.personel', 'Personel ve yetki düzenleme yetkiniz yok.'
    );
  end loop;
end $$;
