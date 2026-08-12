-- Kayıt ekranını denerken açılan işletmeleri temizler.
--
-- Göç dosyası değil, elde tutulan bir yardımcı: her denemeden önce çalıştırılıp
-- ortalık toplanıyor. 1 numaralı işletme gerçek olan, ona dokunulmuyor.
--
-- Silme sırası önemli: işletme satırına bağlı kayıtlar durduğu sürece işletme
-- silinemiyor. Bu yüzden önce Auth hesapları, sonra bağımlıdan bağımsıza doğru
-- bütün tablolar, en son işletmenin kendisi siliniyor.
delete from auth.users
 where id in (
   select auth_id from personel where isletme_id > 1 and auth_id is not null
 );

do $$
declare
  t text;
  -- Sıra çocuktan ebeveyne: tahsilat adisyona, adisyon masaya, masa bölgeye bağlı.
  tablolar text[] := array[
    'denetim_kayitlari', 'tahsilatlar', 'adisyon_kalemleri', 'turlar', 'adisyonlar',
    'masalar', 'bolgeler',
    'menu_satirlari', 'menu_gruplari',
    'porsiyon_secenek_gruplari', 'secenekler', 'secenek_gruplari',
    'porsiyonlar', 'urun_kategorileri', 'urunler', 'kategoriler',
    'kdv_gruplari', 'birimler',
    'kasa_hareketleri', 'giderler', 'vardiyalar',
    'odeme_tipleri', 'indirim_tanimlari', 'isletme_ayarlari',
    'personel_yetkileri', 'personel_bolgeleri', 'personel',
    'rol_yetkileri', 'roller'
  ];
begin
  foreach t in array tablolar loop
    if to_regclass(t) is null then
      continue;
    end if;
    execute format('delete from %I where isletme_id > 1', t);
  end loop;
end $$;

delete from isletmeler where id > 1;
