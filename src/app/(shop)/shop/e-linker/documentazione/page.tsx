import type { Metadata } from "next";
import { ProductDocumentation } from "@/components/shop/ProductDocumentation";

export const metadata: Metadata = { title: "Guida e-linker", description: "Il portachiavi NFC per attività, prodotti e ricordi: scegli il collegamento, poi personalizza forma, testo, logo e colori." };

export default function ELinkerDocumentationPage() {
  return <ProductDocumentation product="e-linker" />;
}
