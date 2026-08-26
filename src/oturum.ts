import { durumluModul } from "./sicakGuncelleme";
import { useEffect, useState } from "react";
import { baglantiHatasi, baglantiVar } from "./baglanti";
import { onbellegiTemizle, onbellekOku, onbellekYaz } from "./onbellek";
import { supabase } from "./supabase";
import { telefonSade } from "./personel";
import { etkinYetkiler, kisiYetkileriniGetir, rolYetkileriniGetir, yetkileriGetir } from "./yetkiler";

export type AcikOturum = {
  id: number;
  ad: string;
  rolId: number | null;
  rolAd: string;
  isletmeId: number;
  /** Kişinin gerçekte kullanabildiği yetki kodları — rol + kişiye özel istisnalar. */
  yetkiler: string[];
};

const KILIT_ANAHTARI = "garso-kilit";
const GECICI_ANAHTARI = "garso-gecici";
const SEKME_ANAHTARI = "garso-sekme";

// Kimlik artık Supabase Auth'ta; buradaki kayıt onun uygulama tarafındaki
// karşılığı (ad, rol, yetkiler). Ekranlar useOturum ile buraya bakıyor.
let acik: AcikOturum | null = null;
let kilitli = false;
const dinleyiciler = new Set<() => void>();

function duyur() {
  for (const f of dinleyiciler) f();
}

export function acikOturum() {
  return acik;
}

const OTURUM_ANAHTARI = "oturum";

// Kişi bilgisi cihazda da duruyor. Kimlik bileti zaten tarayıcıda kalıcı; eksik
// olan ad, rol ve yetkilerdi — onlar sunucudan okunduğu için internetsiz açılan
// kasa giriş ekranına düşüyordu. Kopya yalnız okuma bağlantı yüzünden
// düştüğünde kullanılıyor.
// Kimlik bileti kime aitse kopya da ona: aynı cihazda başka hesapla girilmişse
// eski kişinin yetkileriyle içeri girilmesin.
function oturumuHatirla(authId?: string) {
  if (!acik) return;
  const eski = onbellekOku<HatirlananOturum>(OTURUM_ANAHTARI)?.veri;
  onbellekYaz(OTURUM_ANAHTARI, { authId: authId ?? eski?.authId ?? "", kisi: acik });
}

type HatirlananOturum = { authId: string; kisi: AcikOturum };

// Telefon numarasından hesap adresi: veritabanındaki hesap_epostasi ile aynı
// kural. Kullanıcı bu adresi hiç görmüyor.
export function hesapEpostasi(telefon: string) {
  return `${telefonSade(telefon)}@garso.app`;
}

// Yetki kümesi girişte bir kez hesaplanıp bellekte tutuluyor; her düğme için
// veritabanına gidilmiyor. Yetkiler değişirse kişi yeniden giriş yapıyor.
async function kisiyiYukle(sutun: "auth_id" | "id", deger: string | number) {
  const { data, error } = await supabase
    .from("personel")
    .select("id, ad, rol_id, isletme_id, aktif, giris_engelli, roller (ad)")
    .eq(sutun, deger)
    .single();

  // Okuma hiç yapılamadıysa "kişi yok" demek değil. Ayrım kritik: aşağıdaki
  // çağıran kişi bulamayınca oturumu kapatıyor, yani bağlantı kopukluğu kalıcı
  // çıkışa dönüşürdü — kasa internetsiz kalınca herkes oturumundan düşerdi.
  if (error) throw new Error("Kişi bilgisi okunamadı.");

  const satir = data as any;
  if (!satir || !satir.aktif || satir.giris_engelli) return null;

  const rolId = satir.rol_id ?? null;
  const [yetkiler, rolKumesi, kisiDurumlari] = await Promise.all([
    yetkileriGetir(),
    rolYetkileriniGetir(),
    kisiYetkileriniGetir(satir.id),
  ]);

  return {
    id: satir.id,
    ad: satir.ad,
    rolId,
    rolAd: satir.roller?.ad ?? "",
    isletmeId: satir.isletme_id,
    yetkiler: [...etkinYetkiler(yetkiler, rolId, rolKumesi, kisiDurumlari)],
  } as AcikOturum;
}

