-- Masa meşguliyeti. İki kişi aynı masaya aynı anda girince biri ötekinin
-- üstüne yazıyordu; kalem kaybı artık veri katmanında kapalı, ama insanların
-- birbirinden habersiz aynı hesapta çalışması hâlâ karışıklık. Masa ekranı
-- açıkken burada bir satır duruyor, öteki cihazlar masayı "Ahmet'te" görüyor.
--
-- Satır bir kilit değil, bir işaret: yetkili "yine de gir" diyip devralabiliyor.
-- Sert kilit gerçek işletmede aksatır — garson ekranı açık unutur, kasiyer
-- müşteriyi kapıda bekletir.
--
-- Takılı kalmaması için ekran 20 saniyede bir "buradayım" diyor (guncelleme
-- sütunu). 60 saniye ses çıkmayan satır ölü sayılıyor ve okunurken eleniyor;
-- telefonun pili bitse de masa kilitli kalmıyor.

create table if not exists masa_mesguliyet (
  masa_id     bigint primary key references masalar (id) on delete cascade,
  isletme_id  bigint not null default oturum_isletmesi() references isletmeler (id) on delete cascade,
  kisi_id     bigint references personel (id) on delete set null,
  kisi_ad     text not null,
  guncelleme  timestamptz not null default now()
);

alter table masa_mesguliyet enable row level security;
drop policy if exists masa_mesguliyet_isletme on masa_mesguliyet;
create policy masa_mesguliyet_isletme on masa_mesguliyet
  for all to authenticated
  using (isletme_id = oturum_isletmesi())
  with check (isletme_id = oturum_isletmesi());

-- Öteki cihazlar işareti anında görsün: yoklamayla beklenseydi garson masaya
-- girdikten saniyeler sonra "meşgul" yazacaktı, o arada ikisi de içeride olurdu.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'masa_mesguliyet'
  ) then
    alter publication supabase_realtime add table masa_mesguliyet;
  end if;
end $$;
