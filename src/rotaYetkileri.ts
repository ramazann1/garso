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
  ["/adisyon", "siparis.al"],
  ["/menu", "tanim.menu"],
  ["/ayarlar", "tanim.ayar"],
  ["/ayarlar/masalar", "tanim.masa"],
  ["/ayarlar/personel", "tanim.personel"],
  ["/ayarlar/yetkiler", "tanim.personel"],
  ["/ayarlar/kisi-yetkileri", "tanim.personel"],
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
  const kod = yolYetkisi(yol);
  return !kod || yetkiVar(kod);
}