// Program açılırken bir kez çalışıyor: Auth'ta oturum duruyorsa kişi bilgisi
// yeniden okunuyor, böylece aradaki rol ve yetki değişiklikleri de geliyor.
export async function oturumuYukle() {
  // "Beni hatırla" işaretlenmemişse oturum yalnızca o sekme boyunca yaşıyor;
  // sekme kapanınca işaret kayboluyor ve program burada oturumu düşürüyor.
  if (localStorage.getItem(GECICI_ANAHTARI) === "1" && !sessionStorage.getItem(SEKME_ANAHTARI)) {
    localStorage.removeItem(GECICI_ANAHTARI);
    await supabase.auth.signOut();
    return;
  }

  // Kimlik biletinin geçerliliği sunucuya sorulurken (bilet süresi dolmuşsa
  // tazeleme isteği bağlantı yokken saniyelerce asılı kalıyor) ekran giriş
  // ekranında bekliyordu. Cihazdaki kopya varsa oturum hemen kuruluyor,
  // doğrulama arkada sürüyor: yanlışsa aşağıda düzeltiliyor.
  const hatirlanan = onbellekOku<HatirlananOturum>(OTURUM_ANAHTARI);
  if (hatirlanan) {
    acik = hatirlanan.veri.kisi;
    kilitli = localStorage.getItem(KILIT_ANAHTARI) === "1";
    duyur();
  }

  const { data } = await supabase.auth.getSession();
  // Bağlantı yokken bilet tazelenemediği için de "oturum yok" dönebiliyor;
  // o durumda kopya duruyor, oturum düşürülmüyor.
  if (!data.session) {
    if (acik && baglantiVar()) {
      acik = null;
      onbellegiTemizle();
      duyur();
    }
    return;
  }

  try {
    // Ekranda görünen kişi sunucunun bildiği kişiyle aynı olmalı. Bilet kasayı
    // açanda kalıyor ama başındaki kişi PIN'le değişiyor; doğrudan bilete
    // bakılsaydı sayfa yenilendiğinde kasayı açan geri gelirdi — PIN'le geçen
    // garsonun yerine yöneticinin ekranı açılırdı. Kimin çalıştığını bilen tek
    // yer veritabanı, oraya soruluyor.
    const { data: kisiId } = await supabase.rpc("oturum_personeli");
    acik = kisiId
      ? await kisiyiYukle("id", kisiId as number)
      : await kisiyiYukle("auth_id", data.session.user.id);
  } catch (hata) {
    // Bağlantı yoksa kişi bilgisi cihazdaki kopyadan kuruluyor; kasa
    // internetsiz açılınca da açık oturumla geliyor. Başka bir hataysa
    // (yetki gibi) eski bilgiyle devam etmek yanlış olur.
    const paket =
      !baglantiVar() || baglantiHatasi(hata)
        ? onbellekOku<HatirlananOturum>(OTURUM_ANAHTARI)
        : null;
    if (!paket || paket.veri.authId !== data.session.user.id) {
      acik = null;
      throw hata;
    }
    acik = paket.veri.kisi;
  }

  if (!acik) {
    await supabase.auth.signOut();
    return;
  }
  oturumuHatirla(data.session.user.id);
  kilitli = localStorage.getItem(KILIT_ANAHTARI) === "1";
  duyur();
}

// Tek alana ya numara ya e-posta yazılıyor; hangisi olduğu içinde @ var mı
// diye anlaşılıyor. E-postanın hangi hesaba karşılık geldiğini veritabanı
// söylüyor — kod tarafı personel tablosunu taramıyor.
export async function girisYap(kimlik: string, sifre: string, kalici: boolean) {
  let adres = hesapEpostasi(kimlik);
  if (kimlik.includes("@")) {
    const { data } = await supabase.rpc("eposta_hesabi", { giris: kimlik.trim() });
    if (!data) throw new Error("Bilgiler doğru değil.");
    adres = data as string;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: adres,
    password: sifre,
  });
  if (error || !data.user) throw new Error("Bilgiler doğru değil.");

  const kisi = await kisiyiYukle("auth_id", data.user.id);
  if (!kisi) {
    await supabase.auth.signOut();
    throw new Error("Bu hesap kullanıma kapalı.");
  }

  if (kalici) {
    localStorage.removeItem(GECICI_ANAHTARI);
  } else {
    localStorage.setItem(GECICI_ANAHTARI, "1");
    sessionStorage.setItem(SEKME_ANAHTARI, "1");
  }

  // Yeni giriş her zaman kişinin kendisiyle başlıyor: aynı cihazda önceki
  // vardiyadan kalmış bir PIN geçişi devralınmasın.
  await supabase.rpc("oturum_kisisini_birak");

  acik = kisi;
  oturumuHatirla(data.user.id);
  kilidiKaldir();
  duyur();
  return kisi;
}

/**
 * Yeni işletme açar ve hemen giriş yapar. Bütün kurulum veritabanındaki tek
 * fonksiyonda dönüyor (`isletme_kur`): işletme, roller, yetkiler, temel
 * tanımlar ve ilk yönetici hesabı ya hep birlikte oluşuyor ya hiç.
 */
