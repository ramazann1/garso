import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { pinIleAc } from "../oturum";

// Kasa gün boyu açık kalıyor; başındaki kişi değiştiğinde ekran kilitleniyor ve
// gelen kişi PIN'iyle devam ediyor. Program burada kapanmıyor — açık adisyonlar
// olduğu gibi duruyor. Oturumu kapatma buraya konmuyor: kilidi açan yönetici
// bunu yan menüden zaten yapabiliyor.
export default function KilitEkrani() {
  const [pin, setPin] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, setBekliyor] = useState(false);

  // Dört hane dolunca ayrıca bir düğmeye basılmıyor.
  useEffect(() => {
    if (pin.length !== 4 || bekliyor) return;
    setBekliyor(true);
    pinIleAc(pin)
      .catch((e) => {
        setHata(e.message);
        setPin("");
      })
      .finally(() => setBekliyor(false));
  }, [pin]);

  const tus = (deger: string) => {
    setHata("");
    if (deger === "sil") setPin((p) => p.slice(0, -1));
    else setPin((p) => (p.length < 4 ? p + deger : p));
  };

  // Kasada klavye varsa rakamlar tuş takımına basmadan da girilebilsin.
  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) tus(e.key);
      else if (e.key === "Backspace") tus("sil");
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, []);

  return (
    <div className="kilit">
      <div className="kilit-kart">
        <span className="giris-marka">
          Garso<i />
        </span>
        <h1>Ekran kilitli</h1>
        <span className="giris-alt">Devam etmek için PIN'ini gir</span>

        <div className={hata ? "pin-nokta sarsil" : "pin-nokta"}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < pin.length ? "dolu" : ""} />
          ))}
        </div>

        <p className={hata ? "giris-hata" : "giris-hata bos"}>{hata || "."}</p>

        <div className="pin-tuslar">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((t) => (
            <button key={t} onClick={() => tus(t)} disabled={bekliyor}>
              {t}
            </button>
          ))}
          <span />
          <button onClick={() => tus("0")} disabled={bekliyor}>
            0
          </button>
          <button className="sil" onClick={() => tus("sil")} disabled={bekliyor}>
            <Delete size={22} />
          </button>
        </div>

      </div>
    </div>
  );
}
