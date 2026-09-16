import { supabase } from "./supabase";

export type Yetki = {
  id: number;
  kod: string;
  ad: string;
  grup: string;
  sira: number;
};

/** Kişiye özel istisna: rolden gelen yetkiyi ezer. */
export type KisiDurumu = "rolden" | "verildi" | "kaldirildi";

export async function yetkileriGetir(): Promise<Yetki[]> {
  const { data } = await supabase
    .from("yetkiler")
    .select("id, kod, ad, grup, sira")
    .order("id");
  return ((data as any[]) ?? []).map((y) => ({
    id: y.id,
    kod: y.kod,
    ad: y.ad,
    grup: y.grup,
    sira: y.sira,
  }));
}

/** Yetkileri ekrandaki sırasıyla gruplara ayırır: Sipariş, Ödeme, Tanım… */
export function gruplara(yetkiler: Yetki[]) {
  const gruplar: { ad: string; yetkiler: Yetki[] }[] = [];
  for (const y of [...yetkiler].sort((a, b) => a.sira - b.sira)) {
    const grup = gruplar.find((g) => g.ad === y.grup);
    if (grup) grup.yetkiler.push(y);
    else gruplar.push({ ad: y.grup, yetkiler: [y] });
  }
  return gruplar;
}

// Rol yetkileri "rol_id-yetki_id" anahtarlı küme olarak dönüyor; matris ekranı
// her kutucuk için bu kümeye bakıyor.
export async function rolYetkileriniGetir(): Promise<Set<string>> {
  const { data } = await supabase.from("rol_yetkileri").select("rol_id, yetki_id");
  return new Set(((data as any[]) ?? []).map((r) => `${r.rol_id}-${r.yetki_id}`));
}

// Matris kaydedilirken yalnız değişen satırlara dokunuluyor. Önce hepsini
// silip yeniden yazmak kendi kendini vuruyordu: veritabanı her silinen satırda
// "bu kişinin yetki düzenleme yetkisi var mı" diye sorduğu için, kaydeden
// kişinin kendi yetkisi silindiği anda işlem duruyor ve hiçbir şey kaydedilmiyordu.
export async function rolYetkileriniKaydet(secili: Set<string>) {
  const kayitli = await rolYetkileriniGetir();

  const eklenecek = [...secili]
    .filter((anahtar) => !kayitli.has(anahtar))
    .map((anahtar) => {
      const [rolId, yetkiId] = anahtar.split("-");
      return { rol_id: Number(rolId), yetki_id: Number(yetkiId) };
    });

  const silinecek = [...kayitli].filter((anahtar) => !secili.has(anahtar));

  if (eklenecek.length) {
    // Sunucunun kendi mesajı ekrana çıkıyor: "… yetkiniz yok" gibi cevaplar
    // genel bir cümlenin altında kaybolmasın.
    const { error } = await supabase.from("rol_yetkileri").insert(eklenecek);
    if (error) throw new Error(error.message || "Yetkiler kaydedilemedi.");
  }

  for (const anahtar of silinecek) {
    const [rolId, yetkiId] = anahtar.split("-");
    const { error } = await supabase
      .from("rol_yetkileri")
      .delete()
      .eq("rol_id", Number(rolId))
      .eq("yetki_id", Number(yetkiId));
    if (error) throw new Error(error.message || "Yetkiler kaydedilemedi.");
  }
}

export async function kisiYetkileriniGetir(personelId: number) {
  const { data } = await supabase
    .from("personel_yetkileri")
    .select("yetki_id, izin")
    .eq("personel_id", personelId);

  const durumlar = new Map<number, KisiDurumu>();
  for (const s of (data as any[]) ?? []) {
    durumlar.set(s.yetki_id, s.izin ? "verildi" : "kaldirildi");
  }
  return durumlar;
}

/** Hangi personelin kaç istisnası var — liste satırında göstermek için. */
export async function istisnaSayilari(): Promise<Map<number, number>> {
  const { data } = await supabase.from("personel_yetkileri").select("personel_id");
  const sayilar = new Map<number, number>();
  for (const s of (data as any[]) ?? []) {
    sayilar.set(s.personel_id, (sayilar.get(s.personel_id) ?? 0) + 1);
  }
  return sayilar;
}

export async function kisiYetkileriniKaydet(
  personelId: number,
  durumlar: Map<number, KisiDurumu>
) {
  // "Rolden" seçilen satır istisna değildir; tabloda yeri olmamalı.
  const satirlar = [...durumlar]
    .filter(([, durum]) => durum !== "rolden")
    .map(([yetkiId, durum]) => ({
      personel_id: personelId,
      yetki_id: yetkiId,
      izin: durum === "verildi",
    }));

  // Rol matrisindeki kural burada da geçerli: kendi istisnasını düzenleyen
  // kişi, satırları toptan silinirken kendi yetkisini kaybedip işlemi
  // durduruyordu. Yalnız değişen satıra dokunuluyor.
  const kayitli = await kisiYetkileriniGetir(personelId);
  const hedef = new Map(satirlar.map((s) => [s.yetki_id, s.izin]));

  const eklenecek = satirlar.filter(
    (s) => kayitli.get(s.yetki_id) !== (s.izin ? "verildi" : "kaldirildi")
  );
  const silinecek = [...kayitli.keys()].filter(
    (yetkiId) => hedef.get(yetkiId) === undefined || eklenecek.some((e) => e.yetki_id === yetkiId)
  );

  for (const yetkiId of silinecek) {
    const { error } = await supabase
      .from("personel_yetkileri")
      .delete()
      .eq("personel_id", personelId)
      .eq("yetki_id", yetkiId);
    if (error) throw new Error(error.message || "Kişiye özel yetkiler kaydedilemedi.");
  }

  if (eklenecek.length === 0) return;

  const { error } = await supabase.from("personel_yetkileri").insert(eklenecek);
  if (error) throw new Error(error.message || "Kişiye özel yetkiler kaydedilemedi.");
}

/**
 * Bir kişinin gerçekte kullanabileceği yetkiler: rolünden gelenler, kişiye
 * verilenlerle genişletilip kişiden alınanlarla daraltılıyor. Satış ekranları
 * Adım 3'te bu işlevi kullanacak.
 */
export function etkinYetkiler(
  yetkiler: Yetki[],
  rolId: number | null,
  rolKumesi: Set<string>,
  kisiDurumlari: Map<number, KisiDurumu>
): Set<string> {
  const kodlar = new Set<string>();
  for (const y of yetkiler) {
    const durum = kisiDurumlari.get(y.id);
    if (durum === "verildi") kodlar.add(y.kod);
    else if (durum === "kaldirildi") continue;
    else if (rolId && rolKumesi.has(`${rolId}-${y.id}`)) kodlar.add(y.kod);
  }
  return kodlar;
}
