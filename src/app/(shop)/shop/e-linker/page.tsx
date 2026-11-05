import type { Metadata } from "next";
import { ShopProductExperience } from "@/components/shop/ShopProductExperience";

export const metadata: Metadata = { title: "e-linker — Piccolo oggetto. Grande carattere.", description: "Il tuo portachiavi in PLA, con forme, colori, testo e logo personalizzabili. Configura il tuo e-linker." };

export default function ELinkerProductPage() {
  return <ShopProductExperience key="e-linker" product="e-linker" />;
}
