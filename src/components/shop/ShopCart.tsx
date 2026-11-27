"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Minus, Plus, Save, ShoppingBag, Trash2 } from "lucide-react";
import type { PublicCatalogList } from "@evolve/ecommerce-server/catalog";
import { cartLineKey, money, type Cart, type CheckoutOptions } from "@/lib/ecommerce/contracts";
import { errorText, StorefrontError, subscribeSession } from "@/lib/ecommerce/browser";
import { importGuestCart, saveAccountCart } from "@/lib/ecommerce/cart";
import { useGuestCart } from "@/lib/ecommerce/guest-cart";
import { cachedShopData, shopApi, shopReads, useShopStore, type ShopStore } from "@/lib/ecommerce/shop-store";
import { useStorefrontResource } from "./useStorefrontResource";
import { CartProductArtwork, ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { PersonalizationText } from "./ShopPersonalization";
import { ShopGuestCart } from "./ShopGuestCart";
import styles from "./CommercePreview.module.css";
import live from "./Storefront.module.css";

async function readCart(store: ShopStore, signal: AbortSignal, refresh: boolean) {
  let accountCart: Cart;
  try {
    accountCart = await shopReads.cart(store, refresh);
  } catch (error) {
    if (!(error instanceof StorefrontError) || error.code !== "LOGIN_REQUIRED") throw error;
    return { cart: null, policy: null, policyError: "", importError: null };
  }
  signal.throwIfAborted();
  const { cart, importError } = await importGuestCart(accountCart, signal);
  let policy: CheckoutOptions | null = null;
  let policyError = "";
  if (cart.items.length) {
    try {
      policy = await shopReads.checkoutOptions(store, refresh);
    } catch (error) {
      signal.throwIfAborted();
      policyError = errorText(error);
    }
  }
  return { cart, policy, policyError, importError };
}
type DraftLine = { id: string; quantity: number };

export function ShopCart() {
  const store = useShopStore();
  const load = useCallback((signal: AbortSignal, refresh: boolean) => readCart(store, signal, refresh), [store]);
  const state = store.getState();
  const cachedCart = cachedShopData(shopApi.endpoints.cart.select()(state));
  const cachedPolicy = cachedShopData(shopApi.endpoints.checkoutOptions.select()(state)) ?? null;
  const resource = useStorefrontResource(load, cachedCart ? { cart: cachedCart, policy: cachedPolicy, policyError: "", importError: null } : undefined);
  const { reload } = resource;
  const guestLines = useGuestCart();
  const [edit, setEdit] = useState<{ cart: Cart; draft: DraftLine[]; reviewed: boolean }>();
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [products, setProducts] = useState<PublicCatalogList["items"]>([]);
  const cart = resource.data?.cart;
  const hasItems = !!cart?.items.length;
  useEffect(() => {
    if (!hasItems) {
      setProducts([]);
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    void shopReads.catalog(store, "limit=50")
      .then(({ items }) => { if (!signal.aborted) setProducts(items); })
      .catch(() => {});
    return () => controller.abort();
  }, [hasItems, store]);
  useEffect(() => { setEdit(undefined); }, [cart]);
  useEffect(() => subscribeSession(reason => { if (reason === "changed") reload(); }), [reload]);
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
  const canSave = !!cart && (dirty || changed && reviewed) && !unavailable && (!changed || reviewed) && !saving && !resource.refreshing && cart.status !== "converted";

  async function save() {
    if (!cart || !canSave || lock.current) return;
    lock.current = true; setSaving(true); setSaveError(""); setNotice("");
    try {
      const saved = await saveAccountCart({ cartPublicId: cart.id, expectedRevision: cart.revision, items: draft.map(item => {
        const source = items.get(item.id)!;
        return { productPublicId: source.productPublicId, personalizationId: source.personalizationId, quantity: item.quantity, listingRevision: (reviewed ? source.currentListingRevision : source.listingRevision)! };
      }) });
      resource.setData(current => current ? { ...current, cart: saved } : current);
      setNotice("Carrello salvato. I totali sono aggiornati.");
    } catch (error) { setSaveError(errorText(error)); resource.reload(); }
    finally { lock.current = false; setSaving(false); }
  }
  const ready = !!cart && cart.status === "active" && !!draft.length && !cart.requiresReview && !dirty && !!resource.data?.policy && !saving && !resource.refreshing && !guestLines.length;
  return <main id="shop-content" className={styles.page}>
    <ShopPageHeader title="Il tuo carrello" />
    <ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next="/carrello" />
    {resource.data && !cart && <ShopGuestCart />}
    {cart && guestLines.length > 0 && <ShopGuestCart importError={resource.data?.importError} retry={resource.reload} />}
    {cart && <div className={styles.cartGrid}><section className={styles.cartContent} aria-label="Prodotti nel carrello"><div className={styles.listHeading}><span>Le tue scelte</span><span>Lordo IVA inclusa</span></div>
      {notice && <p className={live.success} role="status">{notice}</p>}{saveError && <p className={live.error} role="alert">{saveError}</p>}
      {cart.status === "converted" && <p className={live.notice}>Questo carrello è già diventato un ordine.{cart.convertedOrderPublicId && <Link href={`/account/ordini/${cart.convertedOrderPublicId}`}>Apri l’ordine <ArrowRight size={15} /></Link>}</p>}
      {cart.status === "expired" && <p className={live.notice}>Il carrello è scaduto. Riparti dagli articoli attualmente pubblicati nello shop.</p>}
      {cart.requiresReview && <p className={live.notice}>Alcuni prodotti, prezzi o limiti sono cambiati. Controlla le righe e salva le scelte prima di continuare.</p>}
      {draft.length ? <ul className={styles.cartList}>{draft.map(line => {
        const item = items.get(line.id)!;
        const published = products.find(product => product.id === item.productPublicId);
        const artwork = <CartProductArtwork product={published} personalization={item.personalization} />;
        return <li key={line.id} className={`${styles.cartItem} ${live.liveCartItem}`}>
          {published ? <Link className={styles.cartArtLink} href={`/negozio/${published.slug}`} aria-label={`Scopri ${published.name}`}>{artwork}</Link> : artwork}
          <div className={styles.itemContent}><div className={styles.itemTitle}><div><h2>{line.quantity > 1 && <strong className={live.cartMultiplier}>{line.quantity}×</strong>}{item.title || "Prodotto non disponibile"}<span>.</span></h2>{item.code && <p>{item.code}</p>}</div><span className={styles.itemPrice}>{item.totals ? money(item.totals.grossMinor) : "—"}</span></div>
          {item.price && <p className={live.help}>{money(item.price.unitMinor)} cad. · {item.price.taxMode === "inclusive" ? "IVA inclusa" : "IVA esclusa"}</p>}
          {item.personalization && <PersonalizationText value={item.personalization} quantity={line.quantity} />}
          {item.state !== "available" && <p className={live.lineWarning}>{item.state === "changed" ? "Prezzo o scheda aggiornati: controlla il prezzo attuale e riconferma." : item.state === "limit_exceeded" ? "Quantità o importo oltre i limiti: modifica il carrello." : "Articolo non disponibile: rimuovilo prima di procedere."}</p>}
          <div className={styles.itemTools}><div className={styles.quantity} role="group" aria-label={`Quantità di ${item.title || "prodotto"}`}><button type="button" disabled={saving || line.quantity <= 1 || cart.status !== "active"} aria-label="Diminuisci quantità" onClick={() => setDraft(current => current.map(value => value.id === line.id ? { ...value, quantity: Math.max(1, value.quantity - 1) } : value))}><Minus size={13} /></button><span>{line.quantity}</span><button type="button" disabled={saving || line.quantity >= maxQuantity || cart.status !== "active"} aria-label="Aumenta quantità" onClick={() => setDraft(current => current.map(value => value.id === line.id ? { ...value, quantity: Math.min(maxQuantity, value.quantity + 1) } : value))}><Plus size={13} /></button></div><button type="button" disabled={saving || cart.status !== "active"} className={styles.removeItem} onClick={() => setDraft(current => current.filter(value => value.id !== line.id))}><Trash2 size={14} /><span>Rimuovi</span></button></div>
        </div></li>;
      })}</ul> : <div className={styles.emptyState}><span className={styles.emptyIcon}><ShoppingBag size={30} strokeWidth={1} /></span><h2>Spazio alla prossima idea<span>.</span></h2><Link className={styles.textLink} href="/shop/e-linker">Esplora gli oggetti <ArrowUpRight size={16} /></Link></div>}
      {changed && <label className={live.check}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} disabled={saving} /><span>Ho controllato i prodotti aggiornati e confermo i nuovi prezzi e le schede.</span></label>}
      {(dirty || changed) && <div className={live.saveBar}><p>Le modifiche saranno applicate al salvataggio. I totali mostrati si riferiscono all’ultimo salvataggio.</p><button type="button" className={live.primary} onClick={() => void save()} disabled={!canSave}>{saving ? "Salvataggio…" : "Salva carrello"}<Save size={16} /></button></div>}
      <Link href="/shop/e-linker" className={styles.continueLink}>Continua a esplorare <ArrowUpRight size={16} /></Link>
    </section><aside className={styles.cartAside}><div className={styles.summaryCard}><div className={styles.summaryTop}><h2>Riepilogo<span>.</span></h2><ShoppingBag size={22} strokeWidth={1.3} /></div><dl className={styles.summaryCosts}><div><dt>Imponibile</dt><dd>{cart.previewTotals ? money(cart.previewTotals.netMinor) : "—"}</dd></div><div><dt>IVA</dt><dd>{cart.previewTotals ? money(cart.previewTotals.taxMinor) : "—"}</dd></div><div><dt>Consegna</dt><dd>Al riepilogo finale</dd></div></dl><div className={styles.summaryTotal}><span>Anteprima articoli</span><strong>{cart.previewTotals ? money(cart.previewTotals.grossMinor) : "—"}</strong></div>{ready ? <Link href="/checkout" className={live.primary}>Procedi al riepilogo <ArrowRight size={17} /></Link> : <button type="button" className={styles.checkoutButton} disabled>Procedi al riepilogo <ArrowRight size={17} /></button>}<p className={styles.summaryNote}>Consegna e totale definitivo vengono confermati nel riepilogo.</p>{resource.data?.policyError && <p className={live.lineWarning}>{resource.data.policyError}</p>}</div></aside></div>}
  </main>;
}
