-- Yetkilerin veritabanı tarafında da işletilmesi.
--
-- Bugüne kadar yetki yalnızca arayüzde soruluyordu: düğme gizleniyor, kayıt
-- yine de yazılabiliyordu. Tarayıcıya gömülü anahtarla istek atan biri (ya da
-- adres çubuğuna elle yazan bir personel) ödemeyi kaydedebilir, kalemi
-- silebilirdi. Satır güvenliği işletmeyi ayırıyor ama işletme içinde kimin ne
-- yapabileceğini sormuyordu.
--
-- Kural artık veritabanında: para ve hesap tutarını değiştiren her yazma
-- işlemi tetikleyicilerden geçiyor, yetkisi olmayan istek hata alıyor.
-- Dayanağı `oturum_yetkisi(kod)` — rolden gelen yetkiyi kişiye özel satır
-- eziyor, arayüzdeki kuralın aynısı.

-- Yetki yoksa işlemi durduran ortak yardımcı. auth.uid() boşken (SQL
-- düzenleyicisi, kurulum betikleri, service_role ile yapılan bakım) denetim
-- yapılmıyor: oradaki iş zaten yönetimin kendi işi, engellenirse kurulum
-- yapılamaz hale gelir.
create or replace function yetki_iste(kod text, mesaj text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not oturum_yetkisi(kod) then
    raise exception '%', mesaj using errcode = '42501';
  end if;
end;
$$;

-- 1) Para hareketleri -------------------------------------------------------

create or replace function tahsilat_yetkisi()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  acik_hesap_tipi boolean;
begin
  if tg_op = 'DELETE' then
    -- Alınmış ödemeyi geri almak iade; ekranda sebep de soruluyor.
    perform yetki_iste('odeme.iade', 'Ödeme iadesi yetkiniz yok.');
    return old;
  end if;

  perform yetki_iste('odeme.al', 'Ödeme alma yetkiniz yok.');

  -- Açık hesap kasaya para getirmiyor, birinin borcuna yazıyor: ayrı yetki.
  select acik_hesap into acik_hesap_tipi
    from odeme_tipleri
   where ad = new.tip and isletme_id = oturum_isletmesi()
   limit 1;

  if coalesce(acik_hesap_tipi, false) then
    perform yetki_iste('odeme.acik_hesap', 'Açık hesaba aktarma yetkiniz yok.');
  end if;

  -- Kapanmış hesabın ödeme tipini sonradan değiştirmek kendi yetkisinde.
  if tg_op = 'UPDATE' and new.tip is distinct from old.tip then
    perform yetki_iste('odeme.tip_duzelt', 'Ödeme tipini düzeltme yetkiniz yok.');
  end if;

  return new;
end;
$$;

drop trigger if exists tahsilat_yetkisi on tahsilatlar;
create trigger tahsilat_yetkisi
  before insert or update or delete on tahsilatlar
  for each row execute function tahsilat_yetkisi();

-- 2) Adisyon kalemleri ------------------------------------------------------

create or replace function kalem_yetkisi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform yetki_iste('siparis.urun_cikar', 'Kaydedilmiş ürünü çıkarma yetkiniz yok.');
    return old;
  end if;

  -- Yeni kalem sipariş almanın kendisi. Hangi türü aldığı adisyonun kendi
  -- kaydında denetlendiği için burada üç yetkiden biri yetiyor; ayrıntılı
  -- denetim güncellemede.
  if tg_op = 'INSERT' then
    if not (
      oturum_yetkisi('siparis.al')
      or oturum_yetkisi('siparis.gelal')
      or oturum_yetkisi('siparis.paket')
    ) then
      perform yetki_iste('siparis.al', 'Sipariş alma yetkiniz yok.');
    end if;
    return new;
  end if;

  if new.adet is distinct from old.adet then
    perform yetki_iste('siparis.miktar', 'Miktar değiştirme yetkiniz yok.');
  end if;

  if new.fiyat is distinct from old.fiyat then
    perform yetki_iste('siparis.fiyat', 'Ürün fiyatı değiştirme yetkiniz yok.');
  end if;

  if new.durum is distinct from old.durum then
    if new.durum = 'ikram' then
      perform yetki_iste('siparis.ikram', 'İkram yapma yetkiniz yok.');
    elsif new.durum = 'iptal' then
      -- Kalem iptali ekranda "üründen çıkarma" yetkisiyle aynı düğmede;
      -- kalem silinmiyor, iptal olarak duruyor ama karar aynı karar.
      perform yetki_iste('siparis.urun_cikar', 'Kalem iptal etme yetkiniz yok.');
    end if;
  end if;

  -- Satır indirimi hesabın tutarını düşürüyor; indirim yetkisine bağlı.
  if coalesce(new.indirim, 0) is distinct from coalesce(old.indirim, 0) then
    if not (oturum_yetkisi('odeme.indirim') or oturum_yetkisi('odeme.indirim_tanimli')) then
      perform yetki_iste('odeme.indirim', 'İndirim yapma yetkiniz yok.');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists kalem_yetkisi on adisyon_kalemleri;
create trigger kalem_yetkisi
  before insert or update or delete on adisyon_kalemleri
  for each row execute function kalem_yetkisi();

-- 3) Adisyonun kendisi ------------------------------------------------------

create or replace function adisyon_yetkisi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Masasız siparişin kendi yetkisi var: kurye paket alır ama masaya
    -- sipariş girmez, ondan "sipariş alma" beklenmiyor.
    if new.tip = 'gelal' then
      perform yetki_iste('siparis.gelal', 'Gel al siparişi alma yetkiniz yok.');
    elsif new.tip = 'paket' then
      perform yetki_iste('siparis.paket', 'Paket siparişi alma yetkiniz yok.');
    else
      perform yetki_iste('siparis.al', 'Sipariş alma yetkiniz yok.');
    end if;
    return new;
  end if;

  if coalesce(new.indirim, 0) is distinct from coalesce(old.indirim, 0) then
    if not (oturum_yetkisi('odeme.indirim') or oturum_yetkisi('odeme.indirim_tanimli')) then
      perform yetki_iste('odeme.indirim', 'İndirim yapma yetkiniz yok.');
    end if;
  end if;

  if new.durum is distinct from old.durum then
    if new.durum = 'iptal' then
      perform yetki_iste('siparis.iptal', 'Adisyon iptal etme yetkiniz yok.');
    elsif new.durum = 'acik' and old.durum <> 'acik' then
      perform yetki_iste('siparis.aktif_et', 'Kapanmış adisyonu yeniden açma yetkiniz yok.');
    end if;
  end if;

  -- Borcu birine yazarak kapatmak ayrı bir karar; kapanışta bu iki alan dolar.
  if coalesce(new.eksik_kisi, '') is distinct from coalesce(old.eksik_kisi, '') then
    perform yetki_iste('odeme.eksik_kapat', 'Eksik tahsilatla hesap kapatma yetkiniz yok.');
  end if;

  return new;
end;
$$;

drop trigger if exists adisyon_yetkisi on adisyonlar;
create trigger adisyon_yetkisi
  before insert or update on adisyonlar
  for each row execute function adisyon_yetkisi();
