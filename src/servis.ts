import { ayarlar } from "./isletmeAyarlari";
import type { ServisTanimi } from "./isletmeAyarlari";
import type { AdisyonTipi } from "./adisyonlar";

/**
 * Kuver ve garsoniye hesabı.
 *
 * İkisi de ürün değil, adisyonun kendi bedeli: sepete kalem olarak girmiyorlar,
 * adisyonun sütunlarında duruyorlar. Hesap tek yerde çünkü aynı rakam sipariş
 * ekranında, masa kartında, fişte ve Analiz'de aynı çıkmak zorunda.
 */

const kurus = (t: number) => Math.round(t * 100) / 100;

export type ServisGirdisi = {
  /** İndirim düşülmüş hesap tutarı; yüzdeli servis bunun üstünden hesaplanıyor. */
  matrah: number;
  kisiSayisi?: number;
  tip?: AdisyonTipi;
  /** Boş = ayarın dediği, true = elle eklendi, false = bu hesapta kaldırıldı. */
  kuverUygula?: boolean | null;
  garsoniyeUygula?: boolean | null;
};

export type ServisTutarlari = { kuver: number; garsoniye: number; toplam: number };

const BOS: ServisTutarlari = { kuver: 0, garsoniye: 0, toplam: 0 };

/** Tanım hiç doldurulmamışsa (değer 0) servis diye bir şey yok demektir. */
export function servisVar() {
  const a = ayarlar();
  return a.servisAcik && (a.kuver.deger > 0 || a.garsoniye.deger > 0);
}

function tutar(tanim: ServisTanimi, matrah: number, carpan: number) {
  if (tanim.deger <= 0) return 0;
  return tanim.tip === "yuzde"
    ? kurus((matrah * tanim.deger) / 100)
    : kurus(tanim.deger * carpan);
}

/**
 * Bir adisyonun servis bedelleri. Boş hesaba servis yazılmıyor: kalemi olmayan
 * ya da tamamı ikrama giden masadan garsoniye almak yanlış olurdu.
 *
 * Kuver kişi başına alındığı için misafir sayısı girilmemiş adisyonda tutar
 * sıfır kalıyor — uydurulmuş bir "1 kişi" varsaymaktansa hiç yazılmaması doğru.
 */
export function servisTutarlari(girdi: ServisGirdisi): ServisTutarlari {
  const a = ayarlar();
  if (!a.servisAcik || girdi.matrah <= 0) return BOS;

  // Otomatik ekleme yalnız masada: gel al ve pakette oturan misafir yok.
  const otomatik = (girdi.tip ?? "masa") === "masa";
  const kuverVar = girdi.kuverUygula ?? (a.kuver.otomatik && otomatik);
  const garsoniyeVar = girdi.garsoniyeUygula ?? (a.garsoniye.otomatik && otomatik);

  const kuver = kuverVar ? tutar(a.kuver, girdi.matrah, girdi.kisiSayisi ?? 0) : 0;
  const garsoniye = garsoniyeVar ? tutar(a.garsoniye, girdi.matrah, 1) : 0;

  return { kuver, garsoniye, toplam: kurus(kuver + garsoniye) };
}

/**
 * Servisin sipariş ekranında ve fişte yazan satırları. Kuverde kişi sayısı da
 * yazıyor: "Kuver (4 kişi)" satırı, tutarın nereden çıktığını sormaya bırakmıyor.
 */
export function servisSatirlari(girdi: ServisGirdisi): { ad: string; tutar: number }[] {
  const a = ayarlar();
  const { kuver, garsoniye } = servisTutarlari(girdi);
  const satirlar: { ad: string; tutar: number }[] = [];

  if (kuver > 0) {
    const kisi = a.kuver.tip === "tutar" && girdi.kisiSayisi ? ` (${girdi.kisiSayisi} kişi)` : "";
    satirlar.push({ ad: `${a.kuver.ad}${kisi}`, tutar: kuver });
  }
  if (garsoniye > 0) satirlar.push({ ad: a.garsoniye.ad, tutar: garsoniye });

  return satirlar;
}

/** Ayar ekranında ve satışta tanımın tek satırlık karşılığı: "%10" / "₺25". */
export function servisEtiketi(tanim: ServisTanimi) {
  return tanim.tip === "yuzde" ? `%${tanim.deger}` : `₺${tanim.deger}`;
}
