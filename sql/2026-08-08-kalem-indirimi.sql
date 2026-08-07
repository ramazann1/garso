-- Ürün bazlı indirim: adisyonun tamamına değil, tek satıra verilen indirim.
-- Satırın toplam tutarından (fiyat × adet) düşülen tutar olarak saklanıyor;
-- yüzde değil tutar, çünkü adet değişince indirim de değişmesin.
alter table adisyon_kalemleri
  add column if not exists indirim numeric(12,2) not null default 0;
