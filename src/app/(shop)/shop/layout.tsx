import type { Metadata } from "next";
import { SiteFooter } from "@/components/Footer";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import styles from "@/components/shop/Shop.module.css";

export const metadata: Metadata = {
  title: { template: "%s · Evolve Shop", default: "Evolve Shop" },
  description: "Oggetti fisici, idee digitali. Scopri e-disk ed e-linker e personalizzali con i tuoi colori.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className={styles.shop}>
        <a className={styles.skipLink} href="#shop-content">Vai al contenuto</a>
        <ShopNavigation />
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
