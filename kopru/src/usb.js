import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * USB yazıcıya basma.
 *
 * Ağ yazıcısında yazıcıyla doğrudan konuşuyoruz; USB'de araya Windows giriyor.
 * Yazıcı işletim sistemine kurulu, köprü onu adıyla buluyor ve baytları
 * Windows'un yazdırma servisine "ham" olarak veriyor (bkz. ham-yazdir.ps1).
 * Bu yüzden USB yolu yalnız Windows'ta çalışıyor — ağ yazıcısı her yerde.
 */

const buKlasor = dirname(fileURLToPath(import.meta.url));
const BETIK = join(buKlasor, "ham-yazdir.ps1");

/**
 * Yazıcı basmaya hazır mı.
 *
 * Windows yazıcı fişten çekilmiş olsa bile işi kuyruğuna alıp "aldım" diyor —
 * fiş çıkmadığı hâlde başarılı görünüyordu. Göndermeden önce yazıcının kendi
 * durumuna bakılıyor: kurulu mu, çevrimdışı mı, kâğıdı var mı.
 */
export async function usbDurumu(sistemAd) {
  if (process.platform !== "win32") {
    return { cevrimici: false, hata: "USB yazıcı yalnız Windows'ta çalışıyor." };
  }

  let cikti;
  try {
    cikti = await powershell([
      "-NoProfile",
      "-Command",
      `Get-CimInstance Win32_Printer -Filter "Name='${String(sistemAd).replace(/'/g, "''")}'" |` +
        " Select-Object WorkOffline, PrinterStatus, DetectedErrorState | ConvertTo-Json -Compress",
    ]);
  } catch (e) {
    return { cevrimici: false, hata: e.message };
  }

  if (!cikti.trim()) {
    return {
      cevrimici: false,
      hata: "Bu adda kurulu bir yazıcı yok — sistemdeki adı birebir yazılmalı.",
    };
  }

  let durum;
  try {
    durum = JSON.parse(cikti);
  } catch {
    return { cevrimici: false, hata: "Yazıcı durumu okunamadı." };
  }

  if (durum.WorkOffline) return { cevrimici: false, hata: "Yazıcı çevrimdışı (kapalı ya da kablosu çıkmış)." };

  // Windows'un hata tablosundan işletmecinin anlayacağı olanlar; gerisi tek
  // cümlede toplanıyor.
  const HATALAR = { 3: "Kapağı açık.", 4: "Kâğıt sıkışmış.", 5: "Kâğıdı bitmiş.", 9: "Çevrimdışı." };
  const kod = durum.DetectedErrorState;
  if (kod && kod !== 2) {
    return { cevrimici: false, hata: HATALAR[kod] ?? "Yazıcı hata durumunda." };
  }

  return { cevrimici: true, hata: null };
}

export async function usbBas(sistemAd, baytlar) {
  if (process.platform !== "win32") {
    throw new Error("USB yazıcı yalnız Windows'ta çalışıyor.");
  }

  const durum = await usbDurumu(sistemAd);
  if (!durum.cevrimici) throw new Error(durum.hata);

  // Baytlar komut satırından geçirilemiyor (ESC/POS'ta her değer var, metin
  // değil); geçici bir dosyaya yazılıp yolu veriliyor.
  const dosya = join(tmpdir(), `garso-fis-${randomUUID()}.bin`);
  await writeFile(dosya, baytlar);

  try {
    await powershell([
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", BETIK,
      "-Yazici", sistemAd,
      "-Dosya", dosya,
    ]);
  } finally {
    await unlink(dosya).catch(() => {});
  }
}

/**
 * İşletim sistemine kurulu yazıcıların adları. Garso tarayıcıda çalıştığı için
 * kasadaki yazıcı listesini göremiyor; adın birebir doğru yazılması gerektiğinden
 * liste buradan okunuyor.
 */
export async function kuruluYazicilar() {
  if (process.platform !== "win32") return [];

  const cikti = await powershell([
    "-NoProfile",
    "-Command",
    "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name",
  ]);

  return cikti
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function powershell(argumanlar) {
  return new Promise((tamam, hata) => {
    const surec = spawn("powershell.exe", argumanlar, { windowsHide: true });

    let cikti = "";
    let sorun = "";
    surec.stdout.on("data", (p) => (cikti += p));
    surec.stderr.on("data", (p) => (sorun += p));

    surec.once("error", () => hata(new Error("Windows yazdırma servisi çağrılamadı.")));
    surec.once("close", (kod) => {
      if (kod === 0) return tamam(cikti);
      hata(new Error(sadeHata(sorun)));
    });
  });
}

/**
 * PowerShell hataları sayfalarca yığın dökümüyle geliyor; kuyruk ekranında
 * okunacak olan tek satır bizim yazdığımız cümle.
 */
function sadeHata(metin) {
  const satir = metin
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.includes("Yazıcı") || s.includes("Yazdırma") || s.includes("Sayfa") || s.includes("Veri"));

  if (satir?.includes("Yazıcı açılamadı")) {
    return "Bu adda kurulu bir yazıcı bulunamadı — sistemdeki adı birebir yazılmalı.";
  }
  return satir || "Windows yazıcıya gönderemedi.";
}
