-- Denetim defteri artık silinmiyor.
--
-- Defterin tek işi, sonradan tartışma çıktığında "şu ürünü şu saatte şu kişi
-- iptal etti" diyebilmek. Ama politikası `for all` idi: kaydı yazan kişi aynı
-- istekle onu silebiliyordu. Silinebilen defter defter değil.
--
-- Bundan sonra yalnız yazılıyor ve okunuyor. Güncelleme ve silme kimseye
-- açık değil — yöneticiye de değil. Yanlış yazılan bir kayıt düzeltilmiyor,
-- üstüne doğrusu yazılıyor; defterin mantığı bu.

drop policy if exists denetim_kayitlari_isletme on denetim_kayitlari;

drop policy if exists denetim_kayitlari_oku on denetim_kayitlari;
create policy denetim_kayitlari_oku on denetim_kayitlari for select to authenticated
  using (isletme_id = oturum_isletmesi());

drop policy if exists denetim_kayitlari_yaz on denetim_kayitlari;
create policy denetim_kayitlari_yaz on denetim_kayitlari for insert to authenticated
  with check (isletme_id = oturum_isletmesi());

-- İmza da sunucuda atılıyor (2026-09-05 tetikleyicilerinin aynısı). Deftere
-- başkasının adını yazdırmak, defteri silmek kadar işe yarardı.
create or replace function denetim_imzasi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.kisi_id := oturum_personeli();
  new.kisi_ad := coalesce((select ad from personel where id = new.kisi_id), '');
  return new;
end;
$$;

drop trigger if exists denetim_imza_tetik on denetim_kayitlari;
create trigger denetim_imza_tetik before insert on denetim_kayitlari
  for each row execute function denetim_imzasi();
