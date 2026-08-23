-- Maliyet sütunu artık herkeste değil (orta grup).
--
-- Maliyet kâr marjı demek: işletmenin ne alıp ne kazandığı. Menü sorgusu her
-- satış ekranında çalışıyordu ve maliyet o sorgunun içindeydi — sipariş alan
-- herkes marjı okuyabiliyordu.
--
-- Satır kuralı burada işe yaramıyor: porsiyon satırının kendisi görünmek
-- zorunda (fiyat, birim, barkod satış için gerekli), yalnız tek sütunu
-- görünmemeli. Bu yüzden izin sütun bazında veriliyor.
--
-- Sütun izni yetki koduna bakamıyor; "kim" sorusunu ancak politika sorabilir.
-- Bu yüzden iki parça: sütun herkese kapanıyor, maliyet ayrı bir görünümden
-- `tanim.menu` yetkisi olana açılıyor. Yazma etkilenmiyor — maliyeti menü
-- ekranı yazıyor, orada zaten tanım yetkisi tetikleyicisi var.

-- 1) Sütunu kapat -----------------------------------------------------------
-- PostgreSQL'de tabloya verilmiş genel `select` izni sütun kısıtını geçersiz
-- kılıyor. Genel izin kaldırılıp sütunlar tek tek veriliyor, maliyet dışarıda.
do $$
declare
  liste text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into liste
    from information_schema.columns
   where table_schema = 'public' and table_name = 'porsiyonlar'
     and column_name <> 'maliyet';

  execute 'revoke select on porsiyonlar from authenticated';
  execute format('grant select (%s) on porsiyonlar to authenticated', liste);
end $$;

-- 2) Yetkisi olana ayrı yoldan ver -----------------------------------------
-- Görünüm çağıranın değil sahibinin yetkisiyle okuyor (security_invoker
-- kapalı); kimin göreceğine içindeki iki şart karar veriyor: aynı işletme ve
-- `tanim.menu`. Yetkisi olmayana boş liste dönüyor, hata değil — menü ekranı
-- zaten o kişiye kapalı.
drop view if exists porsiyon_maliyetleri;
create view porsiyon_maliyetleri with (security_invoker = false) as
  select p.id, p.maliyet
    from porsiyonlar p
   where p.isletme_id = oturum_isletmesi()
     and oturum_yetkisi('tanim.menu');

grant select on porsiyon_maliyetleri to authenticated;
