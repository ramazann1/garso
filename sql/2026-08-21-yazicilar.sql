-- Yazıcı modülünün veri modeli.
--
-- Yönlendirme zinciri: ürün → mutfak grubu → yazıcı. Ürün hangi mutfak grubuna
-- aitse, o gruba açılmış yazıcılardan çıkar. Adisyo'da mutfak grubu yalnız
-- ürünün alanı; 200 ürünlük menüde tek tek seçtirmek işkence olduğu için bizde
-- grubu KATEGORİ belirliyor, ürün gerekirse kendi grubunu yazıp eziyor.

create table if not exists mutfak_gruplari (
  id         bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  ad         text not null,
  sira       int  not null default 0,
  -- Adisyo'nun iki anahtarı: fiş pişirme bölümüne mi, paketleme bölümüne mi
  -- gidiyor. Mutfak ekranı gelince aşama sırası buradan okunacak.
  pisirme    boolean not null default true,
  paketleme  boolean not null default false,
  unique (isletme_id, ad)
);

alter table kategoriler add column if not exists mutfak_grup_id bigint
  references mutfak_gruplari (id) on delete set null;
-- Üründeki alan boşsa kategorininki geçerli; dolu olması "bu ürün ayrı yere
-- gitsin" demek (kategori Yiyecek ama tatlı ayrı tezgâhta hazırlanıyor gibi).
alter table urunler add column if not exists mutfak_grup_id bigint
  references mutfak_gruplari (id) on delete set null;

create table if not exists yazicilar (
  id         bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  ad         text not null,
  -- ethernet: köprü doğrudan IP:9100'e ESC/POS gönderir, sürücü gerekmez.
  -- usb:      işletim sistemine kurulu yazıcı, köprü onun adıyla bulur.
  -- webusb:   köprü yok, tarayıcı doğrudan basar (tek yazıcılı küçük işletme).
  baglanti   text not null default 'ethernet'
             check (baglanti in ('ethernet', 'usb', 'webusb')),
  ip         text,
  port       int  not null default 9100,
  -- USB'de işletim sistemindeki yazıcı adı ("XP-80", "Xprinter XP-80"...).
  sistem_ad  text,
  -- Bir yazıcı birden fazla türe bakabilir (kasadaki hem adisyon hem kurye
  -- fişini basar), o yüzden tek sütun değil dizi. En az biri dolu olmalı.
  turler     text[] not null default '{adisyon}'
             check (
               array_length(turler, 1) >= 1
               and turler <@ array['adisyon', 'mutfak', 'kurye']
             ),
  aktif      boolean not null default true,
  sira       int not null default 0,
  unique (isletme_id, ad)
);

-- Yazıcı ↔ mutfak grubu: bir yazıcı birden fazla gruba, bir grup birden fazla
-- yazıcıya açılabilir. Yalnız "mutfak" türü seçiliyken anlamlı.
create table if not exists yazici_mutfak_gruplari (
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  yazici_id  bigint not null references yazicilar (id) on delete cascade,
  grup_id    bigint not null references mutfak_gruplari (id) on delete cascade,
  primary key (yazici_id, grup_id)
);

-- Fiş şablonu. Görünürlük anahtarları ve alan alan puntolar onlarca küçük
-- ayardan oluşuyor; her biri ayrı sütun olsaydı şablona her eklemede göç
-- gerekirdi. Bu yüzden iki jsonb: neyin görüneceği ve hangi puntoda.
create table if not exists fis_sablonlari (
  id           bigint generated always as identity primary key,
  isletme_id   bigint not null references isletmeler (id) on delete cascade,
  tip          text not null check (tip in ('adisyon', 'mutfak')),
  parametreler jsonb not null default '{}'::jsonb,
  puntolar     jsonb not null default '{}'::jsonb,
  ust_metin    text,
  alt_metin    text,
  unique (isletme_id, tip)
);

