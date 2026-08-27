import { cihazKimligi } from "./ayar.js";
import {
  cihazBildir,
  girisYap,
  kapanisBildir,
  isAl,
  kuyruguDinle,
  sonucBildir,
  yaziciDurumBildir,
  yazicilariGetir,
} from "./bulut.js";
import { SURUM } from "./surum.js";
import { cekmeceyiAc, yaziciDurumu, yaziciyaBas } from "./yazdir.js";
import { basilanlarDefteri, yerelSunucuBaslat } from "./yerelSunucu.js";

/**
 * Köprünün çalışan yanı.
 *
 * Pencereden ayrı duruyor: aynı motor hem terminal sürümünde hem pencereli
 * sürümde çalışıyor, arayüz yalnız olayları dinliyor. Ne olup bittiğini
 * `bildir` ile dışarı veriyor — kim dinlerse (konsol ya da durum penceresi)
 * kendi biçiminde gösteriyor.
 */

/** Durum penceresinde gösterilen son işler; kasada uzun bir günlüğe gerek yok. */
const KAYIT_SINIRI = 50;

export async function motorBaslat(ayar, bildir = () => {}) {
  const cihaz = cihazKimligi();
  // Basılan fişlerin kimlikleri iki yol için ortak: kasa yerelden bastırdıysa
  // aynı fiş buluttan geldiğinde ikinci kez kâğıda dökülmüyor.
  const defter = basilanlarDefteri();
  const kayitlar = [];
  const zamanlayicilar = [];

  const durum = {
    cihaz,
    surum: SURUM,
    bulut: "baglaniyor",
    bulutHata: "",
    yazicilar: [],
    sonIs: null,
    /** Kasanın kendi ekranından doğrudan basma yolu açık mı. */
    yerel: "kapali",
    yerelPort: null,
  };

  const yayinla = () => bildir({ durum: { ...durum, kayitlar: [...kayitlar] } });

  const kayitYaz = (metin, tur = "bilgi") => {
    kayitlar.unshift({ saat: new Date().toISOString(), metin, tur });
    if (kayitlar.length > KAYIT_SINIRI) kayitlar.length = KAYIT_SINIRI;
    yayinla();
  };

  // Giriş başarısızsa buradan hata çıkıyor; pencere onu giriş ekranında
  // gösteriyor, terminal sürümü de yazıp kapanıyor.
  const oturum = await girisYap(ayar);
  durum.oturum = oturum;
  durum.bulut = "bagli";
  kayitYaz(`Giriş yapıldı: ${oturum.kisi} · ${oturum.isletme} (${oturum.kod})`);

  async function turAt() {
    const isler = await isAl(cihaz);
    if (!isler.length) return;

    const yazicilar = await yazicilariGetir();

    for (const is of isler) {
      // Kasa bu fişi doğrudan bastırmıştı; bulut kaydı yalnız geçmiş için
      // yazılmış. Basıldı deyip geçiliyor, kâğıt ikinci kez çıkmıyor.
      if (is.istemci_kimlik && defter.gorulduMu(is.istemci_kimlik)) {
        await sonucBildir(is.id, true);
        continue;
      }

      const yazici = yazicilar.get(is.yazici_id);
      const cekmece = is.tip === "cekmece";
      try {
        cekmece ? await cekmeceyiAc(yazici) : await yaziciyaBas(yazici, is.icerik);
        await sonucBildir(is.id, true);
        defter.isaretle(is.istemci_kimlik);
        durum.sonIs = new Date().toISOString();
        kayitYaz(`${cekmece ? "Çekmece açıldı" : "Basıldı"}: #${is.id} → ${yazici.ad}`);
      } catch (e) {
        await sonucBildir(is.id, false, e.message);
        kayitYaz(`${cekmece ? "Çekmece açılamadı" : "Basılamadı"}: #${is.id} → ${e.message}`, "hata");
        // Yazıcı silinmiş ya da adresi değişmiş olabilir; liste tazelensin ki
        // sonraki fiş eski bilgiyle tekrar patlamasın.
        await yazicilariGetir(true).catch(() => {});
      }
    }
  }

  let calisiyor = false;
  const bas = async () => {
    if (calisiyor) return;
    calisiyor = true;
    try {
      await turAt();
      if (durum.bulut !== "bagli") {
        durum.bulut = "bagli";
        durum.bulutHata = "";
        kayitYaz("Buluta yeniden bağlanıldı.");
      }
    } catch (e) {
      if (durum.bulutHata !== e.message) {
        durum.bulut = "kopuk";
        durum.bulutHata = e.message;
        kayitYaz(`Buluta ulaşılamıyor: ${e.message}`, "hata");
      }
    } finally {
      calisiyor = false;
    }
  };

  // Fiş düşer düşmez basılıyor; yoklama yalnız canlı bağlantı koparsa ya da
  // basılamamış bir fiş yeniden sıraya alındığında devreye giriyor.
  kuyruguDinle(bas);

  // "Buradayım" haberi: Bağlantı Durumu ekranı köprünün açık olduğunu bundan
  // anlıyor. Beş saniyede bir yenileniyor — ekrandaki sessizlik sınırı 15
  // saniye, aralık ondan belirgin küçük olmalı ki kaçan tek haber köprüyü
  // kapalı göstermesin.
  const haberVer = () =>
    cihazBildir(cihaz, SURUM, oturum.kisi).catch(() => {
      /* haber verilemedi diye fiş basmak durmasın */
    });

  await haberVer();
  zamanlayicilar.push(setInterval(haberVer, 5_000));

  // Yazıcı yoklaması: kâğıt göndermeden yalnız ulaşılabiliyor mu diye bakılıyor.
  // Fiş basmaktan ayrı bir tur, çünkü sipariş gelmediği sürece hiçbir yazıcıya
  // dokunulmuyor ve kapalı yazıcı ancak ilk fiş kaybolunca fark ediliyordu.
  const yazicilariYokla = async () => {
    const yazicilar = await yazicilariGetir().catch(() => null);
    if (!yazicilar) return;

    const liste = [];
    for (const y of yazicilar.values()) {
      if (y.baglanti === "webusb") {
        liste.push({ id: y.id, ad: y.ad, durum: "webusb" });
        continue;
      }
      // Başka kasaya bağlanmış yazıcı bu bilgisayardan görünmüyor; yoklanırsa
      // durup dururken "çevrimdışı" yazardı.
      if (y.cihaz && y.cihaz !== cihaz) continue;
      const sonuc = await yaziciDurumu(y);
      await yaziciDurumBildir(y.id, cihaz, sonuc.cevrimici, sonuc.hata).catch(() => {});
      liste.push({ id: y.id, ad: y.ad, durum: sonuc.cevrimici ? "bagli" : "kopuk", hata: sonuc.hata });
    }
    durum.yazicilar = liste;
    yayinla();
  };

  yazicilariYokla();
  zamanlayicilar.push(setInterval(yazicilariYokla, 30_000));

  /**
   * Kasanın kendi ekranından gelen fiş: buluta uğramadan doğrudan yazıcıya.
   * Yazdırma işini buluttan gelen fişle aynı yol yapıyor, tek fark işin nereden
   * geldiği — kayıt satırında "yerel" diye ayrılıyor ki hangi yolun çalıştığı
   * görülebilsin.
   */
  const yerelBas = async (is) => {
    const yazicilar = await yazicilariGetir();
    const yazici = yazicilar.get(is.yaziciId);
    const cekmece = is.tip === "cekmece";
    try {
      cekmece ? await cekmeceyiAc(yazici) : await yaziciyaBas(yazici, is.icerik);
      durum.sonIs = new Date().toISOString();
      kayitYaz(`${cekmece ? "Çekmece açıldı" : "Basıldı"} (yerel) → ${yazici?.ad ?? "?"}`);
      return { yazici: yazici?.ad ?? "" };
    } catch (e) {
      kayitYaz(`${cekmece ? "Çekmece açılamadı" : "Basılamadı"} (yerel) → ${e.message}`, "hata");
      // Yazıcı silinmiş ya da adresi değişmiş olabilir; liste tazelensin.
      await yazicilariGetir(true).catch(() => {});
      throw e;
    }
  };

  const yerel = yerelSunucuBaslat({
    port: ayar.yerelPort,
    bilgi: () => ({ cihaz, surum: SURUM, isletme: oturum.isletme, kod: oturum.kod }),
    bas: yerelBas,
    defter,
    acilinca: (acikPort) => {
      durum.yerel = "acik";
      durum.yerelPort = acikPort;
      kayitYaz(`Yerel yazdırma açık: 127.0.0.1:${acikPort}`);
    },
    hataysa: (metin) => {
      durum.yerel = "kapali";
      kayitYaz(metin, "hata");
    },
  });

  // Yedek yoklama: canlı bağlantının kaçırdığı ya da yeniden sıraya alınan
  // fişler burada yakalanıyor.
  zamanlayicilar.push(setInterval(bas, ayar.yoklamaSaniye * 1000));

  yayinla();

  return {
    oturum,
    cihaz,
    durumAl: () => ({ ...durum, kayitlar: [...kayitlar] }),
    durdur() {
      for (const z of zamanlayicilar) clearInterval(z);
      zamanlayicilar.length = 0;
      void yerel.kapat();
    },

    /**
     * Düzgün kapanış: zamanlayıcılar duruyor ve buluta "kapandım" deniyor.
     * Haber gitmezse (internet yoksa) beklenmiyor — kapanan program açık
     * kalamaz, ekran zaten sessizlikten anlayacak.
     */
    async kapat() {
      for (const z of zamanlayicilar) clearInterval(z);
      zamanlayicilar.length = 0;
      await yerel.kapat();
      await Promise.race([
        kapanisBildir(cihaz).catch(() => {}),
        new Promise((tamam) => setTimeout(tamam, 2000)),
      ]);
    },
  };
}
