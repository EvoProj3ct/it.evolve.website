import type { Metadata } from "next";
import { ShopProductExperience } from "@/components/shop/ShopProductExperience";

export const metadata: Metadata = { title: "e-disk — Meno scroll. Più rock’n’roll!", description: "e-disk nei tuoi colori, dischi personalizzati stampati da Evolve e un bundle con tre dischi. Dai una forma alla tua musica." };

export default function EDiskProductPage() {
  return <ShopProductExperience key="e-disk" product="e-disk" />;
}
