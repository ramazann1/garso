-- İşletme kodu ve adın kilitlenmesi.
--
-- Ürün satılmaya başlayınca her işletmenin değişmeyen bir kimliği olmalı:
-- destek isteyen "kodum 15042" diyebilsin, kayıtlar hangi işletmeye ait
-- olduğunu ad değişse bile taşısın. Tablonun `id` sütunu bu iş için uygun
-- değil — o iç numaralandırma, dışarıya verilmez.
--
-- Kod 15000'den başlıyor: müşteriye verilen numara "1" gibi görünmesin.

create sequence if not exists isletme_kod_dizisi start with 15000;

alter table isletmeler add column if not exists kod bigint;

-- Mevcut işletmeler açılış sırasına göre numaralanıyor.
update isletmeler set kod = nextval('isletme_kod_dizisi')
 where kod is null;

alter table isletmeler alter column kod set default nextval('isletme_kod_dizisi');
alter table isletmeler alter column kod set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'isletmeler_kod_tekil'
  ) then
    alter table isletmeler add constraint isletmeler_kod_tekil unique (kod);
  end if;
end $$;

-- İşletme adı ve kodu artık programdan değiştirilemiyor. Güncelleme kuralı
-- tamamen kalkıyor: arayüzü atlayıp doğrudan istek gönderen biri de
-- değiştiremesin. Ad düzeltmesi gerekirse buradan, elle yapılıyor.
drop policy if exists isletmeler_duzenle on isletmeler;
