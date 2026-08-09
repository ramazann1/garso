-- Adisyon düzeyi alanlar: masaya ad verme, kişi sayısı ve adisyon notu.
-- Müşteri alanları (musteri_ad / musteri_telefon / adres) zaten vardı; artık
-- masalı adisyonda da doldurulabiliyor.

alter table adisyonlar
  add column if not exists ad          text,
  add column if not exists kisi_sayisi int,
  add column if not exists not_metni   text;
