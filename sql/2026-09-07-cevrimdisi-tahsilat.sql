-- Çevrimdışı tahsilat: aynı ödemenin iki kere yazılmasını engelleyen kimlik.
--
-- Ödeme artık bağlantı yokken de alınıyor ve cihazdaki kuyrukta bekliyor.
-- Kuyruk bir kaydı yeniden denerken sunucu ilk denemeyi almış olabilir
-- (istek gitmiş, cevap dönerken bağlantı kopmuş). Kimlik ödeme alındığı anda
-- cihazda üretiliyor; sunucu aynı kimliği ikinci kez kabul etmiyor, böylece
-- kasada çift tahsilat oluşmuyor.
--
-- Eski satırlarda kimlik yok. Postgres'te benzersizlik kuralı boş değerleri
-- birbirinden ayrı sayar, o yüzden geçmiş kayıtlar olduğu gibi kalıyor.

alter table tahsilatlar
  add column if not exists istemci_kimlik uuid;

create unique index if not exists tahsilatlar_istemci_kimlik_tekil
  on tahsilatlar (istemci_kimlik);

comment on column tahsilatlar.istemci_kimlik is
  'Ödemeyi alan cihazın ürettiği kimlik; kuyruk yeniden denerse çift kayıt olmasın diye.';
