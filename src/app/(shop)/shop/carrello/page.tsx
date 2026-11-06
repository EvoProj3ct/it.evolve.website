import type { Metadata } from "next";
import { ShopCart } from "@/components/shop/ShopCart";

export const metadata: Metadata = {
  title: "Il tuo carrello",
  description: "Le tue scelte nello shop Evolve. Anteprima del carrello con prodotti e importi dimostrativi.",
  robots: { index: false, follow: false },
};

export default function CartPreviewPage() {
  return <ShopCart />;
}
