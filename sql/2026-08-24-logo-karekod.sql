-- Fişteki logo ve karekod.
--
-- Logo ayrı bir dosya deposunda değil şablonun içinde duruyor: fiş 384 nokta
-- genişliğinde basılıyor, o boya küçültülmüş siyah-beyaz bir görsel birkaç
-- kilobayt tutuyor. Ayrı depo kurmak, erişim izni ve köprünün dosya indirmesi
-- demekti; kazanç yok.
alter table fis_sablonlari add column if not exists logo text;

-- Karekodun içeriği işletmenin kararı: kimi fişin künyesini bastırıyor
-- (Adisyo'nun yaptığı bu), kimi müşteriyi menüsüne ya da sosyal medyasına
-- götürüyor. İkincisi satışta daha değerli olduğu için seçim bırakıldı.
alter table fis_sablonlari
  add column if not exists karekod_tip text not null default 'fis'
    check (karekod_tip in ('fis', 'baglanti'));

alter table fis_sablonlari add column if not exists karekod_adres text;
