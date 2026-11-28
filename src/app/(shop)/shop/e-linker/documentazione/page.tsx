import type { Metadata } from "next";
import { ProductDocumentation } from "@/components/shop/ProductDocumentation";

export const metadata: Metadata = {
  title: "Istruzioni e-linker",
  description: "Come leggere e riscrivere il tag NFC di e-linker, risolvere i problemi e prendersi cura della scocca in PLA.",
};

export default function ELinkerDocumentationPage() {
  return <ProductDocumentation product="e-linker" />;
}
