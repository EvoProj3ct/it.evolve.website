import { SiteFooter } from "@/components/Footer";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import { ShopStoreProvider } from "@/components/shop/ShopStoreProvider";
import styles from "@/components/shop/Shop.module.css";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <><ShopStoreProvider><div className={styles.shop}><a className={styles.skipLink} href="#shop-content">Vai al contenuto</a><ShopNavigation />{children}</div></ShopStoreProvider><SiteFooter /></>;
}