export async function isletmeKur(
  isletmeAd: string,
  yoneticiAd: string,
  telefon: string,
  sifre: string
) {
  const { error } = await supabase.rpc("isletme_kur", {
    p_isletme_ad: isletmeAd,
    p_yonetici_ad: yoneticiAd,
    p_telefon: telefon,
    p_sifre: sifre,
  });
  // Veritabanından gelen mesaj kullanıcıya gösterilecek kadar açık yazıldı.
  if (error) throw new Error(error.message);

  return girisYap(telefon, sifre, true);
}

export async function oturumuKapat() {
  // PIN'le geçilen kişi bilette kayıtlı duruyor; bilet devredilirken silinmezse
  // sonraki kişi onun yetkileriyle çalışırdı.
  await supabase.rpc("oturum_kisisini_birak");
  kilidiKaldir();
  localStorage.removeItem(GECICI_ANAHTARI);
  acik = null;
  // Çıkışta cihazdaki kopyalar da gidiyor: kasayı devreden kişi kendi
  // işletmesinin menüsünü ve yetkilerini geride bırakmasın.
  onbellegiTemizle();
  duyur();
  await supabase.auth.signOut();
}

// Kilit kasa ekranının gündelik hâli: program açık kalıyor, başındaki kişi
// değişiyor. Yenilemeye dayansın diye kilit de tarayıcıya yazılıyor.
export function kilitle() {
  kilitli = true;
  localStorage.setItem(KILIT_ANAHTARI, "1");
  duyur();
}

function kilidiKaldir() {
  kilitli = false;
  localStorage.removeItem(KILIT_ANAHTARI);
}

export function kilitliMi() {
  return kilitli && acik !== null;
}

// PIN programı açan bir anahtar değil: yalnızca kilitli ekranda, zaten açık
// olan oturumun yerine geçen kişiyi belirliyor. Aranan kişi bu yüzden aynı
// işletmenin personeli arasından çıkıyor.
//
// Kimlik bileti kasayı açan hesapta kalıyor, değişen kişi uygulama katmanında
// tutuluyor — ortak kasa terminalinin çalışma şekli bu. Adisyonu kimin açtığı,
// turu kimin yazdığı bu kişiye yazılacak.
export async function pinIleAc(pin: string) {
  if (!kilitliMi()) throw new Error("Ekran kilitli değil.");

  // PIN'i sunucu doğruluyor. Tarayıcı karşılaştırsaydı "ben şu kişiyim" demek
  // kurcalayana kalırdı; üstelik veritabanı tarafı kimin çalıştığını hiç
  // öğrenmiyordu ve yetki denetimleri kasayı açan kişiye göre işliyordu.
  // Fonksiyon kişiyi hem doğruluyor hem oturumun üstüne yazıyor.
  const { data, error } = await supabase.rpc("pin_ile_gec", { pin });
  if (error || !data) throw new Error("PIN doğru değil.");

  const kisi = await kisiyiYukle("id", data as number);
  if (!kisi) throw new Error("PIN doğru değil.");

  acik = kisi;
  oturumuHatirla();
  kilidiKaldir();
  duyur();
  return kisi;
}

/** Ekranların oturuma abone olma yolu; giriş/çıkış/kilitte hepsi birlikte yenileniyor. */
export function useOturum() {
  const [, yenile] = useState(0);
  useEffect(() => {
    const f = () => yenile((n) => n + 1);
    dinleyiciler.add(f);
    return () => {
      dinleyiciler.delete(f);
    };
  }, []);
  return { oturum: acik, kilitli: kilitliMi() };
}

/** Tek yetkinin sorgusu — satış ekranları indirim/ikram gibi işlemlerde çağıracak. */
export function yetkiVar(kod: string) {
  return !!acik?.yetkiler.includes(kod);
}

// İndirim düğmesi iki yetkiden birine bakıyor: serbest indirim yapabilen de,
// yalnız hazır tanımlardan seçebilen de düğmeyi görüyor. İçeride ne kadarının
// açık olduğuna İndirim penceresi karar veriyor.
export function indirimYapabilir() {
  return yetkiVar("odeme.indirim") || yetkiVar("odeme.indirim_tanimli");
}

// İlk kurulumda henüz kimsenin hesabı yoktur; giriş ekranı konsa işletme kendi
// programına giremez. İlk hesap açılana kadar ekranlar açık kalıyor.
// Soru giriş yapılmadan soruluyor; satır güvenliği personel tablosunu anonim
// bağlantıya kapattığı için cevabı veritabanı fonksiyonu veriyor.
export async function girisKuruldu() {
  const { data } = await supabase.rpc("giris_kuruldu");
  return data === true;
}

// Modül kendi durumunu bellekte tutuyor: sıcak güncelleme yerine tam yenileme.
durumluModul(import.meta.hot);
