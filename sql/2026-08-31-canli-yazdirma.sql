-- Masa kartındaki "hesap fişi basıldı" işaretinin anında görünmesi için yazdırma
-- kuyruğu da canlı yayına giriyor: köprü fişi basıp durumu güncelleyince salon
-- ve mobil ekran kendiliğinden tazeleniyor, sayfa yenilemek gerekmiyor.
--
-- adisyon_kalemleri de aynı listeye ekleniyor: ekranlar bu tabloyu zaten
-- dinliyordu ama yayında olmadığı için haber gelmiyordu.

do $$
declare
  t text;
begin
  foreach t in array array['yazdirma_kuyrugu', 'adisyon_kalemleri'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
