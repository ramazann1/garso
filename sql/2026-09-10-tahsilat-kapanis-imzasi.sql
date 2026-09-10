-- Ödemeyi alan ve hesabı kapatan kişi.
--
-- Adisyonun zaman çizelgesinde "kim" sütunu açılış ve ürün girme satırlarında
-- doluydu, ödeme ve kapanış satırlarında boştu: o iki bilgi hiçbir yerde
-- tutulmuyordu. Oysa "bu tahsilatı kim aldı" sorusu, siparişi kimin girdiğinden
-- daha çok sorulan bir soru — eksik kasa aranırken bakılan yer burası.
--
-- İmza 2026-09-05'teki kuralın aynısıyla atılıyor: dışarıdan ne gelirse gelsin
-- sunucu oturum_personeli() ile eziyor, kayıt duruyorken de değiştirilemiyor.
-- Böylece kendi aldığı tahsilatı başkasının üstüne yazan bir istek işe yaramaz.

alter table tahsilatlar
  add column if not exists kisi_id bigint references personel (id) on delete set null;

alter table adisyonlar
  add column if not exists kapatan_id bigint references personel (id) on delete set null;

-- 1) Ödemeyi alan ----------------------------------------------------------

create or replace function tahsilat_imzasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.kisi_id := oturum_personeli();
  else
    new.kisi_id := old.kisi_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tahsilat_imza_tetik on tahsilatlar;
create trigger tahsilat_imza_tetik before insert or update on tahsilatlar
  for each row execute function tahsilat_imzasi();

-- 2) Hesabı kapatan --------------------------------------------------------
--
-- Kasa vardiyasındaki kapatan imzasının aynısı: kapanış saati ilk kez
-- yazıldığında konuyor, sonraki güncellemelerde donuyor. Adisyon yeniden aktif
-- edilirse kapanış boşalıyor, imza da onunla birlikte siliniyor — hesap
-- yeniden kapatıldığında o seferki kişi yazılsın diye.
--
-- Not: adisyonun açanını yazan tetikleyici (adisyon_imza_tetik) ayrı duruyor,
-- ikisi birbirinin alanına dokunmuyor.

create or replace function adisyon_kapanis_imzasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.kapatan_id := null;
  elsif new.kapanis is null then
    new.kapatan_id := null;
  elsif old.kapanis is null then
    new.kapatan_id := oturum_personeli();
  else
    new.kapatan_id := old.kapatan_id;
  end if;
  return new;
end;
$$;

drop trigger if exists adisyon_kapanis_imza_tetik on adisyonlar;
create trigger adisyon_kapanis_imza_tetik before insert or update on adisyonlar
  for each row execute function adisyon_kapanis_imzasi();
