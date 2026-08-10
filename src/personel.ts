import { supabase } from "./supabase";

export type Rol = {
  id: number;
  ad: string;
  sira: number;
  hazir: boolean;
};

export type Personel = {
  id: number;
  ad: string;
  telefon: string;
  eposta: string;
  rolId: number | null;
  rolAd: string;
  hesapVar: boolean;
  pinVar: boolean;
  girisEngelli: boolean;
  aktif: boolean;
  sira: number;
  bolgeIdler: number[];
};

export type PersonelAlanlari = {
  ad: string;
  telefon: string;
  eposta: string;
  rolId: number | null;
  girisEngelli: boolean;
  aktif: boolean;
  bolgeIdler: number[];
  /** Boş bırakılırsa mevcut şifre korunur. */
  sifre?: string;
  /** null = PIN kaldırıldı, undefined = dokunulmadı. */
  pin?: string | null;
};

// PIN veritabanına düz metin gitmiyor; tarayıcının kendi kripto kütüphanesiyle
// özeti alınıyor. Giriş şifresi burada değil, Supabase Auth'ta duruyor.
export async function ozet(metin: string): Promise<string> {
  const veri = new TextEncoder().encode(metin);
  const tampon = await crypto.subtle.digest("SHA-256", veri);
  return Array.from(new Uint8Array(tampon))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// En çok denenen şifreler. Uzun bir liste tutmanın anlamı yok; saldırgan zaten
// ilk birkaç yüz denemede bu kalıpları geçiyor, gerisi uzunlukla korunuyor.
const YAYGIN_SIFRELER = [
  "123456", "1234567", "12345678", "123456789", "1234567890", "password",
  "sifre1", "sifre123", "parola1", "parola123", "qwerty1", "qwerty123",
  "asdasd1", "asdasd123", "111111", "abcd1234", "admin123", "garson123",
];

export type SifreKurali = { metin: string; tamam: boolean };

// Şifre kuralları NIST kılavuzuna yakın: uzunluk esas, karmaşıklık dayatması
// değil. Ekranda kullanıcıya madde madde gösterilsin diye liste dönüyor.
export function sifreKurallari(sifre: string): SifreKurali[] {
  return [
    { metin: "En az 6 karakter", tamam: sifre.length >= 6 },
    { metin: "En az bir harf ve bir rakam", tamam: /[a-zçğıöşü]/i.test(sifre) && /\d/.test(sifre) },
    { metin: "Başında ve sonunda boşluk yok", tamam: sifre === sifre.trim() && sifre.length > 0 },
    {
      metin: "Kolay tahmin edilen bir şifre değil",
      tamam: !YAYGIN_SIFRELER.includes(sifre.toLowerCase()),
    },
  ];
}

export function sifreGecerli(sifre: string) {
  return sifreKurallari(sifre).every((k) => k.tamam);
}

// Dar yerlerde (yan menü, masa kartı, tur başlığı) ad soyad sığmıyor; soyad
// baş harfe iniyor. Kimin olduğunu ilk ad zaten söylüyor.
export function kisaAd(ad: string) {
  const parcalar = ad.trim().split(/\s+/);
  if (parcalar.length < 2) return ad.trim();
  const son = parcalar[parcalar.length - 1];
  return `${parcalar.slice(0, -1).join(" ")} ${son[0].toLocaleUpperCase("tr")}.`;
}

export async function rolleriGetir(): Promise<Rol[]> {
  const { data } = await supabase
    .from("roller")
    .select("id, ad, sira, hazir")
    .order("sira");
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    ad: r.ad,
    sira: r.sira,
    hazir: r.hazir ?? false,
  }));
}

const ALANLAR =
  "id, ad, telefon, eposta, auth_id, pin_hash, rol_id, giris_engelli, aktif, sira, roller (ad)";

// Bölge ataması ayrı tabloda; personel listesi ekranda tek satır olarak
// göründüğü için iki sorgu birleştirilip tek tipe indiriliyor.
export async function personeliGetir(hepsi = false): Promise<Personel[]> {
  let sorgu = supabase.from("personel").select(ALANLAR);
  if (!hepsi) sorgu = sorgu.eq("aktif", true);
  const [{ data }, { data: baglar }] = await Promise.all([
    sorgu.order("sira"),
    supabase.from("personel_bolgeleri").select("personel_id, bolge_id"),
  ]);

  const bolgeler = new Map<number, number[]>();
  for (const b of (baglar as any[]) ?? []) {
    const liste = bolgeler.get(b.personel_id) ?? [];
    liste.push(b.bolge_id);
    bolgeler.set(b.personel_id, liste);
  }

  return ((data as any[]) ?? []).map((p) => ({
    id: p.id,
    ad: p.ad,
    telefon: p.telefon ?? "",
    eposta: p.eposta ?? "",
    rolId: p.rol_id ?? null,
    rolAd: p.roller?.ad ?? "",
    hesapVar: !!p.auth_id,
    pinVar: !!p.pin_hash,
    girisEngelli: p.giris_engelli ?? false,
    aktif: p.aktif ?? true,
    sira: p.sira ?? 0,
    bolgeIdler: bolgeler.get(p.id) ?? [],
  }));
}

