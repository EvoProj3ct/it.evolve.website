import type { Metadata } from "next";
import { ProductDocumentation } from "@/components/shop/ProductDocumentation";

export const metadata: Metadata = { title: "Guida e-linker", description: "Come personalizzare e-linker: quattro forme, testo in rilievo, loghi e colori." };

export default function ELinkerDocumentationPage() {
  return <ProductDocumentation product="e-linker" />;
}
