-- Tanım verileri (menü, ayarlar, bölgeler, ödeme tipleri, istasyonlar) artık
-- cihazdaki kopyadan anında veriliyor; sunucu arkadan okunup kopya tazeleniyor.
-- Kopyanın bayatlamaması bu haberlere bağlı: menü bir cihazda düzenlenince
-- kasadaki de öğrensin. Yayına eklenmeyen tablo değiştiğinde Supabase haber
-- vermiyor, kopya menü değişene kadar eski kalır.

do $$
declare
  t text;
begin
  foreach t in array array[
    'kategoriler',
    'urunler',
    'urun_kategorileri',
    'porsiyonlar',
    'porsiyon_secenek_gruplari',
    'secenek_gruplari',
    'secenekler',
    'birimler',
    'kdv_gruplari',
    'bolgeler',
    'odeme_tipleri',
    'isletme_ayarlari',
    'istasyonlar',
    'odenmezler'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
