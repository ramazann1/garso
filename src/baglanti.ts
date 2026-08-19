import { useEffect, useState } from "react";

/**
 * Sunucuya ulaşılıyor mu.
 *
 * Tarayıcının kendi `navigator.onLine` bilgisi yalnız "ağ kartı bağlı mı"
 * diyor: modem açık ama internet yoksa, ya da Supabase'e ulaşılamıyorsa
 * çevrimiçi görünüyor. Kasada bunun karşılığı, garsonun bağlantı var sanıp
 * sipariş girmesi. Onun için gerçekten istek atıp bakıyoruz.
 *
 * İki kaynak birlikte çalışıyor: düzenli yoklama ve gerçek isteklerin sonucu.
 * Kaydetme çağrısı ağ yüzünden düştüğünde `kopukBildir()` durumu anında
 * çeviriyor — bir sonraki yoklamayı beklemeden şerit iniyor.
 */

const ADRES = import.meta.env.VITE_SUPABASE_URL;
const ANAHTAR = import.meta.env.VITE_SUPABASE_KEY;

/** Bağlantı varken seyrek yokluyoruz: her yoklama boşa giden bir istek. */
const ARALIK_ACIK = 30_000;

/** Kopukken sık: bağlantı gelir gelmez şeridin inmesi gerekiyor. */
const ARALIK_KOPUK = 5_000;

/** Yoklama bu süre içinde cevap vermezse ulaşılamıyor sayılıyor. */
const BEKLEME_SINIRI = 6_000;

let cevrimici = true;
const dinleyiciler = new Set<(durum: boolean) => void>();
let zamanlayici: ReturnType<typeof setTimeout> | null = null;

function durumYaz(yeni: boolean) {
  if (yeni === cevrimici) return;
  cevrimici = yeni;
  for (const d of dinleyiciler) d(yeni);
  // Durum değişince sıradaki yoklamanın aralığı da değişiyor.
  zamanla();
}

/**
 * Sunucuya ulaşılıyor mu — REST kapısına en ucuz istek. Cevabın içeriği
 * ilgilendirmiyor, hata kodu bile olsa cevap dönmesi yeterli: sunucu
 * konuşuyor demektir.
 */
async function yokla() {
  if (!navigator.onLine) return false;
  try {
    const durdur = AbortSignal.timeout(BEKLEME_SINIRI);
    await fetch(`${ADRES}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: ANAHTAR },
      cache: "no-store",
      signal: durdur,
    });
    return true;
  } catch {
    return false;
  }
}

function zamanla() {
  if (zamanlayici) clearTimeout(zamanlayici);
  zamanlayici = setTimeout(async () => {
    durumYaz(await yokla());
    zamanla();
  }, cevrimici ? ARALIK_ACIK : ARALIK_KOPUK);
}

/**
 * Ağ hatasına takılan bir istek durumu hemen çeviriyor. Sunucudan gelen
 * "yetkin yok" gibi cevaplar bağlantı sorunu değil; yalnız isteğin hiç
 * ulaşamadığı durumlar buraya düşüyor.
 */
export function kopukBildir() {
  durumYaz(false);
}

/** Bir istek başarıyla döndü: yoklamayı beklemeden bağlantı var diyoruz. */
export function ulasildiBildir() {
  durumYaz(true);
}

export const baglantiVar = () => cevrimici;

/** Ekran dışından izleme — yazma kuyruğu bağlantı gelince kendini boşaltıyor. */
export function baglantiDinle(f: (durum: boolean) => void) {
  dinleyiciler.add(f);
  return () => {
    dinleyiciler.delete(f);
  };
}

/**
 * Hatanın sebebi bağlantı mı. Supabase ağ hatasında "Failed to fetch" atıyor;
 * tarayıcıya göre metin değişiyor, o yüzden birkaç kalıba birden bakılıyor.
 */
export function baglantiHatasi(hata: unknown) {
  if (!navigator.onLine) return true;
  const metin = hata instanceof Error ? `${hata.name} ${hata.message}` : String(hata);
  return /failed to fetch|networkerror|network request failed|load failed|aborted|timeout/i.test(
    metin
  );
}

/**
 * Kullanıcıya gösterilecek hata metni. Bağlantı yüzünden düşen işlemde
 * "Adisyon kaydedilemedi" demek yanıltıyor: garson kaydı yanlış girdiğini
 * sanıp baştan deniyor. Sebebi ağsa onu söylüyoruz, değilse işlemin kendi
 * mesajı geçerli.
 */
export function hataMesaji(hata: unknown, varsayilan: string) {
  if (baglantiHatasi(hata)) {
    return "Bağlantı yok, kayıt sunucuya gönderilemedi. Ekrandaki sipariş duruyor; bağlantı gelince yeniden kaydedin.";
  }
  return hata instanceof Error && hata.message ? hata.message : varsayilan;
}

/**
 * Bir işi süreyle sınırlar. Bağlantı yokken bazı istekler hata vermek yerine
 * cevap bekleyip asılı kalıyor (oturum tazeleme böyle); program açılışta bunu
 * beklerse ekranda sonsuza kadar yükleniyor halkası döner. Süre dolunca iş
 * bitmemiş sayılıyor ve ekran çizilmeye devam ediyor.
 */
export function sureSinirli<T>(is: Promise<T>, sinir = 5_000) {
  return Promise.race([
    is,
    new Promise<undefined>((coz) => setTimeout(() => coz(undefined), sinir)),
  ]);
}

/** Ekranların bağlantı durumunu izlemesi. */
export function useBaglanti() {
  const [durum, setDurum] = useState(cevrimici);

  useEffect(() => {
    dinleyiciler.add(setDurum);
    setDurum(cevrimici);
    return () => {
      dinleyiciler.delete(setDurum);
    };
  }, []);

  return durum;
}

/**
 * İzlemeyi başlatır. Tarayıcının kendi olayları ilk haberci: kablo çekilince
 * yoklamayı beklemeden anlıyoruz. Sekme arkaya alınınca yoklama duruyor,
 * öne gelince ilk iş durum tazeleniyor — arka planda boşuna istek atılmasın.
 */
export function baglantiyiIzle() {
  const tazele = async () => {
    durumYaz(await yokla());
    // Yoklama döngüsü her tazelemede yeniden kuruluyor. Yalnız `durumYaz`a
    // bırakılırsa durum değişmediğinde döngü kurulmuyor ve izleme sessizce
    // ölüyordu: bir kez kopuk denen ekran, bağlantı gelse de öyle kalıyordu.
    zamanla();
  };

  window.addEventListener("offline", () => durumYaz(false));
  window.addEventListener("online", tazele);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tazele();
    else if (zamanlayici) clearTimeout(zamanlayici);
  });

  tazele();
}
