-- Denetim kayıtları: "kim ne zaman ne yaptı" defterinin tek yeri.
--
-- Hassas işlemler (kalem iptali, ikram, ileride adisyon iptali, indirim,
-- tahsilat düzeltmesi) her biri için ayrı sütun/tablo açmak yerine burada
-- toplanıyor. Analiz'in Denetim sekmesi doğrudan bu tabloyu okuyor.

create table if not exists denetim_kayitlari (
  id         bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  -- İşlemi yapan; personel sonradan silinse de defterde adı kalsın diye
  -- kimliğin yanında o günkü adı da yazılıyor.
  kisi_id    bigint references personel (id) on delete set null,
  kisi_ad    text   not null default '',
  zaman      timestamptz not null default now(),
  -- İşlem kodu: kalem_iptal, kalem_iptal_geri, kalem_ikram, kalem_ikram_geri...
  -- Serbest metin değil ama check kısıtı da yok; yeni işlem türü eklerken
  -- tabloyu değiştirmek gerekmesin.
  islem      text   not null,
  adisyon_id bigint references adisyonlar (id) on delete set null,
  -- Adisyon silinse bile kaydın hangi masaya ait olduğu okunabilsin.
  yer        text,
  kalem_ad   text,
  adet       int,
  tutar      numeric(12,2) not null default 0,
  sebep      text
);

create index if not exists denetim_kayitlari_zaman
  on denetim_kayitlari (isletme_id, zaman desc);

-- Satır güvenliği: diğer tablolarla aynı kural, işletme kendi satırlarını görür.
alter table denetim_kayitlari alter column isletme_id set default oturum_isletmesi();
alter table denetim_kayitlari enable row level security;
drop policy if exists denetim_kayitlari_isletme on denetim_kayitlari;
create policy denetim_kayitlari_isletme on denetim_kayitlari for all to authenticated
  using (isletme_id = oturum_isletmesi())
  with check (isletme_id = oturum_isletmesi());
