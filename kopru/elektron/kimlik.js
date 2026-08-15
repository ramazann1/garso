import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { safeStorage } from "electron";

/**
 * Giriş bilgisinin kasadaki bilgisayarda saklanması.
 *
 * Şifre düz metin yazılmıyor: Windows'un kendi şifreleme servisi (DPAPI)
 * kullanılıyor — çözülen metin yalnız o bilgisayarda ve o Windows kullanıcısı
 * için geçerli, dosya kopyalanıp başka makinede açılamıyor. Servis
 * kullanılamazsa (nadir) düz yazılıyor; programın çalışmaması daha kötü.
 */

export function kimlikOku(yol) {
  if (!existsSync(yol)) return null;

  let kayit;
  try {
    kayit = JSON.parse(readFileSync(yol, "utf8"));
  } catch {
    return null;
  }

  let sifre = kayit.sifre ?? "";
  if (kayit.sifreKapali) {
    try {
      sifre = safeStorage.decryptString(Buffer.from(kayit.sifreKapali, "base64"));
    } catch {
      // Windows kullanıcısı ya da bilgisayar değişmiş; yeniden giriş istenir.
      return null;
    }
  }

  if (!kayit.telefon || !sifre) return null;
  return { telefon: kayit.telefon, sifre, yoklamaSaniye: kayit.yoklamaSaniye ?? 3 };
}

export function kimlikYaz(yol, { telefon, sifre }) {
  // Dosyada giriş bilgisinden başka şeyler de duruyor (cihaz kimliği); üstüne
  // yazılmıyor, üzerine ekleniyor.
  let onceki = {};
  try {
    onceki = JSON.parse(readFileSync(yol, "utf8"));
  } catch {
    onceki = {};
  }

  const kayit = { ...onceki, telefon, yoklamaSaniye: 3 };
  delete kayit.sifre;
  delete kayit.sifreKapali;

  if (safeStorage.isEncryptionAvailable()) {
    kayit.sifreKapali = safeStorage.encryptString(sifre).toString("base64");
  } else {
    kayit.sifre = sifre;
  }

  writeFileSync(yol, `${JSON.stringify(kayit, null, 2)}\n`, "utf8");
}

/** Oturum kapatma: yalnız giriş bilgisi siliniyor, cihaz kimliği kalıyor. */
export function kimlikSil(yol) {
  let kayit;
  try {
    kayit = JSON.parse(readFileSync(yol, "utf8"));
  } catch {
    rmSync(yol, { force: true });
    return;
  }

  delete kayit.telefon;
  delete kayit.sifre;
  delete kayit.sifreKapali;
  writeFileSync(yol, `${JSON.stringify(kayit, null, 2)}\n`, "utf8");
}
