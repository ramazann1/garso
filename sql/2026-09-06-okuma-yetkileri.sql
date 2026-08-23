-- Okuma tarafı da yetki soruyor (kolay parça).
--
-- 5 Eylül'de yazma tarafı kapandı: kimse yetkisiz satır yazamıyor. Okuma açık
-- kalmıştı — giriş yapmış herkes tarayıcının geliştirici konsolundan doğrudan
-- sorgu atıp kasayı, gider dökümünü, denetim defterini ve müşteri listesini
-- okuyabiliyordu. Ekranın menüde görünmemesi burada koruma değil: ekran
-- gizleniyor, veri isteği gizlenmiyor.
--
-- Kural role değil yetkiye bağlanıyor. Aşağıda hiçbir yerde rol adı geçmiyor;
-- her kapı "bu işi yapan hangi yetkiye sahip" sorusuyla açılıyor. İşletmeci
-- yetkiyi kime verirse veri ona görünüyor.
--
-- Bir tabloyu birden çok yetki açıyor. Sebebi aynı veriyi farklı işlerin
-- okuması: kasa hareketini kasayı kapatan da görür, kasaya para koyan da. Tek
-- yetkiye bağlansaydı diğerinin ekranı boş gelirdi.
--
-- Adisyon, tur, kalem ve tahsilat tabloları burada YOK. Onlar satır bazında
-- kural istiyor (açık adisyon garsonun işi, kapanmış adisyon raporun); yanlış
-- kurulursa garson kendi masasını göremez. Ayrı ve dikkatli yapılacak.

-- Yetkilerden herhangi biri yeterli mi? Politikaların içine tek tek
-- `oturum_yetkisi(...) or oturum_yetkisi(...)` yazmamak için.
create or replace function oturum_yetkilerinden_biri(kodlar text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from unnest(kodlar) k where oturum_yetkisi(k));
$$;

-- Okuma kapısını kuran yardımcı.
--
-- Tablolarda tek bir `for all` politikası vardı; o politika okumayı da
-- kapsıyor. PostgreSQL aynı komuta bakan politikaları VEYA ile birleştirdiği
-- için yanına okuma kuralı eklemek işe yaramaz — eski politika yetkisiz kişiyi
-- yine içeri alır. Bu yüzden `for all` bölünüyor: ekleme, güncelleme ve silme
-- eskisi gibi yalnız işletmeye bakıyor, okuma ayrıca yetki soruyor.
create or replace function okuma_yetkisi_bagla(tablo text, kodlar text[])
returns void language plpgsql as $$
begin
  if to_regclass(tablo) is null then
    raise notice 'Tablo bulunamadı, atlandı: %', tablo;
    return;
  end if;

  execute format('drop policy if exists %I on %I', tablo || '_isletme', tablo);

  execute format('drop policy if exists %I on %I', tablo || '_ekle', tablo);
  execute format(
    'create policy %I on %I for insert to authenticated
       with check (isletme_id = oturum_isletmesi())', tablo || '_ekle', tablo);

  execute format('drop policy if exists %I on %I', tablo || '_guncelle', tablo);
  execute format(
    'create policy %I on %I for update to authenticated
       using (isletme_id = oturum_isletmesi())
       with check (isletme_id = oturum_isletmesi())', tablo || '_guncelle', tablo);

  execute format('drop policy if exists %I on %I', tablo || '_sil', tablo);
  execute format(
    'create policy %I on %I for delete to authenticated
       using (isletme_id = oturum_isletmesi())', tablo || '_sil', tablo);

  execute format('drop policy if exists %I on %I', tablo || '_oku', tablo);
  execute format(
    'create policy %I on %I for select to authenticated
       using (isletme_id = oturum_isletmesi() and oturum_yetkilerinden_biri(%L))',
    tablo || '_oku', tablo, kodlar
  );
end;
$$;

revoke all on function okuma_yetkisi_bagla(text, text[]) from anon, authenticated, public;

do $$
declare
  s record;
begin
  for s in
    select * from (values
      -- Kasa günü: kasayı açıp kapatan, kasaya para koyan ve gün sonu raporu
      -- alan görür. Analiz'in tarih süzgeci de vardiya listesini okuyor (kasa
      -- gününe göre filtre), o yüzden rapor yetkileri de burada.
      ('kasa_vardiyalari', array['kasa.ac_kapat', 'kasa.para', 'rapor.gun_sonu', 'rapor.tumu']),
      ('kasa_hareketleri', array['kasa.ac_kapat', 'kasa.para']),

      -- Gider: gideri işleyen görür. Kasa kapanış ekranı nakit giderleri
      -- okuyor (kasada ne kalmalı hesabı), rapor tarafı da döküyor.
      ('masraflar',        array['kasa.gider', 'kasa.ac_kapat', 'rapor.tumu']),

      -- Denetim defteri: kim iptal etti, kim indirim yaptı. Yönetici işi.
      ('denetim_kayitlari', array['rapor.tumu']),

      -- Müşteri: görmek ayrı bir yetki. Ama açık hesaba yazan da müşteriyi
      -- seçmek zorunda; o yetki de listeyi açıyor, yoksa ödeme ekranındaki
      -- müşteri seçici boş gelir.
      ('musteriler',        array['cari.gor', 'cari.duzenle', 'cari.tahsilat', 'odeme.acik_hesap']),
      ('musteri_adresleri', array['cari.gor', 'cari.duzenle', 'cari.tahsilat', 'odeme.acik_hesap']),
      ('cari_hareketler',   array['cari.gor', 'cari.tahsilat', 'odeme.acik_hesap', 'rapor.tumu'])
    ) as v(tablo, kodlar)
  loop
    perform okuma_yetkisi_bagla(s.tablo, s.kodlar);
  end loop;
end $$;

-- Denetim defteri bir istisna: 5 Eylül'de güncelleme ve silme kimseye
-- kapatılmıştı (silinebilen defter defter değil). Yardımcı o iki politikayı
-- geri açtı, tekrar kaldırılıyor.
drop policy if exists denetim_kayitlari_guncelle on denetim_kayitlari;
drop policy if exists denetim_kayitlari_sil on denetim_kayitlari;

-- PIN özeti sütunu ---------------------------------------------------------
--
-- Satır kuralı burada işe yaramıyor: personel satırı görünmeli (ekranlar adı
-- gösteriyor), içindeki PIN özeti görünmemeli. Karşılaştırmayı sunucu kendi
-- yapıyor (2026-08-30-pin-sunucuda.sql), tarayıcının bu sütunu okumasına hiç
-- gerek yok. Kasa köprüsü de etkilenmiyor: o yalnız ad ve işletme okuyor.
do $$
declare
  liste text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into liste
    from information_schema.columns
   where table_schema = 'public' and table_name = 'personel'
     and column_name <> 'pin_hash';

  execute 'revoke select on personel from authenticated';
  execute format('grant select (%s) on personel to authenticated', liste);
end $$;

-- porsiyonlar.maliyet bu dosyada YOK. Maliyet ürünün değil porsiyonun sütunu
-- ve menü yükleme sorgusu onu herkese çekiyor — sipariş ekranı dahil. Sütun
-- kapatılırsa garsonun menüsü hiç açılmaz. Önce uygulamanın maliyeti yalnız
-- menü ekranında istemesi gerekiyor; kapı ondan sonra konacak.
