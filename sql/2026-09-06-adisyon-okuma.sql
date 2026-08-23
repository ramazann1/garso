-- Adisyon tarafının okunması da yetki soruyor (zor parça).
--
-- Kolay parçada kasa, gider, denetim ve cari tabloları kapandı. Geriye para
-- akışının kendisi kalmıştı: adisyonlar, turlar, kalemler ve tahsilatlar.
-- Bunlar zor, çünkü kural satırdan satıra değişiyor — açık adisyon garsonun
-- günlük işi, kapanmış adisyon rapor işi. Tek yetkiye bağlansaydı ya garson
-- kendi masasını göremezdi ya da herkes bütün ciroyu okurdu.
--
-- Ölçüt yine yetki kodu, rol adı değil. Adisyonun kimin açtığına da
-- bakılmıyor: "garson yalnız kendi masasını görsün" işletmeye göre değişen bir
-- tercih, kural değil. Öyle bir istek gelirse ayar olarak gelir.

-- Durumuna göre okunabilir mi ---------------------------------------------
--
-- Açık adisyonu satış ekranı, ödeme ekranı ve istasyon ekranı okuyor.
-- Kapanmış (ya da iptal edilmiş) adisyonu görmek ayrı bir iş: kapalı adisyon
-- görüntüleme, adisyonu yeniden açma, ödeme tipini düzeltme, iade ve raporlar.
-- Yeniden açma / tip düzeltme / iade listede olmasaydı o yetkiler kâğıt
-- üstünde kalırdı: kişi işlemi yapabilir ama üzerinde çalışacağı hesabı
-- göremezdi.
--
-- `kasa.ac_kapat` iki listede birden: kasayı kapatan kişi hem "açıkta sipariş
-- var mı" diye bakıyor hem o kasa gününün tahsilatlarını sayıyor. Hesapları
-- göremeden kasa sayılmaz.
create or replace function adisyon_okunur(durum text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when durum = 'acik' then oturum_yetkilerinden_biri(array[
      'siparis.al', 'odeme.al', 'mutfak.ekran', 'kasa.ac_kapat',
      'rapor.gun_sonu', 'rapor.tumu'
    ])
    else oturum_yetkilerinden_biri(array[
      'siparis.kapali_gor', 'siparis.aktif_et', 'odeme.tip_duzelt', 'odeme.iade',
      'kasa.ac_kapat', 'rapor.gun_sonu', 'rapor.tumu'
    ])
  end;
$$;

-- Bağlı satırlar kendi başlarına karar vermiyor, adisyonlarına bakıyor.
-- Fonksiyon tanımlayıcı yetkisiyle çalışıyor: politika içinden adisyonlar
-- tablosuna doğrudan bakılsa o tablonun kendi kuralı yeniden tetiklenirdi.
create or replace function adisyon_okunur_id(a_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from adisyonlar a
     where a.id = a_id
       and a.isletme_id = oturum_isletmesi()
       and adisyon_okunur(a.durum)
  );
$$;

-- Politikalar --------------------------------------------------------------
--
-- Kolay parçadaki gibi tek `for all` politikası bölünüyor: yazma tarafı
-- eskisi gibi yalnız işletmeye bakıyor (yetki denetimi orada zaten
-- tetikleyicilerde), okuma ayrıca yetki soruyor.

do $$
declare
  t text;
begin
  foreach t in array array['adisyonlar', 'turlar', 'adisyon_kalemleri', 'tahsilatlar'] loop
    execute format('drop policy if exists %I on %I', t || '_isletme', t);

    execute format('drop policy if exists %I on %I', t || '_ekle', t);
    execute format(
      'create policy %I on %I for insert to authenticated
         with check (isletme_id = oturum_isletmesi())', t || '_ekle', t);

    execute format('drop policy if exists %I on %I', t || '_guncelle', t);
    execute format(
      'create policy %I on %I for update to authenticated
         using (isletme_id = oturum_isletmesi())
         with check (isletme_id = oturum_isletmesi())', t || '_guncelle', t);

    execute format('drop policy if exists %I on %I', t || '_sil', t);
    execute format(
      'create policy %I on %I for delete to authenticated
         using (isletme_id = oturum_isletmesi())', t || '_sil', t);
  end loop;
end $$;

drop policy if exists adisyonlar_oku on adisyonlar;
create policy adisyonlar_oku on adisyonlar for select to authenticated
  using (isletme_id = oturum_isletmesi() and adisyon_okunur(durum));

drop policy if exists turlar_oku on turlar;
create policy turlar_oku on turlar for select to authenticated
  using (isletme_id = oturum_isletmesi() and adisyon_okunur_id(adisyon_id));

drop policy if exists tahsilatlar_oku on tahsilatlar;
create policy tahsilatlar_oku on tahsilatlar for select to authenticated
  using (isletme_id = oturum_isletmesi() and adisyon_okunur_id(adisyon_id));

-- Kalem iki adım uzakta: kalem → tur → adisyon.
create or replace function turun_adisyonu(t_id bigint)
returns bigint language sql stable security definer set search_path = public as $$
  select adisyon_id from turlar where id = t_id;
$$;

drop policy if exists adisyon_kalemleri_oku on adisyon_kalemleri;
create policy adisyon_kalemleri_oku on adisyon_kalemleri for select to authenticated
  using (isletme_id = oturum_isletmesi() and adisyon_okunur_id(turun_adisyonu(tur_id)));

-- Ödenmez silme sayımı -----------------------------------------------------
--
-- Ödenmez listesi silmeden önce "bu satır kullanılmış mı" diye adisyon ve
-- kalem sayıyordu. Okuma kapanınca o sayı yetkisiz kişide sıfır görünür ve
-- kullanılmış bir kayıt kalıcı silinirdi — geçmiş ikramlar sahipsiz kalırdı.
-- Sayım sunucuya alınıyor: kaç tane olduğunu söylemiyor, yalnız "kullanılmış"
-- diyor. Ödenmez listesini yönetenin adisyonları okuması gerekmiyor.
create or replace function odenmez_kullanimda(o_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from adisyon_kalemleri k
     where k.odenmez_id = o_id and k.isletme_id = oturum_isletmesi()
  ) or exists (
    select 1 from adisyonlar a
     where a.odenmez_id = o_id and a.isletme_id = oturum_isletmesi()
  );
$$;
