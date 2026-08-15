const { contextBridge, ipcRenderer } = require("electron");

/**
 * Pencere ile ana süreç arasındaki tek kapı. Pencerenin Node'a doğrudan
 * erişimi yok; yalnız buradaki sayılı işleri çağırabiliyor.
 *
 * Bu dosya CommonJS: ön yükleyici modül sözdizimini kabul etmiyor.
 */
contextBridge.exposeInMainWorld("kopru", {
  giris: (bilgi) => ipcRenderer.invoke("giris", bilgi),
  durumAl: () => ipcRenderer.invoke("durum"),
  kunye: () => ipcRenderer.invoke("kunye"),
  kopyala: (metin) => ipcRenderer.invoke("kopyala", metin),
  pencereyiKapat: () => ipcRenderer.invoke("pencereyi-kapat"),
  durumDinle: (isle) => ipcRenderer.on("durum", (_olay, durum) => isle(durum)),
});
