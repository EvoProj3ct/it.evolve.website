import localFont from "next/font/local";
import ChiediloFooter from "@/components/chiedilo/site-footer";

const geistSans = localFont({
  src: "../fonts/Geist-latin-variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/GeistMono-latin-variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-white text-zinc-900 antialiased`}>
      <div className="flex-1">{children}</div>
      <ChiediloFooter />
    </div>
  );
}
