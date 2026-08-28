import { supabase } from "./supabase";
import { acikOturum } from "./oturum";

/**
 * Menü görselleri. Dosyalar Supabase'in `menu` kovasında, her işletme kendi
 * klasöründe duruyor; veritabanında yalnız yol tutuluyor.
 *
 * Menüyü açan müşterinin hesabı olmadığı için kova herkese okumaya açık —
 * içinde zaten menüde görünen görsellerden başka bir şey yok.
 */

const KOVA = "menu";

/** Fotoğraf 5 MB, video 20 MB. Telefondan çekilen kare bunun altında kalıyor. */
const SINIR_FOTO = 5 * 1024 * 1024;
const SINIR_VIDEO = 20 * 1024 * 1024;

export const medyaTuru = (dosya: File) => (dosya.type.startsWith("video/") ? "video" : "foto");

/** Depodaki yolun tarayıcıda açılabilir tam adresi. */
export function medyaAdresi(yol: string) {
  return supabase.storage.from(KOVA).getPublicUrl(yol).data.publicUrl;
}

/**
 * Dosyayı depoya koyup yolunu döndürür. Ad çakışmasın diye zaman damgası ve
 * rastgele son ek konuyor: aynı adla ikinci kez yüklenen fotoğraf eskisini
 * ezmiyor, başka üründe kullanılan görsel bozulmuyor.
 */
export async function medyaYukle(dosya: File) {
  const isletmeId = acikOturum()?.isletmeId;
  if (!isletmeId) throw new Error("Görsel yüklenemedi.");

  const tur = medyaTuru(dosya);
  if (dosya.size > (tur === "video" ? SINIR_VIDEO : SINIR_FOTO)) {
    throw new Error(
      tur === "video"
        ? "Video en fazla 20 MB olabilir."
        : "Fotoğraf en fazla 5 MB olabilir."
    );
  }

  const uzanti = dosya.name.split(".").pop()?.toLowerCase() || (tur === "video" ? "mp4" : "jpg");
  const yol = `${isletmeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${uzanti}`;

  const { error } = await supabase.storage.from(KOVA).upload(yol, dosya, {
    contentType: dosya.type || undefined,
  });
  if (error) throw new Error("Görsel yüklenemedi.");

  return { yol, tur } as const;
}

/**
 * Dosyayı depodan siler. Menüden çıkarılan görsel depoda kalırsa işletmenin
 * alanı boşuna doluyor. Silme başarısızsa iş durmuyor — kayıt zaten gitti,
 * ekranda görünmüyor.
 */
export async function medyaSil(yol: string) {
  await supabase.storage.from(KOVA).remove([yol]);
}
