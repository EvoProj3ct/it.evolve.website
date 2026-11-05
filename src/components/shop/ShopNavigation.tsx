"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ShoppingCart, UserRound } from "lucide-react";
import { PRODUCTS, type ProductId } from "./products";
import styles from "./Shop.module.css";

function NavShadow({ id, reduced }: { id: string; reduced: boolean | null }) {
  return <>
    <motion.span layoutId={`${id}-upper`} className={`${styles.navShadow} ${styles.navShadowUpper}`} initial={false} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 30 }} aria-hidden="true" />
    <motion.span layoutId={`${id}-middle`} className={`${styles.navShadow} ${styles.navShadowMiddle}`} initial={false} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 25 }} aria-hidden="true" />
    <motion.span layoutId={`${id}-lower`} className={`${styles.navShadow} ${styles.navShadowLower}`} initial={false} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 145, damping: 21 }} aria-hidden="true" />
  </>;
}

export function ShopNavigation() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<ProductId | null>(null);
  const current = (Object.keys(PRODUCTS) as ProductId[]).find(id => pathname.startsWith(`/shop/${id}`));
  const highlighted = hovered ?? current;
  return (
    <header className={styles.globalHeader}>
      <Link href="/" className={styles.logoLink} aria-label="Evolve, torna al sito">
        <Image src="/logoEvolve.png" alt="Evolve" width={61} height={49} priority />
        <span className={styles.shopWord}>shop</span>
      </Link>
      <LayoutGroup id="shop-products"><nav className={styles.productLinks} aria-label="Prodotti Evolve" onPointerLeave={() => setHovered(null)}>
        {(Object.keys(PRODUCTS) as ProductId[]).map(id => <Link key={id} href={`/shop/${id}`} aria-current={current === id ? "page" : undefined} onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(id); }} onFocus={() => setHovered(id)} onBlur={() => setHovered(null)}>
          {highlighted === id && <NavShadow id="product-shadow" reduced={reduced} />}
          <span className={styles.navLabel}>{PRODUCTS[id].name}</span>
        </Link>)}
      </nav></LayoutGroup>
      <div className={styles.headerActions}>
        <button type="button" className={styles.headerTool} disabled aria-label="Profilo, prossimamente" title="Profilo, prossimamente"><UserRound size={18} /></button>
        <button type="button" className={styles.headerTool} disabled aria-label="Carrello, prossimamente" title="Carrello, prossimamente"><ShoppingCart size={18} /></button>
        <Link href="/" className={styles.backToSite}><span>Il mondo Evolve</span><ArrowUpRight size={14} /></Link>
      </div>
    </header>
  );
}

export function ProductNavigation({ product }: { product: ProductId }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const [section, setSection] = useState("scopri");
  const root = `/shop/${product}`;
  useEffect(() => {
    const readHash = () => setSection(window.location.hash === "#configura" ? "configura" : "scopri");
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [pathname]);
  const selected = pathname.endsWith("/documentazione") ? "guide" : pathname.endsWith("/app") ? "app" : section;
  const highlighted = hovered ?? selected;
  const tabs = [
    { id: "scopri", label: "Scopri", href: root },
    { id: "configura", label: "Configura", href: `${root}#configura` },
    { id: "guide", label: "Guide", href: `${root}/documentazione` },
    ...(product === "e-disk" ? [{ id: "app", label: "App", href: `${root}/app` }] : []),
  ];
  return (
    <div className={styles.productHeader}>
      <Link href={root} className={styles.productIdentity} onClick={() => setSection("scopri")}>{product}<span className={styles.identityDot}>.</span></Link>
      <LayoutGroup id={`shop-${product}-sections`}><nav aria-label={`Esplora ${product}`} className={styles.sectionLinks} onPointerLeave={() => setHovered(null)}>
        {tabs.map(tab => <Link key={tab.id} href={tab.href} aria-current={selected === tab.id ? "page" : undefined} onClick={() => setSection(tab.id)} onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(tab.id); }} onFocus={() => setHovered(tab.id)} onBlur={() => setHovered(null)}>
          {highlighted === tab.id && <NavShadow id="section-shadow" reduced={reduced} />}
          <span className={styles.navLabel}>{tab.label}{tab.id === "app" && <ArrowUpRight size={12} />}</span>
        </Link>)}
        <Link className={styles.navCta} href={`${root}#configura`} onClick={() => setSection("configura")}>Personalizza <ArrowUpRight size={14} /></Link>
      </nav></LayoutGroup>
    </div>
  );
}
