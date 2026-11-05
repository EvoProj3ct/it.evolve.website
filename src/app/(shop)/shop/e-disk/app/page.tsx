import type { Metadata } from "next";
import EDiskExperience from "@/components/e-disk/EDiskExperience";
import styles from "@/components/shop/Shop.module.css";

export const metadata: Metadata = { title: "App e-disk", description: "La tua collezione di dischi NFC e il player e-disk." };

export default function EDiskShopAppPage() {
  return <div id="shop-content" className={styles.appPage}><EDiskExperience backHref="/shop/e-disk" backLabel="Il progetto e-disk" /></div>;
}
