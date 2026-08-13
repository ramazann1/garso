import { createClient } from "@supabase/supabase-js";
import { hesapEpostasi } from "./ayar.js";

let istemci = null;

export async function girisYap(ayar) {
  istemci = createClient(ayar.sunucu, ayar.anahtar, {
    auth: { persistSession: false, autoRefreshToken: true },
  });

  const { error } = await istemci.auth.signInWithPassword({
    email: hesapEpostasi(ayar.telefon),
    password: ayar.sifre,
  });
  if (error) throw new Error("Girilemedi — telefon ya da şifre doğru değil.");

  const { data } = await istemci
    .from("personel")
    .select("ad, isletmeler (ad, kod)")
    .eq("auth_id", (await istemci.auth.getUser()).data.user.id)
    .single();

  return {
    kisi: data?.ad ?? "",
    isletme: data?.isletmeler?.ad ?? "",
    kod: data?.isletmeler?.kod ?? null,
  };
}

/**
 * Yazıcı tanımları bulutta duruyor, köprü onları kendinde tutmuyor. Kasadaki
 * kişi Ayarlar'dan yeni yazıcı eklediğinde köprüye dokunmak gerekmesin diye
 * liste her turda değil, arada bir tazeleniyor.
 */
let yazicilar = new Map();
let sonOkuma = 0;

export async function yazicilariGetir(zorla = false) {
  if (!zorla && yazicilar.size > 0 && Date.now() - sonOkuma < 60_000) return yazicilar;

  const { data, error } = await istemci
    .from("yazicilar")
    .select("id, ad, baglanti, ip, port, sistem_ad, kagit_genislik, zil, aktif");
  if (error) throw new Error(`Yazıcılar okunamadı: ${error.message}`);

  yazicilar = new Map(
    (data ?? []).map((y) => [
      y.id,
      {
        id: y.id,
        ad: y.ad,
        baglanti: y.baglanti,
        ip: y.ip,
        port: y.port ?? 9100,
        kagitGenislik: y.kagit_genislik ?? 80,
        zil: y.zil ?? false,
        aktif: y.aktif,
      },
    ])
  );
  sonOkuma = Date.now();
  return yazicilar;
}

/** Kuyruktan iş alma — satırı üstümüze alıp basmaya hazır hale getiriyor. */
export async function isAl(cihaz, adet = 5) {
  const { data, error } = await istemci.rpc("kuyruktan_al", { p_cihaz: cihaz, p_adet: adet });
  if (error) throw new Error(`Kuyruk okunamadı: ${error.message}`);
  return data ?? [];
}

/**
 * Kuyruğa yeni fiş düştüğü anda haber veren canlı bağlantı. Yoklama tek başına
 * kalsaydı fiş en kötü ihtimalle bir tur boyu beklerdi; mutfakta o bekleme
 * hissediliyor. Bağlantı koparsa yoklama zaten devam ediyor, fiş kaybolmuyor.
 */
export function kuyruguDinle(haberVer) {
  istemci
    .channel("yazdirma-kuyrugu")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "yazdirma_kuyrugu" },
      () => haberVer()
    )
    .subscribe();
}

export async function sonucBildir(id, basarili, hata = null) {
  const { error } = await istemci.rpc("kuyruk_sonuc", {
    p_id: id,
    p_basarili: basarili,
    p_hata: hata ? String(hata).slice(0, 300) : null,
  });
  if (error) throw new Error(`Sonuç yazılamadı: ${error.message}`);
}
