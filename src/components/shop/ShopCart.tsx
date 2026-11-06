"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, Minus, Plus, RotateCcw, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { createPreviewCart, previewPrice, previewTotal, type PreviewCartLine } from "./commercePreview";
import { PreviewFinish, PreviewPageHeader, PreviewProductArtwork } from "./ShopPreviewShared";
import styles from "./CommercePreview.module.css";

export function ShopCart() {
  const [items, setItems] = useState(createPreviewCart);
  const [removed, setRemoved] = useState<{ item: PreviewCartLine; index: number } | null>(null);
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const total = previewTotal(items);

  function changeQuantity(id: string, quantity: number) {
    setItems(current => current.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(9, quantity)) } : item));
  }
  function removeItem(id: string) {
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return;
    setRemoved({ item: items[index], index });
    setItems(current => current.filter(item => item.id !== id));
  }
  function restoreItem() {
    if (!removed) return;
    setItems(current => [...current.slice(0, removed.index), removed.item, ...current.slice(removed.index)]);
    setRemoved(null);
  }

  return <main id="shop-content" className={styles.page}>
    <PreviewPageHeader title="Il tuo carrello" description={count ? `${count} ${count === 1 ? "oggetto, scelto" : "oggetti, scelti"} a modo tuo.` : "C’è spazio per una nuova idea."} />
    <div className={styles.cartGrid}>
      <section className={styles.cartContent} aria-label="Prodotti nel carrello di esempio">
        <div className={styles.listHeading}><span>Le tue scelte <b>{String(items.length).padStart(2, "0")}</b></span><span>Totale</span></div>
        <div role="status" className={styles.cartStatus}>{removed && <><span>{removed.item.name} rimosso dal carrello.</span><button type="button" onClick={restoreItem}>Annulla <RotateCcw size={13} /></button></>}</div>
        {items.length ? <ul className={styles.cartList}>{items.map(item => <li key={item.id} className={styles.cartItem}>
          <Link href={`/shop/${item.product}`} className={styles.cartArtLink} aria-label={`Scopri ${item.name}`}><PreviewProductArtwork item={item} /></Link>
          <div className={styles.itemContent}>
            <div className={styles.itemTitle}><div><h2><Link href={`/shop/${item.product}`}>{item.name}<span>.</span></Link></h2><p>{item.description}</p></div><span className={styles.itemPrice}>{previewPrice(item.unitPriceCents * item.quantity)}</span></div>
            <PreviewFinish item={item} />
            <details className={styles.itemDetails}><summary>La personalizzazione <ChevronDown size={12} /></summary><dl>{item.details.map(detail => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl><Link href={`/shop/${item.product}#configura`}>Apri il configuratore <ArrowUpRight size={12} /></Link></details>
            <div className={styles.itemTools}>
              <div className={styles.quantity} role="group" aria-label={`Quantità di ${item.name}`}><button type="button" onClick={() => changeQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} aria-label={`Diminuisci la quantità di ${item.name}`}><Minus size={13} /></button><span aria-live="polite" aria-atomic="true">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= 9} aria-label={`Aumenta la quantità di ${item.name}`}><Plus size={13} /></button></div>
              {item.quantity > 1 && <span className={styles.unitPrice}>{previewPrice(item.unitPriceCents)} cad.</span>}
              <button type="button" className={styles.removeItem} onClick={() => removeItem(item.id)} aria-label={`Rimuovi ${item.name} dal carrello`}><Trash2 size={14} /><span>Rimuovi</span></button>
            </div>
          </div>
        </li>)}</ul> : <div className={styles.emptyState}><span className={styles.emptyIcon}><ShoppingBag size={31} strokeWidth={1.2} /></span><h2>La prossima idea<br />ti aspetta<span>.</span></h2><p>Trova un oggetto a cui dare il tuo carattere.</p><Link href="/shop" className={styles.textLink}>Esplora gli oggetti <ArrowUpRight size={17} /></Link><button className={styles.resetPreview} type="button" onClick={() => { setItems(createPreviewCart()); setRemoved(null); }}>Ripristina l’esempio <RotateCcw size={13} /></button></div>}
        <Link href="/shop" className={styles.continueLink}>Continua a esplorare <ArrowUpRight size={16} /></Link>
      </section>

      <aside className={styles.cartAside} aria-labelledby="summary-title">
        <div className={styles.summaryCard}>
          <div className={styles.summaryTop}><h2 id="summary-title">Riepilogo<span>.</span></h2><ShoppingBag size={22} strokeWidth={1.3} /></div>
          <div className={styles.summaryLines}>{items.map(item => <div key={item.id}><span>{item.name}<small>× {item.quantity}</small></span><span>{previewPrice(item.unitPriceCents * item.quantity)}</span></div>)}{!items.length && <p>Nessun oggetto selezionato.</p>}</div>
          <dl className={styles.summaryCosts}><div><dt>Subtotale</dt><dd>{previewPrice(total)}</dd></div><div><dt>Spedizione</dt><dd>Da calcolare</dd></div></dl>
          <div className={styles.summaryTotal} aria-live="polite" aria-atomic="true"><span>Totale articoli</span><strong>{previewPrice(total)}</strong></div>
          <button type="button" className={styles.checkoutButton} disabled>Procedi all’acquisto <ArrowRight size={19} /></button>
          <p className={styles.summaryNote}>Importi dimostrativi. L’acquisto sarà disponibile in seguito.</p>
        </div>
        <Link href="/shop/profilo" className={styles.profileNudge}><span className={styles.nudgeIcon}><UserRound size={19} strokeWidth={1.4} /></span><span>Il tuo spazio Evolve<small>Ordini, idee e oggetti preferiti.</small></span><ArrowUpRight size={17} /></Link>
      </aside>
    </div>
  </main>;
}
