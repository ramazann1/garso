-- Kasa ve cari tarafı da yetki soruyor.
--
-- Tanım tablolarıyla aynı boşluk buradaydı: satır güvenliği "aynı işletmeden
-- mi" diye bakıyor, "bunu yapabilir mi" diye sormuyordu. Farkı, buradaki
-- tabloların doğrudan para tutması — kasaya sahte giriş yazmak ya da bir
-- müşterinin borcunu silmek ekran hiç açılmadan mümkündü.
--
-- Yetki kodları arayüzdekilerle aynı.

do $$
declare
  s record;
begin
  for s in
    select * from (values
      ('kasa_vardiyalari',  'kasa.ac_kapat',  'Kasa açma-kapatma yetkiniz yok.'),
      ('kasa_hareketleri',  'kasa.para',      'Kasaya para giriş-çıkış yetkiniz yok.'),
      ('masraflar',         'kasa.gider',     'Gider işleme yetkiniz yok.'),
      ('musteriler',        'cari.duzenle',   'Müşteri düzenleme yetkiniz yok.'),
      ('musteri_adresleri', 'cari.duzenle',   'Müşteri düzenleme yetkiniz yok.')
    ) as v(tablo, kod, mesaj)
  loop
    perform tanim_yetkisi_bagla(s.tablo, s.kod, s.mesaj);
  end loop;
end $$;

-- Cari hareketleri: iki ayrı iş, iki ayrı yetki ----------------------------
--
-- Bu tabloya iki yerden yazılıyor ve ikisi aynı yetki değil:
--
--   satis     — adisyon açık hesaba aktarıldı, borç doğdu. Ödeme ekranından
--               geliyor, garson da yapıyor: yetkisi `odeme.acik_hesap`.
--   tahsilat  — borç kapatılıyor, para giriyor: `cari.tahsilat`.
--   duzeltme  — bakiyeye elle müdahale, en hassası: `cari.tahsilat`.
--   acilis    — müşteri açılırken devir bakiyesi: `cari.duzenle`.
--
-- Hepsini `cari.tahsilat`a bağlasaydık normal satış akışı kırılırdı: açık
-- hesaba yazan garsonun o yetkisi yok.
--
-- Silme borç kaydını yok etmek demek; tahsilat yetkisine bağlı (ödeme
-- silindiğinde ona bağlı borç da düşüyor).

create or replace function cari_hareket_yetkisi()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tip text;
begin
  tip := case when tg_op = 'DELETE' then old.tip else new.tip end;

  if tg_op = 'DELETE' then
    perform yetki_iste('cari.tahsilat', 'Cari hareket silme yetkiniz yok.');
    return old;
  end if;

  case tip
    when 'satis'    then perform yetki_iste('odeme.acik_hesap', 'Açık hesaba yazma yetkiniz yok.');
    when 'acilis'   then perform yetki_iste('cari.duzenle',     'Müşteri düzenleme yetkiniz yok.');
    else                 perform yetki_iste('cari.tahsilat',    'Cari tahsilat yetkiniz yok.');
  end case;

  return new;
end;
$$;

drop trigger if exists cari_hareketler_yetki on cari_hareketler;
create trigger cari_hareketler_yetki before insert or update or delete on cari_hareketler
  for each row execute function cari_hareket_yetkisi();

-- "Kim yaptı" imzaları -----------------------------------------------------
--
-- İkisi de tarayıcıdan geliyordu; 2026-09-05'teki diğer imzalarla aynı kural.

create or replace function cari_imzasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.personel_id := oturum_personeli();
  else
    new.personel_id := old.personel_id;
  end if;
  return new;
end;
$$;

drop trigger if exists cari_imza_tetik on cari_hareketler;
create trigger cari_imza_tetik before insert or update on cari_hareketler
  for each row execute function cari_imzasi();

create or replace function masraf_imzasi()
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

drop trigger if exists masraf_imza_tetik on masraflar;
create trigger masraf_imza_tetik before insert or update on masraflar
  for each row execute function masraf_imzasi();
