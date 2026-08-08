-- İşletme geneli ayarlar. Tek satır tutuluyor (id = 1); kuver, servis bedeli
-- gibi sonraki genel ayarlar da bu satıra sütun olarak eklenecek.
create table if not exists isletme_ayarlari (
  id        int primary key default 1,
  kdv_dahil boolean not null default true,
  constraint isletme_ayarlari_tek_satir check (id = 1)
);

insert into isletme_ayarlari (id) values (1) on conflict (id) do nothing;
