-- Kâğıt genişliği yazıcının kendi özelliği: 80 mm termal kâğıt bir satıra 576
-- nokta, 58 mm'lik 384 nokta alıyor. Köprü fişi çizerken bunu bilmek zorunda —
-- yanlış genişlikte çizilen fiş ya kenardan taşıyor ya ortada dar kalıyor.
-- Adisyo bu ayarı sormuyor çünkü çizimi Windows sürücüsüne bırakmış; biz
-- doğrudan yazıcıya bastığımız için bizim bilmemiz gerekiyor.

alter table yazicilar add column if not exists kagit_genislik int not null default 80
  check (kagit_genislik in (58, 80));
