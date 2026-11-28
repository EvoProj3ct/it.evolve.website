import type { Metadata } from "next";
import { LinkerNfcWriter } from "@/components/shop/LinkerNfcWriter";

export const metadata: Metadata = {
  title: "Configura e-linker",
  description: "Scrivi il tuo link sul tag NFC di e-linker dal telefono.",
};

export default function ConfigureLinkerPage() {
  return <LinkerNfcWriter />;
}
