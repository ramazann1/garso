-- "Kim yaptı" imzası artık sunucuda atılıyor.
--
-- Adisyonu açan, siparişi giren ve kasayı açıp kapatan kişi bugüne kadar
-- tarayıcının gönderdiği değerle yazılıyordu. Tarayıcıdaki kod kurcalanabilir:
-- kendi girdiği siparişi başkasının üstüne yazan bir istek göndermek yeterdi.
-- Personel raporu, ciro sorumluluğu ve iptal takibi bu imzaya dayandığı için
-- imzanın atıldığı yer önemli.
--
-- Kural basit: dışarıdan ne gelirse gelsin bu sütunlar oturum_personeli() ile
-- eziliyor. O fonksiyon PIN'le geçilen kişiyi de biliyor (2026-08-30), yani
-- ortak kasada gün içinde başa geçen kişi doğru yazılıyor.
--
-- Kayıt duruyorken imza da değiştirilemiyor: güncellemede eski değer geri
-- yazılıyor. Kasanın kapatanı bunun istisnası — o zaten kapanış anında konuyor.

-- 1) Adisyonu açan ---------------------------------------------------------

create or replace function adisyon_imzasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.acan_id := oturum_personeli();
  else
    new.acan_id := old.acan_id;
  end if;
  return new;
end;
$$;

drop trigger if exists adisyon_imza_tetik on adisyonlar;
create trigger adisyon_imza_tetik before insert or update on adisyonlar
  for each row execute function adisyon_imzasi();

-- 2) Siparişi giren --------------------------------------------------------

create or replace function tur_imzasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.garson_id := oturum_personeli();
  else
    new.garson_id := old.garson_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tur_imza_tetik on turlar;
create trigger tur_imza_tetik before insert or update on turlar
  for each row execute function tur_imzasi();

-- 3) Kasayı açan ve kapatan ------------------------------------------------
--
-- Açan yalnız eklemede konuyor. Kapatan, kapanış saati ilk kez yazıldığında
-- konuyor; onun dışındaki güncellemelerde ikisi de dondurulmuş kalıyor.

create or replace function vardiya_imzasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.acan_id := oturum_personeli();
    new.kapatan_id := null;
  else
    new.acan_id := old.acan_id;
    if old.kapanis is null and new.kapanis is not null then
      new.kapatan_id := oturum_personeli();
    else
      new.kapatan_id := old.kapatan_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vardiya_imza_tetik on kasa_vardiyalari;
create trigger vardiya_imza_tetik before insert or update on kasa_vardiyalari
  for each row execute function vardiya_imzasi();

-- 4) Kasaya para giren-çıkaran ---------------------------------------------
--
-- Kasa hareketi (giriş/çıkış) elle girilen para demek; en çok denetlenen yer
-- burası. İmzası da diğerleriyle aynı kuralda.

create or replace function hareket_imzasi()
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

drop trigger if exists hareket_imza_tetik on kasa_hareketleri;
create trigger hareket_imza_tetik before insert or update on kasa_hareketleri
  for each row execute function hareket_imzasi();
