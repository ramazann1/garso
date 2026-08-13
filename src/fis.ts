import { adisyonOzeti, kalemTutari } from "./adisyonlar";
import type { AdisyonVerisi } from "./adisyonlar";
import { isletmeAdi } from "./isletmeAyarlari";
import { paraGoster } from "./para";
import type { SepetKalemi } from "./types";
import type { FisSablonu } from "./yazicilar";

/**
 * Fişin kâğıttaki hâli. Ekrandaki önizleme ile aynı şablonu okuyor: orada
 * görünen sıra burada da geçerli. Puntolar bu katmanın işi değil — onlar
 * ESC/POS komutu, kasa köprüsü yazıcıya kendisi söylüyor; burada üretilen
 * metin fişin donmuş içeriği.
 */

/** 80 mm termal kâğıt normal puntoda 42 karakter alıyor. */
export const SATIR_GENISLIGI = 42;

const cizgi = "-".repeat(SATIR_GENISLIGI);

/** Solda ad, sağda tutar. Ad uzunsa kesiliyor ki tutar satırdan taşmasın. */
function ikiUc(sol: string, sag: string) {
  const yer = SATIR_GENISLIGI - sag.length - 1;
  const kisa = sol.length > yer ? sol.slice(0, yer - 1) + "…" : sol;
  return kisa + " ".repeat(SATIR_GENISLIGI - kisa.length - sag.length) + sag;
}

function ortala(metin: string) {
  const bosluk = Math.max(0, Math.floor((SATIR_GENISLIGI - metin.length) / 2));
  return " ".repeat(bosluk) + metin;
}

const saatMetni = (zaman?: string) =>
  new Date(zaman ?? Date.now()).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Şablonu metne çevirir. `kalemler` verilirse fiş yalnız onları yazar —
 * mutfak fişinde masanın tamamı değil, o turda gönderilen ürünler basılıyor.
 */
export function fisMetni(
  sablon: FisSablonu,
  adisyon: AdisyonVerisi,
  kalemler?: SepetKalemi[]
): string {
  const mutfak = sablon.tip === "mutfak";
  const p = sablon.parametreler;
  const ozet = adisyonOzeti(adisyon);
  const satilanlar = (kalemler ?? adisyon.sepet).filter(
    (k) => (k.durum ?? "normal") === "normal"
  );

  const satirlar: string[] = [];

  if (!mutfak) satirlar.push(ortala(isletmeAdi() || "İşletmeniz"));
  if (mutfak && p.siparis_no) satirlar.push(ortala(`#${adisyon.no ?? "—"}`));
  if (sablon.ustMetin) satirlar.push(ortala(sablon.ustMetin));

  satirlar.push(ikiUc(adisyon.ad ?? "Masa", saatMetni(adisyon.acilis)));
  if (adisyon.garson) satirlar.push(`Garson: ${adisyon.garson}`);
  if (!mutfak && p.siparis_no) satirlar.push(`Fiş No: ${adisyon.no ?? "—"}`);
  if (mutfak && p.musteri_sayisi && adisyon.kisiSayisi)
    satirlar.push(`Kişi: ${adisyon.kisiSayisi}`);
  if (mutfak && p.musteri_bilgileri && adisyon.musteri?.ad) {
    satirlar.push(ikiUc(adisyon.musteri.ad, adisyon.musteri.telefon ?? ""));
    if (adisyon.musteri.adres) satirlar.push(adisyon.musteri.adres);
  }

  satirlar.push(cizgi);
  if (!mutfak && p.baslik) satirlar.push(ikiUc("Ürün                Adet", "Tutar"));

  for (const k of satilanlar) {
    const ad = `${k.adet} x ${k.ad}${!mutfak && p.urun_birimleri && k.porsiyon ? ` (${k.porsiyon})` : ""}`;
    const fiyatliMi = !mutfak || p.urun_fiyatlari;
    satirlar.push(fiyatliMi ? ikiUc(ad, paraGoster(kalemTutari(k))) : ad);
    if (k.secimler?.length) satirlar.push(`  ${k.secimler.join(" • ")}`);
    if (k.not) satirlar.push(`  Not: ${k.not}`);
  }

  satirlar.push(cizgi);

  if (!mutfak || p.siparis_toplami) {
    if (!mutfak && adisyon.indirim > 0)
      satirlar.push(ikiUc("İndirim", `-${paraGoster(adisyon.indirim)}`));
    if (!mutfak && p.kdv_bilgisi) satirlar.push(ikiUc("KDV", paraGoster(ozet.kdv)));
    // Mutfak fişinin toplamı masanın değil, o turda gönderilen ürünlerin.
    const toplam = mutfak
      ? satilanlar.reduce((t, k) => t + kalemTutari(k), 0)
      : ozet.toplam;
    satirlar.push(ikiUc("TOPLAM", paraGoster(toplam)));
  }

  if (!mutfak && p.hesabi_paylas && adisyon.kisiSayisi)
    satirlar.push(
      ikiUc(`Kişi başı (${adisyon.kisiSayisi})`, paraGoster(ozet.toplam / adisyon.kisiSayisi))
    );

  if (!mutfak && p.bahsis) {
    satirlar.push("Bahşiş: ____________");
    satirlar.push("Toplam: ____________");
  }

  if (adisyon.not) satirlar.push(`Not: ${adisyon.not}`);
  if (sablon.altMetin) satirlar.push(ortala(sablon.altMetin));

  return satirlar.join("\n");
}
