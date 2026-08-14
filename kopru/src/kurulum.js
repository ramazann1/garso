import { spawn } from "node:child_process";
import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { ayarYolu } from "./ayar.js";
import { kokDizin, paketli } from "./yerler.js";

/**
 * Kurulum işleri.
 *
 * Kasadaki kişiye terminal gösterilmiyor: program ilk açıldığında bilgileri
 * kendisi soruyor, `kur` komutuyla kendini kalıcı bir yere kopyalayıp Windows
 * başlangıcına yazılıyor. Kayıt defterine dokunulmuyor — Başlangıç klasörüne
 * konan kısayol aynı işi yapıyor ve `kaldir` ile temiz geri alınıyor.
 */

const KURULUM_DIZINI = join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Garso", "Kopru");
const KISAYOL = join(
  process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
  "Microsoft",
  "Windows",
  "Start Menu",
  "Programs",
  "Startup",
  "Garso Kasa Köprüsü.lnk"
);

/** Ayar dosyası yokken sorulan bilgiler — kurulumun tek elle yapılan adımı. */
export async function ayarlariSor() {
  const soru = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\nGarso Kasa Köprüsü ilk kez açılıyor. Bağlantı bilgileri bir kez isteniyor.\n");

  const ayar = {
    sunucu: (await soru.question("Sunucu adresi   : ")).trim(),
    anahtar: (await soru.question("Sunucu anahtarı : ")).trim(),
    telefon: (await soru.question("Personel telefonu: ")).trim(),
    sifre: (await soru.question("Personel şifresi : ")).trim(),
    yoklamaSaniye: 3,
  };
  soru.close();

  for (const [alan, deger] of Object.entries(ayar)) {
    if (!deger) throw new Error(`"${alan}" boş bırakıldı, kurulum yarım kaldı.`);
  }

  await writeFile(ayarYolu(), `${JSON.stringify(ayar, null, 2)}\n`, "utf8");
  console.log(`\nBilgiler kaydedildi: ${ayarYolu()}\nDeğiştirmek gerekirse bu dosya düzenlenir.\n`);
}

/**
 * Programı kalıcı yerine kopyalayıp Windows başlangıcına ekliyor. Kopyalama
 * şart: klasör masaüstünde ya da USB bellekte kalırsa silindiği gün köprü de
 * gidiyor, kasa fiş basmayı sessizce bırakıyor.
 */
export async function baslangicaEkle() {
  if (process.platform !== "win32") throw new Error("Bu komut yalnız Windows'ta çalışıyor.");
  if (!paketli) throw new Error("Bu komut yalnız paketlenmiş garso-kopru.exe ile çalışıyor.");

  const hedefExe = join(KURULUM_DIZINI, basename(process.execPath));

  if (kokDizin.toLowerCase() !== KURULUM_DIZINI.toLowerCase()) {
    await mkdir(KURULUM_DIZINI, { recursive: true });
    await cp(kokDizin, KURULUM_DIZINI, { recursive: true, force: true });
    console.log(`Program kopyalandı: ${KURULUM_DIZINI}`);
  }

  await kisayolYaz(hedefExe);
  console.log("Windows başlangıcına eklendi — bilgisayar açılınca köprü kendiliğinden çalışacak.");
  console.log("Kaldırmak için: garso-kopru.exe kaldir");
}

/** Başlangıç kaydını siliyor; kopyalanan klasör yerinde kalıyor. */
export async function baslangictanCikar() {
  if (process.platform !== "win32") throw new Error("Bu komut yalnız Windows'ta çalışıyor.");

  await rm(KISAYOL, { force: true });
  console.log("Windows başlangıcından çıkarıldı.");
  console.log(`Program klasörü duruyor: ${KURULUM_DIZINI}`);
}

function kisayolYaz(hedefExe) {
  const komut = [
    "$k = (New-Object -ComObject WScript.Shell).CreateShortcut(",
    `'${KISAYOL.replaceAll("'", "''")}')`,
    `; $k.TargetPath = '${hedefExe.replaceAll("'", "''")}'`,
    `; $k.WorkingDirectory = '${KURULUM_DIZINI.replaceAll("'", "''")}'`,
    "; $k.Description = 'Garso Kasa Köprüsü'; $k.Save()",
  ].join("");

  return new Promise((tamam, hata) => {
    const surec = spawn("powershell.exe", ["-NoProfile", "-Command", komut], { windowsHide: true });
    surec.once("error", () => hata(new Error("Başlangıç kısayolu oluşturulamadı.")));
    surec.once("close", (kod) =>
      kod === 0 ? tamam() : hata(new Error("Başlangıç kısayolu oluşturulamadı."))
    );
  });
}
