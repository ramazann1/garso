-- Adisyon veri modeli: tek jsonb satırından gerçek tablolara.
-- Eski "adisyonlar" tablosu adisyonlar_eski'ye alınır, açık adisyonlar aktarılır.

alter table if exists adisyonlar rename to adisyonlar_eski;

create sequence if not exists adisyon_no_seq;

create table adisyonlar (
  id          bigint generated always as identity primary key,
  masa_ad     text        not null,
  adisyon_no  bigint      not null default nextval('adisyon_no_seq'),
  durum       text        not null default 'acik' check (durum in ('acik', 'kapali', 'iptal')),
  garson      text,
  indirim     numeric(12,2) not null default 0,
  acilis      timestamptz not null default now(),
  kapanis     timestamptz,
  guncelleme  timestamptz not null default now()
);

-- Bir masada aynı anda yalnızca tek açık adisyon olabilir.
create unique index adisyonlar_acik_masa on adisyonlar (masa_ad) where durum = 'acik';
create index adisyonlar_durum on adisyonlar (durum);

-- Turlar: siparişin saat damgalı grupları. Her kaydetmede yeni gelen kalemler
-- kendi turuna yazılır; mutfak ve garson "ne zaman ne söylendi"yi böyle görür.
create table turlar (
  id         bigint generated always as identity primary key,
  adisyon_id bigint      not null references adisyonlar (id) on delete cascade,
  sira       int         not null,
  olusturma  timestamptz not null default now()
);
create index turlar_adisyon on turlar (adisyon_id);

create table adisyon_kalemleri (
  id          bigint generated always as identity primary key,
  tur_id      bigint      not null references turlar (id) on delete cascade,
  -- Ürün/porsiyon kaydı silinse bile adisyon ayakta kalmalı; bu yüzden yabancı
  -- anahtar yok, satış anındaki ad ve fiyat kalemin kendisinde duruyor.
  urun_id     bigint,
  porsiyon_id bigint,
  ad          text        not null,   -- satış anındaki ad; ürün sonradan değişse adisyon oynamaz
  porsiyon    text,
  secimler    jsonb       not null default '[]'::jsonb,
  adet        numeric(10,3) not null default 1,
  fiyat       numeric(12,2) not null,
  kdv_oran    numeric(5,2),
  durum       text        not null default 'normal' check (durum in ('normal', 'ikram', 'iptal')),
  not_metni   text,
  olusturma   timestamptz not null default now()
);
create index adisyon_kalemleri_tur on adisyon_kalemleri (tur_id);

-- Tahsilat hangi kalemlerden ne kadar ödendiğini de taşır (tasarım kararı 2).
-- kalem_adetleri: { "<kalem_id>": adet }
create table tahsilatlar (
  id             bigint generated always as identity primary key,
  adisyon_id     bigint      not null references adisyonlar (id) on delete cascade,
  tip            text        not null,
  tutar          numeric(12,2) not null,
  kalem_adetleri jsonb,
  olusturma      timestamptz not null default now()
);
create index tahsilatlar_adisyon on tahsilatlar (adisyon_id);

alter table adisyonlar        enable row level security;
alter table turlar            enable row level security;
alter table adisyon_kalemleri enable row level security;
alter table tahsilatlar       enable row level security;

create policy adisyonlar_hepsi        on adisyonlar        for all using (true) with check (true);
create policy turlar_hepsi            on turlar            for all using (true) with check (true);
create policy adisyon_kalemleri_hepsi on adisyon_kalemleri for all using (true) with check (true);
create policy tahsilatlar_hepsi       on tahsilatlar       for all using (true) with check (true);

-- Eski açık adisyonların aktarımı. Ödemelerin kalem dökümü eski yapıda sepet
-- sırasına bağlıydı, aktarımda tutar ve tip korunuyor, döküm boş bırakılıyor.
do $$
declare
  eski   record;
  yeni_adisyon bigint;
  yeni_tur     bigint;
  kalem  jsonb;
  odeme  jsonb;
  sepet  jsonb;
begin
  for eski in select * from adisyonlar_eski loop
    sepet := case
      when jsonb_typeof(eski.kalemler) = 'array' then eski.kalemler
      else coalesce(eski.kalemler -> 'sepet', '[]'::jsonb)
    end;
    continue when jsonb_array_length(sepet) = 0;

    insert into adisyonlar (masa_ad, indirim, acilis)
    values (
      eski.masa_ad,
      coalesce((eski.kalemler ->> 'indirim')::numeric, 0),
      coalesce(eski.acilis, now())
    )
    returning id into yeni_adisyon;

    insert into turlar (adisyon_id, sira) values (yeni_adisyon, 1) returning id into yeni_tur;

    for kalem in select * from jsonb_array_elements(sepet) loop
      insert into adisyon_kalemleri (tur_id, ad, porsiyon, secimler, adet, fiyat, kdv_oran)
      values (
        yeni_tur,
        kalem ->> 'ad',
        kalem ->> 'porsiyon',
        coalesce(kalem -> 'secimler', '[]'::jsonb),
        coalesce((kalem ->> 'adet')::numeric, 1),
        coalesce((kalem ->> 'fiyat')::numeric, 0),
        (kalem ->> 'kdvOran')::numeric
      );
    end loop;

    for odeme in select * from jsonb_array_elements(coalesce(eski.tahsilatlar, '[]'::jsonb)) loop
      insert into tahsilatlar (adisyon_id, tip, tutar)
      values (yeni_adisyon, odeme ->> 'tip', coalesce((odeme ->> 'tutar')::numeric, 0));
    end loop;
  end loop;
end $$;
