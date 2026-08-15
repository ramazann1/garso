const bul = (ad) => document.getElementById(ad);

let sonDurum = null;
let kunye = { cihaz: "", surum: "" };

const saat = (zaman) =>
  new Date(zaman).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Bir bağlantı/yazıcı satırı: nokta · ad · durum etiketi. */
function satir(ad, durum, etiket, aciklama = "") {
  const kutu = document.createElement("div");
  kutu.className = "satir";
  kutu.innerHTML =
    `<span class="nokta ${durum}"></span>` +
    `<span class="satir-ad"><strong></strong><em></em></span>` +
    `<span class="etiket ${durum}"></span>`;
  kutu.querySelector("strong").textContent = ad;
  kutu.querySelector("em").textContent = aciklama;
  kutu.querySelector(".etiket").textContent = etiket;
  return kutu;
}

function ciz(durum) {
  sonDurum = durum;
  if (!durum) return;

  const oturum = durum.oturum ?? {};
  bul("isletme").textContent = oturum.isletme || "—";
  bul("kisi").textContent = oturum.kisi ? `${oturum.kisi} · sürüm ${kunye.surum}` : `sürüm ${kunye.surum}`;

  const kod = bul("kodKopyala");
  kod.hidden = !oturum.kod;
  kod.textContent = oturum.kod ? `Kod ${oturum.kod}` : "";

  bul("cihaz").textContent = `Cihaz: ${durum.cihaz || kunye.cihaz}`;

  const bagli = durum.bulut === "bagli";
  const baglantilar = bul("baglantilar");
  baglantilar.replaceChildren(
    satir(
      "Garso sunucusu",
      bagli ? "acik" : "kapali",
      bagli ? "Bağlı" : "Bağlantı yok",
      bagli ? "Fişler anında alınıyor" : durum.bulutHata || "Yeniden deneniyor"
    )
  );

  const yazicilar = bul("yazicilar");
  if (!durum.yazicilar.length) {
    const bos = document.createElement("p");
    bos.className = "bos";
    bos.textContent = "Henüz yazıcı tanımlanmamış ya da ilk yoklama yapılmadı.";
    yazicilar.replaceChildren(bos);
  } else {
    yazicilar.replaceChildren(
      ...durum.yazicilar.map((y) =>
        y.durum === "webusb"
          ? satir(y.ad, "bilinmiyor", "Tarayıcıdan", "Bu yazıcıya köprü dokunmuyor")
          : satir(
              y.ad,
              y.durum === "bagli" ? "acik" : "kapali",
              y.durum === "bagli" ? "Çevrimiçi" : "Çevrimdışı",
              y.durum === "bagli" ? "" : y.hata || "Ulaşılamıyor"
            )
      )
    );
  }
}

/** Destek hattına yapıştırılacak özet — tek tek yazdırmaya gerek kalmıyor. */
function ozetMetni() {
  const d = sonDurum;
  if (!d) return "";

  const satirlar = [
    "Garso Kasa Köprüsü",
    `İşletme : ${d.oturum?.isletme ?? "-"} (${d.oturum?.kod ?? "-"})`,
    `Kişi    : ${d.oturum?.kisi ?? "-"}`,
    `Cihaz   : ${d.cihaz}`,
    `Sürüm   : ${d.surum}`,
    `Sunucu  : ${d.bulut === "bagli" ? "bağlı" : `bağlantı yok (${d.bulutHata || "sebep yok"})`}`,
    "Yazıcılar:",
    ...(d.yazicilar.length
      ? d.yazicilar.map((y) => `  ${y.ad}: ${y.durum}${y.hata ? ` (${y.hata})` : ""}`)
      : ["  yok"]),
    "Son işlemler:",
    ...d.kayitlar.slice(0, 15).map((k) => `  ${saat(k.saat)}  ${k.metin}`),
  ];
  return satirlar.join("\n");
}

kopru.kunye().then((k) => {
  kunye = k;
  bul("cihaz").textContent = `Cihaz: ${k.cihaz}`;
  ciz(sonDurum);
});

kopru.durumAl().then(ciz);
kopru.durumDinle(ciz);

bul("kodKopyala").onclick = () => kopru.kopyala(sonDurum?.oturum?.kod ?? "");
bul("hepsiniKopyala").onclick = () => kopru.kopyala(ozetMetni());
