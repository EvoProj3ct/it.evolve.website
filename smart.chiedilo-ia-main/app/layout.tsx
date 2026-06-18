import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import CookieConsent from "./components/cookie-consent";
import SiteFooter from "./components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chiedilo all’IA | Evolve per BCC",
  description:
    "Evento promosso da BCC e realizzato da Evolve per imparare a dialogare con l’intelligenza artificiale in modo chiaro, utile e consapevole.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
