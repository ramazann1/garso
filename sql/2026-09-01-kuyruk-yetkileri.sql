-- Yazdırma kuyruğuna kapı.
--
-- Tabloda tek bir "for all" politikası vardı: giriş yapmış herkes tarayıcının
-- geliştirici konsolundan bütün fişleri okuyabiliyor, kuyruğa sahte fiş
-- atabiliyor ve mutfağa düşmeyi bekleyen fişi iptal edebiliyordu. Ekranın
-- menüde görünmemesi burada koruma değil; ekran gizleniyor, veri isteği değil.
--
-- Kapı dikkat istiyor: kasadaki köprü de bu tabloyla çalışıyor. Köprü tabloya
-- doğrudan dokunmuyor, iki işlevi çağırıyor (`kuyruktan_al`, `kuyruk_sonuc`) —
-- ama o işlevler bugüne kadar çağıranın yetkisiyle çalışıyor, yani kapatmak
-- istediğimiz açık politikaya yaslanıyorlardı. Bu yüzden önce işlevler
-- `security definer` yapılıyor ve işletme kontrolü içlerine elle yazılıyor;
-- RLS'in verdiği koruma kaybolmasın diye bu şart.

-- 1) Köprünün iki işlevi ---------------------------------------------------

drop function if exists kuyruktan_al(text, int);

create function kuyruktan_al(p_cihaz text, p_adet int default 5)
returns table (id bigint, icerik text, yazici_id bigint, tip text, istemci_kimlik text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_isletme bigint := oturum_isletmesi();
begin
  if v_isletme is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  -- Bekleyen çekmece işinin ömrü kısa: yazıcı kapalıyken sıraya giren darbe
  -- yarım saat sonra basılırsa kasa durup dururken açılıyor.
  update yazdirma_kuyrugu k
     set durum = 'iptal', hata = 'Çekmece zamanında açılamadı.'
   where k.isletme_id = v_isletme
     and k.tip = 'cekmece'
     and k.durum = 'bekliyor'
     and k.olusturma < now() - interval '5 minutes';

  return query
  with secilen as (
    select k.id
    from yazdirma_kuyrugu k
    join yazicilar y on y.id = k.yazici_id
    where k.isletme_id = v_isletme
      and k.durum = 'bekliyor'
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

-- Basma denemesinin sonucu. İşlev artık kapıdan muaf çalıştığı için satırın
-- kendi işletmesine ait olduğu burada aranıyor; yoksa bir işletmenin köprüsü
-- id tahmin ederek başkasının fişini "basıldı" yapabilirdi.
create or replace function kuyruk_sonuc(p_id bigint, p_basarili boolean, p_hata text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update yazdirma_kuyrugu
     set durum   = case when p_basarili then 'basildi' else 'basarisiz' end,
         basilma = case when p_basarili then now() end,
         hata    = case when p_basarili then null else p_hata end,
         alinma  = null
   where id = p_id
     and isletme_id = oturum_isletmesi();
$$;

grant execute on function kuyruktan_al(text, int) to authenticated;
grant execute on function kuyruk_sonuc(bigint, boolean, text) to authenticated;

-- 2) Tablonun kapısı -------------------------------------------------------
--
-- Tek "for all" politikası dörde bölünüyor. PostgreSQL aynı komuta bakan
-- politikaları VEYA ile birleştirdiği için eski politika yanında bırakılamaz;
-- bırakılsaydı yetkisiz kişiyi yine içeri alırdı.

drop policy if exists yazdirma_kuyrugu_isletme    on yazdirma_kuyrugu;
drop policy if exists yazdirma_kuyrugu_oku        on yazdirma_kuyrugu;
drop policy if exists yazdirma_kuyrugu_ekle       on yazdirma_kuyrugu;
drop policy if exists yazdirma_kuyrugu_guncelle   on yazdirma_kuyrugu;
drop policy if exists yazdirma_kuyrugu_sil        on yazdirma_kuyrugu;

-- Okuma. Üç yer okuyor: Yazdırma Kuyruğu ve Bağlantı Durumu ekranları
-- (`yazici.yonet`), fiş basan kişinin kendi işi (`siparis.fis_yazdir`) ve
-- masa kartındaki "hesap fişi basıldı" işareti — o işaret salonu açan herkesin
-- ekranında duruyor, `siparis.al` olmasa garson kendi masasında göremezdi.
create policy yazdirma_kuyrugu_oku on yazdirma_kuyrugu
  for select to authenticated
  using (
    isletme_id = oturum_isletmesi()
    and oturum_yetkilerinden_biri(
      array['yazici.yonet', 'siparis.fis_yazdir', 'siparis.al']
    )
  );

-- Ekleme. Fişi kuyruğa koyan üç iş var: adisyon/mutfak fişi
-- (`siparis.fis_yazdir`), para çekmecesini açma darbesi (`kasa.cekmece`) ve
-- yazıcı ayarlarındaki deneme fişi (`yazici.yonet`).
create policy yazdirma_kuyrugu_ekle on yazdirma_kuyrugu
  for insert to authenticated
  with check (
    isletme_id = oturum_isletmesi()
    and oturum_yetkilerinden_biri(
      array['siparis.fis_yazdir', 'kasa.cekmece', 'yazici.yonet']
    )
  );

-- Güncelleme ve silme yalnız Yazdırma Kuyruğu ekranının işi: yeniden sıraya
-- alma ve iptal. Köprünün güncellemesi bu kapıdan geçmiyor, `kuyruk_sonuc`
-- artık muaf çalışıyor.
create policy yazdirma_kuyrugu_guncelle on yazdirma_kuyrugu
  for update to authenticated
  using      (isletme_id = oturum_isletmesi() and oturum_yetkisi('yazici.yonet'))
  with check (isletme_id = oturum_isletmesi() and oturum_yetkisi('yazici.yonet'));

create policy yazdirma_kuyrugu_sil on yazdirma_kuyrugu
  for delete to authenticated
  using (isletme_id = oturum_isletmesi() and oturum_yetkisi('yazici.yonet'));
