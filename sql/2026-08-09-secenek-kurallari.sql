-- Seçenek grubunda "en az kaç tane seçilmeli" ve seçeneklerde "önceden işaretli"
-- kuralları. en_az yalnız çoklu gruplarda anlamlı; tekli grupta zorunlu zaten
-- bir tane demek.
alter table secenek_gruplari
  add column if not exists en_az int not null default 0;

alter table secenekler
  add column if not exists varsayilan boolean not null default false;
