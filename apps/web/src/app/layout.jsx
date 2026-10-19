import { Poppins } from "next/font/google";
import "./globals.css";
import { ALAMAT_SITUS } from "@/constants/situs";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  // `metadataBase` (25 September 2026) diperlukan agar URL di sitemap, Open
  // Graph, dan kanonis menjadi absolut. Tanpanya Next memperingatkan dan
  // menyusunnya relatif, yang tak berguna bagi mesin pencari maupun pratinjau
  // tautan di aplikasi pesan.
  metadataBase: new URL(ALAMAT_SITUS),
  // `template` dipakai supaya nama situs ditulis SEKALI di sini, bukan diulang
  // di 36 berkas judul. Sebelumnya delapan judul yang ada menempelkannya
  // sendiri-sendiri dengan tiga pemisah berbeda (" - ", " | ", dan tanda pisah
  // panjang); ketiganya kini seragam.
  title: {
    default: "SKEMA Madiun",
    template: "%s - SKEMA Madiun",
  },
  description: "Layanan Publik Terpadu Kabupaten Madiun",
};

// maximumScale: 1 + userScalable: false DIBUANG (29 Agustus 2026).
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${poppins.variable} ${poppins.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-poppins bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}