-- "Mutfak grubu" → "İstasyon".
--
-- Adisyo'nun kelimesi "mutfak grubu" ama tezgâhların hepsi mutfak değil: bar,
-- nargile, pasta tezgâhı da aynı yapıyı kullanıyor. İstasyon hem daha kısa hem
-- de bardaki kişiye "mutfak" dememiş oluyoruz.
--
-- Modül bir günlük, taşınacak veri yok; tablolar yeniden adlandırılıyor ki
-- kodda ve veritabanında tek isim dursun.
alter table if exists mutfak_gruplari rename to istasyonlar;
alter table if exists yazici_mutfak_gruplari rename to yazici_istasyonlari;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'yazici_istasyonlari' and column_name = 'grup_id'
  ) then
    alter table yazici_istasyonlari rename column grup_id to istasyon_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'kategoriler' and column_name = 'mutfak_grup_id'
  ) then
    alter table kategoriler rename column mutfak_grup_id to istasyon_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'urunler' and column_name = 'mutfak_grup_id'
  ) then
    alter table urunler rename column mutfak_grup_id to istasyon_id;
  end if;
end $$;

-- Politika adları tablo adıyla birlikte taşınmıyor; kural aynı, adı düzeliyor.
do $$
declare t text;
begin
  foreach t in array array['istasyonlar', 'yazici_istasyonlari'] loop
    execute format('drop policy if exists %I on %I', 'mutfak_gruplari_isletme', t);
    execute format('drop policy if exists %I on %I', 'yazici_mutfak_gruplari_isletme', t);
    execute format('drop policy if exists %I on %I', t || '_isletme', t);
    execute format(
      'create policy %I on %I for all to authenticated
         using (isletme_id = oturum_isletmesi())
         with check (isletme_id = oturum_isletmesi())', t || '_isletme', t);
  end loop;
end $$;

-- Kurulum fonksiyonu eski tablo adını yazıyordu; yeni işletme kurulurken
-- patlamaması için yeniden tanımlanıyor.
create or replace function yazici_varsayilanlari_kur(p_isletme bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into istasyonlar (isletme_id, ad, sira, pisirme, paketleme)
  values (p_isletme, 'Mutfak', 1, true, false),
         (p_isletme, 'Bar',    2, true, false)
  on conflict (isletme_id, ad) do nothing;

  insert into fis_sablonlari (isletme_id, tip, parametreler, puntolar, alt_metin)
  values (
    p_isletme, 'adisyon',
    '{"baslik": true, "kdv_bilgisi": true, "kdv_grubu": false,
      "siparis_no": true, "urun_birimleri": false, "bahsis": false,
      "hesabi_paylas": false, "karekod": false, "logo": false}'::jsonb,
    '{"isletme_adi": 25, "urun_listesi": 20, "toplam": 25, "not": 15,
      "ust_bosluk": 0}'::jsonb,
    'Afiyet olsun.'
  ), (
    p_isletme, 'mutfak',
    '{"urun_fiyatlari": false, "siparis_toplami": false,
      "musteri_bilgileri": false, "musteri_sayisi": true,
      "siparis_no": true}'::jsonb,
    '{"siparis_no": 30, "urun_listesi": 24, "not": 15, "ust_bosluk": 0}'::jsonb,
    null
  )
  on conflict (isletme_id, tip) do nothing;
end $$;

update yetkiler set ad = 'Yazıcı, istasyon ve fiş ayarları' where kod = 'yazici.yonet';
