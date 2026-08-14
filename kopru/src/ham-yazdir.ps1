# Windows'un yazdırma servisine ham veri gönderme.
#
# Normal yazdırma yolları (Out-Printer, notepad /p) metni kendi biçimlendirip
# yazıcıya öyle veriyor; ESC/POS komutları o dönüşümde bozuluyor. Servise "bunu
# olduğu gibi bas" demenin tek yolu spooler'ın kendi arayüzü, o da PowerShell'de
# doğrudan yok — aşağıdaki köprü sınıfı Windows'un yazdırma kütüphanesini
# çağırıyor. Ek kurulum istemiyor, Windows'un kendi parçası.

param(
  [Parameter(Mandatory = $true)][string]$Yazici,
  [Parameter(Mandatory = $true)][string]$Dosya
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class GarsoHamYazdir
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct BELGE
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string Ad;
        [MarshalAs(UnmanagedType.LPWStr)] public string CiktiDosyasi;
        [MarshalAs(UnmanagedType.LPWStr)] public string VeriTuru;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool OpenPrinter(string ad, out IntPtr tutamak, IntPtr ayar);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool ClosePrinter(IntPtr tutamak);

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool StartDocPrinter(IntPtr tutamak, int seviye, ref BELGE belge);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool EndDocPrinter(IntPtr tutamak);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool StartPagePrinter(IntPtr tutamak);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool EndPagePrinter(IntPtr tutamak);

    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool WritePrinter(IntPtr tutamak, IntPtr veri, int uzunluk, out int yazilan);

    public static void Gonder(string yazici, byte[] veri)
    {
        IntPtr tutamak;
        if (!OpenPrinter(yazici, out tutamak, IntPtr.Zero))
            throw new Exception("Yazıcı açılamadı (" + Marshal.GetLastWin32Error() + ")");

        try
        {
            BELGE belge = new BELGE();
            belge.Ad = "Garso fiş";
            // RAW: baytları dönüştürmeden yazıcıya ilet.
            belge.VeriTuru = "RAW";

            if (!StartDocPrinter(tutamak, 1, ref belge))
                throw new Exception("Yazdırma işi açılamadı (" + Marshal.GetLastWin32Error() + ")");

            try
            {
                if (!StartPagePrinter(tutamak))
                    throw new Exception("Sayfa açılamadı (" + Marshal.GetLastWin32Error() + ")");

                IntPtr bellek = Marshal.AllocCoTaskMem(veri.Length);
                try
                {
                    Marshal.Copy(veri, 0, bellek, veri.Length);
                    int yazilan;
                    if (!WritePrinter(tutamak, bellek, veri.Length, out yazilan) || yazilan != veri.Length)
                        throw new Exception("Veri yazıcıya aktarılamadı (" + Marshal.GetLastWin32Error() + ")");
                }
                finally { Marshal.FreeCoTaskMem(bellek); }

                EndPagePrinter(tutamak);
            }
            finally { EndDocPrinter(tutamak); }
        }
        finally { ClosePrinter(tutamak); }
    }
}
"@

[GarsoHamYazdir]::Gonder($Yazici, [System.IO.File]::ReadAllBytes($Dosya))
