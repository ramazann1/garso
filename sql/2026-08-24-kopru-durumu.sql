-- Kasa köprüsünün kendini haber vermesi.
--
-- Köprü kasadaki bilgisayarda sessizce çalışıyor; şu ana kadar açık mı kapalı mı
-- olduğunu anlamanın tek yolu o bilgisayarın başına gitmekti. Artık açılırken ve
-- düzenli aralıkla bu tabloya dokunuyor, Bağlantı Durumu ekranı da son dokunuşun
-- ne zaman olduğuna bakıp "çalışıyor" ya da "ulaşılamıyor" diyor.
create table if not exists kopru_cihazlari (
  isletme_id  bigint not null references isletmeler (id) on delete cascade,
  -- Cihazın kendi ürettiği kimlik (bilgisayar adı); iki kasa birbirine karışmasın.
  cihaz       text not null,
  surum       text,
  -- Köprüyü hangi personel hesabıyla girildiyse o; "kim bastı" bilgisiyle aynı kişi.
  kisi        text,
  baslangic   timestamptz not null default now(),
  son_gorulme timestamptz not null default now(),
  primary key (isletme_id, cihaz)
);

alter table kopru_cihazlari alter column isletme_id set default oturum_isletmesi();
alter table kopru_cihazlari enable row level security;
drop policy if exists kopru_cihazlari_isletme on kopru_cihazlari;
create policy kopru_cihazlari_isletme on kopru_cihazlari for all to authenticated
  using (isletme_id = oturum_isletmesi())
  with check (isletme_id = oturum_isletmesi());

-- Köprü her seferinde "satırım var mı" diye sormasın: tek çağrıda ya açıyor ya
-- güncelliyor.
create or replace function kopru_bildir(p_cihaz text, p_surum text, p_kisi text)
returns void
language sql
security invoker
as $$
  insert into kopru_cihazlari (cihaz, surum, kisi)
  values (p_cihaz, p_surum, p_kisi)
  on conflict (isletme_id, cihaz) do update
    set son_gorulme = now(),
        surum       = excluded.surum,
        kisi        = excluded.kisi;
$$;
