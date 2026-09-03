import { durumluModul } from "./sicakGuncelleme";
import { useEffect, useState } from "react";
import { baglantiHatasi, baglantiVar } from "./baglanti";
import { acikOturum } from "./oturum";

/**
 * Seyrek değişen tanım verilerinin cihazdaki kopyası.
 *
 * Kural: **önce kopya, arkada tazele.** Tanım verileri (menü, ayarlar,
 * bölgeler, ödeme tipleri, istasyonlar) cihazdaki kopyadan anında veriliyor,
 * sunucu arkadan okunup kopya tazeleniyor. Eskiden her okuma sunucuyu
 * bekliyordu ve kopya yalnız kopukluk sigortasıydı; ölçümde iki masaya girmek
 * menüyü iki kez baştan indiriyordu (~5 sn).
 * Bayat menüden satış riskinin emniyeti canlı abonelik: menü sunucuda
 * değişince cihazlar haber alıp kopyasını tazeliyor.
 *
 * Canlı veriler (adisyon, sipariş, tahsilat) buraya girmiyor: bir dakika
 * öncesinin masa durumu yanlış bilgidir, yokluğu yanlış bilgiden iyidir.
 */

const ON_EK = "garso-onbellek-";

type Paket<T> = {
  /** Kopya hangi işletmenin — başka hesapla girilince eski işletmenin menüsü çıkmasın. */
  isletmeId: number | null;
  zaman: number;
  veri: T;
};

export function onbellekYaz<T>(anahtar: string, veri: T) {
  const isletmeId = acikOturum()?.isletmeId ?? null;
  // Oturum açılmadan yapılan okumalar satır güvenliği yüzünden boş dönüyor:
  // program açılışında ayarlar bir kez böyle okunuyor. O boşluk kopyanın
  // üstüne yazılırsa çevrimdışı açılışta işletmenin ayarları kaybolur.
  if (isletmeId === null) return;

  const paket: Paket<T> = {
    isletmeId,
    zaman: Date.now(),
    veri,
  };
  try {
    localStorage.setItem(ON_EK + anahtar, JSON.stringify(paket));
  } catch {
    // Yer dolduysa kopya yazılamaz; program çalışmaya devam etsin.
  }
}

export function onbellekOku<T>(anahtar: string): Paket<T> | null {
  const ham = localStorage.getItem(ON_EK + anahtar);
  if (!ham) return null;
  try {
    const paket = JSON.parse(ham) as Paket<T>;
    const isletmeId = acikOturum()?.isletmeId ?? null;
    // Oturum henüz kurulmadıysa (açılış anı) kıyas yapılamıyor, kopya geçerli.
    if (isletmeId !== null && paket.isletmeId !== null && paket.isletmeId !== isletmeId) {
      return null;
    }
    return paket;
  } catch {
    return null;
  }
}

export function onbellegiTemizle() {
  for (const anahtar of Object.keys(localStorage)) {
    if (anahtar.startsWith(ON_EK)) localStorage.removeItem(anahtar);
  }
  yerelZamanYaz(null);
}

// Ekranda "bilgiler ne zamandan kalma" yazabilmek için, kopyaya en son ne
// zaman düşüldüğü tek yerde tutuluyor. Şerit buraya bakıyor.
let yerelZaman: number | null = null;
const dinleyiciler = new Set<(z: number | null) => void>();

function yerelZamanYaz(z: number | null) {
  if (z === yerelZaman) return;
  yerelZaman = z;
  for (const d of dinleyiciler) d(z);
}

/** Kopyaya düşüldü mü, düşüldüyse kopya ne zamanın. */
export function useYerelVeriZamani() {
  const [z, setZ] = useState(yerelZaman);
  useEffect(() => {
    dinleyiciler.add(setZ);
    setZ(yerelZaman);
    return () => {
      dinleyiciler.delete(setZ);
    };
  }, []);
  return z;
}

/** Sunucu bu süre içinde cevap vermezse, elde kopya varsa ona geçiliyor. */
const BEKLEME_SINIRI = 1_500;

class ZamanAsimi extends Error {}

function sinirla<T>(is: Promise<T>, ms: number) {
  return Promise.race([
    is,
    new Promise<T>((_, at) => setTimeout(() => at(new ZamanAsimi("Sunucu cevap vermedi.")), ms)),
  ]);
}

/**
 * Uçuştaki okumalar. Aynı sorgu havadayken ikinci çağrı yenisini açmasın,
 * uçuştakini beklesin: iki ekran aynı anda menü isteyince menü iki kez
 * iniyordu (ölçümde `giris_kuruldu` de ikizlenmişti, ikisi de tam 451 ms).
 */
const ucustakiler = new Map<string, Promise<any>>();

