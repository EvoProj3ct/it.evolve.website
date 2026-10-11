import type { Metadata } from "next";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { QuoteConfigurator } from "@/components/three-d/QuoteConfigurator";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Preventivatore 3D | Evolve",
  description: "Scegli un modello, il materiale e le dimensioni per il tuo progetto di stampa 3D.",
};

export default async function QuoteCalculatorPage() {
  const files = await readdir(path.join(process.cwd(), "public", "modelli_3d"));
  const models = files
    .filter((file) => file.toLowerCase().endsWith(".stl"))
    .sort((a, b) => a.localeCompare(b, "it", { numeric: true }))
    .map((file) => ({
      label: file.replace(/\.stl$/i, "").replace(/\s+/g, " ").trim(),
      url: `/modelli_3d/${encodeURIComponent(file)}`,
    }));

  return (
    <main className={styles.page}>
      <QuoteConfigurator models={models} />
    </main>
  );
}
