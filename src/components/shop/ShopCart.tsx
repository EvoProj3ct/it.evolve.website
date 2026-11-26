"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Minus, Plus, Save, ShoppingBag, Trash2 } from "lucide-react";
import type { PublicCatalogList } from "@evolve/ecommerce-server/catalog";
import { cartLineKey, cartSchema, checkoutOptionsSchema, money, type Cart, type CheckoutOptions } from "@/lib/ecommerce/contracts";
import { errorText, storefrontGet, storefrontMutate, storefrontRead } from "@/lib/ecommerce/browser";
import { useStorefrontResource } from "./useStorefrontResource";
import { CatalogArtwork, ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { PersonalizationText } from "./ShopPersonalization";
import styles from "./CommercePreview.module.css";
import live from "./Storefront.module.css";

async function readCart(signal: AbortSignal) {
  const cart = await storefrontGet("/cart", cartSchema, signal);
  const [policyResult, catalogResult] = await Promise.allSettled([storefrontGet("/checkout-options", checkoutOptionsSchema, signal), storefrontRead<PublicCatalogList>("/catalog?limit=50", signal)]);
  if (signal.aborted) throw new DOMException("Richiesta annullata.", "AbortError");
  const policy: CheckoutOptions | null = policyResult.status === "fulfilled" ? policyResult.value : null;
  const policyError = policyResult.status === "rejected" ? errorText(policyResult.reason) : "";
  // Le immagini sono decorative: un errore non sostituisce carrello o prezzi con fixture.
  const products = catalogResult.status === "fulfilled" ? catalogResult.value.items : [];
  return { cart, policy, policyError, products };
}
type DraftLine = { id: string; quantity: number };

export function ShopCart() {
  const resource = useStorefrontResource(readCart);
  const [edit, setEdit] = useState<{ cart: Cart; draft: DraftLine[]; reviewed: boolean }>();
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const cart = resource.data?.cart;
  useEffect(() => { setEdit(undefined); }, [cart]);
  const items = new Map(cart?.items.map(item => [cartLineKey(item), item]));
  const initialDraft = cart?.items.map(item => ({ id: cartLineKey(item), quantity: item.quantity })) ?? [];
  const activeEdit = edit?.cart === cart ? edit : undefined;
  const draft = activeEdit?.draft ?? initialDraft;
  const reviewed = activeEdit?.reviewed ?? false;
  function setDraft(update: (current: DraftLine[]) => DraftLine[]) {
    if (cart) setEdit(current => {
      const active = current?.cart === cart ? current : undefined;
      return { cart, draft: update(active?.draft ?? initialDraft), reviewed: active?.reviewed ?? false };
    });
  }
  function setReviewed(value: boolean) {
    if (cart) setEdit(current => ({ cart, draft: current?.cart === cart ? current.draft : initialDraft, reviewed: value }));
  }
  const dirty = !!cart && (draft.length !== cart.items.length || draft.some(item => item.quantity !== items.get(item.id)?.quantity));
  const retained = draft.map(line => items.get(line.id)!);
  const changed = retained.some(item => item.state === "changed" || item.currentListingRevision !== undefined && item.listingRevision !== item.currentListingRevision);
  const unavailable = retained.some(item => item.state === "unavailable");
  const maxQuantity = resource.data?.policy?.maxQuantity ?? 1000;
  const canSave = !!cart && (dirty || changed && reviewed) && !unavailable && (!changed || reviewed) && !saving && !resource.busy && cart.status !== "converted";

  async function save() {
    if (!cart || !canSave || lock.current) return;
    lock.current = true; setSaving(true); setSaveError(""); setNotice("");
    try {
      const saved: Cart = await storefrontMutate("/cart/items", "PUT", { cartPublicId: cart.id, expectedRevision: cart.revision, items: draft.map(item => {
        const source = items.get(item.id)!;
        return { productPublicId: source.productPublicId, personalizationId: source.personalizationId, quantity: item.quantity, listingRevision: reviewed ? source.currentListingRevision : source.listingRevision };
      }) }, cartSchema);
      resource.setData(current => current ? { ...current, cart: saved } : current);
      setNotice("Carrello salvato. I totali sono aggiornati.");
    } catch (error) { setSaveError(errorText(error)); resource.reload(); }
    finally { lock.current = false; setSaving(false); }
  }
  const ready = !!cart && cart.status === "active" && !!draft.length && !cart.requiresReview && !dirty && !!resource.data?.policy && !saving;
  return <main id="shop-content" className={styles.page}>
    <ShopPageHeader title="Il tuo carrello" description="Le tue scelte, pronte a prendere forma." />
    <ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next="/carrello" />
    {cart && <div className={styles.cartGrid}><section className={styles.cartContent} aria-label="Prodotti nel carrello"><div className={styles.listHeading}><span>Le tue scelte</span><span>Lordo IVA inclusa</span></div>
      {notice && <p className={live.success} role="status">{notice}</p>}{saveError && <p className={live.error} role="alert">{saveError}</p>}
      {cart.status === "converted" && <p className={live.notice}>Questo carrello è già diventato un ordine.{cart.convertedOrderPublicId && <Link href={`/account/ordini/${cart.convertedOrderPublicId}`}>Apri l’ordine <ArrowRight size={15} /></Link>}</p>}
      {cart.status === "expired" && <p className={live.notice}>Il carrello è scaduto. Riparti dagli articoli attualmente pubblicati nello shop.</p>}
      {cart.requiresReview && <p className={live.notice}>Alcuni prodotti, prezzi o limiti sono cambiati. Controlla le righe e salva le scelte prima di continuare.</p>}
      {draft.length ? <ul className={styles.cartList}>{draft.map(line => {
        const item = items.get(line.id)!;
        const published = resource.data?.products.find(product => product.id === item.productPublicId);
        return <li key={line.id} className={`${styles.cartItem} ${live.liveCartItem}`}><div className={styles.cartArtLink}>{published ? <Link href={`/negozio/${published.slug}`} aria-label={`Scopri ${published.name}`}><CatalogArtwork product={published} /></Link> : <CatalogArtwork />}</div><div className={styles.itemContent}><div className={styles.itemTitle}><div><h2>{item.title || "Prodotto non disponibile"}<span>.</span></h2>{item.code && <p>{item.code}</p>}</div><span className={styles.itemPrice}>{item.totals ? money(item.totals.grossMinor) : "—"}</span></div>
          {item.price && <p className={live.help}>{money(item.price.unitMinor)} cad. · {item.price.taxMode === "inclusive" ? "IVA inclusa" : "IVA esclusa"}</p>}
          {item.personalization && <PersonalizationText value={item.personalization} />}
          {item.state !== "available" && <p className={live.lineWarning}>{item.state === "changed" ? "Prezzo o scheda aggiornati: controlla il prezzo attuale e riconferma." : item.state === "limit_exceeded" ? "Quantità o importo oltre i limiti: modifica il carrello." : "Articolo non disponibile: rimuovilo prima di procedere."}</p>}
          <div className={styles.itemTools}><div className={styles.quantity} role="group" aria-label={`Quantità di ${item.title || "prodotto"}`}><button type="button" disabled={saving || line.quantity <= 1 || cart.status !== "active"} aria-label="Diminuisci quantità" onClick={() => setDraft(current => current.map(value => value.id === line.id ? { ...value, quantity: Math.max(1, value.quantity - 1) } : value))}><Minus size={13} /></button><span>{line.quantity}</span><button type="button" disabled={saving || line.quantity >= maxQuantity || cart.status !== "active"} aria-label="Aumenta quantità" onClick={() => setDraft(current => current.map(value => value.id === line.id ? { ...value, quantity: Math.min(maxQuantity, value.quantity + 1) } : value))}><Plus size={13} /></button></div><button type="button" disabled={saving || cart.status !== "active"} className={styles.removeItem} onClick={() => setDraft(current => current.filter(value => value.id !== line.id))}><Trash2 size={14} /><span>Rimuovi</span></button></div>
        </div></li>;
      })}</ul> : <div className={styles.emptyState}><span className={styles.emptyIcon}><ShoppingBag size={30} strokeWidth={1} /></span><h2>Spazio alla prossima idea<span>.</span></h2><Link className={styles.textLink} href="/negozio">Esplora gli oggetti <ArrowUpRight size={16} /></Link></div>}
      {changed && <label className={live.check}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={saving} /><span>Ho controllato i prodotti aggiornati e confermo i nuovi prezzi e le schede.</span></label>}
      {(dirty || changed) && <div className={live.saveBar}><p>Le modifiche saranno applicate al salvataggio. I totali mostrati si riferiscono all’ultimo salvataggio.</p><button type="button" className={live.primary} onClick={() => void save()} disabled={!canSave}>{saving ? "Salvataggio…" : "Salva carrello"}<Save size={16} /></button></div>}
      <Link href="/negozio" className={styles.continueLink}>Continua a esplorare <ArrowUpRight size={16} /></Link>
    </section><aside className={styles.cartAside}><div className={styles.summaryCard}><div className={styles.summaryTop}><h2>Riepilogo<span>.</span></h2><ShoppingBag size={22} strokeWidth={1.3} /></div><dl className={styles.summaryCosts}><div><dt>Imponibile</dt><dd>{cart.previewTotals ? money(cart.previewTotals.netMinor) : "—"}</dd></div><div><dt>IVA</dt><dd>{cart.previewTotals ? money(cart.previewTotals.taxMinor) : "—"}</dd></div><div><dt>Consegna</dt><dd>Al riepilogo finale</dd></div></dl><div className={styles.summaryTotal}><span>Anteprima articoli</span><strong>{cart.previewTotals ? money(cart.previewTotals.grossMinor) : "—"}</strong></div>{ready ? <Link href="/checkout" className={live.primary}>Procedi al riepilogo <ArrowRight size={17} /></Link> : <button type="button" className={styles.checkoutButton} disabled>Procedi al riepilogo <ArrowRight size={17} /></button>}<p className={styles.summaryNote}>Consegna e totale definitivo vengono confermati nel riepilogo.</p>{resource.data?.policyError && <p className={live.lineWarning}>{resource.data.policyError}</p>}</div></aside></div>}
  </main>;
}
