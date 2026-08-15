# Garso Kasa Köprüsü

Kasadaki bilgisayarda çalışan küçük program. Garso'da bir fiş üretildiğinde
bulutta `yazdirma_kuyrugu` tablosuna düşüyor; köprü o satırı alıp yazıcıya
basıyor. Tarayıcı yerel ağdaki yazıcıya doğrudan bağlanamadığı için bu program
zincirin zorunlu halkası.

## Kasaya kurulum

Kasada Node kurulu olması gerekmiyor. Tek dosya: `garso-kopru-kurulum-<sürüm>.exe`.

1. Kurulum dosyasına çift tıklayın. Windows imzasız program için "bilinmeyen
   yayıncı" uyarısı verir: **Daha fazla bilgi → Yine de çalıştır** (uyarı ancak
   kod imzalama sertifikasıyla kalkıyor).
2. Kurulum soru sormadan biter, program kendiliğinden açılır ve telefon/şifre
   ister. Sunucu adresi ve anahtarı sorulmuyor — ikisi de programa gömülü.
3. Girişten sonra pencere kapanır, program saat yanındaki simgeye iner. Simgeye
   çift tıklayınca durum penceresi açılır; çıkış yalnız simgenin sağ tık
   menüsünden.

Bilgisayar açılınca köprü kendiliğinden çalışıyor; her açılışta kontrol edilip
gerekirse kaydı yeniden yazılıyor.

Köprü için ayrı bir personel açmak iyi olur (Adisyo bunu "Teknik" kullanıcı
diye yapıyor): kim bastı bilgisi karışmaz, şifresi kasada durur. Şifre diske düz
metin yazılmıyor, Windows'un kendi şifrelemesinden geçiyor.

## Kurulum dosyasını üretme (geliştirici tarafı)

```bash
npm.cmd run paketle
```

Çıkan dosya proje klasöründe değil, burada:

```bash
explorer "$env:LOCALAPPDATA\Garso\dagitim"
```

İşletmeye giden tek dosya `garso-kopru-kurulum-<sürüm>.exe`; yanındaki
`win-unpacked` klasörü ve `.blockmap` dosyası ara ürün. Çıktının proje dışında
olmasının sebebi Windows'un dosya dizinleyicisi: Masaüstü'nü sürekli taradığı
için paketleyici klasör adını değiştiremiyor ve "EPERM" hatası veriyor.

Paketleme sırasında sunucu adresi ve anon anahtarı ana projenin `.env.local`
dosyasından okunup `src/sunucu-gomulu.js` olarak koda gömülüyor (o dosya depoya
girmiyor). Sürüm iki yerde yazılı: `package.json` ve `src/surum.js`.

## Geliştirirken çalıştırma

```bash
npm.cmd install
```

```bash
npm.cmd start
```

Pencereli sürüm açılır; giriş bilgileri Windows'un kullanıcı klasöründe
(`%APPDATA%\Garso Kasa Köprüsü\ayarlar.json`) saklanır. Sunucu bilgisi
geliştirirken ana projenin `.env.local` dosyasından okunur.

Penceresiz, düz terminal sürümü de duruyor:

```bash
npm.cmd run terminal
```

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
- Aynı fişi iki kasa birden basmıyor: satır önce cihazın üstüne alınıyor. USB
  yazıcı belli bir kasaya bağlanabiliyor (Ayarlar › Yazıcılar); bağlıysa o
  yazıcının işini başka köprü almıyor.
- Basılamayan fiş "başarısız" olarak kalıyor, Yazdırma Kuyruğu ekranından
  yeniden sıraya alınabiliyor.

## Henüz yok

Kendi kendini güncelleme, ÖKC ve arayan numara (CallerID). Sonraki adımlar.
