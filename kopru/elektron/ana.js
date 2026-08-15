import { app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, shell, Tray } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SURUM } from "../src/surum.js";
import { kimlikOku, kimlikSil, kimlikYaz } from "./kimlik.js";

/**
 * Garso Kasa Köprüsü — pencereli sürüm.
 *
 * Program ana pencere olarak yaşamıyor: ilk açılışta giriş penceresi çıkıyor,
 * girildikten sonra saat yanındaki simgeye iniyor. Kasadaki kişi bu programa
 * günde bir kez bakıyor; sürekli açık duran bir pencereye ihtiyacı yok. Pencere
 * kapatılınca program da kapanmıyor — X'e basıp fiş basmayı durdurmak kolay
 * olmamalı, çıkış yalnız tepsi menüsünden.
 */

const buDizin = dirname(fileURLToPath(import.meta.url));
const kopruKoku = join(buDizin, "..");

/**
 * Yazı tipi ve çizim kütüphanesi paketin içinden değil, yanındaki açık
 * klasörden okunuyor: kurulumda kaynak tek bir arşive (app.asar) giriyor, ama
 * ne Windows'un yazdırma betiği ne de çizim kütüphanesi arşivin içinden
 * okunabiliyor. Bu ikisi "unpacked" klasörde duruyor (bkz. package.json →
 * asarUnpack).
 *
 * Ayarlar ise Windows'un kullanıcı klasöründe: program klasörüne yazmak
 * yönetici yetkisi istiyor ve güncellemede silinip gidiyor.
 *
 * İkisi de motor yüklenmeden önce yazılmak zorunda — yerler.js/ayar.js açılışta
 * okuyor.
 */
process.env.GARSO_KOK = app.isPackaged
  ? kopruKoku.replace("app.asar", "app.asar.unpacked")
  : kopruKoku;
process.env.GARSO_AYAR_YOLU = join(app.getPath("userData"), "ayarlar.json");

const AYAR_YOLU = process.env.GARSO_AYAR_YOLU;
const simge = (boy) => join(kopruKoku, "varliklar", `simge-${boy}.png`);

// İki köprü aynı kuyruğa bakarsa aynı fişi iki kez basma riski doğuyor.
if (!app.requestSingleInstanceLock()) app.quit();

let tepsi = null;
let pencere = null;
let durumPenceresi = null;
let motor = null;
let sonDurum = null;
let cikiliyor = false;

/** Pencerelerin ortak ayarları; ikisi de aynı ön yükleyiciden geçiyor. */
const pencereAyari = (genislik, yukseklik) => ({
  width: genislik,
  height: yukseklik,
  title: "Garso Kasa Köprüsü",
  icon: nativeImage.createFromPath(simge(256)),
  autoHideMenuBar: true,
  backgroundColor: "#faf7f2",
  show: false,
  webPreferences: {
    preload: join(buDizin, "onyuk.cjs"),
    contextIsolation: true,
    nodeIntegration: false,
  },
});

/** Giriş penceresi — kurulumun elle yapılan tek adımı. */
function girisPenceresiAc(hata = "") {
  if (pencere && !pencere.isDestroyed()) {
    pencere.show();
    pencere.focus();
    return;
  }

  pencere = new BrowserWindow({
    ...pencereAyari(420, 580),
    resizable: false,
    maximizable: false,
  });

  pencere.loadFile(join(kopruKoku, "arayuz", "giris.html"), {
    query: hata ? { hata } : {},
  });
  pencere.once("ready-to-show", () => pencere.show());

  // Kapat düğmesi girişteyken programı gerçekten kapatıyor: henüz çalışan bir
  // köprü yok, tepsiye inecek bir şey de yok.
  pencere.on("closed", () => {
    pencere = null;
    if (!motor && !cikiliyor) app.quit();
  });
}

/**
 * Durum penceresi. Kapatılınca program kapanmıyor: köprü tepside çalışmaya
 * devam ediyor, X'e basıp fiş basmayı durdurmak kolay olmamalı.
 */
function durumPenceresiAc() {
  if (durumPenceresi && !durumPenceresi.isDestroyed()) {
    durumPenceresi.show();
    durumPenceresi.focus();
    return;
  }

  durumPenceresi = new BrowserWindow({ ...pencereAyari(500, 520), minWidth: 440, minHeight: 400 });
  durumPenceresi.loadFile(join(kopruKoku, "arayuz", "durum.html"));
  durumPenceresi.once("ready-to-show", () => durumPenceresi.show());
  durumPenceresi.on("closed", () => {
    durumPenceresi = null;
  });
}

/** Motoru başlatıyor; giriş bilgisi yanlışsa giriş penceresine dönülüyor. */
async function kopruyuBaslat(kimlik) {
  const { ayarlariTamamla } = await import("../src/ayar.js");
  const { motorBaslat } = await import("../src/motor.js");

  const ayar = ayarlariTamamla(kimlik);
  motor = await motorBaslat(ayar, ({ durum }) => {
    sonDurum = durum;
    tepsiyiTazele();
    // Durum penceresi canlı: yenile düğmesi yok, motor her haber verdiğinde
    // kendiliğinden tazeleniyor.
    if (durumPenceresi && !durumPenceresi.isDestroyed()) {
      durumPenceresi.webContents.send("durum", durum);
    }
  });
  sonDurum = motor.durumAl();
  tepsiyiTazele();
}

