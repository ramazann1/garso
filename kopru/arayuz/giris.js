const uyari = document.getElementById("uyari");
const dugme = document.getElementById("dugme");
const telefon = document.getElementById("telefon");
const sifre = document.getElementById("sifre");

const uyariGoster = (metin) => {
  uyari.textContent = metin;
  uyari.classList.toggle("acik", Boolean(metin));
};

// Program açılırken kayıtlı bilgiyle giriş denenip başarısız olduysa sebebi
// adres satırıyla geliyor.
uyariGoster(new URLSearchParams(location.search).get("hata") ?? "");

kopru.kunye().then(({ cihaz, surum }) => {
  document.getElementById("cihaz").textContent = cihaz;
  document.getElementById("surum").textContent = surum;
  document.getElementById("kopyala").onclick = () => kopru.kopyala(cihaz);
});

document.getElementById("form").onsubmit = async (olay) => {
  olay.preventDefault();
  uyariGoster("");

  if (!telefon.value.trim() || !sifre.value) {
    uyariGoster("Telefon ve şifre gerekli.");
    return;
  }

  dugme.disabled = true;
  dugme.textContent = "Bağlanıyor...";

  const sonuc = await kopru.giris({ telefon: telefon.value.trim(), sifre: sifre.value });

  if (sonuc.tamam) {
    // Giriş tamam: pencere kapanıyor, köprü tepsiden çalışmaya devam ediyor.
    kopru.pencereyiKapat();
    return;
  }

  uyariGoster(sonuc.hata);
  dugme.disabled = false;
  dugme.textContent = "Bağlan";
};

telefon.focus();
