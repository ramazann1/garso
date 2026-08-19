import { ayarlar } from "./isletmeAyarlari";
import { yetkiVar } from "./oturum";

/**
 * Hangi adres hangi yetkiyi istiyor.
 *
 * Menüden gizlemek tek başına koruma değil: adres elle yazılabiliyor, kişi
 * değişince tarayıcı öncekinin sayfasında kalıyor. Bu liste hem yan menünün
 * neyi göstereceğini hem de hangi sayfanın açılacağını belirliyor — kural tek
 * yerde dursun, biri güncellenip diğeri unutulmasın.
 *
 * Eşleşme en uzun ön ekten: "/ayarlar" tüm ayar ekranlarına taban kural koyar,
 * altındaki özel satırlar onu ezer. Böylece ayarlara sonradan eklenen bir ekran
 * listeye yazılmayı unutulsa bile korumasız kalmıyor.
 */
const ROTA_YETKILERI: [string, string][] = [
  ["/siparis", "siparis.al"],
  // Mobil arayüz aynı yetkileri istiyor; alt sekme çubuğu da bu listeye bakarak
  // hangi sekmenin çıkacağına karar veriyor.
  ["/mobil/masalar", "siparis.al"],
  ["/mobil/siparis", "siparis.al"],
  ["/mobil/adisyon", "siparis.al"],
  ["/mobil/mutfak", "mutfak.ekran"],
  ["/mobil/satis", "rapor.gun_sonu"],
  ["/adisyon", "siparis.al"],
  ["/menu", "tanim.menu"],
  ["/istasyon", "mutfak.ekran"],
  ["/kasa/gecmis", "kasa.ac_kapat"],
  ["/kasa/giderler", "kasa.gider"],
  // Özet ile adisyon listesi gün sonu yetkisine açık; ciroyu kapatan kasiyer
  // kendi gününü görebilsin. Personel dökümü ve denetim kayıtları yönetici işi.
  ["/musteriler", "cari.gor"],
  ["/analiz", "rapor.tumu"],
  ["/analiz/ozet", "rapor.gun_sonu"],
  ["/analiz/adisyonlar", "rapor.gun_sonu"],
  ["/ayarlar", "tanim.ayar"],
  ["/ayarlar/masalar", "tanim.masa"],
  ["/ayarlar/personel", "tanim.personel"],
  ["/ayarlar/yetkiler", "tanim.personel"],
  ["/ayarlar/kisi-yetkileri", "tanim.personel"],
  ["/ayarlar/odenmezler", "tanim.odenmez"],
  ["/ayarlar/yazicilar", "yazici.yonet"],
  ["/ayarlar/istasyonlar", "yazici.yonet"],
  ["/ayarlar/fis-tasarimi", "yazici.yonet"],
  ["/ayarlar/yazdirma-kuyrugu", "yazici.yonet"],
  ["/ayarlar/baglanti-durumu", "yazici.yonet"],
];

/** Adresin istediği yetki kodu; kural yoksa ekran herkese açık demektir. */
export function yolYetkisi(yol: string) {
  let kod: string | undefined;
  let uzunluk = -1;
  for (const [onEk, gereken] of ROTA_YETKILERI) {
    if ((yol === onEk || yol.startsWith(onEk + "/")) && onEk.length > uzunluk) {
      kod = gereken;
      uzunluk = onEk.length;
    }
  }
  return kod;
}

export function yolaGirebilir(yol: string) {
  // Kasa takibi kapalı işletmede vardiya diye bir şey yok, geçmiş ekranı da
  // yok. Giderler kasadan bağımsız tutuluyor: kasa açıp kapatmayan işletmenin
  // de faturası, kirası var.
  if (yol.startsWith("/kasa/gecmis") && !ayarlar().kasaTakibi) return false;

  const kod = yolYetkisi(yol);
  return !kod || yetkiVar(kod);
}
