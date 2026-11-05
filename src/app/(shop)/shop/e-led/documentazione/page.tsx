import type { Metadata } from "next";
import { ELedDocumentation } from "@/components/shop/ELedDocumentation";

export const metadata: Metadata = { title: "Guida e-led", description: "Testi, loghi vettoriali, effetti luminosi e preparazione del tuo progetto e-led." };

export default function ELedDocumentationPage() {
  return <ELedDocumentation />;
}
