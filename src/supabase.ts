import { createClient } from "@supabase/supabase-js";
import { kopukBildir, ulasildiBildir } from "./baglanti";

/**
 * Sunucuya giden her istek bağlantı durumunu besliyor. Yüz küsur çağrının her
 * birine kontrol koymaktansa istemcinin kendi `fetch`'i sarılıyor: nereden
 * çağrılırsa çağrılsın, isteğin ulaşıp ulaşmadığı buradan görünüyor.
 *
 * Ayrım önemli — sunucudan gelen "yetkin yok" gibi bir cevap bağlantı sorunu
 * değil, cevap dönmesi zaten ulaşıldığının kanıtı. Yalnız isteğin hiç
 * ulaşamadığı hâller kopukluk sayılıyor.
 */
/**
 * Cevapsız kalan istek bu süre sonunda kesiliyor. Çevrimdışı bir istek her
 * zaman hata vermiyor: bağlantı kurulamayınca tarayıcı beklemeye geçiyor,
 * ekranlar da o beklemede asılı kalıyordu. Kesilen istek hata veriyor, hata
 * da ekranda karşılığı olan bir mesaja dönüyor.
 */
const CEVAP_SINIRI = 12_000;

const izlenenFetch: typeof fetch = async (adres, secenekler) => {
  // Çağıranın kendi iptal isteği varsa o da geçerli kalıyor; ikisinden hangisi
  // önce koparsa istek onunla bitiyor.
  const kesici = new AbortController();
  const sayac = setTimeout(() => kesici.abort(), CEVAP_SINIRI);
  secenekler?.signal?.addEventListener("abort", () => kesici.abort());

  try {
    const cevap = await fetch(adres, { ...secenekler, signal: kesici.signal });
    ulasildiBildir();
    return cevap;
  } catch (hata) {
    kopukBildir();
    throw hata;
  } finally {
    clearTimeout(sayac);
  }
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  { global: { fetch: izlenenFetch } }
);
