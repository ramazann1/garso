-- Bölgenin salon ekranında nasıl gösterileceği: ızgara mı, çizilen plan mı.
-- Karar işletmecinin; masaya konum yazılmış olması tek başına planı açmıyor.
-- Varsayılan ızgara, yani mevcut kurulumlar olduğu gibi kalıyor.
alter table bolgeler add column if not exists plan_modu boolean not null default false;
