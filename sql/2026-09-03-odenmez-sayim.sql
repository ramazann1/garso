-- Ödenmez silinemiyordu: ekran silmeden önce "bu satır kullanılmış mı" diye
-- sunucuya soruyor (odenmez_kullanimda), ama fonksiyon veritabanında yoktu —
-- istek 404 dönüyor, silme hiç başlamıyordu.
--
-- Fonksiyon 2026-09-06-adisyon-okuma.sql içinde tanımlı; o dosya adisyon okuma
-- yetkilerini de baştan yazdığı için tamamı çalıştırılmadan yalnız bu parça
-- alındı. İki dosyada da aynı tanım duruyor, hangisi önce çalışırsa çalışsın
-- sonuç aynı.
--
-- Sayım neden sunucuda: kaç tane olduğunu söylemiyor, yalnız "kullanılmış"
-- diyor. Ödenmez listesini yöneten kişinin adisyonları okuma yetkisi
-- olmayabilir; istemcide sayılsaydı onda sıfır görünür ve kullanılmış bir kayıt
-- kalıcı silinirdi — geçmiş ikramlar sahipsiz kalırdı.
create or replace function odenmez_kullanimda(o_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from adisyon_kalemleri k
     where k.odenmez_id = o_id and k.isletme_id = oturum_isletmesi()
  ) or exists (
    select 1 from adisyonlar a
     where a.odenmez_id = o_id and a.isletme_id = oturum_isletmesi()
  );
$$;
