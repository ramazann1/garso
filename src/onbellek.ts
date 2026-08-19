import { useEffect, useState } from "react";
import { baglantiHatasi, baglantiVar } from "./baglanti";
import { acikOturum } from "./oturum";

/**
 * Seyrek değişen tanım verilerinin cihazdaki kopyası.
 *
 * Kural: **önce sunucu, olmazsa yerel.** Bağlantı varken her okuma sunucudan
 * gelir ve kopya tazelenir; yalnız istek ağ yüzünden düştüğünde cihazdaki
 * kopya kullanılır. Bayat menüden satış riski böyle sınırlanıyor — kopya bir
 * hızlandırma değil, yalnızca kopukluk sigortası.
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
 * Sunucudan okur, tazeyi kopyaya yazar. Okuma ağ yüzünden düşerse cihazdaki
 * kopyayı döndürür. Sunucudan gelen başka bir hata (yetki gibi) kopyaya
 * düşürmez — orada sorun bağlantı değil, yanlış veriyle devam etmek yanlış.
 */
export async function onbellekliGetir<T>(anahtar: string, getirici: () => Promise<T>): Promise<T> {
  const paket = onbellekOku<T>(anahtar);

  // Bağlantının olmadığı zaten biliniyorsa sunucuyu denemenin anlamı yok:
  // istek nasılsa düşecek, ekran o arada yükleniyor halkasıyla bekliyordu.
  // Kopya varsa doğrudan veriliyor, sayfa anında açılıyor.
  if (paket && !baglantiVar()) {
    yerelZamanYaz(paket.zaman);
    return paket.veri;
  }

  try {
    // Çevrimdışı bir istek hemen hata vermiyor, cevap bekleyip asılı kalıyor;
    // hatayı beklemek ekranı saniyelerce boş tutuyordu. Elde kopya varsa
    // beklemenin anlamı yok: kısa süre sonra kopyaya geçiliyor.
    const veri = paket ? await sinirla(getirici(), BEKLEME_SINIRI) : await getirici();
    onbellekYaz(anahtar, veri);
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
