-- Kişiye özel yetki istisnaları.
-- Temel her zaman rolden gelir; burada yalnızca "bu kişide farklı olsun"
-- denen satırlar tutulur. Kayıt yoksa rolün yetkisi geçerlidir.
--   izin = true  → rolde olmasa da bu kişiye verildi
--   izin = false → rolde olsa da bu kişiden alındı
create table if not exists personel_yetkileri (
  personel_id bigint not null references personel (id) on delete cascade,
  yetki_id    bigint not null references yetkiler (id) on delete cascade,
  izin        boolean not null,
  primary key (personel_id, yetki_id)
);
