-- Köprü kapanırken haber veriyor.
--
-- Eskiden yalnız "buradayım" haberi vardı: program kapatıldığında ekran bunu
-- ancak sessizlik sınırı dolunca (45 saniye) anlıyordu. Kasadaki kişi köprüyü
-- kapatıp ekrana baktığında hâlâ "Çalışıyor" görüyordu. Artık kapanış anında
-- satır işaretleniyor; beklemeye yalnız elektrik kesintisi gibi haber
-- verilemeyen durumlarda ihtiyaç kalıyor.

alter table kopru_cihazlari add column if not exists kapanis timestamptz;

create or replace function kopru_kapandi(p_cihaz text)
returns void
language sql
security invoker
as $$
  update kopru_cihazlari
     set kapanis = now()
   where isletme_id = oturum_isletmesi()
     and cihaz = p_cihaz;
$$;

-- Yeniden açılınca kapanış işareti siliniyor.
create or replace function kopru_bildir(p_cihaz text, p_surum text, p_kisi text)
returns void
language sql
security invoker
as $$
  insert into kopru_cihazlari (cihaz, surum, kisi)
  values (p_cihaz, p_surum, p_kisi)
  on conflict (isletme_id, cihaz) do update
    set son_gorulme = now(),
        kapanis     = null,
        surum       = excluded.surum,
        kisi        = excluded.kisi;
$$;
