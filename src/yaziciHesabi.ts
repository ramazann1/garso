import { supabase } from "./supabase";

/**
 * Kasa köprüsünün giriş hesabı.
 *
 * Köprü fiş basmak için Garso'ya giriş yapıyor. Bunu işletmecinin kendi
 * hesabıyla yapmıyor: şifre kasadaki bilgisayarda duruyor ve o makineye
 * ulaşan biri yönetici olurdu. Ayrıca işletmeci şifresini değiştirdiği gün
 * köprü sessizce susardı.
 *
 * Hesabın yetkisi yok — yazıcı listesini okuyup kuyruktan iş almaktan başka
 * bir şey yapamıyor.
 */

export type YaziciHesabi = {
  telefon: string;
  kurulu: boolean;
};

export async function yaziciHesabiniGetir(): Promise<YaziciHesabi | null> {
  const { data } = await supabase.rpc("yazici_hesabi_durumu");
  const satir = (data as any[])?.[0];
  if (!satir) return null;
  return { telefon: satir.telefon ?? "", kurulu: !!satir.kurulu };
}

/**
 * Hesabı kurar ya da şifresini yeniler; ikisi de aynı düğmeden çıkıyor.
 *
 * Dönen şifre bir daha okunamıyor — hiçbir yerde saklanmıyor. Ekran onu bir
 * kez gösteriyor, işletmeci köprüye yazıyor. Kaybolursa yenisi üretiliyor.
 */
export async function yaziciHesabiKur(telefon: string): Promise<string> {
  const { data, error } = await supabase.rpc("yazici_hesabi_kur", {
    p_telefon: telefon,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
