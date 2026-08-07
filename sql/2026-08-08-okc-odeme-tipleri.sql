-- Yazarkasaya iletilen hazır ödeme tipleri. Kapalı (gizli) ekleniyor: her
-- işletme bunların hepsini kullanmıyor, kasa ekranı dolmasın. İşletme Ayarları →
-- Ödeme Tipleri'nden "Satış ekranında görünsün" anahtarıyla açılıyorlar.
insert into odeme_tipleri (ad, renk, sira, sinif, acik_hesap, aktif)
select v.ad, v.renk, v.sira, 'okc', false, false
from (values
  ('ÖKC Nakit',        '#a8d5c2', 1),
  ('ÖKC Kredi Kartı',  '#9fc5d8', 2),
  ('ÖKC Multinet',     '#c9b8d8', 3),
  ('ÖKC Sodexo',       '#e8b4b4', 4),
  ('ÖKC Edenred',      '#d8b8c4', 5),
  ('ÖKC SetCard',      '#e0c9a6', 6),
  ('ÖKC Metropol',     '#d4b896', 7),
  ('ÖKC Paye',         '#b8d4a8', 8),
  ('ÖKC Havale',       '#9fc5d8', 9)
) as v(ad, renk, sira)
where not exists (
  select 1 from odeme_tipleri o where lower(o.ad) = lower(v.ad)
);
