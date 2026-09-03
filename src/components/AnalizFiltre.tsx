import { useEffect, useState } from "react";
import { CalendarDays, Filter, SlidersHorizontal, X } from "lucide-react";
import { ayarlar } from "../isletmeAyarlari";
import { vardiyaGecmisi, type VardiyaOzeti } from "../kasa";
import { BOLGE_ANAHTAR, bolgeleriGetir } from "../masalar";
import { ODEME_TIPI_ANAHTAR, odemeTipleriniGetir, type OdemeTipi } from "../odemeTipleri";
import { kisaAd, personeliGetir } from "../personel";
import { useTanim } from "../tanimAbonelik";
import {
  BOS_FILTRE,
  DONEMLER,
  donemMetni,
  filtreSayisi,
  type AnalizFiltre as Filtre,
} from "../analiz";
import type { Bolge } from "../types";

const DURUM_CIPLERI: Record<Filtre["durum"], string> = {
  hepsi: "",
  acik: "Açık hesaplar",
  kapali: "Kapanmış hesaplar",
  ikram: "İkram edilenler",
  iptal: "İptal edilenler",
};

/**
 * Bütün rapor sekmelerinin tek filtre şeridi. Dönem düğmeleri hep görünür —
 * en çok değişen şey o; gerisi "Filtreler" panelinde duruyor ve seçilenler
 * altta çip olarak kalıyor ki sekme değiştirince neyin süzüldüğü unutulmasın.
 */
