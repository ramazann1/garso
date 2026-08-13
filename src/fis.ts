import { adisyonOzeti, kalemTutari } from "./adisyonlar";
import type { AdisyonVerisi } from "./adisyonlar";
import { isletmeAdi } from "./isletmeAyarlari";
import { paraGoster } from "./para";
import type { SepetKalemi } from "./types";
import { VARSAYILAN_PUNTOLAR } from "./yazicilar";
import type { FisSablonu } from "./yazicilar";

/**
 * Fişin kâğıttaki hâli.
 *
 * Fiş düz metin olarak değil, alan alan üretiliyor: "bu satır işletme adı",
 * "bu satır ürün — solda ad, sağda tutar". Kasa köprüsü her alanı Fiş
 * Tasarımı'ndaki puntosuyla çiziyor; daktilo düzeninde boşlukla hizalasaydık
 * ne punto farkı ne kalın yazı kâğıda yansırdı.
 *
 * Üretilen içerik kuyrukta donuyor: şablon sonradan değişse bile eski fiş
 * ilk basıldığı gibi çıkıyor. Puntolar da bu yüzden içeriğe yazılıyor.
 */

export type FisSatiri =
  /** Ortalanmış tek satır: işletme adı, üst/alt metin. */
  | { t: "orta"; m: string; alan?: string; kalin?: boolean }
  /** Sola yaslı satır. */
  | { t: "sol"; m: string; alan?: string; kalin?: boolean }
  /** Solda ad, sağda tutar — ürün ve toplam satırları. */
  | { t: "ikiUc"; sol: string; sag: string; alan?: string; kalin?: boolean }
  /** Ürünün altındaki seçenek/not satırı: içeriden, küçük punto. */
  | { t: "ic"; m: string; alan?: string }
  | { t: "cizgi" }
  | { t: "bosluk" };

export type FisIcerigi = {
  tip: FisSablonu["tip"];
  puntolar: Record<string, number>;
  satirlar: FisSatiri[];
};

const saatMetni = (zaman?: string) =>
  new Date(zaman ?? Date.now()).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Şablonu fiş içeriğine çevirir. `kalemler` verilirse fiş yalnız onları yazar —
 * mutfak fişinde masanın tamamı değil, o turda gönderilen ürünler basılıyor.
 */
