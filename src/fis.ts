import { adisyonOzeti, kalemTutari, servisGirdisi } from "./adisyonlar";
import { servisSatirlari } from "./servis";
import type { AdisyonVerisi } from "./adisyonlar";
import { ayarlar, isletmeAdi } from "./isletmeAyarlari";
import { kdvDokumu } from "./kdv";
import { adetGoster, paraGoster } from "./para";
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
  /** İşletmenin logosu; gömülü resim olarak taşınıyor, kâğıda ortalanıyor. */
  | { t: "logo"; m: string }
  /** Karekod: içeriği burada duruyor, kareleri basan taraf çiziyor. */
  | { t: "karekod"; m: string }
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
 * Aynı ürünü tek satırda toplama. Ürünler mutfağa tur tur gidiyor ama müşterinin
 * hesabında bunun karşılığı yok: üç kez ayrı ayrı ısmarlanan çay fişte "3 x Çay"
 * olarak duruyor.
 *
 * Yalnız fişte aynı görünenler birleşiyor — seçenekler basılıyorsa sütlü ile
 * sütsüz kahve ayrı satır kalmalı, yoksa fiş yanlış bilgi verir.
 */
function kalemleriTopla(kalemler: SepetKalemi[], seceneklerGorunuyor: boolean): SepetKalemi[] {
  const toplanan = new Map<string, SepetKalemi>();

  for (const k of kalemler) {
    const anahtar = [
      k.ad,
      k.porsiyon ?? "",
      k.fiyat,
      seceneklerGorunuyor ? (k.secimler ?? []).join("|") : "",
      seceneklerGorunuyor ? k.not ?? "" : "",
    ].join("");

    const eski = toplanan.get(anahtar);
    if (eski) {
      eski.adet += k.adet;
      eski.indirim = (eski.indirim ?? 0) + (k.indirim ?? 0);
    } else {
      toplanan.set(anahtar, { ...k });
    }
  }

  return [...toplanan.values()];
}

/**
 * Karekoda yazılan adres. Telefon, başında `https://` olmayan metni adres değil
 * arama sözcüğü sayıyor ve müşteriyi arama sonucuna götürüyor — işletmeciden
 * bunu bilmesini beklemek yerine başına kendimiz ekliyoruz.
 */
function adresDuzelt(adres: string) {
  const temiz = adres.trim();
  if (!temiz) return "";
  return /^[a-z][a-z0-9+.-]*:/i.test(temiz) ? temiz : `https://${temiz}`;
}

/**
 * Şablonu fiş içeriğine çevirir. `kalemler` verilirse fiş yalnız onları yazar —
 * mutfak fişinde masanın tamamı değil, o turda gönderilen ürünler basılıyor.
 */
