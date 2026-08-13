-- Fiş çıkarken uyarı sesi. Mutfakta kimse yazıcıya bakmıyor; fişin düştüğünü
-- ses haber veriyor. Yazıcının kendi zili çalıyor, ayrı bir cihaz gerekmiyor.
-- Kasadaki adisyon yazıcısında istenmiyor (her fişte öten kasa rahatsız eder),
-- o yüzden varsayılan kapalı ve yazıcı yazıcı ayarlanıyor.

alter table yazicilar add column if not exists zil boolean not null default false;
