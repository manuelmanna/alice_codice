import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "A.L.I.C.E. - Assistenza per la Longevità",
  description: "Piattaforma web per la gestione e assistenza dei pazienti anziani",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
