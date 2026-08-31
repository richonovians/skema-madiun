import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "SKEMA Madiun",
  description: "Layanan Publik Terpadu Kabupaten Madiun",
};

// `maximumScale: 1` + `userScalable: false` DIBUANG (29 Agustus 2026).
//
// Keduanya mematikan cicit-perbesar di peramban ponsel. Untuk portal layanan
// publik yang penggunanya seluruh warga -- termasuk yang lanjut usia dan yang
// berpenglihatan rendah -- itu menghilangkan satu-satunya cara mereka membesarkan
// teks yang terlalu kecil. WCAG 1.4.4 (Resize Text, level AA) mensyaratkan teks
// dapat diperbesar sampai 200%, dan iOS bahkan sudah mengabaikan larangan ini
// sejak lama, sehingga kedua baris itu hanya menghukum pengguna Android.
//
// Tak ada yang berubah pada tampilan zoom bawaan: `initialScale: 1` tetap, jadi
// halaman terbuka pada ukuran yang sama seperti sebelumnya. Yang berubah hanya
// satu: pengguna kini BOLEH memperbesarnya.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-poppins bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
