-- Kasa köprüsü kuyruğu canlı dinliyor: fiş kuyruğa düşer düşmez basılıyor.
-- Yoklama tek başına kalsaydı fiş bir tur boyu bekliyordu ve mutfakta bu
-- gecikme hissediliyordu. Canlı yayın için tablonun yayına eklenmesi gerekiyor.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'yazdirma_kuyrugu'
  ) then
    alter publication supabase_realtime add table yazdirma_kuyrugu;
  end if;
end $$;
