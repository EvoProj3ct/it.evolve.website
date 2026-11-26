import { SiteFooter } from "@/components/Footer";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import styles from "@/components/shop/Shop.module.css";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <><div className={styles.shop}><a className={styles.skipLink} href="#shop-content">Vai al contenuto</a><ShopNavigation />{children}</div><SiteFooter /></>;
}
