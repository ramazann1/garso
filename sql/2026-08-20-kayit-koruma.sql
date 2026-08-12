-- Kayıt ekranına kötüye kullanım koruması.
--
-- `isletme_kur` internete açık tek uç: giriş yapmamış herkes çağırabiliyor,
-- çünkü kaydın anlamı bu. Sınır olmayınca aynı yerden arka arkaya yüzlerce
-- işletme açılabiliyor.
--
-- Sınır IP'ye göre kuruluyor. Telefon numarasına göre olmaz: kayıt olan her
-- seferinde başka numara yazar. IP tek gerçek ortak nokta.
--
-- Yalnız BAŞARILI kayıtlar sayılıyor. Hatalı denemeyi de saymak isterdik ama
-- kurulum hata verdiğinde işlemin tamamı geri alınıyor, deftere yazılan satır
-- da onunla birlikte siliniyor. Engellemek istediğimiz şey zaten toplu işletme
-- açma; o da başarılı kayıt demek.

create table if not exists kayit_denemeleri (
  id       bigserial primary key,
  ip       text        not null,
  telefon  text        not null,
  isletme  text        not null,
  zaman    timestamptz not null default now()
);

create index if not exists kayit_denemeleri_ip_idx on kayit_denemeleri (ip, zaman desc);

-- Defteri kimse okumasın: satır güvenliği açık ve hiçbir politika yok. Yalnız
-- güvenliği aşarak çalışan kurulum fonksiyonu yazabiliyor.
alter table kayit_denemeleri enable row level security;
revoke all on kayit_denemeleri from anon, authenticated;

-- İsteği yapanın IP'si başlıklarda geliyor. Başlık "istemci, vekil, vekil"
-- biçiminde bir liste olabiliyor; SONDAKİ değer araya giren sunucunun kendi
-- yazdığı değer olduğu için en güvenilir olan o. Başlık hiç yoksa herkes aynı
-- kovaya düşüyor — sınır sıkılaşır, açılmaz.
create or replace function istek_ip()
returns text language plpgsql stable as $$
declare
  basliklar json;
  liste     text;
begin
  begin
    basliklar := current_setting('request.headers', true)::json;
  exception when others then
    return 'bilinmiyor';
  end;

  if basliklar is null then
    return 'bilinmiyor';
  end if;

  liste := coalesce(
    basliklar ->> 'cf-connecting-ip',
    basliklar ->> 'x-real-ip',
    basliklar ->> 'x-forwarded-for'
  );

  if liste is null or trim(liste) = '' then
    return 'bilinmiyor';
  end if;

  return trim((string_to_array(liste, ','))[array_length(string_to_array(liste, ','), 1)]);
end $$;

-- Kapı önü kontrolü. Kurulum başlamadan önce çağrılıyor; sınır aşıldıysa
-- kurulum hiç başlamıyor.
create or replace function kayit_sinirini_kontrol_et()
returns void language plpgsql security definer set search_path = public as $$
declare
  -- Tabloda da 'ip' adında bir sütun var; değişken adı ayrı olmalı.
  gelen_ip text := istek_ip();
begin
  -- Defter şişmesin: bir aydan eski satırlar bir işe yaramıyor.
  delete from kayit_denemeleri where zaman < now() - interval '30 days';

  if (select count(*) from kayit_denemeleri
       where ip = gelen_ip
         and zaman > now() - interval '24 hours') >= 2 then
    raise exception 'Bugün bu bağlantıdan çok fazla işletme kaydı yapıldı. Yarın tekrar deneyin.';
  end if;

  if (select count(*) from kayit_denemeleri
       where ip = gelen_ip
         and zaman > now() - interval '7 days') >= 5 then
    raise exception 'Bu bağlantıdan çok fazla işletme kaydı yapıldı. Bir süre sonra tekrar deneyin.';
  end if;
end $$;

create or replace function kayit_denemesi_yaz(p_telefon text, p_isletme text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into kayit_denemeleri (ip, telefon, isletme)
  values (istek_ip(), p_telefon, p_isletme);
end $$;

-- Kurulumun gövdesi olduğu gibi kalıyor, yalnız adı değişiyor: dışarıya bakan
-- kapı artık önce sınıra bakan yeni `isletme_kur`. İki yüz satırlık kurulumu
-- kopyalamamak için bu yol seçildi.
do $$
begin
  if not exists (
    select 1 from pg_proc where proname = 'isletme_kur_uygula'
  ) then
    alter function isletme_kur(text, text, text, text) rename to isletme_kur_uygula;
  end if;
end $$;

-- Gövde artık dışarıdan çağrılamıyor; çağrılabilseydi sınır atlanırdı.
revoke all on function isletme_kur_uygula(text, text, text, text) from anon, authenticated, public;

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
  perform kayit_sinirini_kontrol_et();

  yeni_id := isletme_kur_uygula(p_isletme_ad, p_yonetici_ad, p_telefon, p_sifre);

  perform kayit_denemesi_yaz(p_telefon, p_isletme_ad);

  return yeni_id;
end $$;

-- Giriş yapmamış ziyaretçi çağırabilmeli — kaydın bütün amacı bu.
grant execute on function isletme_kur(text, text, text, text) to anon, authenticated;
