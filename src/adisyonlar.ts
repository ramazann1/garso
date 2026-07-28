import type { SepetKalemi } from "./types";

const depo = new Map<string, SepetKalemi[]>();

export function adisyonGetir(masaAd: string): SepetKalemi[] {
  return depo.get(masaAd) ?? [];
}

export function adisyonKaydet(masaAd: string, kalemler: SepetKalemi[]) {
  if (kalemler.length === 0) depo.delete(masaAd);
  else depo.set(masaAd, kalemler);
}