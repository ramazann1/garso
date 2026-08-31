import { durumluModul } from "./sicakGuncelleme";
import { acikOturum } from "./oturum";
import type { AcikOturum } from "./oturum";

/**
 * Kilitli ekrandan PIN'le geçmenin internetsiz karşılığı.
 *
 * PIN'i normalde sunucu doğruluyor ve özeti tarayıcıya hiç inmiyor (2 Eyl
 * kararı: `pin_hash` sütunu yetkiyle gizlendi, çünkü çalışan biri yöneticinin
 * özetini okuyup kırabiliyordu). O karar burada bozulmuyor — sunucudan hâlâ
 * hiçbir özet çıkmıyor.
 *
 * Bunun yerine cihaz kendi doğrulayıcısını **kişi o kasada internet varken
 * PIN'le geçtiği an** üretiyor: PIN'i zaten kullanıcı yazmış oluyor, sunucu da
 * doğru olduğunu söylemiş oluyor. Böylece cihazda yalnız o kasada fiilen
 * çalışan kişilerin doğrulayıcısı birikiyor; hiç uğramamış birinin PIN'i
 * oraya inmiyor.
 *
 * Doğrulayıcı PBKDF2 ile üretiliyor: her kişide ayrı tuz (aynı PIN iki kişide
 * aynı değeri vermesin) ve yüksek tur sayısı (dört hanede 9.000 ihtimal var,
 * ucuz özetle cihazı eline geçiren saniyeler içinde tarardı).
 */

const ANAHTAR = "garso-pin-yerel";
const TUR = 250_000;

/**
 * Doğrulayıcının ömrü. Kişi PIN'ini başka bir cihazdan değiştirirse buradaki
 * kopya bunu duymuyor ve eski PIN internetsizken çalışmaya devam ederdi.
 * Kopya kişi her online geçişinde tazelendiği için, gündelik kullanan birinde
 * süre hiç dolmuyor; dolduğu durum zaten aylardır o kasaya uğramamış kişi.
 */
const OMUR = 30 * 24 * 60 * 60 * 1000;

// Kişinin adı ve yetkileri de kayda giriyor: internetsizken `kisiyiYukle`
// çalışamıyor, oysa geçen kişinin yetkileri bilinmeden ekran kurulamaz.
// Kopya kişi PIN'le her geçişinde tazeleniyor, yani en son bilinen hâli.
type Kayit = {
  personelId: number;
  kisi: AcikOturum;
  tuz: string;
  ozet: string;
  zaman: number;
};

function onaltiliya(veri: ArrayBuffer | Uint8Array) {
  const bayt = veri instanceof Uint8Array ? veri : new Uint8Array(veri);
  return Array.from(bayt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bayta(onaltili: string) {
  const bayt = new Uint8Array(onaltili.length / 2);
  for (let i = 0; i < bayt.length; i++) {
    bayt[i] = parseInt(onaltili.slice(i * 2, i * 2 + 2), 16);
  }
  return bayt;
}

async function ozetle(pin: string, tuz: Uint8Array) {
  const anahtar = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bit = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: tuz as BufferSource, iterations: TUR, hash: "SHA-256" },
    anahtar,
    256
  );
  return onaltiliya(bit);
}

function hepsiniOku(): Kayit[] {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    const hepsi = ham ? (JSON.parse(ham) as Kayit[]) : [];
    return hepsi.filter((k) => Date.now() - k.zaman < OMUR);
  } catch {
    return [];
  }
}

function hepsiniYaz(kayitlar: Kayit[]) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(kayitlar));
  } catch {
    // Yer dolduysa çevrimdışı geçiş kurulamaz; program çalışmaya devam etsin.
  }
}

/**
 * Sunucu PIN'i doğruladıktan sonra çağrılıyor: aynı PIN internetsizken de
 * çalışsın diye cihaza doğrulayıcı bırakılıyor. Kişinin PIN'i sonradan
 * değişirse eski kayıt burada üzerine yazılıyor.
 */
export async function yerelPinKaydet(kisi: AcikOturum, pin: string) {
  const tuz = crypto.getRandomValues(new Uint8Array(16));
  const kayit: Kayit = {
    personelId: kisi.id,
    kisi,
    tuz: onaltiliya(tuz),
    ozet: await ozetle(pin, tuz),
    zaman: Date.now(),
  };
  hepsiniYaz([...hepsiniOku().filter((k) => k.personelId !== kisi.id), kayit]);
}

/**
 * İnternetsizken PIN kime ait — bilinmiyorsa null.
 *
 * Bütün kayıtlar tek tek deneniyor; PIN aynı işletmede iki kişide olamadığı
 * için ilk tutan doğru kişi. Kayıt sayısı bir kasada birkaç kişiyi geçmiyor.
 */
export async function yerelPinCoz(pin: string) {
  const isletmeId = acikOturum()?.isletmeId;
  if (!isletmeId) return null;

  for (const kayit of hepsiniOku()) {
    if (kayit.kisi.isletmeId !== isletmeId) continue;
    if ((await ozetle(pin, bayta(kayit.tuz))) === kayit.ozet) return kayit.kisi;
  }
  return null;
}

/** Bu cihazda internetsiz geçebilecek kimse var mı — kilit ekranı mesajı için. */
export function yerelPinVar() {
  const isletmeId = acikOturum()?.isletmeId;
  return hepsiniOku().some((k) => k.kisi.isletmeId === isletmeId);
}

/**
 * Kişinin PIN'i değiştiğinde çağrılıyor: eski doğrulayıcı internetsizken hâlâ
 * geçerli olurdu. Yalnız değişikliğin yapıldığı cihazı temizliyor, başka
 * kasalardaki kopyayı süre kapatıyor.
 */
export function yerelPinUnut(personelId: number) {
  hepsiniYaz(hepsiniOku().filter((k) => k.personelId !== personelId));
}

/** Çıkışta cihazdaki diğer kopyalarla birlikte siliniyor. */
export function yerelPinleriSil() {
  localStorage.removeItem(ANAHTAR);
}

durumluModul(import.meta.hot);
