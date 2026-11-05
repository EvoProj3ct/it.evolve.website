"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ShoppingCart, UserRound } from "lucide-react";
import { PRODUCTS, type ProductId } from "./products";
import { NavInk, type NavInkPress } from "./NavInk";
import styles from "./Shop.module.css";

export function ShopNavigation() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [pressed, setPressed] = useState<NavInkPress | null>(null);
  const [hovered, setHovered] = useState<ProductId | null>(null);
  const current = (Object.keys(PRODUCTS) as ProductId[]).find(id => pathname.startsWith(`/shop/${id}`));
  const highlighted = hovered ?? current;
  return (
    <header className={styles.globalHeader}>
      <Link href="/" className={styles.logoLink} aria-label="Evolve, torna al sito">
        <Image src="/logoEvolve.png" alt="Evolve" width={61} height={49} priority />
        <span className={styles.shopWord}>shop</span>
      </Link>
      <nav ref={navRef} className={styles.productLinks} aria-label="Prodotti Evolve" onPointerLeave={() => setHovered(null)}>
        {(Object.keys(PRODUCTS) as ProductId[]).map(id => <Link key={id} data-nav-key={id} href={`/shop/${id}`} aria-current={current === id ? "page" : undefined} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button > 0) return;
          setHovered(id); setPressed(current => ({ key: id, serial: (current?.serial ?? 0) + 1 }));
        }} onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(id); }} onFocus={() => setHovered(id)} onBlur={() => setHovered(null)}>
          <span data-nav-label className={styles.navLabel}>{PRODUCTS[id].name}</span>
        </Link>)}
        <NavInk active={highlighted} navRef={navRef} pressed={pressed} />
      </nav>
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
  const navRef = useRef<HTMLElement>(null);
  const [pressed, setPressed] = useState<NavInkPress | null>(null);
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
    <div className={styles.productHeader} data-product={product}>
      <Link href={root} className={styles.productIdentity} onClick={() => setSection("scopri")}>
        <Image src={`/shop/brand/${product}.svg`} alt="" width={56} height={42} className={styles.productMark} />
        <span>{product}<span className={styles.identityDot}>.</span></span>
      </Link>
      <nav ref={navRef} aria-label={`Esplora ${product}`} className={styles.sectionLinks} onPointerLeave={() => setHovered(null)}>
        {tabs.map(tab => <Link key={tab.id} data-nav-key={tab.id} href={tab.href} aria-current={selected === tab.id ? "page" : undefined} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.button > 0) return;
          setSection(tab.id); setHovered(tab.id); setPressed(current => ({ key: tab.id, serial: (current?.serial ?? 0) + 1 }));
        }} onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(tab.id); }} onFocus={() => setHovered(tab.id)} onBlur={() => setHovered(null)}>
          <span data-nav-label className={styles.navLabel}>{tab.label}{tab.id === "app" && <ArrowUpRight size={12} />}</span>
        </Link>)}
        <Link className={styles.navCta} href={`${root}${product === "e-disk" ? "#incidi" : "#configura"}`} onClick={() => setSection(product === "e-disk" ? "incidi" : "configura")}>{product === "e-disk" ? "Crea la tua musica" : product === "e-led" ? "Accendi la tua idea" : "Personalizza"} <ArrowUpRight size={14} /></Link>
        <NavInk active={highlighted} navRef={navRef} pressed={pressed} />
      </nav>
    </div>
  );
}
