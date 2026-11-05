import type { Metadata } from "next";
import { ShopProductExperience } from "@/components/shop/ShopProductExperience";

export const metadata: Metadata = { title: "e-disk — Meno scroll. Più rock’n’roll!", description: "Un giradischi NFC, i tuoi brani e due colori da scegliere. Scopri e-disk di Evolve." };

export default function EDiskProductPage() {
  return <ShopProductExperience key="e-disk" product="e-disk" />;
}
