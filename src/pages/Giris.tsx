import { useState } from "react";
import { AtSign, Check, Eye, EyeOff, Lock } from "lucide-react";
import { girisYap } from "../oturum";

export default function Giris() {
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
        </form>
      </div>
    </div>
  );
}
