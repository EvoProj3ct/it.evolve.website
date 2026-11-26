import type { Metadata } from "next";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Il tuo spazio · Evolve", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function AccountLayout({ children }: { children: React.ReactNode }) { return children; }
