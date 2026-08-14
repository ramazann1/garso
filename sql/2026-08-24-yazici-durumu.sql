-- Yazıcının o andaki durumu.
--
-- Windows, yazıcı fişten çekilmiş olsa bile yazdırma işini kuyruğuna alıyor ve
-- "aldım" diyor; köprü de fiş basıldı sanıyordu. Artık köprü yazıcıya gerçekten
-- ulaşıp ulaşamadığına bakıyor ve sonucu buraya yazıyor.
--
-- Durum yazıcının kendi satırında değil ayrı tabloda: aynı yazıcıya iki kasadan
-- bakılıyorsa (birinde ağ üzerinden ulaşılıyor, diğerinde ulaşılamıyor) ikisi de
-- görünsün, biri diğerinin bilgisini ezmesin.
create table if not exists yazici_durumlari (
  isletme_id  bigint not null references isletmeler (id) on delete cascade,
  yazici_id   bigint not null references yazicilar (id) on delete cascade,
  cihaz       text not null,
  cevrimici   boolean not null,
  hata        text,
  son_kontrol timestamptz not null default now(),
  primary key (yazici_id, cihaz)
);

alter table yazici_durumlari alter column isletme_id set default oturum_isletmesi();
alter table yazici_durumlari enable row level security;
drop policy if exists yazici_durumlari_isletme on yazici_durumlari;
create policy yazici_durumlari_isletme on yazici_durumlari for all to authenticated
  using (isletme_id = oturum_isletmesi())
  with check (isletme_id = oturum_isletmesi());

create or replace function yazici_durum_bildir(
  p_yazici bigint,
  p_cihaz text,
  p_cevrimici boolean,
  p_hata text
)
returns void
language sql
security invoker
as $$
  insert into yazici_durumlari (yazici_id, cihaz, cevrimici, hata)
  values (p_yazici, p_cihaz, p_cevrimici, left(p_hata, 200))
  on conflict (yazici_id, cihaz) do update
    set cevrimici   = excluded.cevrimici,
        hata        = excluded.hata,
        son_kontrol = now();
$$;
