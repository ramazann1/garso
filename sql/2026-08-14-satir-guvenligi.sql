-- Satır güvenliği (RLS).
-- Şimdiye kadar tabloları tarayıcıya gömülü anonim anahtarla okuyorduk; o
-- anahtarı eline geçiren biri başka işletmenin verisini de çekebilirdi.
-- Bundan sonra kuralı veritabanı uyguluyor: kişi yalnızca kendi işletmesinin
-- satırlarını görüyor ve yazabiliyor. Kuralın dayanağı oturum_isletmesi(),
-- o da giriş yapan Auth kullanıcısının personel kaydından işletmeyi buluyor.
--
-- Giriş yapmamış (anonim) bağlantı hiçbir satırı göremiyor: politikalar
-- yalnızca 'authenticated' rolüne veriliyor. Giriş ekranının açılışta ihtiyaç
-- duyduğu iki bilgi ayrı fonksiyonlarla veriliyor (aşağıda).

-- 1) İşletmeye bağlı tablolar --------------------------------------------

do $$
declare
  t text;
  tablolar text[] := array[
    'adisyonlar', 'turlar', 'adisyon_kalemleri', 'tahsilatlar',
    'bolgeler', 'masalar',
    'kategoriler', 'urunler', 'urun_kategorileri', 'porsiyonlar',
    'secenek_gruplari', 'secenekler', 'porsiyon_secenek_gruplari',
    'birimler', 'kdv_gruplari', 'menu_gruplari', 'menu_satirlari',
    'odeme_tipleri', 'indirim_tanimlari', 'isletme_ayarlari',
    'roller', 'rol_yetkileri', 'personel', 'personel_bolgeleri', 'personel_yetkileri'
  ];
begin
  foreach t in array tablolar loop
    if to_regclass(t) is null then
      raise notice 'Tablo bulunamadı, atlandı: %', t;
      continue;
    end if;

    -- Yeni satırın işletmesini artık veritabanı yazıyor. Kod tarafında 25
    -- ekleme noktasını tek tek düzeltmek yerine kural tek yerde duruyor;
    -- böylece unutulan bir yer hatalı işletmeye düşemiyor.
    execute format('alter table %I alter column isletme_id set default oturum_isletmesi()', t);

    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_isletme', t);
    execute format(
      'create policy %I on %I for all to authenticated
         using (isletme_id = oturum_isletmesi())
         with check (isletme_id = oturum_isletmesi())',
      t || '_isletme', t
    );
  end loop;
end $$;

-- 2) İşletmenin kendi satırı ---------------------------------------------

alter table isletmeler enable row level security;

drop policy if exists isletmeler_kendi on isletmeler;
create policy isletmeler_kendi on isletmeler for select to authenticated
  using (id = oturum_isletmesi());

-- Adını Ayarlar'dan değiştirmek için; yeni işletme açmak buradan yapılmıyor.
drop policy if exists isletmeler_duzenle on isletmeler;
create policy isletmeler_duzenle on isletmeler for update to authenticated
  using (id = oturum_isletmesi())
  with check (id = oturum_isletmesi());

-- 3) Ortak tanım listesi --------------------------------------------------
-- 'yetkiler' sistemin kendi listesi (indirim yapabilir, adisyon iptal
-- edebilir...); her işletmede aynı, işletmeye bağlı değil. Okunur ama
-- programdan değiştirilemez.

alter table yetkiler enable row level security;

drop policy if exists yetkiler_oku on yetkiler;
create policy yetkiler_oku on yetkiler for select to authenticated using (true);

-- 4) Giriş ekranının açılışta sorduğu soru --------------------------------
-- "Hiç hesap açılmış mı?" — açılmamışsa ilk kurulumdur ve program giriş
-- ekranını koymadan açılıyor. Bu soru giriş yapmadan sorulduğu için
-- politikaların dışında, tanımlayıcı yetkisiyle çalışan bir fonksiyon.

create or replace function giris_kuruldu()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from personel where auth_id is not null);
$$;

grant execute on function giris_kuruldu() to anon, authenticated;
grant execute on function eposta_hesabi(text) to anon, authenticated;

-- Numara bütün sistemde tek olmak zorunda: giriş adresi ondan üretiliyor
-- (05551112233@garso.app) ve iki işletmede aynı numara olursa ikinci hesap
-- açılamıyor. Personel ekranı bunu kaydetmeden önce sorabilsin diye, kendi
-- işletmesinin dışına bakabilen ama yalnızca evet/hayır dönen bir fonksiyon.
create or replace function telefon_kullanimda(p_telefon text, p_haric bigint default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from personel
     where telefon = regexp_replace(p_telefon, '\D', '', 'g')
       and (p_haric is null or id <> p_haric)
  );
$$;

grant execute on function telefon_kullanimda(text, bigint) to authenticated;

-- 5) İşletme ayarları artık işletme başına bir satır -----------------------
-- Tablo "tek satır var, id = 1" varsayımıyla kurulmuştu. Çok işletmeli yapıda
-- her işletmenin kendi ayar satırı oluyor; anahtar isletme_id.

alter table isletme_ayarlari drop constraint if exists isletme_ayarlari_tek_satir;
alter table isletme_ayarlari drop column if exists id;
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'isletme_ayarlari'::regclass and contype = 'p'
  ) then
    alter table isletme_ayarlari add primary key (isletme_id);
  end if;
end $$;

-- Ayar satırı olmayan işletme kalmasın; program açılışta okumaya çalışıyor.
insert into isletme_ayarlari (isletme_id)
select i.id from isletmeler i
 where not exists (select 1 from isletme_ayarlari a where a.isletme_id = i.id);
