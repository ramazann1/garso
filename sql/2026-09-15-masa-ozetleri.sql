-- Salon ve mobil Masalar için açık masaların özeti.
--
-- Ekranlar açık adisyonları bütün turları, kalemleri, fişleri ve ödemeleriyle
-- indirip tutarı cihazda topluyordu. Okuma kuralı her kalem satırı için ayrı
-- çalışıyor (kalem → tur → adisyon → yetki); masa ve kalem arttıkça okuma
-- telefonda saniyelere çıkıyordu. Toplama sunucuya alındı: yetki bir kez
-- soruluyor, masa başına tek satır dönüyor.
--
-- Tutar kuralı ekrandakinin aynısı: iptal kalem hiç sayılmıyor, ikram adete
-- giriyor ama tutara girmiyor, kalem indirimi düşülüyor, hesap indirimi
-- düşüldükten sonra kuver ve garsoniye ekleniyor.
--
-- Fiş işareti: son basılan hesap fişi, masanın son turundan sonraysa kâğıttaki
-- tutar hâlâ geçerli.
--
-- Okuma yetkisi olmayan kişiye boş liste dönüyor; tablonun kendi kuralıyla
-- aynı sonuç.

create or replace function masa_ozetleri()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id,
           'masa_id', a.masa_id,
           'acilis', a.acilis,
           'ad', a.ad,
           'kisi_sayisi', a.kisi_sayisi,
           'garson', p.ad,
           'tutar', greatest(0, coalesce(k.tutar, 0) - coalesce(a.indirim, 0))
                    + coalesce(a.kuver_tutar, 0) + coalesce(a.garsoniye_tutar, 0),
           'odenen', coalesce(o.odenen, 0),
           'adet', coalesce(k.adet, 0),
           'son_siparis', t.son,
           'fis_basildi', f.basilma is not null and (t.son is null or f.basilma > t.son)
         )), '[]'::jsonb)
    from adisyonlar a
    left join personel p on p.id = a.acan_id
    left join lateral (
      select max(tr.olusturma) as son from turlar tr where tr.adisyon_id = a.id
    ) t on true
    left join lateral (
      select sum(ak.adet) filter (where ak.durum is distinct from 'iptal') as adet,
             sum(greatest(0, ak.fiyat * ak.adet - coalesce(ak.indirim, 0)))
               filter (where ak.durum is distinct from 'iptal'
                         and ak.durum is distinct from 'ikram') as tutar
        from turlar tr
        join adisyon_kalemleri ak on ak.tur_id = tr.id
       where tr.adisyon_id = a.id
    ) k on true
    left join lateral (
      select sum(th.tutar) as odenen from tahsilatlar th where th.adisyon_id = a.id
    ) o on true
    left join lateral (
      select max(y.basilma) as basilma
        from yazdirma_kuyrugu y
       where y.adisyon_id = a.id and y.tip = 'adisyon' and y.durum = 'basildi'
    ) f on true
   where a.durum = 'acik'
     and a.masa_id is not null
     and a.isletme_id = oturum_isletmesi()
     and adisyon_okunur('acik');
$$;

revoke all on function masa_ozetleri() from anon, public;
grant execute on function masa_ozetleri() to authenticated;
