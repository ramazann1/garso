import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { ayarYolu } from "./ayar.js";

/**
 * Terminal sürümünün ilk açılışı.
 *
 * Kasaya giden pencereli sürümde bu iş giriş penceresinde yapılıyor; burası
 * geliştirirken köprüyü çıplak Node ile çalıştırmak için duruyor. Sunucu adresi
 * ve anahtarı sorulmuyor: ikisi de programa gömülü (bkz. sunucu.js).
 */
export async function ayarlariSor() {
  const soru = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\nGarso Kasa Köprüsü ilk kez açılıyor. Giriş bilgileri bir kez isteniyor.\n");

  const ayar = {
    telefon: (await soru.question("Personel telefonu: ")).trim(),
    sifre: (await soru.question("Personel şifresi : ")).trim(),
    yoklamaSaniye: 3,
  };
  soru.close();

  for (const [alan, deger] of Object.entries(ayar)) {
    if (!deger) throw new Error(`"${alan}" boş bırakıldı, kurulum yarım kaldı.`);
  }

  await writeFile(ayarYolu(), `${JSON.stringify(ayar, null, 2)}\n`, "utf8");
  console.log(`\nBilgiler kaydedildi: ${ayarYolu()}\n`);
}
