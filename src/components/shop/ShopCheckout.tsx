"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { money, placedOrderSchema, quoteSchema, type Quote, type QuoteInput } from "@/lib/ecommerce/contracts";
import { errorText, StorefrontError, storefrontMutate, subscribeSession } from "@/lib/ecommerce/browser";
import { cartChanged } from "@/lib/ecommerce/cart";
import { useGuestCart } from "@/lib/ecommerce/guest-cart";
import { shopApi, shopReads, useShopStore, type ShopStore } from "@/lib/ecommerce/shop-store";
import { PersonalizationText } from "./ShopPersonalization";
import { AddressText, BillingText } from "./ShopAddress";
import { AddressFields, BillingFields, readAddressFields, readBillingFields } from "./ShopBillingFields";
import { CartProductArtwork, ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { useStorefrontResource } from "./useStorefrontResource";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

async function loadCheckout(store: ShopStore, signal: AbortSignal, refresh: boolean) {
  const [profile, cart, policy, link, savedBilling] = await Promise.all([
    shopReads.profile(store, refresh),
    shopReads.cart(store, refresh),
    shopReads.checkoutOptions(store, refresh),
    shopReads.customerLink(store, refresh),
    shopReads.billing(store, refresh).catch(error => {
      if (error instanceof StorefrontError && error.status === 401) throw error;
      return null;
    }),
  ]);
  signal.throwIfAborted();
  return { account: profile.account, cart, policy, link, billing: savedBilling?.billing, billingUnavailable: savedBilling === null };
}
export function ShopCheckout({ termsPath, termsVersion }: { termsPath: string; termsVersion: string }) {
  const store = useShopStore();
  const load = useCallback((signal: AbortSignal, refresh: boolean) => loadCheckout(store, signal, refresh), [store]);
  const resource = useStorefrontResource(load), router = useRouter();
  const guestCart = useGuestCart();
  const [physical, setPhysical] = useState(""), [service, setService] = useState("");
  const [selectedBillingCountry, setBillingCountry] = useState<string | null>(null), [shippingCountry, setShippingCountry] = useState("");
  const [sameAddress, setSameAddress] = useState(true), [accepted, setAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null), [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [uncertain, setUncertain] = useState(false);
  const lock = useRef(false), quoteIntent = useRef<{ signature: string; key: string } | null>(null), orderIntent = useRef<{ quoteId: string; key: string } | null>(null);
  const data = resource.data;
  const savedCountry = data?.billing?.address.country;
  const billingCountry = selectedBillingCountry ?? (savedCountry && data?.policy.countries.includes(savedCountry) ? savedCountry : "");
  useEffect(() => subscribeSession(() => {
    setBillingCountry(null);
    setShippingCountry("");
    setPhysical("");
    setService("");
  }), []);
  useEffect(() => { setQuote(null); setAccepted(false); quoteIntent.current = null; orderIntent.current = null; setUncertain(false); }, [data]);
  useEffect(() => { if (!quote) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [quote]);
  const selection = data?.policy.options.find(option => option.publicId === physical);
  const hasPhysical = !!data?.cart.items.some(item => item.kind === "physical");
  const hasService = !!data?.cart.items.some(item => item.kind === "service");
  const shipping = hasPhysical && selection?.mode === "shipping";
  const physicalOptions = data?.policy.options.filter(option => option.mode !== "service" && data.cart.items.filter(item => item.kind === "physical").every(item => item.fulfillmentModes?.includes(option.mode))) || [];
  const serviceOptions = data?.policy.options.filter(option => option.mode === "service" && data.cart.items.filter(item => item.kind === "service").every(item => item.fulfillmentModes?.includes("service"))) || [];
  const cartReady = !guestCart.length && !!data && data.cart.status === "active" && !!data.cart.id && data.cart.items.length > 0 && !data.cart.requiresReview && data.cart.items.every(item => item.state === "available");
  const remaining = quote ? Math.max(0, Math.ceil((new Date(quote.expiresAt).getTime() - now) / 1000)) : 0;
  const termsReady = !!termsPath && !!quote && termsVersion === quote.termsVersion;
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data || !cartReady || !data.link.checkoutReady || lock.current) return;
    const form = new FormData(event.currentTarget);
    const billing = readBillingFields(form);
    const physicalOption = physicalOptions.find(option => option.publicId === physical);
    const serviceOption = serviceOptions.find(option => option.publicId === service);
    if (hasPhysical && !physicalOption || hasService && !serviceOption) { setError("Scegli le modalità di consegna o servizio."); return; }
    const selections = [hasPhysical ? physicalOption : undefined, hasService ? serviceOption : undefined]
      .flatMap(option => option ? [{ mode: option.mode, optionPublicId: option.publicId }] : []);
    const billingInput: QuoteInput["billing"] = { ...billing, kind: data.account.kind, email: data.account.email };
    const discountCode = String(form.get("discountCode") ?? "").trim().toUpperCase();
    const input = { ...(discountCode && { discountCode }), cartPublicId: data.cart.id!, cartRevision: data.cart.revision, policyRevision: data.policy.revision, termsVersion: data.policy.termsVersion, billing: billingInput, ...(shipping ? { shipping: sameAddress ? billing.address : readAddressFields(form, "shipping") } : {}), fulfillmentSelections: selections };
    const signature = JSON.stringify(input);
    if (quoteIntent.current?.signature !== signature) quoteIntent.current = { signature, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setError("");
    try { const result = await storefrontMutate("/quotes", "POST", { ...input, idempotencyKey: quoteIntent.current!.key }, quoteSchema); setQuote(result); setNow(Date.now()); setAccepted(false); orderIntent.current = null; }
    catch (reason) {
      if (reason instanceof StorefrontError && reason.code === "QUOTE_EXPIRED_OR_CHANGED") quoteIntent.current = null;
      if (reason instanceof StorefrontError && ["CART_CHANGED", "CATALOG_CHANGED", "POLICY_CHANGED", "DELIVERY_CHANGED", "PERSONALIZATION_CHANGED"].includes(reason.code)) {
        if (["CATALOG_CHANGED", "PERSONALIZATION_CHANGED"].includes(reason.code))
          store.dispatch(shopApi.util.invalidateTags(["Catalog"]));
        resource.reload();
      }
      setError(errorText(reason));
    }
    finally { lock.current = false; setBusy(false); }
  }
  async function place() {
    if (!quote || !accepted || !termsReady || !remaining && !uncertain || lock.current) return;
    if (!orderIntent.current) orderIntent.current = { quoteId: quote.id, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await storefrontMutate("/orders/place", "POST", { quotePublicId: orderIntent.current.quoteId, idempotencyKey: orderIntent.current.key, acceptedTermsVersion: quote.termsVersion }, placedOrderSchema);
      cartChanged();
      router.replace(`/account/ordini/${result.order.id}`);
    } catch (reason) {
      const blockedBeforeOrder = reason instanceof StorefrontError &&
        (reason.code === "ORDER_NUMBER_UNAVAILABLE" || reason.code === "REVENUE_MAPPING_REQUIRED");
      setUncertain(previous => previous || !blockedBeforeOrder &&
        (!(reason instanceof StorefrontError) || reason.status === 0 || reason.status >= 500));
      setError(errorText(reason));
    } finally { lock.current = false; setBusy(false); }
  }
  return <main id="shop-content" className={common.page}><ShopPageHeader title="Dai forma alle tue scelte" description="Dati, consegna e riepilogo. Il pagamento si apre dopo la conferma dell’ordine." /><ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next="/checkout" />{data && <>{!cartReady ? <p className={styles.notice}>Controlla il carrello prima di continuare.<Link href="/carrello">Apri il carrello <ArrowRight size={15} /></Link></p> : !data.link.checkoutReady ? <p className={styles.notice}>{data.link.message}<Link href="/account">Vai al tuo profilo <ArrowRight size={15} /></Link></p> : <>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <form method="post" onSubmit={prepare} hidden={!!quote} className={styles.checkoutForm}>
        <fieldset disabled={busy || !!quote}>
          <legend>Fatturazione</legend>
          {data.billingUnavailable && <p className={styles.notice}>I dati di fatturazione salvati sono temporaneamente indisponibili. Puoi compilare i campi qui.</p>}
          <BillingFields account={data.account} billing={data.billing} countries={data.policy.countries}
            country={billingCountry} onCountry={setBillingCountry}
            requireTaxCode={data.account.kind === "individual" && data.policy.requireIndividualTaxCode}
            requireVat={data.policy.requireCompanyVat} />
        </fieldset>
      <fieldset disabled={busy || !!quote}><legend>Consegna e servizi</legend>{hasPhysical && <div className={styles.deliveryOptions}><h3>Per i tuoi oggetti</h3>{physicalOptions.map(option => <label key={option.publicId} data-selected={physical === option.publicId}><input type="radio" name="physical-option" required value={option.publicId} checked={physical === option.publicId} onChange={() => setPhysical(option.publicId)} /><span><strong>{option.label}</strong><small>{option.details}</small></span><span>{money(option.totals.grossMinor)}</span></label>)}{!physicalOptions.length && <p className={styles.notice}>Non ci sono modalità compatibili con tutti gli oggetti del carrello.</p>}</div>}{hasService && <div className={styles.deliveryOptions}><h3>Per i tuoi servizi</h3>{serviceOptions.map(option => <label key={option.publicId} data-selected={service === option.publicId}><input type="radio" name="service-option" required value={option.publicId} checked={service === option.publicId} onChange={() => setService(option.publicId)} /><span><strong>{option.label}</strong><small>{option.details}</small></span><span>{money(option.totals.grossMinor)}</span></label>)}{!serviceOptions.length && <p className={styles.notice}>Non ci sono modalità compatibili con i servizi scelti.</p>}</div>}{shipping && <><label className={styles.check}><input type="checkbox" checked={sameAddress} onChange={event => setSameAddress(event.target.checked)} />Usa l’indirizzo di fatturazione per la spedizione.</label>{!sameAddress && <AddressFields prefix="shipping" name={data.account.name} countries={data.policy.countries.filter(code => (selection?.countries || []).includes(code))} country={shippingCountry} onCountry={setShippingCountry} />}</>}</fieldset>
      <fieldset disabled={busy || !!quote}><legend>Sconto</legend><div className={styles.fieldGrid}><label>Codice sconto, facoltativo<input name="discountCode" maxLength={32} pattern={"[A-Za-z0-9][A-Za-z0-9_\\x2D]{2,31}"} autoComplete="off" /></label></div></fieldset>
      <button className={styles.primary} type="submit" disabled={busy || hasPhysical && !physicalOptions.length || hasService && !serviceOptions.length}>{busy ? "Preparazione…" : "Prepara il riepilogo"}<ArrowRight size={17} /></button></form>
      {quote && <section className={styles.quote} aria-label="Riepilogo definitivo">
        <div className={common.panelHeading}><h2>Le tue scelte, confermate<span>.</span></h2><span className={styles.help}>{remaining ? `Valido per ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Riepilogo scaduto"}</span></div>
        <div className={styles.quoteLines}>{quote.lines.map(line =>
        <div key={line.lineId}>
          <div className={styles.quoteLineDescription}>
            {line.personalization?.details && <div className={styles.quoteLineArtwork}><CartProductArtwork personalization={line.personalization} /></div>}
            <div>
              {line.title}
              <small>{line.quantity} × {money(line.price.unitMinor)} · {line.price.taxMode === "inclusive" ? "IVA inclusa" : "IVA esclusa"}</small>
              {line.personalization && <PersonalizationText value={line.personalization} />}
            </div>
          </div>
          <strong>{money(line.totals.grossMinor)}</strong>
        </div>
      )}</div><dl className={styles.totals}><div><dt>Imponibile</dt><dd>{money(quote.totals.netMinor)}</dd></div><div><dt>IVA</dt><dd>{money(quote.totals.taxMinor)}</dd></div>{quote.discount && <div><dt>Sconto incluso · {quote.discount.code} ({quote.discount.percent}%)</dt><dd>−{money(quote.discount.amountMinor)}</dd></div>}<div><dt>Totale da pagare</dt><dd>{money(quote.totals.grossMinor)}</dd></div></dl><div className={styles.addresses}><div><h3>Fatturazione</h3><address><BillingText billing={quote.billing} /></address></div>{quote.shipping && <div><h3>Spedizione</h3><address><AddressText address={quote.shipping} /></address></div>}</div>{quote.fulfillmentSelections.map(option => <p className={styles.notice} key={option.optionPublicId}><strong>{option.label}</strong><br />{option.details}</p>)}{termsReady ? <label className={styles.check}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy || uncertain} /><span>Accetto le <Link href={termsPath} target="_blank" rel="noreferrer" prefetch={false}>condizioni di acquisto</Link> ({quote.termsVersion}).</span></label> : <p className={styles.notice}>La conferma sarà disponibile quando le condizioni di acquisto saranno pubblicate.</p>}{uncertain && <p className={styles.notice}>L’esito della conferma non è ancora noto. Ripeti lo stesso tentativo oppure <Link href="/account/ordini">controlla i tuoi ordini</Link>, prima di iniziare un altro acquisto.</p>}<button type="button" className={styles.primary} disabled={busy || !accepted || !termsReady || !remaining && !uncertain} onClick={() => void place()}>{busy ? "Conferma…" : uncertain ? "Verifica la conferma" : "Conferma l’ordine"}<ArrowRight size={17} /></button><p className={styles.help}>Il pagamento si effettua nel passaggio successivo, su Stripe Checkout.</p>{!uncertain && <button className={styles.secondary} type="button" disabled={busy} onClick={() => { setQuote(null); setAccepted(false); quoteIntent.current = null; orderIntent.current = null; }}>Rivedi i dati</button>}</section>}
    </>}</>}</main>;
}
