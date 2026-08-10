-- Şifre artık Supabase Auth'ta duruyor; personel.sifre_hash kullanılmıyor.
-- Kullanılmayan şifre özetini tutmanın faydası yok, riski var: anonim anahtarla
-- okunabilen bir tabloda eski şifrelerin izi kalıyor. Kolon kaldırılıyor.
--
-- "Bu kişinin girişi var mı?" sorusunun yeni cevabı auth_id'nin dolu olması.

alter table personel drop column if exists sifre_hash;
