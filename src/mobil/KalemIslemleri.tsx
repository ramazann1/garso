import { yeniKalemId } from "../adisyonlar";
import type { SepetKalemi } from "../types";

/**
 * Kalem değişikliğini sepete uygular.
 *
 * Kaydedilmiş bir kalemin adedi **artıyorsa** eski satır olduğu gibi kalıyor,
 * fark yeni bir satır olarak ekleniyor: müşteri o ürünü sonradan istedi, mutfak
 * yeni sipariş olarak görmeli ve adisyonda hangi turda kaç tane geldiği
 * okunabilmeli. Eskisinin üstüne yazmak, saati de mutfak fişini de kaybediyor.
 * Azaltma, ikram, iptal ve indirim satırın kendi üstünde işleniyor.
 *
 * Kalem penceresinin kendisi ortak: telefon da `components/KalemPaneli`
 * açıyor, burada yalnız sepete yazma kuralı duruyor.
 */
export function kalemiUygula(sepet: SepetKalemi[], eski: SepetKalemi, yeni: SepetKalemi) {
  const kaydedilmis = !!eski.id && eski.id > 0;
  const fark = yeni.adet - eski.adet;

  if (kaydedilmis && fark > 0) {
    return [
      ...sepet.map((k) => (k.id === eski.id ? { ...yeni, adet: eski.adet } : k)),
      {
        ...yeni,
        id: yeniKalemId(),
        adet: fark,
        turSira: undefined,
        turSaat: undefined,
        turGarson: undefined,
        // Yeni satır kendi hesabına giriyor; eskisinin indirimi taşınmıyor.
        indirim: undefined,
        indirimTanimId: undefined,
        indirimAd: undefined,
      },
    ];
  }

  return sepet.map((k) => (k.id === eski.id ? yeni : k)).filter((k) => k.adet > 0);
}
