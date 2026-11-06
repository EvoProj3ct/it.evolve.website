import type { Metadata } from "next";
import { ShopProfile } from "@/components/shop/ShopProfile";

export const metadata: Metadata = {
  title: "Il tuo spazio",
  description: "Il tuo spazio Evolve: ordini, idee salvate e preferenze. Anteprima con dati dimostrativi.",
  robots: { index: false, follow: false },
};

export default function ProfilePreviewPage() {
  return <ShopProfile />;
}
