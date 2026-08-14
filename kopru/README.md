# Garso Kasa Köprüsü

Kasadaki bilgisayarda çalışan küçük program. Garso'da bir fiş üretildiğinde
bulutta `yazdirma_kuyrugu` tablosuna düşüyor; köprü o satırı alıp yazıcıya
basıyor. Tarayıcı yerel ağdaki yazıcıya doğrudan bağlanamadığı için bu program
zincirin zorunlu halkası.

## Kurulum

1. Bilgisayarda Node 20 veya üstü kurulu olmalı.
2. Bu klasörde:

```bash
npm.cmd install
```

3. `ayarlar.ornek.json` dosyasını `ayarlar.json` adıyla kopyalayın ve doldurun:

| Alan | Ne yazılacak |
|---|---|
| `sunucu` | Supabase proje adresi |
| `anahtar` | Supabase anon anahtarı |
| `telefon` | Köprünün gireceği personelin telefonu |
| `sifre` | O personelin şifresi |
| `yoklamaSaniye` | Kuyruğun kaç saniyede bir yoklanacağı (varsayılan 3) |

Köprü için ayrı bir personel açmak iyi olur (Adisyo bunu "Teknik" kullanıcı
diye yapıyor): kim bastı bilgisi karışmaz, şifresi kasada durur.

4. Çalıştırın:

```bash
npm.cmd start
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
- Aynı fişi iki kasa birden basmıyor: satır önce cihazın üstüne alınıyor.
- Basılamayan fiş "başarısız" olarak kalıyor, Yazdırma Kuyruğu ekranından
  yeniden sıraya alınabiliyor.

## Henüz yok

Bağlantı Durumu ekranı, "Dene" düğmesi, Windows başlangıcına kaydolma ve tek
dosyaya paketleme. Sonraki adımlar.
