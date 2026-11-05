import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PRODUCTS, type ProductId } from "./products";
import styles from "./Shop.module.css";

export function RelatedProducts({ current, dark = false }: { current: ProductId; dark?: boolean }) {
  const products = (Object.keys(PRODUCTS) as ProductId[]).filter(product => product !== current);
  return <section className={`${styles.relatedProducts}${dark ? ` ${styles.relatedDark}` : ""}`} aria-labelledby="related-products-title">
    <h2 id="related-products-title">Esplora gli altri prodotti</h2>
    <ul className={styles.relatedTrack} aria-label="Altri prodotti Evolve">{products.map(product => <li key={product}>
      <Link href={`/shop/${product}`}>
        <Image src={`/shop/brand/${product}.svg`} alt="" width={86} height={64} />
        <span>{PRODUCTS[product].name}<i>.</i></span><ArrowUpRight size={19} />
      </Link>
    </li>)}</ul>
  </section>;
}
