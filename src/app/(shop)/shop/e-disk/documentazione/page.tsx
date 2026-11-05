import type { Metadata } from "next";
import { ProductDocumentation } from "@/components/shop/ProductDocumentation";

export const metadata: Metadata = { title: "Guida e-disk", description: "Primi passi con e-disk: app, collezione, collegamento al giradischi, dischi NFC e uscita audio." };

export default function EDiskDocumentationPage() {
  return <ProductDocumentation product="e-disk" />;
}