-- Yazdırma kuyruğu — Adisyo'da yok, bizim eklememiz. Yazıcı kapalıyken
-- gönderilen fiş kayboluyordu; mutfağa düşmeyen sipariş bir restoranda en
-- pahalı hata. Fiş önce buraya yazılır, köprü sırayla alıp basar, basılamayan
-- "başarısız" olarak görünür ve yeniden basılabilir.
create table if not exists yazdirma_kuyrugu (
  id         bigint generated always as identity primary key,
  isletme_id bigint not null references isletmeler (id) on delete cascade,
  yazici_id  bigint references yazicilar (id) on delete set null,
  adisyon_id bigint references adisyonlar (id) on delete set null,
  tip        text not null,
  -- Fişin basılacak hali. Şablon sonradan değişse bile eski fiş o günkü
  -- haliyle yeniden basılabilsin diye metin burada donuyor.
  icerik     text not null default '',
  durum      text not null default 'bekliyor'
             check (durum in ('bekliyor', 'basildi', 'basarisiz', 'iptal')),
  deneme     int  not null default 0,
  hata       text,
  olusturma  timestamptz not null default now(),
  basilma    timestamptz
);

create index if not exists yazdirma_kuyrugu_bekleyen
  on yazdirma_kuyrugu (isletme_id, durum, olusturma);

-- Satır güvenliği: isletme_id sütunu olan her tabloda aynı kural. Koşulu
-- "true" olan politika bırakılmıyor — 19 Ağu'da bütün işletmelerin birbirini
-- görmesine o sebep olmuştu.
do $$
declare t text;
begin
  foreach t in array array[
    'mutfak_gruplari', 'yazicilar', 'yazici_mutfak_gruplari',
    'fis_sablonlari', 'yazdirma_kuyrugu'
  ] loop
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

insert into yetkiler (kod, ad, grup, sira)
select 'yazici.yonet', 'Yazıcı ve fiş ayarları', 'Tanım', 5
where not exists (select 1 from yetkiler y where y.kod = 'yazici.yonet');

-- Göç SQL editöründen çalıştığı için oturum yok: isletme_id elle yazılıyor,
-- kaynağı yetkinin verildiği rolün kendi işletmesi.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select r.isletme_id, r.id, y.id
from roller r cross join yetkiler y
where r.ad in ('Yönetici', 'Müdür')
  and y.kod = 'yazici.yonet'
  and not exists (
    select 1 from rol_yetkileri ry where ry.rol_id = r.id and ry.yetki_id = y.id
  );

-- Varsayılanlar. Yeni işletme yazıcı ekranını boş bulmasın: iki mutfak grubu
-- ve iki fiş şablonu hazır gelir, yazıcısını tanıtınca sistem çalışır durumda
-- olur.
create or replace function yazici_varsayilanlari_kur(p_isletme bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into mutfak_gruplari (isletme_id, ad, sira, pisirme, paketleme)
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
    -- Mutfak fişinde fiyat varsayılan kapalı: mutfağın işine yaramıyor,
    -- kâğıt ve göz yoruyor. Sipariş numarası büyük punto, uzaktan okunuyor.
    '{"urun_fiyatlari": false, "siparis_toplami": false,
      "musteri_bilgileri": false, "musteri_sayisi": true,
      "siparis_no": true}'::jsonb,
    '{"siparis_no": 30, "urun_listesi": 24, "not": 15, "ust_bosluk": 0}'::jsonb,
    null
  )
  on conflict (isletme_id, tip) do nothing;
end $$;

-- Kurulum fonksiyonunun gövdesine dokunmak yerine tetikleyici: hangi yoldan
-- açılırsa açılsın yeni işletme varsayılanlarıyla başlar.
create or replace function isletme_yazici_varsayilanlari()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform yazici_varsayilanlari_kur(new.id);
  return new;
end $$;

drop trigger if exists isletme_yazici_varsayilanlari on isletmeler;
create trigger isletme_yazici_varsayilanlari
  after insert on isletmeler
  for each row execute function isletme_yazici_varsayilanlari();

-- Zaten kurulu işletmeler de aynı varsayılanları alsın.
do $$
declare i bigint;
begin
  for i in select id from isletmeler loop
    perform yazici_varsayilanlari_kur(i);
  end loop;
end $$;
