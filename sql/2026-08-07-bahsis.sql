-- Bahşiş: kalandan fazla girilen tutarın üstü. Ayrı tahsilat satırı açılmıyor,
-- ödemenin kendi satırında duruyor ki bahşişin hangi ödeme tipiyle (nakit,
-- kart) geldiği belli olsun.
alter table tahsilatlar add column if not exists bahsis numeric(12,2) not null default 0;