function tepsiyiKur() {
  if (tepsi) return;
  tepsi = new Tray(nativeImage.createFromPath(simge(32)));
  tepsi.on("double-click", () => (motor ? durumPenceresiAc() : girisPenceresiAc()));
  tepsiyiTazele();
}

function tepsiyiTazele() {
  if (!tepsi) return;

  const oturum = sonDurum?.oturum;
  const bagli = sonDurum?.bulut === "bagli";
  const baslik = oturum ? `${oturum.isletme} (${oturum.kod})` : "Giriş yapılmadı";

  tepsi.setToolTip(`Garso Kasa Köprüsü — ${bagli ? "bağlı" : "bağlantı yok"}\n${baslik}`);
  tepsi.setContextMenu(
    Menu.buildFromTemplate([
      { label: oturum ? `Giriş yapıldı: ${oturum.kisi}` : "Giriş yapılmadı", enabled: false },
      {
        label: baslik,
        enabled: Boolean(oturum?.kod),
        click: () => clipboard.writeText(String(oturum?.kod ?? "")),
        toolTip: "İşletme kodunu kopyalar",
      },
      { type: "separator" },
      { label: bagli ? "Bağlantı: bağlı" : "Bağlantı: yok, yeniden deneniyor", enabled: false },
      { label: "Durum penceresi", enabled: Boolean(motor), click: durumPenceresiAc },
      { type: "separator" },
      { label: "Garso'yu aç", click: () => shell.openExternal("https://garso.app") },
      { label: "Oturumu kapat", click: oturumuKapat },
      { label: "Çıkış", click: cik },
    ])
  );
}

async function oturumuKapat() {
  await motor?.kapat();
  motor = null;
  sonDurum = null;
  kimlikSil(AYAR_YOLU);
  durumPenceresi?.close();
  tepsiyiTazele();
  girisPenceresiAc();
}

/**
 * Çıkış. Kapanış haberi gidene kadar program açık tutuluyor: bu haber olmazsa
 * Bağlantı Durumu ekranı köprünün kapandığını ancak sessizlik sınırı dolunca
 * anlıyor, o zamana kadar "Çalışıyor" yazıyor.
 */
async function cik() {
  if (cikiliyor) return;
  cikiliyor = true;
  await motor?.kapat();
  app.quit();
}

// Bilgisayar kapanırken ya da program başka yoldan sonlandırılırken de haber
// gitmesi gerekiyor.
app.on("before-quit", (olay) => {
  if (!motor || cikiliyor) return;
  olay.preventDefault();
  cik();
});

// Giriş penceresinden gelen denemeler. Bilgiler ancak giriş gerçekten
// başarılıysa kaydediliyor — yanlış şifre diskte kalmıyor.
ipcMain.handle("giris", async (_olay, { telefon, sifre }) => {
  try {
    await kopruyuBaslat({ telefon, sifre, yoklamaSaniye: 3 });
    kimlikYaz(AYAR_YOLU, { telefon, sifre });
    return { tamam: true, oturum: motor.oturum };
  } catch (e) {
    motor?.durdur();
    motor = null;
    return { tamam: false, hata: e.message };
  }
});

ipcMain.handle("durum", () => sonDurum);

// Cihaz kimliği giriş penceresinde yazıyor: destek hattı "hangi kasa" sorusunu
// bununla ayırt ediyor.
ipcMain.handle("kunye", async () => {
  const { cihazKimligi } = await import("../src/ayar.js");
  return { cihaz: cihazKimligi(), surum: SURUM };
});

// Giriş bitince pencere kapanıyor; program tepsiden çalışmaya devam ediyor.
ipcMain.handle("pencereyi-kapat", () => pencere?.close());
ipcMain.handle("kopyala", (_olay, metin) => clipboard.writeText(String(metin)));

// İkinci kez çalıştırılırsa yeni program açılmıyor, olan program kendini
// gösteriyor.
app.on("second-instance", () => (motor ? durumPenceresiAc() : girisPenceresiAc()));

// Bütün pencereler kapansa da program yaşamaya devam ediyor: köprü tepsiden
// çalışıyor.
app.on("window-all-closed", () => {});

/**
 * Bilgisayar açılınca köprü de açılıyor. Kasada bunu kimsenin elle yapması
 * beklenmiyor: köprü kapalıysa fişler sessizce sırada birikir, kimse fark
 * etmez. Kurulumda değil her açılışta bakılıyor — kayıt silinirse kendini
 * onarıyor.
 */
function baslangicaYaz() {
  if (process.platform !== "win32" || !app.isPackaged) return;
  if (app.getLoginItemSettings().openAtLogin) return;
  app.setLoginItemSettings({ openAtLogin: true, args: ["--gizli"] });
}

app.whenReady().then(async () => {
  baslangicaYaz();
  tepsiyiKur();

  const kimlik = kimlikOku(AYAR_YOLU);
  if (!kimlik) {
    girisPenceresiAc();
    return;
  }

  try {
    await kopruyuBaslat(kimlik);
  } catch (e) {
    girisPenceresiAc(e.message);
  }
});
