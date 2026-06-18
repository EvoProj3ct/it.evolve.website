import { Geist, Geist_Mono } from "next/font/google";
import ChiediloFooter from "@/components/chiedilo/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-white text-zinc-900 antialiased`}>
      <div className="flex-1">{children}</div>
      <ChiediloFooter />
    </div>
  );
}
