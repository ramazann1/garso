import { useEffect, useMemo, useState } from "react";
import {
  ChefHat,
  Eye,
  Hash,
  Package,
  Percent,
  Scale,
  ShoppingCart,
  SplitSquareHorizontal,
  Star,
  Tag,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import Bilgi from "./Bilgi";
import { kategoriUrunleri } from "../menu";
import { paraMetin, paraSayi, paraYaz } from "../para";
import type { TopluPorsiyon, TopluUrun } from "../menu";
import type { MenuBirim, MenuKategori, MenuKdv, MenuPorsiyon, MenuUrun } from "../types";

type PorsiyonTaslak = {
  id?: number;
  birimId?: number;
  fiyat: string;
  maliyet: string;
  masaFiyat: string;
  gelalFiyat: string;
  paketFiyat: string;
};

type UrunTaslak = {
  id: number;
  ad: string;
  kod: string;
  kdvId?: number;
  favori: boolean;
  satistaGorunur: boolean;
  mutfaktaGorunur: boolean;
  porsiyonlar: PorsiyonTaslak[];
};

// Kampanyalı menüler burada düzenlenmez — kendi sekmesinde yönetiliyor.
const taslakYap = (urunler: MenuUrun[]): UrunTaslak[] =>
  urunler
    .filter((u) => u.id && !u.menuGruplari.length)
    .map((u) => ({
      id: u.id!,
      ad: u.ad,
      kod: u.kod ?? "",
      kdvId: u.kdvId,
      favori: u.favori,
      satistaGorunur: u.satistaGorunur,
      mutfaktaGorunur: u.mutfaktaGorunur,
      porsiyonlar: u.porsiyonlar.map((p) => ({
        id: p.id,
        birimId: p.birimId,
        fiyat: paraMetin(p.fiyat),
        maliyet: paraMetin(p.maliyet),
        masaFiyat: paraMetin(p.masaFiyat),
        gelalFiyat: paraMetin(p.gelalFiyat),
        paketFiyat: paraMetin(p.paketFiyat),
      })),
    }));

/**
 * Porsiyonun tek fiyatından ayrışan bir sipariş türü fiyatı var mı. Panel
 * kendiliğinden açılmıyor — tablo tek fiyatla duruyor, bu yalnız fiyat
 * tuşunun işaretli görünmesi için: kapalı panelde saklı bir fiyat olduğu
 * bilinmezse yanlış zam yapılır.
 */
const turAyrisiyor = (p: PorsiyonTaslak) => {
  const tek = paraSayi(p.fiyat) ?? 0;
  return [p.masaFiyat, p.gelalFiyat, p.paketFiyat].some((v) => {
    const sayi = paraSayi(v);
    return sayi !== undefined && sayi !== null && sayi !== tek;
  });
};

const urunFarki = (t: UrunTaslak, a: MenuUrun) =>
  t.ad.trim() !== a.ad ||
  t.kod.trim() !== (a.kod ?? "") ||
  t.kdvId !== a.kdvId ||
  t.favori !== a.favori ||
  t.satistaGorunur !== a.satistaGorunur ||
  t.mutfaktaGorunur !== a.mutfaktaGorunur;

const porsiyonFarki = (p: PorsiyonTaslak, a: MenuPorsiyon) =>
  p.birimId !== a.birimId ||
  (paraSayi(p.fiyat) ?? 0) !== a.fiyat ||
  paraSayi(p.maliyet) !== a.maliyet ||
  paraSayi(p.masaFiyat) !== a.masaFiyat ||
  paraSayi(p.gelalFiyat) !== a.gelalFiyat ||
  paraSayi(p.paketFiyat) !== a.paketFiyat;

export default function TopluDuzenle({
  urunler,
  kategoriler,
  birimler,
  kdvler,
  onKaydet,
  onUyari,
  onBildirim,
  onDegisiklik,
}: {
  urunler: MenuUrun[];
  kategoriler: MenuKategori[];
  birimler: MenuBirim[];
  kdvler: MenuKdv[];
  onKaydet: (u: TopluUrun[], p: TopluPorsiyon[]) => Promise<string | undefined>;
  onUyari: (mesaj: string) => void;
  onBildirim: (mesaj: string) => void;
  onDegisiklik: (sayi: number) => void;
}) {
  const [taslak, setTaslak] = useState<UrunTaslak[]>(() => taslakYap(urunler));
  const [arama, setArama] = useState("");
  const [kategoriId, setKategoriId] = useState<number | "tumu">("tumu");
  const [adaGore, setAdaGore] = useState(false);
  const [hepsiAcik, setHepsiAcik] = useState(false);
  // Tablo her zaman tek fiyatla açılıyor; tür fiyatı panelini kullanıcı açar.
  const [turAcik, setTurAcik] = useState(() => new Set<string>());

  // Kaydetten sonra menü yeniden okunuyor; taslak da kaydedilmiş haline döner.
  useEffect(() => {
    setTaslak(taslakYap(urunler));
    setTurAcik(new Set());
  }, [urunler]);

  // Tür fiyatı satırı tabloyu baştan sona kaplıyor; sütun sayısı KDV'ye göre değişiyor.
  const sutunSayisi = 6 + (kdvler.length ? 1 : 0);

  const asil = useMemo(() => new Map(urunler.filter((u) => u.id).map((u) => [u.id!, u])), [urunler]);

  const varsayilanKdv = kdvler.find((k) => k.varsayilan);

  const kategoriAdlari = (u: MenuUrun) =>
    kategoriler.filter((k) => u.kategoriIdler.includes(k.id)).map((k) => k.ad).join(", ");

  // Menüdeki gerçek sıra: önce kategori sırası, kategori içinde ürün sırası.
  const menuSirasi = useMemo(() => {
    const idler: number[] = [];
    const ekle = (id: number) => {
      if (!idler.includes(id)) idler.push(id);
    };
    if (kategoriId === "tumu") {
      kategoriler.forEach((k) => kategoriUrunleri(urunler, k.id).forEach((u) => ekle(u.id!)));
      urunler.forEach((u) => u.id && ekle(u.id));
    } else {
      kategoriUrunleri(urunler, kategoriId).forEach((u) => ekle(u.id!));
    }
    return idler;
  }, [urunler, kategoriler, kategoriId]);

  const aranan = arama.trim().toLocaleLowerCase("tr");
  const gorunenler = useMemo(() => {
    const sirali = menuSirasi
      .map((id) => taslak.find((t) => t.id === id))
      .filter((t): t is UrunTaslak => !!t)
      .filter(
        (t) =>
          !aranan ||
          t.ad.toLocaleLowerCase("tr").includes(aranan) ||
          t.kod.toLocaleLowerCase("tr").includes(aranan)
      );
    return adaGore ? [...sirali].sort((a, b) => a.ad.localeCompare(b.ad, "tr")) : sirali;
  }, [menuSirasi, taslak, aranan, adaGore]);

  const degisenler = useMemo(() => {
    const urunDegisim: TopluUrun[] = [];
    const porsiyonDegisim: TopluPorsiyon[] = [];
    const degisenIdler = new Set<number>();

    for (const t of taslak) {
      const a = asil.get(t.id);
      if (!a) continue;

      if (urunFarki(t, a)) {
        urunDegisim.push({
          id: t.id,
          ad: t.ad.trim(),
          kod: t.kod.trim() || undefined,
          kdvId: t.kdvId,
          favori: t.favori,
          satistaGorunur: t.satistaGorunur,
          mutfaktaGorunur: t.mutfaktaGorunur,
        });
        degisenIdler.add(t.id);
      }

      for (const p of t.porsiyonlar) {
        const ap = a.porsiyonlar.find((x) => x.id === p.id);
        if (!p.id || !ap || !porsiyonFarki(p, ap)) continue;
        porsiyonDegisim.push({
          id: p.id,
          birimId: p.birimId,
          fiyat: paraSayi(p.fiyat) ?? 0,
          maliyet: paraSayi(p.maliyet),
          masaFiyat: paraSayi(p.masaFiyat),
          gelalFiyat: paraSayi(p.gelalFiyat),
          paketFiyat: paraSayi(p.paketFiyat),
        });
        degisenIdler.add(t.id);
      }
    }

    return { urunDegisim, porsiyonDegisim, sayi: degisenIdler.size };
  }, [taslak, asil]);

  useEffect(() => onDegisiklik(degisenler.sayi), [degisenler.sayi, onDegisiklik]);

  const urunDegis = (id: number, degisim: Partial<UrunTaslak>) => {
    setTaslak((l) => l.map((t) => (t.id === id ? { ...t, ...degisim } : t)));
  };

  const porsiyonDegis = (id: number, sira: number, degisim: Partial<PorsiyonTaslak>) => {
    setTaslak((l) =>
      l.map((t) =>
        t.id === id
          ? { ...t, porsiyonlar: t.porsiyonlar.map((p, i) => (i === sira ? { ...p, ...degisim } : p)) }
          : t
      )
    );
  };

  // Şeritteki ayar, tabloda o an görünen (süzülmüş) ürünlerin hepsine işlenir.
  // Yazma değil taslak değişikliği — sonuç tabloda görünür, alttaki Kaydet ile gider.
  const hepsineUygula = (degisim: Partial<UrunTaslak>) => {
    const idler = new Set(gorunenler.map((t) => t.id));
    setTaslak((l) => l.map((t) => (idler.has(t.id) ? { ...t, ...degisim } : t)));
  };

  const kaydet = async () => {
    const bos = taslak.find((t) => !t.ad.trim());
    if (bos) {
      onUyari("Ürün adı boş bırakılamaz.");
      return;
    }

    const kodlar = new Map<string, string>();
    for (const t of taslak) {
      const kod = t.kod.trim().toLocaleLowerCase("tr");
      if (!kod) continue;
      const sahip = kodlar.get(kod);
      if (sahip) {
        onUyari(`"${sahip}" ile "${t.ad}" aynı ürün kodunu kullanıyor. Ürün kodu benzersiz olmalı.`);
        return;
      }
      kodlar.set(kod, t.ad);
    }

    // Aynı ürünün iki porsiyonu aynı birimi taşıyamaz — siparişte hangisi olduğu ayırt edilmez.
    for (const t of taslak) {
      const birimIdler = t.porsiyonlar.map((p) => p.birimId);
      if (new Set(birimIdler).size !== birimIdler.length) {
        onUyari(`"${t.ad}" ürününde aynı birim iki porsiyonda kullanılıyor.`);
        return;
      }
    }

    const sayi = degisenler.sayi;
    const hata = await onKaydet(degisenler.urunDegisim, degisenler.porsiyonDegisim);
    if (hata) onUyari(hata);
    else onBildirim(`${sayi} üründeki değişiklik kaydedildi`);
  };

  const paraHucre = (
    deger: string,
    degisti: boolean,
    yerTutucu: string,
    yaz: (v: string) => void
  ) => (
    <td className="toplu-para">
      <input
        className={degisti ? "degisti" : ""}
        value={deger}
        onChange={(e) => yaz(paraYaz(e.target.value))}
        placeholder={yerTutucu}
        inputMode="decimal"
      />
    </td>
  );

  // Sipariş türü fiyatı ürünlerin çok azında var; üç sütunu bütün tabloya
  // açmak yerine yalnız o satırın fiyat hücresi ikiye ayrılıyor.
  const turDegistir = (id: number, sira: number) => {
    const anah = id + "-" + sira;
    setTurAcik((eski) => {
      const yeni = new Set(eski);
      if (yeni.has(anah)) {
        yeni.delete(anah);
        // Tek fiyata dönen porsiyonda türe özel tutarlar kalmamalı, yoksa
        // görünmeyen bir fiyat satışa girer.
        porsiyonDegis(id, sira, { masaFiyat: "", gelalFiyat: "", paketFiyat: "" });
      } else yeni.add(anah);
      return yeni;
    });
  };

  const turKutusu = (
    baslik: string,
    deger: string,
    degisti: boolean,
    yerTutucu: string,
    yaz: (v: string) => void
  ) => (
    <label className="toplu-tur-kutu">
      <span>{baslik}</span>
      <input
        className={degisti ? "degisti" : ""}
        value={deger}
        onChange={(e) => yaz(paraYaz(e.target.value))}
        placeholder={yerTutucu}
        inputMode="decimal"
      />
    </label>
  );

  const fiyatHucresi = (
    id: number,
    sira: number,
    p: PorsiyonTaslak,
    fark: (alan: keyof MenuPorsiyon, deger: string, sifir?: boolean) => boolean
  ) => {
    const acik = turAcik.has(id + "-" + sira);
    const dolu = !acik && turAyrisiyor(p);

    return (
      <td className="toplu-para">
        <div className="toplu-fiyat">
          <input
            className={fark("fiyat", p.fiyat, true) ? "degisti" : ""}
            value={p.fiyat}
            onChange={(e) => porsiyonDegis(id, sira, { fiyat: paraYaz(e.target.value) })}
            placeholder="₺"
            inputMode="decimal"
          />
          <button
            className={"toplu-tur-tus" + (acik ? " acik" : dolu ? " dolu" : "")}
            onClick={() => turDegistir(id, sira)}
            title={
              acik
                ? "Tek fiyata dön"
                : dolu
                  ? "Sipariş türüne göre ayrı fiyatı var"
                  : "Sipariş türüne göre ayrı fiyat"
            }
          >
            {acik ? <Undo2 size={15} /> : <SplitSquareHorizontal size={15} />}
          </button>
        </div>
      </td>
    );
  };

  /**
   * Tür fiyatları kendi alt satırında. Fiyat hücresinin içine sıkıştırılmıştı;
   * hücre genişleyince tablo sağa taşıp yatay kaydırma açıyordu. Alt satır tam
   * genişlikte, sütun ölçüleri hiç oynamıyor.
   */
  const turSatiri = (
    t: UrunTaslak,
    p: PorsiyonTaslak,
    sira: number,
    sutunSayisi: number,
    fark: (alan: keyof MenuPorsiyon, deger: string, sifir?: boolean) => boolean
  ) => {
    const tekFiyat = p.fiyat || "0";

    return (
      <tr key={`tur-${t.id}-${sira}`} className="toplu-tur-satir">
        <td colSpan={sutunSayisi}>
          <div className="toplu-tur">
            <span className="toplu-tur-ad">
              <SplitSquareHorizontal size={14} />
              Sipariş türüne göre fiyat
            </span>
            {turKutusu("Masa", p.masaFiyat, fark("masaFiyat", p.masaFiyat), tekFiyat, (v) =>
              porsiyonDegis(t.id, sira, { masaFiyat: v })
            )}
            {turKutusu("Gel Al", p.gelalFiyat, fark("gelalFiyat", p.gelalFiyat), tekFiyat, (v) =>
              porsiyonDegis(t.id, sira, { gelalFiyat: v })
            )}
            {turKutusu("Paket", p.paketFiyat, fark("paketFiyat", p.paketFiyat), tekFiyat, (v) =>
              porsiyonDegis(t.id, sira, { paketFiyat: v })
            )}
            <span className="toplu-tur-not">Boş bırakılan tür {tekFiyat} ₺ ile satılır.</span>
          </div>
        </td>
      </tr>
    );
  };

  const basligi = (ikon: React.ReactNode, ad: string) => (
    <span className="toplu-baslik">
      {ikon}
      {ad}
    </span>
  );

  // Satışta / Mutfakta / Favori üç ayrı sütundu; üçü de tek işaretlik bilgi
  // olduğu için tek sütunda üç ikon düğmesine indi, tablo ekrana sığdı.
  const gorunurlukTusu = (
    acik: boolean,
    degistir: () => void,
    baslik: string,
    ikon: React.ReactNode
  ) => (
    <button
      className={acik ? "toplu-im acik" : "toplu-im"}
      onClick={degistir}
      title={baslik}
      aria-label={baslik}
      aria-pressed={acik}
    >
      {ikon}
    </button>
  );

  return (
    <div className="ms-urunler">
      <div className="ms-urun-ust">
        <h2>Toplu Düzenle</h2>
        <span>
          {gorunenler.length} ürün
          {aranan || kategoriId !== "tumu" ? " (filtreli)" : ""}
        </span>
      </div>

      <Bilgi>
        Fiyatları ve anahtarları doğrudan tabloda değiştir, en altta tek Kaydet ile hepsi birden yazılır.
        Zam döneminde ürünleri tek tek açmaktan çok hızlı.
      </Bilgi>

      <div className="ms-arama toplu-arac">
        <div className="arama-kutu">
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ürün adı veya kodu ara"
          />
          {arama && (
            <button className="arama-temizle" onClick={() => setArama("")} title="Temizle">
              <X size={15} />
            </button>
          )}
        </div>

        <select
          className="toplu-kategori"
          value={kategoriId}
          onChange={(e) => setKategoriId(e.target.value === "tumu" ? "tumu" : Number(e.target.value))}
        >
          <option value="tumu">Tüm kategoriler</option>
          {kategoriler.map((k) => (
            <option key={k.id} value={k.id}>{k.ustId ? `↳ ${k.ad}` : k.ad}</option>
          ))}
        </select>

        <button
          className={adaGore ? "toplu-tus aktif" : "toplu-tus"}
          onClick={() => setAdaGore(!adaGore)}
          title="Ürünleri A-Z sırala"
        >
          A-Z
        </button>

        <button
          className={hepsiAcik ? "toplu-tus aktif" : "toplu-tus"}
          onClick={() => setHepsiAcik(!hepsiAcik)}
          title="Listedeki tüm ürünlere tek hamlede aynı ayarı uygula"
        >
          Hepsine uygula
        </button>
      </div>

      {hepsiAcik && (
        <div className="toplu-hepsi">
          <strong>
            Listedeki {gorunenler.length} ürünün hepsine:
          </strong>

          {!!kdvler.length && (
            <label>
              KDV
              <select
                value=""
                disabled={!gorunenler.length}
                onChange={(e) =>
                  hepsineUygula({ kdvId: e.target.value ? Number(e.target.value) : undefined })
                }
              >
                <option value="">Seç…</option>
                {kdvler.map((k) => (
                  <option key={k.id} value={k.id}>%{k.oran} · {k.ad}</option>
                ))}
              </select>
            </label>
          )}

          {(
            [
              ["Satışta", "satistaGorunur"],
              ["Mutfakta", "mutfaktaGorunur"],
              ["Favori", "favori"],
            ] as const
          ).map(([baslik, alan]) => (
            <div key={alan} className="hepsi-ikili">
              <span>{baslik}</span>
              <button disabled={!gorunenler.length} onClick={() => hepsineUygula({ [alan]: true })}>
                Aç
              </button>
              <button disabled={!gorunenler.length} onClick={() => hepsineUygula({ [alan]: false })}>
                Kapat
              </button>
            </div>
          ))}

          <small>Değişiklik tabloda işaretlenir, kaydetmeden önce Vazgeç ile geri alınabilir.</small>
        </div>
      )}

      <div className="toplu-sar">
        <table className="toplu-tablo">
          <thead>
            <tr>
              <th className="sol">{basligi(<Package size={15} />, "Ürün")}</th>
              <th className="s-kod">{basligi(<Hash size={15} />, "Kod")}</th>
              {!!kdvler.length && (
                <th className="s-kdv">{basligi(<Percent size={15} />, "KDV")}</th>
              )}
              <th className="s-porsiyon">{basligi(<Scale size={15} />, "Porsiyon")}</th>
              <th className="s-para sag">{basligi(<Tag size={15} />, "Fiyat")}</th>
              <th className="s-para sag">{basligi(<Wallet size={15} />, "Maliyet")}</th>
              <th className="s-imler">{basligi(<Eye size={15} />, "Görünürlük")}</th>
            </tr>
          </thead>

          <tbody>
            {gorunenler.map((t) => {
              const a = asil.get(t.id)!;
              const satirSayisi = Math.max(t.porsiyonlar.length, 1);

              const urunHucreleri = (
                <>
                  <td className="toplu-ad" rowSpan={satirSayisi}>
                    <input
                      className={t.ad.trim() !== a.ad ? "degisti" : ""}
                      value={t.ad}
                      onChange={(e) => urunDegis(t.id, { ad: e.target.value })}
                    />
                    <span className="toplu-kategori-ad">{kategoriAdlari(a) || "Kategorisiz"}</span>
                  </td>
                  <td className="toplu-kod" rowSpan={satirSayisi}>
                    <input
                      className={t.kod.trim() !== (a.kod ?? "") ? "degisti" : ""}
                      value={t.kod}
                      onChange={(e) => urunDegis(t.id, { kod: e.target.value })}
                      placeholder="—"
                    />
                  </td>
                  {!!kdvler.length && (
                    <td className="toplu-kdv" rowSpan={satirSayisi}>
                      <select
                        className={t.kdvId !== a.kdvId ? "degisti" : ""}
                        value={t.kdvId ?? ""}
                        onChange={(e) =>
                          urunDegis(t.id, {
                            kdvId: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      >
                        <option value="">
                          {varsayilanKdv ? `%${varsayilanKdv.oran} (varsayılan)` : "Varsayılan"}
                        </option>
                        {kdvler.map((k) => (
                          <option key={k.id} value={k.id}>%{k.oran} · {k.ad}</option>
                        ))}
                      </select>
                    </td>
                  )}
                </>
              );

              const urunAnahtarlari = (
                <td className="toplu-imler" rowSpan={satirSayisi}>
                  {gorunurlukTusu(
                    t.satistaGorunur,
                    () => urunDegis(t.id, { satistaGorunur: !t.satistaGorunur }),
                    "Satış ekranında göster",
                    <ShoppingCart size={16} />
                  )}
                  {gorunurlukTusu(
                    t.mutfaktaGorunur,
                    () => urunDegis(t.id, { mutfaktaGorunur: !t.mutfaktaGorunur }),
                    "Mutfak ekranında göster",
                    <ChefHat size={16} />
                  )}
                  {gorunurlukTusu(
                    t.favori,
                    () => urunDegis(t.id, { favori: !t.favori }),
                    "Favori ürün",
                    <Star size={16} fill={t.favori ? "currentColor" : "none"} />
                  )}
                </td>
              );

              if (!t.porsiyonlar.length) {
                return (
                  <tr key={t.id}>
                    {urunHucreleri}
                    <td className="toplu-porsiyon yok" colSpan={3}>
                      porsiyon yok
                    </td>
                    {urunAnahtarlari}
                  </tr>
                );
              }

              return t.porsiyonlar.flatMap((p, i) => {
                const ap = a.porsiyonlar.find((x) => x.id === p.id);
                const fark = (alan: keyof MenuPorsiyon, deger: string, sifir = false) =>
                  !!ap && (sifir ? (paraSayi(deger) ?? 0) : paraSayi(deger)) !== ap[alan];
                const satir = (
                  <tr key={p.id ?? `${t.id}-${i}`} className={i ? "ek-porsiyon" : undefined}>
                    {i === 0 && urunHucreleri}
                    <td className="toplu-porsiyon">
                      <select
                        className={p.birimId !== ap?.birimId ? "degisti" : ""}
                        value={p.birimId ?? ""}
                        onChange={(e) =>
                          porsiyonDegis(t.id, i, { birimId: Number(e.target.value) })
                        }
                      >
                        {!p.birimId && <option value="">Birim seç</option>}
                        {birimler.map((b) => (
                          <option key={b.id} value={b.id}>{b.ad}</option>
                        ))}
                      </select>
                    </td>
                    {fiyatHucresi(t.id, i, p, fark)}
                    {paraHucre(p.maliyet, fark("maliyet", p.maliyet), "—", (v) =>
                      porsiyonDegis(t.id, i, { maliyet: v })
                    )}
                    {i === 0 && urunAnahtarlari}
                  </tr>
                );

                return turAcik.has(t.id + "-" + i)
                  ? [satir, turSatiri(t, p, i, sutunSayisi, fark)]
                  : [satir];
              });
            })}
          </tbody>
        </table>

        {gorunenler.length === 0 && <p className="bos">Eşleşen ürün yok</p>}
      </div>

      <div className="toplu-alt">
        <span className={degisenler.sayi ? "toplu-durum dolu" : "toplu-durum"}>
          {degisenler.sayi ? `${degisenler.sayi} üründe değişiklik var` : "Kaydedilmemiş değişiklik yok"}
        </span>
        <button
          className="iptal"
          disabled={!degisenler.sayi}
          onClick={() => setTaslak(taslakYap(urunler))}
        >
          Vazgeç
        </button>
        <button className="birim-kaydet" disabled={!degisenler.sayi} onClick={kaydet}>
          Kaydet
        </button>
      </div>
    </div>
  );
}
