"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, ChevronDown, HelpCircle, LayoutGrid, MapPin, Package, Pencil, Plus, Settings2, X } from "lucide-react";
import { PREVIEW_ORDERS, PREVIEW_PROFILE, PREVIEW_SAVED, previewPrice, previewTotal, type PreviewProduct } from "./commercePreview";
import { OrderProgress, PreviewFinish, PreviewPageHeader, PreviewProductArtwork } from "./ShopPreviewShared";
import styles from "./CommercePreview.module.css";

const SECTIONS = [
  { id: "overview", label: "Panoramica", icon: LayoutGrid },
  { id: "orders", label: "I tuoi ordini", icon: Package },
  { id: "saved", label: "Idee salvate", icon: Bookmark },
  { id: "addresses", label: "Indirizzi", icon: MapPin },
  { id: "settings", label: "Il tuo profilo", icon: Settings2 },
] as const;
type Section = typeof SECTIONS[number]["id"];

function SavedIdeas({ items, onRemove }: { items: PreviewProduct[]; onRemove?: (id: string) => void }) {
  return <div className={styles.savedGrid}>{items.map(item => <article className={styles.savedCard} key={item.id}>
    <div className={styles.savedVisual}><Link href={`/shop/${item.product}#configura`} aria-label={`Personalizza ${item.name}`}><PreviewProductArtwork item={item} /></Link>{onRemove && <button type="button" onClick={() => onRemove(item.id)} aria-label={`Rimuovi ${item.name} dalle idee salvate`}><X size={15} /></button>}</div>
    <div className={styles.savedDetails}><h3>{item.name}<span>.</span></h3><PreviewFinish item={item} /><Link href={`/shop/${item.product}#configura`}>Personalizza <ArrowUpRight size={14} /></Link></div>
  </article>)}</div>;
}

