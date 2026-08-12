-- Tekillik kuralları işletmeye göre olmalı.
--
-- Tablolar "tek işletme var" varsayımıyla kurulmuştu; `birimler.ad` gibi
-- alanlarda tekillik bütün veritabanı genelinde tanımlı kalmış. İkinci işletme
-- kurulurken "Tam" birimi çakışıyor — oysa iki işletmenin aynı adı kullanması
-- normal, birbirlerinin verisini görmüyorlar bile.
--
-- Tek tek düzeltmek yerine kural genel: işletmeye bağlı tabloların tekil
-- alanlarının başına isletme_id ekleniyor. Birincil anahtarlara dokunulmuyor.
do $$
declare
  t        text;
  kisit    record;
  sutunlar text;
  tablolar text[] := array[
    'adisyonlar', 'turlar', 'adisyon_kalemleri', 'tahsilatlar',
    'bolgeler', 'masalar',
    'kategoriler', 'urunler', 'urun_kategorileri', 'porsiyonlar',
    'secenek_gruplari', 'secenekler', 'porsiyon_secenek_gruplari',
    'birimler', 'kdv_gruplari', 'menu_gruplari', 'menu_satirlari',
    'odeme_tipleri', 'indirim_tanimlari',
    'roller', 'rol_yetkileri', 'personel', 'personel_bolgeleri', 'personel_yetkileri'
  ];
begin
  foreach t in array tablolar loop
    if to_regclass(t) is null then
      continue;
    end if;

    for kisit in
      select c.conname,
             array_agg(a.attname order by k.ord) as alanlar
        from pg_constraint c
        join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
       where c.conrelid = t::regclass
         and c.contype = 'u'
       group by c.conname
      having not ('isletme_id' = any (array_agg(a.attname)))
    loop
      sutunlar := array_to_string(kisit.alanlar, ', ');
      execute format('alter table %I drop constraint %I', t, kisit.conname);
      execute format(
        'alter table %I add constraint %I unique (isletme_id, %s)',
        t, kisit.conname, sutunlar
      );
      raise notice 'Düzeltildi: %.% → (isletme_id, %)', t, kisit.conname, sutunlar;
    end loop;

    -- Kısıt olarak değil, doğrudan tekil indeks olarak tanımlananlar. Koşullu
    -- (where'lü) indeksler kendi kuralını taşıyor, elle bakılsın diye yalnız
    -- haber veriliyor.
    for kisit in
      select i.indexrelid::regclass::text as ad,
             pg_get_indexdef(i.indexrelid) as tanim,
             i.indpred is not null as kosullu,
             array_agg(a.attname order by k.ord) as alanlar
        from pg_index i
        join lateral unnest(string_to_array(i.indkey::text, ' ')::int[])
             with ordinality as k(attnum, ord) on true
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
       where i.indrelid = t::regclass
         and i.indisunique
         and not i.indisprimary
         and not exists (
           select 1 from pg_constraint c where c.conindid = i.indexrelid
         )
       group by i.indexrelid, i.indpred, i.indnkeyatts
      having not ('isletme_id' = any (array_agg(a.attname)))
         -- Alan sayısı tutmuyorsa indekste ifade var; ona dokunulmuyor.
         and count(*) = i.indnkeyatts
    loop
      if kisit.kosullu then
        raise notice 'Koşullu tekil indeks elle bakılmalı: % — %', kisit.ad, kisit.tanim;
        continue;
      end if;
      sutunlar := array_to_string(kisit.alanlar, ', ');
      execute format('drop index %s', kisit.ad);
      execute format(
        'create unique index %I on %I (isletme_id, %s)',
        split_part(kisit.ad, '.', -1), t, sutunlar
      );
      raise notice 'Düzeltildi: indeks % → (isletme_id, %)', kisit.ad, sutunlar;
    end loop;
  end loop;
end $$;
