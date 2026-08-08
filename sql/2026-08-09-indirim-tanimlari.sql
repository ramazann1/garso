-- Ön tanımlı indirimler: kasiyer satışta serbest tutar yazmak yerine listeden
-- seçiyor. Değer yüzdeyse oran (10 = %10), tutarsa lira.
create table if not exists indirim_tanimlari (
  id    bigserial primary key,
  ad    text not null,
  tip   text not null check (tip in ('yuzde', 'tutar')),
  deger numeric not null check (deger > 0),
  sira  int not null default 0,
  aktif boolean not null default true
);

-- Hangi indirimin uygulandığı raporda lazım olacak; adı da yazılıyor ki tanım
-- sonradan silinse bile eski adisyon ne indirimi aldığını unutmasın.
alter table adisyonlar
  add column if not exists indirim_tanim_id bigint references indirim_tanimlari (id) on delete set null,
  add column if not exists indirim_ad       text;

alter table adisyon_kalemleri
  add column if not exists indirim_tanim_id bigint references indirim_tanimlari (id) on delete set null,
  add column if not exists indirim_ad       text;