export function fisIcerigi(
  sablon: FisSablonu,
  adisyon: AdisyonVerisi,
  kalemler?: SepetKalemi[],
  /** Mutfak fişinin numarası — turun kendi numarası, adisyonunki değil. */
  siparisNo?: number
): FisIcerigi {
  const mutfak = sablon.tip === "mutfak";
  const p = sablon.parametreler;
  const ozet = adisyonOzeti(adisyon);
  const satilanlar = (kalemler ?? adisyon.sepet).filter(
    (k) => (k.durum ?? "normal") === "normal"
  );

  const s: FisSatiri[] = [];

  if (!mutfak) s.push({ t: "orta", m: isletmeAdi() || "İşletmeniz", alan: "isletme_adi", kalin: true });
  if (mutfak && p.siparis_no && siparisNo)
    s.push({ t: "orta", m: `Sipariş ${siparisNo}`, alan: "siparis_no", kalin: true });
  if (sablon.ustMetin) s.push({ t: "orta", m: sablon.ustMetin, alan: "alt_metin" });

  s.push({
    t: "ikiUc",
    sol: adisyon.ad ?? "Masa",
    sag: saatMetni(adisyon.acilis),
    alan: "genel",
    kalin: true,
  });
  if (adisyon.garson) s.push({ t: "sol", m: `Garson: ${adisyon.garson}`, alan: "genel" });
  if (!mutfak && p.siparis_no) s.push({ t: "sol", m: `Fiş No: ${adisyon.no ?? "—"}`, alan: "genel" });
  if (mutfak && p.musteri_sayisi && adisyon.kisiSayisi)
    s.push({ t: "sol", m: `Kişi: ${adisyon.kisiSayisi}`, alan: "genel" });
  if (mutfak && p.musteri_bilgileri && adisyon.musteri?.ad) {
    s.push({
      t: "ikiUc",
      sol: adisyon.musteri.ad,
      sag: adisyon.musteri.telefon ?? "",
      alan: "genel",
    });
    if (adisyon.musteri.adres) s.push({ t: "sol", m: adisyon.musteri.adres, alan: "genel" });
  }

  s.push({ t: "cizgi" });
  if (!mutfak && p.baslik)
    s.push({ t: "ikiUc", sol: "Ürün", sag: "Tutar", alan: "urun_listesi", kalin: true });

  for (const k of satilanlar) {
    const ad = `${k.adet} x ${k.ad}${!mutfak && p.urun_birimleri && k.porsiyon ? ` (${k.porsiyon})` : ""}`;
    const fiyatli = !mutfak || p.urun_fiyatlari;
    s.push(
      fiyatli
        ? { t: "ikiUc", sol: ad, sag: paraGoster(kalemTutari(k)), alan: "urun_listesi" }
        : { t: "sol", m: ad, alan: "urun_listesi" }
    );
    if (k.secimler?.length) s.push({ t: "ic", m: k.secimler.join(" • "), alan: "secenek" });
    if (k.not) s.push({ t: "ic", m: `Not: ${k.not}`, alan: "secenek" });
  }

  s.push({ t: "cizgi" });

  if (!mutfak || p.siparis_toplami) {
    if (!mutfak && adisyon.indirim > 0)
      s.push({ t: "ikiUc", sol: "İndirim", sag: `-${paraGoster(adisyon.indirim)}`, alan: "odeme" });
    if (!mutfak && p.kdv_bilgisi)
      s.push({ t: "ikiUc", sol: "KDV", sag: paraGoster(ozet.kdv), alan: "odeme" });
    // Mutfak fişinin toplamı masanın değil, o turda gönderilen ürünlerin.
    const toplam = mutfak
      ? satilanlar.reduce((t, k) => t + kalemTutari(k), 0)
      : ozet.toplam;
    s.push({ t: "ikiUc", sol: "TOPLAM", sag: paraGoster(toplam), alan: "toplam", kalin: true });
  }

  if (!mutfak && p.hesabi_paylas && adisyon.kisiSayisi)
    s.push({
      t: "ikiUc",
      sol: `Kişi başı (${adisyon.kisiSayisi})`,
      sag: paraGoster(ozet.toplam / adisyon.kisiSayisi),
      alan: "odeme",
    });

  if (!mutfak && p.bahsis) {
    s.push({ t: "sol", m: "Bahşiş: ____________", alan: "odeme" });
    s.push({ t: "sol", m: "Toplam: ____________", alan: "odeme" });
  }

  if (adisyon.not) s.push({ t: "sol", m: `Not: ${adisyon.not}`, alan: "not" });
  if (sablon.altMetin) {
    s.push({ t: "bosluk" });
    s.push({ t: "orta", m: sablon.altMetin, alan: "alt_metin" });
  }

  // Ayarlanmamış alanlar varsayılanıyla donuyor: köprü fişi basarken şablona
  // değil, kuyruktaki bu pakete bakıyor.
  return {
    tip: sablon.tip,
    puntolar: { ...VARSAYILAN_PUNTOLAR, ...sablon.puntolar },
    satirlar: s,
  };
}

/** Kuyruğa yazılan hâli: köprü bunu okuyup çiziyor. */
export const fisPaketi = (icerik: FisIcerigi) => JSON.stringify(icerik);

/**
 * Fişin okunabilir özeti — Yazdırma Kuyruğu ekranı satıra tıklayınca bunu
 * gösteriyor. Kâğıttaki düzenin birebir aynısı değil, ne basıldığının
 * dökümü. Eski kayıtlar düz metin olduğu için onlar olduğu gibi dönüyor.
 */
export function icerikOzeti(ham: string): string {
  let icerik: FisIcerigi;
  try {
    icerik = JSON.parse(ham);
    if (!Array.isArray(icerik?.satirlar)) return ham;
  } catch {
    return ham;
  }

  const GENISLIK = 42;
  return icerik.satirlar
    .map((s) => {
      if (s.t === "cizgi") return "-".repeat(GENISLIK);
      if (s.t === "bosluk") return "";
      if (s.t === "ic") return `  ${s.m}`;
      if (s.t === "orta") {
        const bosluk = Math.max(0, Math.floor((GENISLIK - s.m.length) / 2));
        return " ".repeat(bosluk) + s.m;
      }
      if (s.t === "sol") return s.m;
      const yer = Math.max(0, GENISLIK - s.sol.length - s.sag.length);
      return s.sol + " ".repeat(yer) + s.sag;
    })
    .join("\n");
}
