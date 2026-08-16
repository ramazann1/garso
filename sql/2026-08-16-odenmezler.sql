-- Ödenmezler: ikramın ve personel yemeğinin kime yazıldığı.
--
-- Bugüne kadar ikram "yapıldı" olarak duruyordu, kime gittiği yazmıyordu.
-- Sebep alanı serbest metin; "müdür ikramı" ile "personel yemeği" aynı torbada
-- kalıyordu. Kayıp/kaçak denetimi bunsuz eksik: ay sonunda ikramların kime
-- gittiği toplanamıyor.
--
-- Ayrı bir liste tutuluyor, doğrudan personele bağlanmıyor: ödenmez yalnız
-- çalışan olmuyor (ev sahibi, tedarikçi, sürekli müşteri de olabiliyor) ve
-- işten ayrılan personelin geçmiş ikramları listede kalmalı.
create table if not exists odenmezler (
  id         bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  ad         text not null,
  -- "Garson", "Müdür", "Ev sahibi" gibi; raporda kırılım bundan çıkıyor.
  unvan      text,
  aktif      boolean not null default true,
  sira       int not null default 0,
  unique (isletme_id, ad)
);

-- İkram kalem bazında da adisyonun tamamında da yapılabiliyor; ikisinde de
-- "kime" bilgisi tutuluyor. Boş kalabilir: acele eden garson seçmeden geçerse
-- ikram yine yapılıyor, yalnız kırılımda "belirtilmemiş" olarak duruyor.
alter table adisyon_kalemleri add column if not exists odenmez_id bigint
  references odenmezler (id) on delete set null;
alter table adisyonlar add column if not exists odenmez_id bigint
  references odenmezler (id) on delete set null;

-- Denetim defterindeki ikram satırı da kimin adına yazıldığını taşısın:
-- defter tek başına okunduğunda da tam olsun.
alter table denetim_kayitlari add column if not exists odenmez text;

do $$
declare t text;
begin
  foreach t in array array['odenmezler'] loop
    execute format(
      'alter table %I alter column isletme_id set default oturum_isletmesi()', t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_isletme', t);
    execute format(
      'create policy %I on %I for all to authenticated
         using (isletme_id = oturum_isletmesi())
         with check (isletme_id = oturum_isletmesi())', t || '_isletme', t);
  end loop;
end $$;

-- Listeyi tanımlamak ayrı bir iş: ikram yapabilen garson listeyi
-- değiştirememeli, yoksa kendi adına yeni bir satır açıp oraya yazardı.
insert into yetkiler (kod, ad, grup, sira)
select 'tanim.odenmez', 'Ödenmez tanımlama', 'Tanım', 6
where not exists (select 1 from yetkiler y where y.kod = 'tanim.odenmez');

-- Göç SQL editöründen çalıştığı için oturum yok: isletme_id elle yazılıyor,
-- kaynağı yetkinin verildiği rolün kendi işletmesi.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'tanim.odenmez'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );
