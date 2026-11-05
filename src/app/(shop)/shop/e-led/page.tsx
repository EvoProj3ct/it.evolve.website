import type { Metadata } from "next";
import { ELedExperience } from "@/components/shop/ELedExperience";

export const metadata: Metadata = { title: "e-led — La tua identità, accesa", description: "Scritte e loghi luminosi stampati in 3D. Immagina la tua insegna e-led, personalizza testo, colori ed effetti nell’anteprima 3D." };

export default function ELedProductPage() {
  return <ELedExperience />;
}
