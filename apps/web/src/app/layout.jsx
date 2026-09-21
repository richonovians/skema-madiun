import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "SKEMA Madiun",
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