export function ShopProfile() {
  const [section, setSection] = useState<Section>("overview");
  const [saved, setSaved] = useState(PREVIEW_SAVED);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [news, setNews] = useState(false);
  const activeOrder = PREVIEW_ORDERS[0];
  const activeSection = SECTIONS.find(item => item.id === section)!;

  return <main id="shop-content" className={styles.page}>
    <PreviewPageHeader title="Il tuo spazio" description={`Bentornato, ${PREVIEW_PROFILE.firstName}. Le tue idee, tutte qui.`} />
    <div className={styles.profileGrid}>
      <aside className={styles.profileSidebar}>
        <div className={styles.profileIdentity}><span className={styles.avatar}>{PREVIEW_PROFILE.initials}<i /></span><div><strong>{PREVIEW_PROFILE.name}</strong><span>{PREVIEW_PROFILE.email}</span></div></div>
        <nav className={styles.profileNav} aria-label="Il tuo spazio Evolve">{SECTIONS.map(item => {
          const Icon = item.icon;
          return <button type="button" key={item.id} aria-pressed={section === item.id} aria-controls="profile-panel" onClick={() => setSection(item.id)}><Icon size={18} strokeWidth={1.5} /><span>{item.label}</span>{item.id === "saved" && <small>{saved.length}</small>}{item.id === "orders" && <small>{PREVIEW_ORDERS.length}</small>}</button>;
        })}</nav>
        <Link className={styles.sidebarHelp} href="/contact"><HelpCircle size={17} strokeWidth={1.5} /><span>Ci siamo, se serve.</span><ArrowUpRight size={13} /></Link>
      </aside>

      <section id="profile-panel" className={styles.profilePanel} aria-label={activeSection.label}>
        {section === "overview" && <>
          <article className={styles.featuredOrder}>
            <div className={styles.featuredCopy}><span className={styles.orderStatus} data-status={activeOrder.status}><i />{activeOrder.status}</span><h2>Il tuo e-disk<br />sta prendendo forma<span>.</span></h2><p>Ordine {activeOrder.id} <span>·</span> {activeOrder.date}</p><button type="button" onClick={() => setSection("orders")}>Segui il tuo ordine <ArrowRight size={16} /></button></div>
            <PreviewProductArtwork item={activeOrder.items[0]} className={styles.featuredArt} />
            <OrderProgress step={activeOrder.step} />
          </article>
          <div className={styles.profileStats}><button type="button" onClick={() => setSection("orders")}><span>{String(PREVIEW_ORDERS.length).padStart(2, "0")}</span><div>I tuoi ordini<ArrowUpRight size={14} /></div></button><button type="button" onClick={() => setSection("saved")}><span>{String(saved.length).padStart(2, "0")}</span><div>Idee salvate<ArrowUpRight size={14} /></div></button><button type="button" onClick={() => setSection("addresses")}><span>01</span><div>Il tuo indirizzo<ArrowUpRight size={14} /></div></button></div>
          <div className={styles.panelHeading}><h2>Le idee da riprendere<span>.</span></h2><button type="button" className={styles.textLink} onClick={() => setSection("saved")}>Mostra tutte <ArrowUpRight size={15} /></button></div>
          {saved.length ? <SavedIdeas items={saved} /> : <p className={styles.quietNote}>Le tue prossime idee troveranno spazio qui.</p>}
        </>}

        {section === "orders" && <>
          <div className={styles.panelHeading}><div><h2>I tuoi ordini<span>.</span></h2><p>Dalla prima idea, fino a casa tua.</p></div><span className={styles.countLabel}>{PREVIEW_ORDERS.length} ordini</span></div>
          <div className={styles.ordersList}>{PREVIEW_ORDERS.map((order, index) => <details key={order.id} className={styles.orderCard} open={index === 0}>
            <summary><span className={styles.orderSymbol}><Package size={21} strokeWidth={1.4} /></span><span className={styles.orderReference}><strong>{order.id}</strong><span>{order.date}</span></span><span className={styles.orderStatus} data-status={order.status}><i />{order.status}</span><ChevronDown className={styles.orderChevron} size={17} /></summary>
            <div className={styles.orderBody}><OrderProgress step={order.step} /><ul className={styles.orderProducts}>{order.items.map(item => <li key={item.id}><Link href={`/shop/${item.product}`} aria-label={`Scopri ${item.name}`}><PreviewProductArtwork item={item} /></Link><div><strong>{item.name}</strong><span>{item.description}</span><small>Quantità {item.quantity}</small></div><span>{previewPrice(item.unitPriceCents * item.quantity)}</span></li>)}</ul><div className={styles.orderFooter}><span><MapPin size={14} />{PREVIEW_PROFILE.name} · Roma</span><span>Totale articoli <strong>{previewPrice(previewTotal(order.items))}</strong></span></div></div>
          </details>)}</div>
        </>}

        {section === "saved" && <>
          <div className={styles.panelHeading}><div><h2>Idee salvate<span>.</span></h2><p>Quelle che ti somigliano. Quelle che verranno.</p></div><span className={styles.countLabel}>{saved.length} {saved.length === 1 ? "idea" : "idee"}</span></div>
          {saved.length ? <SavedIdeas items={saved} onRemove={id => setSaved(current => current.filter(item => item.id !== id))} /> : <div className={styles.emptyState}><span className={styles.emptyIcon}><Bookmark size={28} strokeWidth={1.3} /></span><h2>Ogni idea<br />ha il suo momento<span>.</span></h2><Link href="/shop" className={styles.textLink}>Trova la prossima <ArrowUpRight size={16} /></Link></div>}
        </>}

        {section === "addresses" && <>
          <div className={styles.panelHeading}><div><h2>I tuoi indirizzi<span>.</span></h2><p>Dove far arrivare i tuoi oggetti.</p></div></div>
          <div className={styles.addressGrid}><article className={styles.addressCard}><div className={styles.addressTop}><MapPin size={21} strokeWidth={1.4} /><span>Predefinito</span></div><h3>Casa</h3><address><strong>{PREVIEW_PROFILE.name}</strong><span>{PREVIEW_PROFILE.address}</span><span>{PREVIEW_PROFILE.city}</span><span>{PREVIEW_PROFILE.country}</span></address><button type="button" className={styles.disabledAction} disabled><Pencil size={13} />Modifica indirizzo</button></article><button type="button" className={styles.addAddress} disabled><span><Plus size={25} strokeWidth={1.2} /></span>Aggiungi un indirizzo</button></div>
        </>}

        {section === "settings" && <>
          <div className={styles.panelHeading}><div><h2>Il tuo profilo<span>.</span></h2><p>I tuoi dati e il modo in cui restiamo in contatto.</p></div></div>
          <section className={styles.settingsSection} aria-labelledby="personal-data-title"><div className={styles.settingsTitle}><h3 id="personal-data-title">Dati personali</h3><button type="button" className={styles.disabledAction} disabled><Pencil size={13} />Modifica</button></div><dl className={styles.personalData}><div><dt>Nome e cognome</dt><dd>{PREVIEW_PROFILE.name}</dd></div><div><dt>Indirizzo email</dt><dd>{PREVIEW_PROFILE.email}</dd></div></dl></section>
          <section className={styles.settingsSection} aria-labelledby="preferences-title"><div className={styles.settingsTitle}><h3 id="preferences-title">Restiamo in contatto</h3></div><div className={styles.preference}><div><strong>I tuoi ordini</strong><p>Stato dell’ordine e aggiornamenti sulla consegna.</p></div><button type="button" role="switch" aria-checked={orderUpdates} aria-label="Aggiornamenti sui tuoi ordini" className={styles.switch} onClick={() => setOrderUpdates(value => !value)}><span /></button></div><div className={styles.preference}><div><strong>Novità Evolve</strong><p>Nuovi oggetti, idee e progetti da scoprire.</p></div><button type="button" role="switch" aria-checked={news} aria-label="Novità Evolve" className={styles.switch} onClick={() => setNews(value => !value)}><span /></button></div></section>
          <section className={styles.settingsSection} aria-labelledby="access-title"><div className={styles.settingsTitle}><h3 id="access-title">Accesso</h3></div><div className={styles.preference}><div><strong>Password</strong><p>La password del tuo account Evolve.</p></div><button type="button" className={styles.disabledAction} disabled>Modifica <ArrowUpRight size={13} /></button></div></section>
        </>}
      </section>
    </div>
  </main>;
}
