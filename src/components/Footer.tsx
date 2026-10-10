import Image from "next/image";
import Link from "next/link";
import { CookiePreferencesButton } from "@/components/legal/cookie-preferences-button";
import { MenuGhost } from "@/components/MenuGhost";
import styles from "./Footer.module.css";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "Chi siamo", href: "/about" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Risorse", href: "/utils" },
];

const moreLinks = [
  { label: "Eventi", href: "/rimani-aggiornato" },
  { label: "Chiedilo all'IA", href: "/chiedilo-all-ia" },
  { label: "Contatti", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer} aria-label="Piè di pagina">
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.brand}>
            <Link href="/" aria-label="Evolve, homepage" className={styles.brandLink}>
              <Image src="/logo_bianco.png" alt="Evolve" width={122} height={101} />
            </Link>
          </div>

          <nav className={styles.column} aria-label="Esplora il sito">
            <h3>Esplora</h3>
            {exploreLinks.map((link) => <Link key={link.href} href={link.href}><span className={styles.linkGhostSlot}><MenuGhost /></span>{link.label}</Link>)}
          </nav>

          <nav className={styles.column} aria-label="Altre pagine">
            <h3>Scopri</h3>
            {moreLinks.map((link) => <Link key={link.href} href={link.href}><span className={styles.linkGhostSlot}><MenuGhost /></span>{link.label}</Link>)}
          </nav>

          <address className={styles.contact}>
            <h3>Contatti</h3>
            <a className={styles.email} href="mailto:infoevolvecompany@gmail.com">infoevolvecompany@gmail.com</a>
            <p>Via Ciciliano, 59/b<br />00036 Palestrina (RM)</p>
            <p>P. IVA 18138881000</p>
          </address>

          <p className={styles.tagline}>Think Different.<br />Think to Evolve.</p>
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} Evolve</span>
          <div className={styles.legal}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookie-policy">Cookie Policy</Link>
            <Link href="/sicurezza">Sicurezza</Link>
            <CookiePreferencesButton className={styles.legalButton} />
          </div>
        </div>
      </div>
    </footer>
  );
}
