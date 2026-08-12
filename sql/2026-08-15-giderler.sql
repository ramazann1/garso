-- Giderler: işletmenin harcamaları. Kasadaki nakdin giriş/çıkışıyla
-- (kasa_hareketleri) karıştırılmamalı — o para taşıma, bu para harcama.
-- Nakit ödenen gider kasadan düşüyor, kartla ödenen düşmüyor.

-- Masraf tipi tek seviyeli düz bir liste; alt kırılımı yok. Hazır grupları
-- (Faturalar, Vergi, Personel...) işletme kendi ekranından ekliyor, burada
-- tohumlanmıyor — her işletme kendi listesini kursun.
create table if not exists masraf_tipleri (
  id         bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  ad         text   not null,
  sira       int    not null default 0,
  aktif      boolean not null default true
);

create unique index if not exists masraf_tipleri_ad
  on masraf_tipleri (isletme_id, lower(ad));

-- Ödeme tipi satışınkinden ayrı ve sabit liste: gider kasadan/bankadan çıkar,
-- satışın ödeme tipleriyle (yemek kartı, açık hesap...) aynı küme değil.
create table if not exists masraflar (
  id         bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  tip_id     bigint references masraf_tipleri (id) on delete set null,
  -- Tanım sonradan silinse bile eski gider ne için yapıldığını unutmasın.
  tip_ad     text   not null,
  odeme_tipi text   not null check (odeme_tipi in ('nakit', 'kart', 'havale', 'cek', 'diger')),
  -- Gider dünkü tarihle de girilebiliyor; kasadan düşerken saat de gerektiği
  -- için tarih ve saat tek alanda duruyor.
  zaman      timestamptz not null default now(),
  tutar      numeric(12,2) not null check (tutar > 0),
  aciklama   text,
  kisi_id    bigint references personel (id),
  olusturma  timestamptz not null default now()
);

create index if not exists masraflar_zaman on masraflar (isletme_id, zaman desc);

-- Satır güvenliği: diğer tablolarla aynı kural, işletme kendi satırlarını görür.
do $$
declare
  t text;
begin
  foreach t in array array['masraf_tipleri', 'masraflar'] loop
    execute format('alter table %I alter column isletme_id set default oturum_isletmesi()', t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_isletme', t);
    execute format(
      'create policy %I on %I for all to authenticated
         using (isletme_id = oturum_isletmesi())
         with check (isletme_id = oturum_isletmesi())',
      t || '_isletme', t
    );
  end loop;
end $$;