function tekil<T>(anahtar: string, is: () => Promise<T>): Promise<T> {
  const varolan = ucustakiler.get(anahtar);
  if (varolan) return varolan as Promise<T>;
  const soz = is().finally(() => ucustakiler.delete(anahtar));
  ucustakiler.set(anahtar, soz);
  return soz;
}

/** Sunucudan okuyup kopyayı tazeler. Tekilleştirme burada uygulanıyor. */
function sunucudanTazele<T>(anahtar: string, getirici: () => Promise<T>) {
  return tekil(anahtar, async () => {
    const veri = await getirici();
    onbellekYaz(anahtar, veri);
    return veri;
  });
}

/**
 * Sunucudan okur, tazeyi kopyaya yazar. Okuma ağ yüzünden düşerse cihazdaki
 * kopyayı döndürür. Sunucudan gelen başka bir hata (yetki gibi) kopyaya
 * düşürmez — orada sorun bağlantı değil, yanlış veriyle devam etmek yanlış.
 *
 * Tanım verilerinde (menü, ayarlar, bölgeler, ödeme tipleri, istasyonlar)
 * `ondenVer` açık: kopya varsa beklemeden o veriliyor, sunucu arkadan okunup
 * kopya tazeleniyor. Ölçümde iki masaya girmek menüyü iki kez baştan
 * indiriyordu (~5 sn); ekranın sunucuyu beklemesi için bir sebep yok.
 * Arkadaki tazeleme o anki ekrana yansımıyor, bir sonraki açılışta geçerli
 * oluyor — emniyeti menünün canlı aboneliği.
 *
 * Canlı veriler (adisyon, tahsilat, masa doluluğu) buraya hiç girmiyor.
 */
export async function onbellekliGetir<T>(
  anahtar: string,
  getirici: () => Promise<T>,
  ondenVer = false
): Promise<T> {
  const paket = onbellekOku<T>(anahtar);

  // Bağlantının olmadığı zaten biliniyorsa sunucuyu denemenin anlamı yok:
  // istek nasılsa düşecek, ekran o arada yükleniyor halkasıyla bekliyordu.
  // Kopya varsa doğrudan veriliyor, sayfa anında açılıyor.
  if (paket && !baglantiVar()) {
    yerelZamanYaz(paket.zaman);
    return paket.veri;
  }

  if (paket && ondenVer) {
    // Tazeleme arkada koşuyor; düşerse elde zaten kopya var, ekrana hata
    // taşınmıyor. Yakalanmayan söz uyarısı çıkmasın diye burada susturuluyor.
    sunucudanTazele(anahtar, getirici).catch(() => {});
    yerelZamanYaz(null);
    return paket.veri;
  }

  try {
    // Çevrimdışı bir istek hemen hata vermiyor, cevap bekleyip asılı kalıyor;
    // hatayı beklemek ekranı saniyelerce boş tutuyordu. Elde kopya varsa
    // beklemenin anlamı yok: kısa süre sonra kopyaya geçiliyor.
    const tazele = () => sunucudanTazele(anahtar, getirici);
    const veri = paket ? await sinirla(tazele(), BEKLEME_SINIRI) : await tazele();
    yerelZamanYaz(null);
    return veri;
  } catch (hata) {
    const gecikme = hata instanceof ZamanAsimi;
    if (!gecikme && !baglantiHatasi(hata) && baglantiVar()) throw hata;
    if (!paket) throw hata;

    yerelZamanYaz(paket.zaman);
    return paket.veri;
  }
}

/** Kopyayı sunucudan tazeler — canlı abonelik menü değişince bunu çağırıyor. */
export function onbellegiTazele<T>(anahtar: string, getirici: () => Promise<T>) {
  return sunucudanTazele(anahtar, getirici).catch(() => {});
}

/**
 * Supabase okumaları hatayı fırlatmıyor, sonucun içinde döndürüyor: kontrol
 * edilmezse bağlantı kopukluğu "boş liste" gibi görünür ve menü bomboş açılır.
 * Önbelleğe bağlı her okuma sonucunu buradan geçiriyor.
 */
export function hataysaFirlat(...sonuclar: { error: unknown }[]) {
  for (const s of sonuclar) {
    if (s.error) {
      const m = (s.error as { message?: string }).message;
      throw new Error(m || "Bilgiler okunamadı.");
    }
  }
}

/** "14:20" ya da bugün değilse "18 Ağu 14:20". */
export function zamanMetni(zaman: number) {
  const t = new Date(zaman);
  const saat = t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const bugun = new Date().toDateString() === t.toDateString();
  if (bugun) return saat;
  return `${t.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${saat}`;
}

// Modül kendi durumunu bellekte tutuyor: sıcak güncelleme yerine tam yenileme.
durumluModul(import.meta.hot);
