-- PIN ile kişi değiştirme sunucuya taşınıyor.
--
-- Kasa ortak bir terminal: giriş bir kere yapılıyor, gün boyu başındaki kişi
-- PIN ile değişiyor. Bugüne kadar bu değişim yalnız tarayıcıda oluyordu —
-- ekranlar doğru kişiyi görüyor ama veritabanı hâlâ kasayı açan kişiyi
-- görüyordu. Yani 2026-08-28'de yazdığımız yetki tetikleyicileri, PIN'le
-- geçen kişiyi değil ilk gireni denetliyordu; son emniyet katmanı boşa
-- çıkıyordu.
--
-- İkinci sorun: PIN'i tarayıcı doğruluyordu (personel tablosunu okuyup özeti
-- karşılaştırarak). Kurcalanmış bir tarayıcı istediği kişiye geçebilirdi.
-- Artık doğrulama burada; dışarıya yalnız "oldu / olmadı" dönüyor.

-- PIN özetini veritabanı alacak; SHA-256 pgcrypto'dan geliyor.
create extension if not exists pgcrypto with schema extensions;

-- 1) Bu bilette şu an kim çalışıyor ----------------------------------------
--
-- Kimlik bileti kasayı açan hesapta kalıyor, kişi burada tutuluyor. Bağlantılar
-- havuzdan geldiği için oturum değişkeni (set_config) işe yaramıyor: bir sonraki
-- istek başka bağlantıya düşüyor ve değişken orada yok. Kayıt tabloda duruyor.
create table if not exists oturum_kisileri (
  auth_id     uuid primary key,
  personel_id bigint not null references personel (id) on delete cascade,
  guncelleme  timestamptz not null default now()
);

-- Dışarıya tamamen kapalı: satır güvenliği açık ve hiçbir politika yok, yani
-- anon/authenticated bağlantı okuyamıyor da yazamıyor da. Yalnızca aşağıdaki
-- security definer fonksiyonlar dokunuyor.
alter table oturum_kisileri enable row level security;
revoke all on oturum_kisileri from anon, authenticated;

-- 2) Şu an kim -------------------------------------------------------------
--
-- Tek kaynak. PIN'le geçilmişse o kişi, geçilmemişse bileti alan kişi.
create or replace function oturum_personeli()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(
    (select ok.personel_id
       from oturum_kisileri ok
       join personel p on p.id = ok.personel_id
      where ok.auth_id = auth.uid()
        and p.aktif
        and not p.giris_engelli),
    (select id from personel where auth_id = auth.uid())
  );
$$;

-- 3) Yetki artık bilete değil kişiye bakıyor -------------------------------
--
-- Kural aynı: temel rolden gelir, kişiye özel satır varsa onu ezer
-- (yetkiler.ts'teki etkinYetkiler ile aynı). Değişen yalnız "hangi kişi".
create or replace function oturum_yetkisi(kod text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select py.izin
       from personel p
       join yetkiler y on y.kod = oturum_yetkisi.kod
       join personel_yetkileri py on py.personel_id = p.id and py.yetki_id = y.id
      where p.id = oturum_personeli()),
    (select true
       from personel p
       join yetkiler y on y.kod = oturum_yetkisi.kod
       join rol_yetkileri ry on ry.rol_id = p.rol_id and ry.yetki_id = y.id
      where p.id = oturum_personeli()),
    false
  );
$$;

-- 4) PIN ile geçiş ---------------------------------------------------------
--
-- PIN programı açan bir anahtar değil: zaten açık olan oturumun başındaki
-- kişiyi değiştiriyor. Onun için aranan kişi biletin kendi işletmesinden
-- çıkıyor — başka işletmenin personeline geçilemiyor.
--
-- Özet tarayıcıdakiyle aynı yöntemle alınıyor (SHA-256, onaltılık): mevcut
-- pin_hash değerleri olduğu gibi geçerli kalıyor.
create or replace function pin_ile_gec(pin text)
returns bigint language plpgsql volatile security definer set search_path = public as $$
declare
  isletme bigint;
  bulunan bigint;
begin
  if auth.uid() is null then
    raise exception 'Oturum yok.' using errcode = '42501';
  end if;

  select isletme_id into isletme from personel where auth_id = auth.uid();
  if isletme is null then
    raise exception 'Oturum yok.' using errcode = '42501';
  end if;

  select id into bulunan
    from personel
   where isletme_id = isletme
     and pin_hash = encode(extensions.digest(pin, 'sha256'), 'hex')
     and aktif
     and not giris_engelli
   limit 1;

  -- Yanlış PIN'de kim olmadığı söylenmiyor, yalnız olmadığı söyleniyor.
  if bulunan is null then
    raise exception 'PIN doğru değil.' using errcode = '42501';
  end if;

  insert into oturum_kisileri (auth_id, personel_id)
  values (auth.uid(), bulunan)
  on conflict (auth_id) do update
    set personel_id = excluded.personel_id, guncelleme = now();

  return bulunan;
end;
$$;

-- 5) Kişi kaydını bırakma --------------------------------------------------
--
-- Çıkışta ve yeni girişte çağrılıyor: bilet başkasına devredildiğinde eski
-- kişinin yetkisi devralınmasın.
create or replace function oturum_kisisini_birak()
returns void language sql volatile security definer set search_path = public as $$
  delete from oturum_kisileri where auth_id = auth.uid();
$$;

grant execute on function pin_ile_gec(text) to authenticated;
grant execute on function oturum_kisisini_birak() to authenticated;
