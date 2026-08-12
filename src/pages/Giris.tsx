import { useState } from "react";
import { AtSign, Check, Eye, EyeOff, Lock, Store } from "lucide-react";
import { girisYap } from "../oturum";
import Kayit from "./Kayit";

export default function Giris() {
  // Kayıt ekranı ayrı bir adres değil: oturum yokken yönlendirici hiç kurulmuyor,
  // giriş ile kayıt aynı kapının iki yüzü.
  const [kayit, setKayit] = useState(false);
  const [telefon, setTelefon] = useState("");
  const [sifre, setSifre] = useState("");
  const [hatirla, setHatirla] = useState(true);
  const [sifreGorunsun, setSifreGorunsun] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, setBekliyor] = useState(false);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBekliyor(true);
    setHata("");
    try {
      await girisYap(telefon, sifre, hatirla);
    } catch (err: any) {
      setHata(err.message);
      setBekliyor(false);
    }
  };

  if (kayit) return <Kayit onGeri={() => setKayit(false)} />;

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
          <h1>Giriş yap</h1>
          <span className="giris-alt">Telefon numaran veya e-postanla</span>

          <label className="giris-satir">
            <AtSign size={18} />
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="Telefon veya e-posta"
              autoFocus
            />
          </label>

          <label className="giris-satir">
            <Lock size={18} />
            <input
              type={sifreGorunsun ? "text" : "password"}
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="Şifre"
            />
            <button
              type="button"
              className="giris-goz"
              onClick={() => setSifreGorunsun((g) => !g)}
            >
              {sifreGorunsun ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {/* Kasa hep aynı işletmede duruyor, bu yüzden işaretli geliyor; ortak
              bir bilgisayarda çalışan kaldırınca oturum sekmeyle birlikte biter. */}
          <label className="giris-hatirla">
            <input
              type="checkbox"
              checked={hatirla}
              onChange={(e) => setHatirla(e.target.checked)}
            />
            <em>
              <Check size={13} strokeWidth={3.5} />
            </em>
            <span>Beni hatırla</span>
          </label>

          <p className={hata ? "giris-hata" : "giris-hata bos"}>{hata || "."}</p>

          <button className="giris-gonder" disabled={bekliyor || !telefon || !sifre}>
            {bekliyor ? "Kontrol ediliyor…" : "Giriş yap"}
          </button>

          <button type="button" className="giris-mod" onClick={() => setKayit(true)}>
            <Store size={15} /> İşletmen yok mu? Hesap oluştur
          </button>
        </form>
      </div>
    </div>
  );
}
