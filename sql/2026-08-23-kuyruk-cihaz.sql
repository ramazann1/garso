-- Kasa köprüsünün kuyruğu güvenle tüketmesi için gereken iki işlev.
--
-- Sorun: işletmede iki kasa varsa ikisinde de köprü çalışır. İkisi de aynı anda
-- "bekliyor" satırlarını okursa aynı fiş iki kere basılır. Çözüm: köprü satırı
-- önce üstüne alır (cihaz + alinma yazılır), sonra basar. Alma işi tek bir SQL
-- işleminde ve "for update skip locked" ile yapılıyor — biri satırı almışsa
-- diğeri o satırı hiç görmeden bir sonrakine geçiyor.

alter table yazdirma_kuyrugu add column if not exists cihaz  text;
alter table yazdirma_kuyrugu add column if not exists alinma timestamptz;

-- Fişi basmak isteyen köprü buradan iş alır. Aldığı satırların durumu
-- "bekliyor" kalmaya devam ediyor: köprü basmadan çökerse fiş kaybolmasın,
-- alinma zaman aşımına uğrayınca yeniden dağıtılabilsin.
create or replace function kuyruktan_al(p_cihaz text, p_adet int default 5)
returns table (id bigint, icerik text, yazici_id bigint)
language plpgsql
as $$
begin
  return query
  with secilen as (
    select k.id
    from yazdirma_kuyrugu k
    where k.durum = 'bekliyor'
      and k.yazici_id is not null
      -- Başka bir köprü az önce aldıysa dokunulmuyor; iki dakika geçtiyse o
      -- cihaz basamamış demektir, iş serbest kalıyor.
      and (k.alinma is null or k.alinma < now() - interval '2 minutes')
    order by k.olusturma
    limit greatest(p_adet, 1)
    for update skip locked
  )
  update yazdirma_kuyrugu k
     set cihaz = p_cihaz, alinma = now(), deneme = k.deneme + 1
    from secilen s
   where k.id = s.id
  returning k.id, k.icerik, k.yazici_id;
end;
$$;

-- Basma denemesinin sonucu. Başarısız fiş "basarisiz" olarak duruyor;
-- Yazdırma Kuyruğu ekranından yeniden sıraya alınabiliyor.
create or replace function kuyruk_sonuc(p_id bigint, p_basarili boolean, p_hata text default null)
returns void
language sql
as $$
  update yazdirma_kuyrugu
     set durum   = case when p_basarili then 'basildi' else 'basarisiz' end,
         basilma = case when p_basarili then now() end,
         hata    = case when p_basarili then null else p_hata end,
         alinma  = null
   where id = p_id;
$$;
