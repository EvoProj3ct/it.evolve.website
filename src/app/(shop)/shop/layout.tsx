import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s · Evolve Shop", default: "Evolve Shop" },
  description: "Oggetti fisici, idee digitali. Scopri e personalizza i prodotti Evolve.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
