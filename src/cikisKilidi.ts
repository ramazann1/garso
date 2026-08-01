// Kaydedilmemiş değişikliği olan ekran buraya kendini kaydeder; sol menü
// başka sayfaya geçmeden önce burayı sorar. Tek kilit yeter — aynı anda iki
// düzenleme ekranı açık olmuyor.
let sorgu: (() => boolean) | null = null;

export function kilitKur(f: () => boolean) {
  sorgu = f;
}

export function kilitKaldir() {
  sorgu = null;
}

export function kilitliMi() {
  return !!sorgu?.();
}