export default function AnalizFiltre({
  filtre,
  degistir,
}: {
  filtre: Filtre;
  degistir: (f: Filtre) => void;
}) {
  const [panelAcik, setPanelAcik] = useState(false);
  const bolgeler = useTanim<Bolge[]>(BOLGE_ANAHTAR, bolgeleriGetir, []);
  const [kisiler, setKisiler] = useState<{ id: number; ad: string }[]>([]);
  const odemeTipleri = useTanim<OdemeTipi[]>(ODEME_TIPI_ANAHTAR, odemeTipleriniGetir, []);
  const [vardiyalar, setVardiyalar] = useState<VardiyaOzeti[]>([]);

  useEffect(() => {
    personeliGetir().then((p) => setKisiler(p.map((k) => ({ id: k.id, ad: kisaAd(k.ad) }))));
    if (ayarlar().kasaTakibi) vardiyaGecmisi(30).then(setVardiyalar);
  }, []);

  const yaz = (parca: Partial<Filtre>) => degistir({ ...filtre, ...parca });

  const bolge = bolgeler.find((b) => b.id === filtre.bolgeId);
  const masalar = bolge ? bolge.masalar : bolgeler.flatMap((b) => b.masalar);
  const masa = masalar.find((m) => m.id === filtre.masaId);
  const kisi = kisiler.find((k) => k.id === filtre.garsonId);
  const vardiya = vardiyalar.find((v) => v.id === filtre.vardiyaId);

  const cipler: { ad: string; sil: () => void }[] = [];
  if (vardiya) {
    cipler.push({
      ad: `Vardiya · ${new Date(vardiya.acilis).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      })} ${new Date(vardiya.acilis).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      sil: () => yaz({ vardiyaId: null, vardiyaBas: "", vardiyaBit: "" }),
    });
  }
  if (bolge) cipler.push({ ad: bolge.ad, sil: () => yaz({ bolgeId: null, masaId: null }) });
  if (masa) cipler.push({ ad: `Masa ${masa.ad}`, sil: () => yaz({ masaId: null }) });
  if (kisi) cipler.push({ ad: kisi.ad, sil: () => yaz({ garsonId: null }) });
  if (filtre.tip) {
    const adlar = { masa: "Masa", gelal: "Gel Al", paket: "Paket" };
    cipler.push({ ad: adlar[filtre.tip], sil: () => yaz({ tip: null }) });
  }
  if (filtre.odemeTipi) {
    cipler.push({ ad: filtre.odemeTipi, sil: () => yaz({ odemeTipi: null }) });
  }
  if (filtre.durum !== "hepsi") {
    cipler.push({
      ad: DURUM_CIPLERI[filtre.durum],
      sil: () => yaz({ durum: "hepsi" }),
    });
  }
  if (filtre.indirimli) {
    cipler.push({ ad: "İndirimli", sil: () => yaz({ indirimli: false }) });
  }
  if (filtre.enAz != null || filtre.enCok != null) {
    const alt = filtre.enAz != null ? `₺${filtre.enAz}` : "";
    const ust = filtre.enCok != null ? `₺${filtre.enCok}` : "";
    cipler.push({
      ad: alt && ust ? `${alt} – ${ust}` : alt ? `${alt} ve üzeri` : `${ust} altı`,
      sil: () => yaz({ enAz: null, enCok: null }),
    });
  }
  const sayi = filtreSayisi(filtre);

  return (
    <div className="analiz-filtre">
      <div className="analiz-filtre-ust">
        <div className="analiz-donem">
          {DONEMLER.map((d) => (
            <button
              key={d.kod}
              className={filtre.donem === d.kod && !filtre.vardiyaId ? "aktif" : ""}
              onClick={() =>
                yaz({ donem: d.kod, vardiyaId: null, vardiyaBas: "", vardiyaBit: "" })
              }
            >
              {d.ad}
            </button>
          ))}
        </div>

        {/* Arama buraya değil, her sekmenin kendi listesinin başına ait: aranan
            şey sekmeden sekmeye değişiyor (adisyon no, ürün adı, personel). */}
        <div className="analiz-filtre-sag">
          <button
            className={sayi > 0 ? "analiz-filtre-dugme dolu" : "analiz-filtre-dugme"}
            onClick={() => setPanelAcik(true)}
          >
            <SlidersHorizontal size={16} />
            Filtreler
            {sayi > 0 && <b>{sayi}</b>}
          </button>
        </div>
      </div>

      {filtre.donem === "ozel" && !filtre.vardiyaId && (
        <div className="analiz-ozel-aralik">
          <CalendarDays size={16} />
          <input
            type="date"
            value={filtre.ozelBas}
            onChange={(e) => yaz({ ozelBas: e.target.value })}
          />
          <span>–</span>
          <input
            type="date"
            value={filtre.ozelBit}
            onChange={(e) => yaz({ ozelBit: e.target.value })}
          />
        </div>
      )}

      <div className="analiz-cipler">
        <span className="analiz-donem-metni">{donemMetni(filtre)}</span>
        {cipler.map((c) => (
          <button key={c.ad} className="analiz-cip" onClick={c.sil}>
            {c.ad}
            <X size={13} />
          </button>
        ))}
        {sayi > 0 && (
          <button
            className="analiz-cip-temizle"
            onClick={() =>
              degistir({
                ...BOS_FILTRE,
                donem: filtre.donem,
                ozelBas: filtre.ozelBas,
                ozelBit: filtre.ozelBit,
              })
            }
          >
            Filtreleri temizle
          </button>
        )}
      </div>

      {panelAcik && (
        <div className="panel-fon" onClick={() => setPanelAcik(false)}>
          <div className="ayar-panel" onClick={(e) => e.stopPropagation()}>
            <header className="panel-ust">
              <h3>
                <Filter size={17} /> Filtreler
              </h3>
              <button className="panel-kapat" onClick={() => setPanelAcik(false)}>
                <X size={19} />
              </button>
            </header>

            <div className="panel-govde analiz-filtre-panel">
              {vardiyalar.length > 0 && (
                <label>
                  <span>Vardiya</span>
                  <select
                    value={filtre.vardiyaId ?? ""}
                    onChange={(e) => {
                      const secilen = vardiyalar.find((v) => v.id === Number(e.target.value));
                      yaz({
                        vardiyaId: secilen?.id ?? null,
                        vardiyaBas: secilen?.acilis ?? "",
                        vardiyaBit: secilen?.kapanis ?? "",
                      });
                    }}
                  >
                    <option value="">Tarih aralığını kullan</option>
                    {vardiyalar.map((v) => (
                      <option key={v.id} value={v.id}>
                        {new Date(v.acilis).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        {new Date(v.acilis).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {v.kapanis ? "" : " · açık"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                <span>Bölge</span>
                <select
                  value={filtre.bolgeId ?? ""}
                  onChange={(e) =>
                    yaz({
                      bolgeId: e.target.value ? Number(e.target.value) : null,
                      masaId: null,
                    })
                  }
                >
                  <option value="">Tüm bölgeler</option>
                  {bolgeler.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.ad}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Masa</span>
                <select
                  value={filtre.masaId ?? ""}
                  onChange={(e) =>
                    yaz({ masaId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">Tüm masalar</option>
                  {masalar.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.ad}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Adisyonu açan</span>
                <select
                  value={filtre.garsonId ?? ""}
                  onChange={(e) =>
                    yaz({ garsonId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">Herkes</option>
                  {kisiler.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ad}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Sipariş tipi</span>
                <select
                  value={filtre.tip ?? ""}
                  onChange={(e) => yaz({ tip: (e.target.value || null) as Filtre["tip"] })}
                >
                  <option value="">Hepsi</option>
                  <option value="masa">Masa</option>
                  {ayarlar().gelalAcik && <option value="gelal">Gel Al</option>}
                  {ayarlar().paketAcik && <option value="paket">Paket</option>}
                </select>
              </label>

              <label>
                <span>Ödeme tipi</span>
                <select
                  value={filtre.odemeTipi ?? ""}
                  onChange={(e) => yaz({ odemeTipi: e.target.value || null })}
                >
                  <option value="">Hepsi</option>
                  {odemeTipleri.map(({ ad: o }) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Durum</span>
                <select
                  value={filtre.durum}
                  onChange={(e) => yaz({ durum: e.target.value as Filtre["durum"] })}
                >
                  <option value="hepsi">Hepsi</option>
                  <option value="kapali">Kapanmış</option>
                  <option value="acik">Açık</option>
                  <option value="ikram">İkram</option>
                  <option value="iptal">İptal</option>
                </select>
              </label>

              <label className="analiz-tutar">
                <span>Tutar aralığı</span>
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="En az"
                    value={filtre.enAz ?? ""}
                    onChange={(e) =>
                      yaz({ enAz: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="En çok"
                    value={filtre.enCok ?? ""}
                    onChange={(e) =>
                      yaz({ enCok: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </div>
              </label>

              <button
                className={filtre.indirimli ? "analiz-secenek acik" : "analiz-secenek"}
                onClick={() => yaz({ indirimli: !filtre.indirimli })}
              >
                Yalnızca indirim uygulanmış adisyonlar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
