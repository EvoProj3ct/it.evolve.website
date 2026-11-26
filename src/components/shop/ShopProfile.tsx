"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, LayoutGrid, LogOut, Package, RefreshCw, Settings2 } from "lucide-react";
import { customerLinkSchema, profileSchema } from "@/lib/ecommerce/contracts";
import { errorText, storefrontGet, storefrontMutate } from "@/lib/ecommerce/browser";
import { ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { ShopOrdersList } from "./ShopOrders";
import { useStorefrontResource } from "./useStorefrontResource";
import styles from "./CommercePreview.module.css";
import live from "./Storefront.module.css";

const loadProfile = (signal: AbortSignal) => storefrontGet("/me", profileSchema, signal);
const loadLink = (signal: AbortSignal) => storefrontGet("/me/customer-link", customerLinkSchema, signal);
export function CustomerLinkStatus() {
  const resource = useStorefrontResource(loadLink);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  async function resolve() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { resource.setData(await storefrontMutate("/me/customer-link", "POST", {}, customerLinkSchema)); }
    catch (reason) { setError(errorText(reason)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className={live.customerStatus} aria-label="Stato del profilo commerciale"><ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} />{resource.data && <><span className={live.status} data-ready={resource.data.checkoutReady}><i />{resource.data.checkoutReady ? "Profilo pronto per acquistare" : "Verifica del profilo"}</span><p>{resource.data.message}</p>{!resource.data.checkoutReady && <button type="button" className={live.secondary} onClick={() => void resolve()} disabled={busy}>{busy ? "Aggiornamento…" : "Aggiorna il profilo"}<RefreshCw size={14} /></button>}</>}{error && <p className={live.error} role="alert">{error}</p>}</section>;
}
export function ShopProfile() {
  const resource = useStorefrontResource(loadProfile);
  const [section, setSection] = useState<"overview" | "profile">("overview");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const lock = useRef(false);
  const account = resource.data?.account;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    const data = new FormData(event.currentTarget);
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try { const updated = await storefrontMutate("/me", "PATCH", { name: data.get("name"), phone: data.get("phone") }, profileSchema); resource.setData(updated); setMessage("Profilo aggiornato."); }
    catch (reason) { setError(errorText(reason)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <main id="shop-content" className={styles.page}><ShopPageHeader title="Il tuo spazio" description={account ? `Bentornato, ${account.name}.` : "I tuoi oggetti, ordini e prossime idee."} /><ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} />{account && <div className={styles.profileGrid}><aside className={styles.profileSidebar}><div className={styles.profileIdentity}><span className={styles.avatar}>{account.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase()}<i /></span><div><strong>{account.name}</strong><span>{account.email}</span></div></div><nav className={styles.profileNav} aria-label="Il tuo spazio"><button type="button" aria-pressed={section === "overview"} onClick={() => setSection("overview")}><LayoutGrid size={18} strokeWidth={1.5} /><span>Panoramica</span></button><Link className={live.sidebarLink} href="/account/ordini"><Package size={18} strokeWidth={1.5} />I tuoi ordini <ArrowUpRight size={13} /></Link><button type="button" aria-pressed={section === "profile"} onClick={() => setSection("profile")}><Settings2 size={18} strokeWidth={1.5} /><span>Dati personali</span></button><Link className={live.sidebarLink} href="/account/logout" prefetch={false}><LogOut size={17} strokeWidth={1.5} />Esci</Link></nav></aside><section className={styles.profilePanel} aria-label={section === "overview" ? "Panoramica" : "Dati personali"}>{section === "overview" ? <><CustomerLinkStatus /><ShopOrdersList compact /><div className={live.profileShopLink}><div><h2>Spazio alla prossima idea<span>.</span></h2><p>Scopri gli oggetti pubblicati nello shop.</p></div><Link href="/negozio" className={styles.textLink}>Esplora <ArrowUpRight size={17} /></Link></div></> : <><div className={styles.panelHeading}><h2>Il tuo profilo<span>.</span></h2></div><p className={live.help}>Account {account.kind === "company" ? "azienda" : "privato"} · Email verificata</p><form method="post" key={account.id} className={live.form} onSubmit={save}><label htmlFor="profile-name">{account.kind === "company" ? "Ragione sociale" : "Nome e cognome"}<input id="profile-name" name="name" required maxLength={200} defaultValue={account.name} autoComplete="name" /></label><label htmlFor="profile-phone">Telefono facoltativo<input id="profile-phone" name="phone" maxLength={40} defaultValue={account.phone || ""} type="tel" autoComplete="tel" /></label><p className={live.help}>{account.email}</p><button type="submit" className={live.primary} disabled={busy}>{busy ? "Salvataggio…" : "Salva le modifiche"}<ArrowRight size={17} /></button></form>{error && <p className={live.error} role="alert">{error}</p>}{message && <p className={live.success} role="status">{message}</p>}<div className={live.credentialLinks}><Link href="/account/change-email" prefetch={false}>Cambia email <ArrowUpRight size={14} /></Link><Link href="/account/change-password" prefetch={false}>Cambia password <ArrowUpRight size={14} /></Link><Link href="/account/logout-all" prefetch={false}>Esci da tutti i dispositivi <ArrowUpRight size={14} /></Link></div></>}</section></div>}</main>;
}
