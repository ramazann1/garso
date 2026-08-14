-- Para çekmecesi.
--
-- Çekmece kendi başına bir cihaz değil: yazıcının arkasındaki uca takılıyor ve
-- yazıcıya giden kısa bir darbeyle açılıyor. Bu yüzden ayrı bir cihaz tablosu
-- yok — hangi yazıcıya bağlı olduğu yazıcının kendi alanı.
alter table yazicilar add column if not exists cekmece boolean not null default false;

-- Çekmecenin ne zaman kendiliğinden açılacağı. "kasaya giren" ödeme tipiyle
-- (nakit ve benzeri) tahsilat alındığında açılıyor; kartla ödemede çekmecenin
-- açılması hem gereksiz hem güvenlik açığı. İşletme bunu kapatabilsin diye
-- anahtar: bazı yerlerde çekmece yalnız elle açılıyor.
alter table isletme_ayarlari
  add column if not exists cekmece_nakitte_acilsin boolean not null default true;

-- Kuyruğa çekmece işi de düşüyor (tip = 'cekmece', içerik boş). Köprünün fişle
-- çekmeceyi ayırt edebilmesi için alma işlevi artık türü de veriyor.
--
-- Dönen sütunlara yenisi eklendiğinde "create or replace" yetmiyor; PostgreSQL
-- var olan bir işlevin dönüş tipini değiştirmiyor, önce silinmesi gerekiyor.
drop function if exists kuyruktan_al(text, int);

create or replace function kuyruktan_al(p_cihaz text, p_adet int default 5)
returns table (id bigint, icerik text, yazici_id bigint, tip text)
language plpgsql
as $$
begin
  -- Bekleyen çekmece işinin ömrü kısa: yazıcı kapalıyken sıraya giren darbe
  -- yarım saat sonra basılırsa kasa durup dururken açılıyor. Fişte durum tersi,
  -- o yüzden yalnız çekmece işleri düşüyor.
  -- Sütunlar tablo adıyla yazılıyor: işlevin döndürdüğü sütunlarla aynı adı
  -- taşıdıkları için sade yazıldığında hangisi olduğu belirsiz kalıyor.
  update yazdirma_kuyrugu k
     set durum = 'iptal', hata = 'Çekmece zamanında açılamadı.'
   where k.tip = 'cekmece'
     and k.durum = 'bekliyor'
     and k.olusturma < now() - interval '5 minutes';

  return query
  with secilen as (
    select k.id
    from yazdirma_kuyrugu k
    where k.durum = 'bekliyor'
      and k.yazici_id is not null
      and (k.alinma is null or k.alinma < now() - interval '2 minutes')
    order by k.olusturma
    limit greatest(p_adet, 1)
    for update skip locked
  )
  update yazdirma_kuyrugu k
     set cihaz = p_cihaz, alinma = now(), deneme = k.deneme + 1
    from secilen s
   where k.id = s.id
  returning k.id, k.icerik, k.yazici_id, k.tip;
end;
$$;
