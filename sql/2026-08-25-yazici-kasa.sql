-- Yazıcı hangi kasaya bağlı.
--
-- USB yazıcı yalnız takılı olduğu bilgisayardan basabiliyor, ama kuyruktaki iş
-- "hangi kasa basacak" diye işaretlenmiyordu: iki kasalı işletmede fişi yanlış
-- köprü kapıyor ve basamıyordu. Alanı boş kalan yazıcı eskisi gibi çalışıyor —
-- ağ yazıcısına her kasa ulaşabildiği için orada bağlamanın anlamı yok.

alter table yazicilar add column if not exists cihaz text;

comment on column yazicilar.cihaz is
  'Bu yazıcıya yalnız bu cihazdaki köprü basar; boşsa hangi köprü önce alırsa o basar.';

-- Postgres var olan işlevin dönüş tipine dokunmaya izin vermiyor; işlev önce
-- siliniyor, hemen altında aynı adla yeniden yazılıyor.
drop function if exists kuyruktan_al(text, int);

create function kuyruktan_al(p_cihaz text, p_adet int default 5)
returns table (id bigint, icerik text, yazici_id bigint)
language plpgsql
as $$
begin
  return query
  with secilen as (
    select k.id
    from yazdirma_kuyrugu k
    join yazicilar y on y.id = k.yazici_id
    where k.durum = 'bekliyor'
      and k.yazici_id is not null
      -- Kasasına bağlanmış yazıcının işini başka köprü almıyor.
      and (y.cihaz is null or y.cihaz = p_cihaz)
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
