import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CookiePreferencesButton } from "@/components/legal/cookie-preferences-button";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import styles from "@/components/shop/Shop.module.css";

export const metadata: Metadata = {
  title: { template: "%s · Evolve Shop", default: "Evolve Shop" },
  description: "Oggetti fisici, idee digitali. Scopri e-disk ed e-linker e personalizzali con i tuoi colori.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shop}>
      <a className={styles.skipLink} href="#shop-content">Vai al contenuto</a>
      <ShopNavigation />
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Link href="/" aria-label="Evolve, homepage"><Image src="/logo_bianco.png" alt="Evolve" width={80} height={66} /></Link>
          <p>Idee digitali.<br />Oggetti da vivere<span>.</span></p>
          <a href="mailto:infoevolvecompany@gmail.com">Parliamone ↗</a>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Evolve · P. IVA 18138881000</span>
          <nav aria-label="Informazioni legali"><Link href="/privacy">Privacy</Link><Link href="/cookie-policy">Cookie</Link><CookiePreferencesButton /></nav>
        </div>
      </footer>
    </div>
  );
}
