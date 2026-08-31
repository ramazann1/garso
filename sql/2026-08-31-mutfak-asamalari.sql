-- İstasyon ekranında aşamalar (hazırlık / paketleme).
--
-- Bugüne kadar kalemin iki hâli vardı: bekliyor ya da hazır (`hazir_at`).
-- İstasyonun "Hazırlık yapılıyor" ve "Paketleme yapılıyor" anahtarları açıksa
-- akış uzuyor: Sırada → Hazırlanıyor → Paketleniyor → Hazır. Anahtarlar
-- kapalıyken ekran bugünküyle birebir aynı çalışıyor.
--
-- Aşama da ayrı tabloya değil kalemin kendi sütununa yazılıyor — hazır
-- durumundaki kararın aynısı. Sütun boşsa o aşamaya girilmemiş, doluysa
-- girilmiş; ayrıca aşamanın kaç dakika sürdüğü de buradan çıkıyor.

alter table adisyon_kalemleri
  add column if not exists hazirlik_at    timestamptz,
  add column if not exists hazirlik_kisi  bigint,
  add column if not exists paketleme_at   timestamptz,
  add column if not exists paketleme_kisi bigint;

-- Personel silinse de kalem ayakta kalmalı; adı düşer, aşamanın anı durur.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'adisyon_kalemleri_hazirlik_kisi_fkey'
  ) then
    alter table adisyon_kalemleri add constraint adisyon_kalemleri_hazirlik_kisi_fkey
      foreign key (hazirlik_kisi) references personel (id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'adisyon_kalemleri_paketleme_kisi_fkey'
  ) then
    alter table adisyon_kalemleri add constraint adisyon_kalemleri_paketleme_kisi_fkey
      foreign key (paketleme_kisi) references personel (id) on delete set null;
  end if;
end $$;

-- Anahtar bugüne kadar hiçbir yerde okunmuyordu, yalnız istasyon listesinde
-- etiket olarak görünüyordu; açık gelmesi de bu yüzden zararsızdı. Artık akışı
-- belirlediği için varsayılanı kapalıya çekiliyor ve mevcut istasyonlar da
-- kapatılıyor: çalışan bir mutfağın ekranına habersiz ikinci bir tuş çıkmasın.
-- Aşama isteyen işletme anahtarı kendi açacak.
alter table istasyonlar alter column pisirme set default false;
update istasyonlar set pisirme = false where pisirme;