export function fisIcerigi(
  sablon: FisSablonu,
  adisyon: AdisyonVerisi,
  kalemler?: SepetKalemi[],
  /** Mutfak fişinin numarası — turun kendi numarası, adisyonunki değil. */
  siparisNo?: number,
  /**
   * İptal fişi: tezgâha "bunları yapma" demek için basılıyor. Mutfak fişiyle
   * aynı şablonu kullanıyor — aynı kâğıt, aynı düzen, tanıdık görünüyor — ama
   * başında iptal başlığı var ve satılan değil iptal edilen kalemleri yazıyor.
   */
  iptal?: boolean,
  /** Yazıcının kâğıt genişliği (mm). Dar kâğıtta iptal başlığı küçülüyor. */
  kagitGenislik?: number
): FisIcerigi {
  const mutfak = sablon.tip === "mutfak";
  const p = sablon.parametreler;
  const ozet = adisyonOzeti(adisyon);
  // İptal fişinde durum süzgeci çalışmıyor: yazılacak kalemler zaten iptal
  // edilenler, çağıran onları seçip veriyor.
  const satilanlar = iptal
    ? (kalemler ?? [])
    : (kalemler ?? adisyon.sepet).filter((k) => (k.durum ?? "normal") === "normal");

  const s: FisSatiri[] = [];

  if (!mutfak && p.logo && sablon.logo) s.push({ t: "logo", m: sablon.logo });
  if (!mutfak) s.push({ t: "orta", m: isletmeAdi() || "İşletmeniz", alan: "isletme_adi", kalin: true });
  // İptal başlığı fişin en üstünde: tezgâhtaki kişi kâğıdı eline alır almaz
  // bunun yeni sipariş olmadığını görmeli, ürün listesine bakmadan.
  if (iptal) s.push({ t: "orta", m: "XXX İPTAL XXX", alan: "iptal_basligi", kalin: true });
  if (mutfak && p.siparis_no && siparisNo && !iptal)
    s.push({ t: "orta", m: `Sipariş ${siparisNo}`, alan: "siparis_no", kalin: true });
  if (sablon.ustMetin) s.push({ t: "orta", m: sablon.ustMetin, alan: "alt_metin" });

  s.push({
    t: "ikiUc",
    sol: adisyon.ad ?? "Masa",
    sag: saatMetni(adisyon.acilis),
    alan: "genel",
    kalin: true,
  });
  // Mutfak fişinde yalnız isim: tezgâha düşen fişteki adın garsona ait olduğunu
  // herkes biliyor, "Garson" yazısı yer kaplamaktan başka iş görmüyor.
  // İptal fişinde isim tek başına yetmiyor: tezgâh siparişi kimin durdurduğunu
  // bilmeli, sorusu olursa doğrudan ona gitsin.
  if (adisyon.garson)
    s.push({
      t: "sol",
      m: iptal
        ? `İptal eden: ${adisyon.garson}`
        : mutfak
          ? adisyon.garson
          : `Garson: ${adisyon.garson}`,
      alan: "genel",
    });
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

  // Seçenek ve not mutfağın işi; hesap fişinde görünmesi işletmenin tercihi.
  const secenekliYaz = mutfak || p.urun_secenekleri !== false;
  const listelenecek =
    !mutfak && p.urun_birlestir !== false ? kalemleriTopla(satilanlar, secenekliYaz) : satilanlar;

  for (const k of listelenecek) {
    const ad = `${adetGoster(k.adet)} x ${k.ad}${!mutfak && p.urun_birimleri && k.porsiyon ? ` (${k.porsiyon})` : ""}`;
    const fiyatli = !mutfak || p.urun_fiyatlari;
    s.push(
      fiyatli
        ? { t: "ikiUc", sol: ad, sag: paraGoster(kalemTutari(k)), alan: "urun_listesi" }
        : { t: "sol", m: ad, alan: "urun_listesi" }
    );
    // Ürün altı satırların başındaki nokta, satırın üstteki ürüne ait olduğunu
    // gösteriyor; onsuz seçenek ile yeni ürün aynı listede karışıyor.
    if (secenekliYaz) {
      if (k.secimler?.length) s.push({ t: "ic", m: `• ${k.secimler.join(", ")}`, alan: "secenek" });
      if (k.not) s.push({ t: "ic", m: `• Not: ${k.not}`, alan: "secenek" });
    }
  }

  s.push({ t: "cizgi" });

  if (!iptal && (!mutfak || p.siparis_toplami)) {
    if (!mutfak && adisyon.indirim > 0)
      s.push({ t: "ikiUc", sol: "İndirim", sag: `-${paraGoster(adisyon.indirim)}`, alan: "odeme" });
    // Kuver ve garsoniye toplamın içinde duruyor; müşteri neyi ödediğini fişte
    // görmeli, yoksa ürünler toplamı tutmuyor gibi görünür.
    if (!mutfak)
      for (const satir of servisSatirlari(
        servisGirdisi(adisyon, Math.max(0, ozet.araToplam - adisyon.indirim))
      ))
        s.push({ t: "ikiUc", sol: satir.ad, sag: paraGoster(satir.tutar), alan: "odeme" });
    // Fişte yazan KDV, toplama eklenen değil hesabın içindeki vergidir: fiyatlar
    // KDV dahil yazıldığında toplama eklenen bir şey olmuyor ama fişte verginin
    // görünmesi gerekiyor.
    if (!mutfak && (p.kdv_bilgisi || p.kdv_grubu)) {
      const dokum = kdvDokumu(satilanlar, adisyon.indirim);
      const dahil = ayarlar().kdvDahil;

      if (p.kdv_grubu)
        for (const g of dokum)
          s.push({
            t: "ikiUc",
            sol: `KDV %${g.oran}`,
            sag: paraGoster(g.kdv),
            alan: "odeme",
          });

      if (p.kdv_bilgisi)
        s.push({
          t: "ikiUc",
          sol: dahil ? "KDV (fiyata dahil)" : "KDV",
          sag: paraGoster(dokum.reduce((t, g) => t + g.kdv, 0)),
          alan: "odeme",
        });
    }
    // Mutfak fişinin toplamı masanın değil, o turda gönderilen ürünlerin.
    const toplam = mutfak
      ? satilanlar.reduce((t, k) => t + kalemTutari(k), 0)
      : ozet.toplam;
    s.push({ t: "ikiUc", sol: "TOPLAM", sag: paraGoster(toplam), alan: "toplam", kalin: true });

    // Kısmen ödenmiş hesabın fişi borcu olduğundan fazla gösteriyordu: alınan
    // para ne satırda görünüyor ne toplamdan düşüyordu. Müşteri ikinci kez
    // tamamını ödemeye kalkıyor.
    if (!mutfak && adisyon.tahsilatlar.length > 0 && ozet.kalan > 0.005) {
      for (const o of adisyon.tahsilatlar)
        s.push({
          t: "ikiUc",
          sol: `Ödendi · ${o.tip}`,
          sag: `-${paraGoster(o.tutar)}`,
          alan: "odeme",
        });
      s.push({
        t: "ikiUc",
        sol: "KALAN",
        sag: paraGoster(ozet.kalan),
        alan: "toplam",
        kalin: true,
      });
    }
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

  if (!mutfak && p.karekod) {
    const icerik =
      sablon.karekodTip === "baglanti"
        ? adresDuzelt(sablon.karekodAdres)
        : [isletmeAdi(), saatMetni(adisyon.acilis), paraGoster(ozet.toplam)]
            .filter(Boolean)
            .join(" · ");
    if (icerik) {
      s.push({ t: "bosluk" });
      s.push({ t: "karekod", m: icerik });
    }
  }

  if (sablon.altMetin) {
    s.push({ t: "bosluk" });
    s.push({ t: "orta", m: sablon.altMetin, alan: "alt_metin" });
  }

  // Ayarlanmamış alanlar varsayılanıyla donuyor: köprü fişi basarken şablona
  // değil, kuyruktaki bu pakete bakıyor.
  return {
    tip: sablon.tip,
    puntolar: {
      ...VARSAYILAN_PUNTOLAR,
      ...sablon.puntolar,
      // İptal başlığı kâğıdın izin verdiği kadar büyük: 80 mm'de en büyük
      // punto sığıyor, 58 mm'de "XXX İPTAL XXX" satırı taşıyor. İşletmenin
      // ayarına bırakılmıyor, kâğıttan hesaplanıyor.
      iptal_basligi: (kagitGenislik ?? 80) < 80 ? 26 : 40,
    },
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
      if (s.t === "logo") return "[logo]";
      if (s.t === "karekod") return `[karekod] ${s.m}`;
      const yer = Math.max(0, GENISLIK - s.sol.length - s.sag.length);
      return s.sol + " ".repeat(yer) + s.sag;
    })
    .join("\n");
}
