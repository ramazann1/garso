-- Ödeme tipleri iki sınıfa ayrılıyor: yazarkasaya iletilenler (ÖKC) ve
-- işletmenin kendi kayıtları (klasik). Ayrım gün sonu raporunda ve yazarkasa
-- entegrasyonunda gerekiyor; ekranda da düğmeler bu başlıklar altında gruplanır.
alter table odeme_tipleri
  add column if not exists sinif text not null default 'klasik';

alter table odeme_tipleri
  drop constraint if exists odeme_tipleri_sinif_check;

alter table odeme_tipleri
  add constraint odeme_tipleri_sinif_check check (sinif in ('okc', 'klasik'));

-- Açık Hesap cari müşteri bakiyesine yazılır, kasaya para girmez.
alter table odeme_tipleri
  add column if not exists acik_hesap boolean not null default false;

update odeme_tipleri set acik_hesap = true where lower(ad) like '%açık hesap%';
