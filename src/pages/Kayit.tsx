import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, Phone, Store, User } from "lucide-react";
import { isletmeKur } from "../oturum";

/**
 * Yeni işletmenin kendi hesabını açtığı ekran. Giriş ekranının kardeşi: aynı
 * tanıtım yüzü, aynı kart. Dört alan yetiyor — masa, menü ve personel
 * kurulumu programın içinde, İşletme Ayarları'ndan yapılıyor.
 */
export default function Kayit({ onGeri }: { onGeri: () => void }) {
  const [isletme, setIsletme] = useState("");
  const [ad, setAd] = useState("");
  const [telefon, setTelefon] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreGorunsun, setSifreGorunsun] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, setBekliyor] = useState(false);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekliyor(true);
    setHata("");
    try {
      await isletmeKur(isletme, ad, telefon, sifre);
    } catch (err: any) {
      setHata(err.message);
      setBekliyor(false);
    }
  };

  return (
    <div className="giris">
      <div className="giris-tanitim">
        <span className="giris-marka">
          Garso<i />
        </span>
        <p>Salonun, mutfağın ve kasanın tek ekranı.</p>
      </div>

      <div className="giris-alan">
        <form className="giris-kart" onSubmit={gonder}>
          <h1>İşletmeni kur</h1>
          <span className="giris-alt">Birkaç dakikada satışa hazır ol</span>

          <label className="giris-satir">
            <Store size={18} />
            <input
              value={isletme}
              onChange={(e) => setIsletme(e.target.value)}
              placeholder="İşletmenin adı"
              autoFocus
            />
          </label>

          <label className="giris-satir">
            <User size={18} />
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Adın soyadın"
            />
          </label>

          {/* Numara hem iletişim bilgisi hem giriş anahtarı; sonradan Personel
              ekranından değiştirilebiliyor. */}
          <label className="giris-satir">
            <Phone size={18} />
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="Telefon numaran"
              inputMode="tel"
            />
          </label>

          <label className="giris-satir">
            <Lock size={18} />
            <input
              type={sifreGorunsun ? "text" : "password"}
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="Şifre belirle (en az 6 karakter)"
            />
            <button
              type="button"
              className="giris-goz"
              onClick={() => setSifreGorunsun((g) => !g)}
            >
              {sifreGorunsun ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          <p className={hata ? "giris-hata" : "giris-hata bos"}>{hata || "."}</p>

          <button
            className="giris-gonder"
            disabled={bekliyor || !isletme || !ad || !telefon || sifre.length < 6}
          >
            {bekliyor ? "İşletmen kuruluyor…" : "İşletmemi kur"}
          </button>

          <button type="button" className="giris-mod" onClick={onGeri}>
            <ArrowLeft size={15} /> Hesabım var, giriş yapayım
          </button>
        </form>
      </div>
    </div>
  );
}
