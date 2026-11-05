import type { Metadata } from "next";
import { ShopProductExperience } from "@/components/shop/ShopProductExperience";

export const metadata: Metadata = { title: "e-linker — Il tuo mondo, a portata di un gesto.", description: "Il portachiavi NFC personalizzato con il tuo logo: condividi la tua attività, presenta un prodotto o regala un ricordo digitale." };

export default function ELinkerProductPage() {
  return <ShopProductExperience key="e-linker" product="e-linker" />;
}
