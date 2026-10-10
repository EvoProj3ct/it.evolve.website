import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Preventivatore 3D | Evolve",
  description: "Il preventivatore per i progetti di stampa 3D di Evolve.",
};

export default function QuoteCalculatorPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <span className={styles.eyebrow}>Progettazione e stampa 3D</span>
        <h1>Il tuo progetto<br />prende forma qui.</h1>
        <p>Il preventivatore è in preparazione. Per raccontarci cosa vorresti realizzare, puoi già contattarci.</p>
        <Link href="/contact" className={styles.contactLink}>Parliamo del tuo progetto <span aria-hidden="true">↗</span></Link>
      </div>
    </main>
  );
}
