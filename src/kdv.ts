// KDV hesabının tek kaynağı. Varsayılan olarak fiyatlar KDV DAHİL yazılır
// (Türkiye'de restoran menüsü böyle) ve burada yapılan iş fiyatın içindeki
// vergiyi ayırmaktır. İşletme "fiyatlar KDV hariç" seçerse fiyat matrah sayılır,
// vergi üstüne eklenir.

import { ayarlar } from "./isletmeAyarlari";
import type { SepetKalemi } from "./types";

const kurus = (v: number) => Math.round(v * 100) / 100;

// KDV dahil tutarın içinden vergiyi çıkarır: ₺100 / %10 → matrah 90,91 + KDV 9,09.
export function kdvAyir(tutar: number, oran: number) {
  const kdv = kurus(tutar - tutar / (1 + oran / 100));
  return { matrah: kurus(tutar) - kdv, kdv };
}

export type KdvSatiri = { oran: number; tutar: number; matrah: number; kdv: number };

// Adisyonun oran oran dökümü. İndirim varsa KDV indirilmiş tutardan hesaplanır —
// yoksa tahsil edilmemiş ciro üzerinden vergi yazılmış olur.
export function kdvDokumu(
  kalemler: SepetKalemi[],
  indirim: number,
  varsayilanOran?: number
): KdvSatiri[] {
  // Ürün bazlı indirim satırın kendi oranından düşer; hesap geneli indirim
  // aşağıda tüm oranlara payıyla dağıtılır.
  const satirTutari = (k: SepetKalemi) =>
    Math.max(0, kurus(k.fiyat * k.adet - (k.indirim ?? 0)));

  const araToplam = kalemler.reduce((t, k) => t + satirTutari(k), 0);
  if (araToplam <= 0) return [];

  const oranlar = new Map<number, number>();
  for (const k of kalemler) {
    const oran = k.kdvOran ?? varsayilanOran;
    if (oran == null) continue;
    oranlar.set(oran, (oranlar.get(oran) ?? 0) + satirTutari(k));
  }

  // İndirim kalemlere tutarları oranında dağıtılır.
  const katsayi = araToplam > 0 ? Math.max(0, araToplam - indirim) / araToplam : 1;

  // "Hariç" düzeninde fiyat matrahtır, vergi üstüne eklenir; satırın tutarı
  // matrah + KDV olur.
  const dahil = ayarlar().kdvDahil;
  const hesapla = (oran: number, paye: number) =>
    dahil
      ? { oran, tutar: paye, ...kdvAyir(paye, oran) }
      : { oran, tutar: kurus(paye * (1 + oran / 100)), matrah: paye, kdv: kurus((paye * oran) / 100) };

  const satirlar = [...oranlar.entries()]
    .map(([oran, ham]) => hesapla(oran, kurus(ham * katsayi)))
    .filter((s) => s.tutar > 0)
    .sort((a, b) => b.oran - a.oran);

  // Yuvarlama artığı en büyük satıra yazılır; dökümün toplamı adisyon toplamını tutsun.
  const payeToplam = satirlar.reduce((t, s) => t + (dahil ? s.tutar : s.matrah), 0);
  const fark = kurus(Math.max(0, araToplam - indirim) - payeToplam);
  if (fark !== 0 && satirlar.length) {
    const en = satirlar.reduce((a, b) => (b.tutar > a.tutar ? b : a));
    const yeni = hesapla(en.oran, kurus((dahil ? en.tutar : en.matrah) + fark));
    en.tutar = yeni.tutar;
    en.matrah = yeni.matrah;
    en.kdv = yeni.kdv;
  }

  return satirlar;
}
