-- Sipariş geçmişi kendi yetkisini aldı.
--
-- Adisyon detayındaki zaman çizelgesi artık denetim defterini de okuyor: bir
-- hesapta ne olduğunun asıl cevabı orada (ürün iptali, ikram, tahsilat silme,
-- masa taşıma). Ama defterin okuma politikası tek bir koda bağlıydı:
-- `rapor.tumu`. Yani tek bir hesabın geçmişine bakabilmek için işletmenin
-- bütün raporlarını görme yetkisi gerekiyordu — ikisi aynı şey değil.
--
-- Kural role değil yetkiye bağlanıyor (5 Eyl 2026 kararı): "bizim işletmede
-- garson hesabın geçmişine bakmaz" varsayımıyla değil, işin hangi yetkinin
-- kapsamında olduğuna bakarak. Bir hesabın kendi geçmişi, işletmenin tüm
-- denetim defterinden dar bir iş; kendi kodunu hak ediyor.
--
-- Defterin yazma tarafına ve silinemezliğine dokunulmadı: kayıt hâlâ yalnız
-- ekleniyor, güncelleme ve silme kimseye açık değil.

-- Yeni yetki ---------------------------------------------------------------
-- Sipariş grubunun sonuna, "Kapanmış adisyonu görüntüleme"nin komşusu olarak.

insert into yetkiler (kod, ad, grup, sira)
select v.kod, v.ad, v.grup, v.sira
from (values
  ('siparis.gecmis', 'Sipariş geçmişini görme', 'Sipariş', 117)
) as v(kod, ad, grup, sira)
where not exists (select 1 from yetkiler y where y.kod = v.kod);

-- Bugün geçmişi görebilenler yarın da görsün: `rapor.tumu` yetkisi olan her
-- role yenisi de veriliyor. Rol adına göre değil, mevcut yetkiye göre —
-- işletmeler kendi rollerini kendi adlandırıyor.
insert into rol_yetkileri (isletme_id, rol_id, yetki_id)
select ry.isletme_id, ry.rol_id, yeni.id
from rol_yetkileri ry
  join yetkiler eski on eski.id = ry.yetki_id and eski.kod = 'rapor.tumu'
  join yetkiler yeni on yeni.kod = 'siparis.gecmis'
where not exists (
  select 1 from rol_yetkileri v where v.rol_id = ry.rol_id and v.yetki_id = yeni.id
);

-- Okuma politikası ---------------------------------------------------------
-- İki koddan biri yetiyor: tüm raporlar ya da sipariş geçmişi.

drop policy if exists denetim_kayitlari_oku on denetim_kayitlari;
create policy denetim_kayitlari_oku on denetim_kayitlari for select to authenticated
  using (
    isletme_id = oturum_isletmesi()
    and oturum_yetkilerinden_biri(array['rapor.tumu', 'siparis.gecmis'])
  );
