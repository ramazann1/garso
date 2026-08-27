-- Kasanın kendi köprüsüne doğrudan yazdırması.
--
-- Fiş şimdiye kadar hep buluttan geçiyordu: Garso kuyruğa yazıyor, köprü
-- buluttan alıp basıyordu. Kasanın interneti gidince yazıcı aynı odada
-- olduğu hâlde kâğıt çıkmıyordu. Artık kasa fişi önce köprüye veriyor
-- (127.0.0.1), buluta da "yerel basıldı" diye yazıyor — yazdırma geçmişi
-- eksilmesin.

-- Fişin kimliği. Aynı fiş hem yerel yoldan hem bulut yolundan köprüye
-- ulaşabiliyor (kâğıt çıktı ama bulut kaydı internetsizlikten sonra yazıldı);
-- köprü bastığı kimlikleri hatırlayıp ikincisini basmıyor.
alter table yazdirma_kuyrugu add column if not exists istemci_kimlik text;

-- Fiş hangi yoldan basıldı. Yazdırma Kuyruğu ekranında ayırt edilsin diye:
-- yerel basılan iş kuyrukta hiç beklemedi, doğrudan kâğıda gitti.
alter table yazdirma_kuyrugu add column if not exists kaynak text not null default 'bulut'
  check (kaynak in ('bulut', 'yerel'));

comment on column yazdirma_kuyrugu.istemci_kimlik is
  'Fişi üreten cihazın verdiği kimlik; aynı fişin iki kez basılmasını durduruyor.';
comment on column yazdirma_kuyrugu.kaynak is
  'bulut: köprü kuyruktan aldı. yerel: kasa doğrudan köprüye verdi, kâğıt çıktı.';

-- Aynı fişin kuyrukta iki satırı olmasın: yerel basıldıktan sonra yazılan kayıt
-- ile ağ yarıda kalıp yeniden denenen kayıt aynı kimliği taşıyor.
create unique index if not exists yazdirma_kuyrugu_kimlik
  on yazdirma_kuyrugu (isletme_id, istemci_kimlik)
  where istemci_kimlik is not null;

-- Postgres var olan işlevin dönüş tipine dokunmaya izin vermiyor; önce
-- siliniyor, aynı adla yeniden yazılıyor.
drop function if exists kuyruktan_al(text, int);

-- İki değişiklik var:
--  1) `istemci_kimlik` de dönüyor — köprü "bunu zaten yerel bastım" diyebilsin.
--  2) `tip` geri geldi. 24 Ağu'da eklenmişti, 25 Ağu'daki sürümde yanlışlıkla
--     düşmüş: köprüye tip gitmeyince çekmece işi fiş sanılıyor ve çekmece
--     açma darbesi yerine boş kâğıt çıkıyordu.
create function kuyruktan_al(p_cihaz text, p_adet int default 5)
returns table (id bigint, icerik text, yazici_id bigint, tip text, istemci_kimlik text)
language plpgsql
as $$
begin
  -- Bekleyen çekmece işinin ömrü kısa: yazıcı kapalıyken sıraya giren darbe
  -- yarım saat sonra basılırsa kasa durup dururken açılıyor.
  update yazdirma_kuyrugu k
     set durum = 'iptal', hata = 'Çekmece zamanında açılamadı.'
   where k.tip = 'cekmece'
     and k.durum = 'bekliyor'
     and k.olusturma < now() - interval '5 minutes';

  return query
  with secilen as (
    select k.id
    from yazdirma_kuyrugu k
    join yazicilar y on y.id = k.yazici_id
    where k.durum = 'bekliyor'
      and k.yazici_id is not null
      -- Kasasına bağlanmış yazıcının işini başka köprü almıyor.
      and (y.cihaz is null or y.cihaz = p_cihaz)
      -- Başka bir köprü az önce aldıysa dokunulmuyor; iki dakika geçtiyse o
      -- cihaz basamamış demektir, iş serbest kalıyor.
      and (k.alinma is null or k.alinma < now() - interval '2 minutes')
    order by k.olusturma
    limit greatest(p_adet, 1)
    for update skip locked
  )
  update yazdirma_kuyrugu k
     set cihaz = p_cihaz, alinma = now(), deneme = k.deneme + 1
    from secilen s
   where k.id = s.id
  returning k.id, k.icerik, k.yazici_id, k.tip, k.istemci_kimlik;
end;
$$;

grant execute on function kuyruktan_al(text, int) to authenticated;
