-- Ekranlar canlı tazeleniyor: garson telefondan masaya sipariş girince kasadaki
-- salon kendiliğinden görüyor, sayfa yenilenmesi gerekmiyor. Aynı şey tahsilat,
-- kasa ve gider ekranları için de geçerli. Yayına eklenmeyen tablo değiştiğinde
-- Supabase haber vermiyor; ekran bir kere okuyup öylece kalıyor.

do $$
declare
  t text;
begin
  foreach t in array array[
    'adisyonlar',
    'tahsilatlar',
    'turlar',
    'masalar',
    'kasa_hareketleri',
    'kasa_vardiyalari',
    'masraflar'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
