-- Satışa geçilene kadar dışarıdan işletme açılmıyor.
--
-- Giriş ekranındaki kayıt düğmesi kaldırıldı ama bu tek başına yetmiyor:
-- isletme_kur giriş yapmamış herkese açıktı, düğme olmadan da çağrılabiliyordu.
-- Mevcut işletmeler ve hesaplar etkilenmiyor; yalnız yeni kayıt kapanıyor.
--
-- Yeni işletme açmak gerekirse geçici olarak:
--   grant execute on function isletme_kur(text, text, text, text) to anon;
-- işletme açıldıktan sonra bu dosya yeniden çalıştırılır.

revoke execute on function isletme_kur(text, text, text, text) from anon, authenticated, public;
