import {
  Banknote,
  BookUser,
  CreditCard,
  Landmark,
  Smartphone,
  Ticket,
  Wallet,
} from "lucide-react";

// Ödeme tipleri işletmenin kendi tanımı; sabit liste yok. İkon ada bakarak
// seçiliyor, tanımadığımız bir tip gelirse cüzdan ikonuyla yine de ikonlu çıkıyor.
const ESLER: { anahtarlar: string[]; ikon: typeof Wallet }[] = [
  { anahtarlar: ["nakit", "peşin", "pesin"], ikon: Banknote },
  { anahtarlar: ["kredi", "kart", "visa", "master", "banka kartı", "pos"], ikon: CreditCard },
  {
    anahtarlar: ["multinet", "sodexo", "ticket", "setcard", "metropol", "yemek", "edenred"],
    ikon: Ticket,
  },
  { anahtarlar: ["açık hesap", "acik hesap", "veresiye", "cari", "borç", "borc"], ikon: BookUser },
  { anahtarlar: ["havale", "eft", "iban", "transfer"], ikon: Landmark },
  {
    anahtarlar: ["online", "yemeksepeti", "getir", "trendyol", "migros", "mobil", "qr"],
    ikon: Smartphone,
  },
];

export function OdemeIkon({ ad, size = 18 }: { ad: string; size?: number }) {
  const kucuk = ad.toLocaleLowerCase("tr");
  const es = ESLER.find((e) => e.anahtarlar.some((a) => kucuk.includes(a)));
  const Ikon = es?.ikon ?? Wallet;
  return <Ikon size={size} />;
}
