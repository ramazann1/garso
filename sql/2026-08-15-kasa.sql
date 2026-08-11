-- Kasa: vardiya (açılış/kapanış) ve kasadaki nakdin hareketleri.
--
-- "Kasa günü" ile "vardiya" iki ayrı şey: kasa günü raporların tarih aralığı
-- (isletme_ayarlari.kasa_gunu_baslangic), vardiya ise kasanın fiilen açık
-- olduğu süre. Bir kasa gününde birden fazla vardiya olabilir — devir teslimde
-- kasa kapatılıp yenisi açılır.

create table if not exists kasa_vardiyalari (
  id            bigint generated always as identity primary key,
  isletme_id    bigint      not null references isletmeler (id) on delete cascade,
  acan_id       bigint      references personel (id),
  acilis        timestamptz not null default now(),
  acilis_tutar  numeric(12,2) not null default 0,   -- kasada bırakılan para
  acilis_not    text,
  kapatan_id    bigint      references personel (id),
  kapanis       timestamptz,
  sayilan_tutar numeric(12,2),                      -- kapanışta fiilen sayılan
  kapanis_not   text
);

-- Aynı anda tek açık vardiya. Kasa iki kere açılamaz; ikinci açılış denemesi
-- veritabanında duruyor, ekranın kontrolüne kalmıyor.
create unique index if not exists kasa_vardiyalari_acik
  on kasa_vardiyalari (isletme_id) where kapanis is null;

-- Kasadaki nakdin fiziksel giriş/çıkışı. Gider DEĞİL: gider işletmenin harcaması,
-- bu ise kasadan para alma/koyma (bankaya götürme, bozukluk getirme...).
create table if not exists kasa_hareketleri (
  id         bigint generated always as identity primary key,
  isletme_id bigint      not null references isletmeler (id) on delete cascade,
  vardiya_id bigint      not null references kasa_vardiyalari (id) on delete cascade,
  tip        text        not null check (tip in ('giris', 'cikis')),
  tutar      numeric(12,2) not null check (tutar > 0),
  aciklama   text,
  kisi_id    bigint      references personel (id),
  olusturma  timestamptz not null default now()
);
create index if not exists kasa_hareketleri_vardiya on kasa_hareketleri (vardiya_id);

-- Hangi ödeme tipi kasadaki nakdi büyütüyor? Kart ödemesi kasaya para koymaz,
-- nakit koyar. Beklenen kasa tutarı bu işarete bakıyor.
alter table odeme_tipleri
  add column if not exists kasaya_girer boolean not null default false;

update odeme_tipleri set kasaya_girer = true
 where kasaya_girer = false and ad ilike '%nakit%';

-- Kasa takibi yapmayan işletmede bu ekranların arayüzde hiç durmaması için.
alter table isletme_ayarlari
  add column if not exists kasa_takibi boolean not null default false,
  add column if not exists kasa_kapanis_zorunlu boolean not null default false,
  -- Bu saatten sonra kasa hâlâ açıksa kapatma hatırlatması çıkar; boşsa uyarı yok.
  add column if not exists kasa_kapanis_uyari time,
  add column if not exists para_hareketi_acik boolean not null default true;

-- Kasadan para çıkarmak, kasayı açmaktan ayrı bir iştir: gün başında kasayı
-- açmak kasiyerin işi, kasadan para çekmek müdürün.
insert into yetkiler (kod, ad, grup, sira)
select 'kasa.para', 'Kasaya para ekleme ve çıkarma', 'Kasa', 3
where not exists (select 1 from yetkiler where kod = 'kasa.para');

-- İşletme SQL Editör'den çalışırken oturumdan gelmiyor; rolün kendi işletmesi
-- yazılıyor. Her işletmenin kendi Yönetici/Müdür rolü ayrı satır.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where y.kod = 'kasa.para'
  and r.ad in ('Yönetici', 'Müdür')
  and not exists (
    select 1 from rol_yetkileri v where v.rol_id = r.id and v.yetki_id = y.id
  );

-- Satır güvenliği: diğer tablolarla aynı kural, işletme kendi satırlarını görür.
do $$
declare
  t text;
begin
  foreach t in array array['kasa_vardiyalari', 'kasa_hareketleri'] loop
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
