"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Disc3, Shapes } from "lucide-react";
import { PRODUCTS, type ProductId } from "./products";
import styles from "./Shop.module.css";

export function ShopNavigation() {
  const pathname = usePathname();
  return (
    <header className={styles.globalHeader}>
      <Link href="/" className={styles.logoLink} aria-label="Evolve, torna al sito">
        <Image src="/logoEvolve.png" alt="Evolve" width={61} height={49} priority />
        <span className={styles.shopWord}>/ shop</span>
      </Link>
      <nav className={styles.productLinks} aria-label="Prodotti Evolve">
        {(Object.keys(PRODUCTS) as ProductId[]).map(id => <Link key={id} href={`/shop/${id}`} aria-current={pathname.startsWith(`/shop/${id}`) ? "page" : undefined}>{id === "e-disk" ? <Disc3 size={17} /> : <Shapes size={17} />}<span>{PRODUCTS[id].name}</span></Link>)}
      </nav>
      <Link href="/" className={styles.backToSite}>Il mondo Evolve <ArrowUpRight size={14} /></Link>
    </header>
  );
}

export function ProductNavigation({ product }: { product: ProductId }) {
  const pathname = usePathname();
  const root = `/shop/${product}`;
  return (
    <div className={styles.productHeader}>
      <Link href={root} className={styles.productIdentity}><span className={styles.productNumber}>{PRODUCTS[product].number}</span>{product}<span className={styles.identityDot}>.</span></Link>
      <nav aria-label={`Esplora ${product}`} className={styles.sectionLinks}>
        <Link href={root} aria-current={pathname === root ? "page" : undefined}>Scopri</Link>
        <Link href={`${root}#configura`}>Configura</Link>
        <Link href={`${root}/documentazione`} aria-current={pathname.endsWith("/documentazione") ? "page" : undefined}>Guide</Link>
        {product === "e-disk" && <Link href={`${root}/app`} aria-current={pathname.endsWith("/app") ? "page" : undefined}>App <ArrowUpRight size={12} /></Link>}
        <Link className={styles.navCta} href={`${root}#configura`}>Fallo tuo <ArrowUpRight size={14} /></Link>
      </nav>
    </div>
  );
}
