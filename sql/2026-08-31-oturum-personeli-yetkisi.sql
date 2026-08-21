-- "Bu bilette şu an kim çalışıyor" sorusu artık tarayıcıdan da soruluyor.
--
-- PIN ile geçilen kişi sunucuda tutuluyordu ama ekran bunu bilmiyordu: sayfa
-- yenilenince kimlik biletinin sahibi yükleniyor, ekranda kasayı açan kişi
-- görünüyordu. Yani Mert PIN'le geçtikten sonra sayfa yenilenince ekranda
-- yönetici Ramazan çıkıyor ve onun düğmeleri açık duruyordu. Veritabanı
-- tarafı doğru kişiyi biliyordu — açık ekrandaydı.
--
-- Fonksiyonun kendisi 2026-08-30'da yazıldı, dışarıya açılmamıştı.

grant execute on function oturum_personeli() to authenticated;
