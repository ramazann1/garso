# Garso Kasa Köprüsü

Kasadaki bilgisayarda çalışan küçük program. Garso'da bir fiş üretildiğinde
bulutta `yazdirma_kuyrugu` tablosuna düşüyor; köprü o satırı alıp yazıcıya
basıyor. Tarayıcı yerel ağdaki yazıcıya doğrudan bağlanamadığı için bu program
zincirin zorunlu halkası.

## Kasaya kurulum

Kasada Node kurulu olması gerekmiyor; program tek dosyaya paketleniyor.

1. `dagitim` klasörünü kasadaki bilgisayara kopyalayın.
2. `garso-kopru.exe` çalıştırın. İlk açılışta bağlantı bilgilerini soruyor
   (sunucu adresi, sunucu anahtarı, köprünün gireceği personelin telefonu ve
   şifresi) ve yanına `ayarlar.json` olarak yazıyor. Sonraki açılışlarda
   sormuyor; değiştirmek gerekirse o dosya düzenleniyor.
3. Bilgisayar açılınca kendiliğinden çalışsın diye, bir kez:

```bash
garso-kopru.exe kur
```

Bu komut programı `%LOCALAPPDATA%\Garso\Kopru` altına kopyalıyor ve Windows'un
Başlangıç klasörüne kısayol koyuyor. Kopyalama şart: klasör masaüstünde kalırsa
silindiği gün köprü de gider. Geri almak için `garso-kopru.exe kaldir`.

Köprü için ayrı bir personel açmak iyi olur (Adisyo bunu "Teknik" kullanıcı
diye yapıyor): kim bastı bilgisi karışmaz, şifresi kasada durur.

## Paketleme (geliştirici tarafı)

```bash
npm.cmd install
npm.cmd run paketle
```

`dagitim` klasörü çıkıyor: `garso-kopru.exe`, `varliklar` (yazı tipleri ve
PowerShell betiği) ve `node_modules` (çizim kütüphanesi). Çizim kütüphanesi bir
Windows eklentisi olduğu için exe'nin içine giremiyor — dağıtım tek dosya değil,
tek klasör. Sürüm iki yerde yazılı: `package.json` ve `src/surum.js`.

## Geliştirirken çalıştırma

```bash
npm.cmd install
npm.cmd start
```

Ayarlar `ayarlar.json` dosyasından okunuyor (`ayarlar.ornek.json` kopyalanabilir):

| Alan | Ne yazılacak |
|---|---|
| `sunucu` | Supabase proje adresi |
| `anahtar` | Supabase anon anahtarı |
| `telefon` | Köprünün gireceği personelin telefonu |
| `sifre` | O personelin şifresi |
| `yoklamaSaniye` | Kuyruğun kaç saniyede bir yoklanacağı (varsayılan 3) |

## Şu an ne yapıyor

- Ağ (Ethernet) yazıcılara doğrudan `IP:9100` üzerinden ESC/POS gönderiyor,
  sürücü kurulumu istemiyor.
- USB yazıcılara Windows'un yazdırma servisi üzerinden ham veri gönderiyor.
  Yazıcının Windows'a kurulu olması ve Garso'daki tanımında sistemdeki adının
  birebir yazılması yeterli. Adları listelemek için:

```bash
npm.cmd run yazicilar
```

- Para çekmecesini açıyor: çekmece yazıcının arkasına takılı olduğu için istek
  kuyruğa "çekmece" işi olarak düşüyor, köprü fiş basmadan açma darbesini
  gönderiyor. Hangi yazıcıda olduğu Ayarlar › Yazıcılar'da işaretleniyor.
- Aynı fişi iki kasa birden basmıyor: satır önce cihazın üstüne alınıyor.
- Basılamayan fiş "başarısız" olarak kalıyor, Yazdırma Kuyruğu ekranından
  yeniden sıraya alınabiliyor.

## Henüz yok

Kendi kendini güncelleme, ÖKC ve arayan numara (CallerID). Sonraki adımlar.
