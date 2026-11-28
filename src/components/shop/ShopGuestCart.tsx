"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { errorText, loginHref } from "@/lib/ecommerce/browser";
import { money } from "@/lib/ecommerce/contracts";
import { removeGuestLine, setGuestQuantity, useGuestCart } from "@/lib/ecommerce/guest-cart";
import { PersonalizationText } from "./ShopPersonalization";
import { CartProductArtwork } from "./ShopPreviewShared";
import { ShopCartFaq } from "./ShopCartFaq";
import styles from "./CommercePreview.module.css";
import live from "./Storefront.module.css";

export function ShopGuestCart({ importError, retry }: { importError?: unknown; retry?: () => void }) {
  const lines = useGuestCart();
  const [error, setError] = useState("");
  const pendingImport = !!retry;
  if (!lines.length && pendingImport) return null;

  function changeQuantity(id: string, amount: number) {
    setError("");
    try { setGuestQuantity(id, amount); }
    catch (reason) { setError(errorText(reason)); }
  }

  if (!lines.length)
    return <div className={styles.emptyState}>
      <span className={styles.emptyIcon}><ShoppingBag size={30} strokeWidth={1} /></span>
      <h2>Il carrello è vuoto.</h2>
      <Link className={styles.textLink} href="/shop/e-linker">Esplora gli oggetti <ArrowUpRight size={16} /></Link>
    </div>;

  const total = lines.reduce((amount, line) => amount + line.unitGrossCents * line.quantity, 0);
  return <div className={styles.cartGrid}>
    <section className={styles.cartContent} aria-label={pendingImport ? "Articoli da trasferire" : "Prodotti nel carrello"}>
      <div className={styles.listHeading}><span>{pendingImport ? "Articoli da trasferire" : "Le tue scelte"}</span><span>IVA inclusa</span></div>
      {error && <p className={live.error} role="alert">{error}</p>}
      <ul className={styles.cartList}>
        {lines.map(line => <li key={line.id} className={`${styles.cartItem} ${live.liveCartItem}`}>
          <CartProductArtwork slug={line.slug} personalization={line.personalization} />
          <div className={styles.itemContent}>
            <div className={styles.itemTitle}>
              <h2><Link href={`/negozio/${line.slug}`}>{line.quantity > 1 && <strong className={live.cartMultiplier}>{line.quantity}×</strong>}{line.title}</Link></h2>
              <span className={styles.itemPrice}>{money(line.unitGrossCents)} cad.</span>
            </div>
            {line.personalization && <PersonalizationText quantity={line.quantity} value={{
              color: line.personalization.color,
              inscription: line.personalization.inscription,
              details: line.personalization.details,
              hasLogo: !!line.personalization.logo,
            }} />}
            <div className={styles.itemTools}>
              {pendingImport ? <span>Quantità {line.quantity}</span> : <div className={styles.quantity} role="group" aria-label={`Quantità di ${line.title}`}>
                <button type="button" disabled={line.quantity <= 1} aria-label="Diminuisci quantità" onClick={() => changeQuantity(line.id, line.quantity - 1)}><Minus size={13} /></button>
                <span>{line.quantity}</span>
                <button type="button" disabled={line.quantity >= 1000} aria-label="Aumenta quantità" onClick={() => changeQuantity(line.id, line.quantity + 1)}><Plus size={13} /></button>
              </div>}
              <button type="button" className={styles.removeItem} onClick={() => { setError(""); removeGuestLine(line.id); }}><Trash2 size={14} /><span>Rimuovi</span></button>
            </div>
          </div>
        </li>)}
      </ul>
      {!pendingImport && <ShopCartFaq />}
      <Link href="/shop/e-linker" className={styles.continueLink}>Continua a esplorare <ArrowUpRight size={16} /></Link>
    </section>
    <aside className={styles.cartAside}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryTop}><h2>Riepilogo<span>.</span></h2><ShoppingBag size={22} strokeWidth={1.3} /></div>
        <div className={styles.summaryTotal}><span>Totale indicativo</span><strong>{money(total)}</strong></div>
        {pendingImport ? <>
          {importError != null && <p className={live.lineWarning} role="alert">{errorText(importError)}</p>}
          <button type="button" className={live.primary} onClick={retry}>Riprova il trasferimento <ArrowRight size={17} /></button>
        </> : <>
          <Link href={loginHref("/carrello")} className={live.primary}>Accedi per procedere <ArrowRight size={17} /></Link>
          <p className={styles.summaryNote}>Puoi anche creare un account. Torna in questa scheda per ritrovare le tue scelte.</p>
        </>}
      </div>
    </aside>
  </div>;
}
