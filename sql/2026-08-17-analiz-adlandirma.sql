-- Rapor ekranının adı Analiz oldu; yetki ekranında hâlâ "Rapor" yazıyordu.
-- Kodlar (rapor.tumu, rapor.gun_sonu) olduğu gibi kalıyor: kimseye görünmüyorlar
-- ve kişilere atanmış yetkiler bunlara bağlı, değiştirilirse bozulur.
update yetkiler set ad = 'Tüm analiz ekranları', grup = 'Analiz'
where kod = 'rapor.tumu';

update yetkiler set ad = 'Özet ve adisyon listesi', grup = 'Analiz'
where kod = 'rapor.gun_sonu';