// Telefon giriş bilgisi olduğu için karşılaştırılabilir tek biçimde saklanıyor;
// "0555 111 22 33" ile "05551112233" aynı numara sayılsın.
export function telefonSade(telefon: string) {
  return telefon.replace(/\D/g, "");
}

async function satirAlanlari(a: PersonelAlanlari) {
  const satir: Record<string, unknown> = {
    ad: a.ad,
    telefon: telefonSade(a.telefon) || null,
    eposta: a.eposta || null,
    rol_id: a.rolId,
    giris_engelli: a.girisEngelli,
    aktif: a.aktif,
  };
  if (a.pin !== undefined) satir.pin_hash = a.pin ? await ozet(a.pin) : null;
  return satir;
}

async function bolgeleriYaz(personelId: number, bolgeIdler: number[]) {
  await supabase.from("personel_bolgeleri").delete().eq("personel_id", personelId);
  if (bolgeIdler.length === 0) return;
  await supabase
    .from("personel_bolgeleri")
    .insert(bolgeIdler.map((bolgeId) => ({ personel_id: personelId, bolge_id: bolgeId })));
}

// Giriş hesabı veritabanı tarafında açılıyor: telefon numarasından üretilen
// adresle bir Auth kullanıcısı oluşturuluyor, şifre orada saklanıyor. Numara
// veya şifre değişince aynı fonksiyon hesabı günceller.
async function hesabiYaz(personelId: number, sifre?: string) {
  const { error } = await supabase.rpc("personel_hesabi_yaz", {
    p_personel_id: personelId,
    p_sifre: sifre ?? "",
  });
  if (error) throw new Error(error.message);
}

export async function personelEkle(alanlar: PersonelAlanlari, sira: number) {
  const { data, error } = await supabase
    .from("personel")
    .insert({ ...(await satirAlanlari(alanlar)), sira })
    .select("id")
    .single();
  if (error) throw new Error("Personel eklenemedi.");
  const id = (data as any).id as number;
  await bolgeleriYaz(id, alanlar.bolgeIdler);
  await hesabiYaz(id, alanlar.sifre);
  return id;
}

export async function personelGuncelle(id: number, alanlar: PersonelAlanlari) {
  const { error } = await supabase
    .from("personel")
    .update(await satirAlanlari(alanlar))
    .eq("id", id);
  if (error) throw new Error("Personel kaydedilemedi.");
  await bolgeleriYaz(id, alanlar.bolgeIdler);
  await hesabiYaz(id, alanlar.sifre);
}

// Yanlış açılan kaydı temizlemek için. İşten ayrılanı silmek yerine listeden
// gizlemek doğru yol; ilerideki adisyon–garson bağı silmeyi zaten kısıtlayacak.
export async function personelSil(id: number) {
  const { error } = await supabase.from("personel").delete().eq("id", id);
  if (error) throw new Error("Personel silinemedi.");
}

// Telefon giriş bilgisi; iki kişide aynı numara varsa kimin girdiği belli olmaz.
// Kontrol bütün sistemi kapsıyor, çünkü giriş adresi numaradan üretiliyor ve o
// adres her yerde tek. Başka işletmenin personelini göremediğimiz için soruyu
// veritabanı fonksiyonu cevaplıyor; geriye yalnızca evet/hayır dönüyor.
export async function telefonKullanimda(telefon: string, haricId?: number) {
  const { data } = await supabase.rpc("telefon_kullanimda", {
    p_telefon: telefonSade(telefon),
    p_haric: haricId ?? null,
  });
  return data === true;
}

// Aynı PIN iki kişide olursa hızlı geçişte kimin işlem yaptığı belirsizleşir.
// Burada işletme içi yeterli: PIN yalnızca kendi kasandaki kişiyi seçiyor,
// satır güvenliği de sorguyu kendi işletmene daraltıyor.
export async function pinKullanimda(pin: string, haricId?: number) {
  let sorgu = supabase.from("personel").select("id").eq("pin_hash", await ozet(pin));
  if (haricId) sorgu = sorgu.neq("id", haricId);
  const { data } = await sorgu;
  return ((data as any[]) ?? []).length > 0;
}
