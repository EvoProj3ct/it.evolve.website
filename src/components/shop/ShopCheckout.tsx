"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { cartSchema, checkoutOptionsSchema, customerLinkSchema, money, placedOrderSchema, profileSchema, quoteSchema, type Address, type Quote, type QuoteInput } from "@/lib/ecommerce/contracts";
import { errorText, StorefrontError, storefrontGet, storefrontMutate } from "@/lib/ecommerce/browser";
import { cartChanged } from "@/lib/ecommerce/cart";
import { useGuestCart } from "@/lib/ecommerce/guest-cart";
import { PersonalizationText } from "./ShopPersonalization";
import { AddressText, BillingText } from "./ShopAddress";
import { CartProductArtwork, ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { useStorefrontResource } from "./useStorefrontResource";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

async function loadCheckout(signal: AbortSignal) {
  const [profile, cart, policy, link] = await Promise.all([storefrontGet("/me", profileSchema, signal), storefrontGet("/cart", cartSchema, signal), storefrontGet("/checkout-options", checkoutOptionsSchema, signal), storefrontGet("/me/customer-link", customerLinkSchema, signal)]);
  return { account: profile.account, cart, policy, link };
}
function AddressFields({ prefix, name, countries, country, onCountry }: { prefix: string; name: string; countries: string[]; country: string; onCountry: (value: string) => void }) {
  return <div className={styles.fieldGrid}><label>Destinatario<input name={`${prefix}-name`} defaultValue={name} required maxLength={200} autoComplete={`${prefix === "billing" ? "billing" : "shipping"} name`} /></label><label className={styles.wideField}>Via e numero civico<input name={`${prefix}-line1`} required maxLength={200} autoComplete={`${prefix === "billing" ? "billing" : "shipping"} address-line1`} /></label><label className={styles.wideField}>Seconda riga, facoltativa<input name={`${prefix}-line2`} maxLength={200} autoComplete={`${prefix === "billing" ? "billing" : "shipping"} address-line2`} /></label><label>Città<input name={`${prefix}-city`} required maxLength={100} autoComplete={`${prefix === "billing" ? "billing" : "shipping"} address-level2`} /></label><label>CAP<input name={`${prefix}-postalCode`} required maxLength={20} autoComplete={`${prefix === "billing" ? "billing" : "shipping"} postal-code`} /></label><label>Provincia o regione, facoltativa<input name={`${prefix}-region`} maxLength={100} autoComplete={`${prefix === "billing" ? "billing" : "shipping"} address-level1`} /></label><label>Paese<select name={`${prefix}-country`} required value={country} onChange={event => onCountry(event.target.value)} autoComplete={`${prefix === "billing" ? "billing" : "shipping"} country`}><option value="">Scegli un paese</option>{countries.map(code => <option key={code} value={code}>{code}</option>)}</select></label></div>;
}
function address(data: FormData, prefix: string): Address {
  const get = (key: string) => String(data.get(`${prefix}-${key}`) || "").trim();
  return { name: get("name"), line1: get("line1"), city: get("city"), postalCode: get("postalCode"), country: get("country"), ...(get("line2") ? { line2: get("line2") } : {}), ...(get("region") ? { region: get("region") } : {}) };
}
export function ShopCheckout({ termsPath, termsVersion }: { termsPath: string; termsVersion: string }) {
  const resource = useStorefrontResource(loadCheckout), router = useRouter();
  const guestCart = useGuestCart();
  const [physical, setPhysical] = useState(""), [service, setService] = useState("");
  const [billingCountry, setBillingCountry] = useState(""), [shippingCountry, setShippingCountry] = useState("");
  const [sameAddress, setSameAddress] = useState(true), [accepted, setAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null), [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [uncertain, setUncertain] = useState(false);
  const lock = useRef(false), quoteIntent = useRef<{ signature: string; key: string } | null>(null), orderIntent = useRef<{ quoteId: string; key: string } | null>(null);
  const data = resource.data;
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
    const form = new FormData(event.currentTarget), billing = address(form, "billing");
    const physicalOption = physicalOptions.find(option => option.publicId === physical);
    const serviceOption = serviceOptions.find(option => option.publicId === service);
    if (hasPhysical && !physicalOption || hasService && !serviceOption) { setError("Scegli le modalità di consegna o servizio."); return; }
    const selections = [hasPhysical ? physicalOption : undefined, hasService ? serviceOption : undefined]
      .flatMap(option => option ? [{ mode: option.mode, optionPublicId: option.publicId }] : []);
    const billingInput: QuoteInput["billing"] = { kind: data.account.kind, name: String(form.get("billingName") || "").trim(), email: data.account.email, address: billing };
    for (const key of ["taxCode", "vatNumber", "recipientCode", "certifiedEmail"] as const) { const value = String(form.get(key) || "").trim(); if (value) billingInput[key] = value; }
    const discountCode = String(form.get("discountCode") ?? "").trim().toUpperCase();
    const input = { ...(discountCode && { discountCode }), cartPublicId: data.cart.id!, cartRevision: data.cart.revision, policyRevision: data.policy.revision, termsVersion: data.policy.termsVersion, billing: billingInput, ...(shipping ? { shipping: sameAddress ? billing : address(form, "shipping") } : {}), fulfillmentSelections: selections };
    const signature = JSON.stringify(input);
    if (quoteIntent.current?.signature !== signature) quoteIntent.current = { signature, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setError("");
    try { const result = await storefrontMutate("/quotes", "POST", { ...input, idempotencyKey: quoteIntent.current!.key }, quoteSchema); setQuote(result); setNow(Date.now()); setAccepted(false); orderIntent.current = null; }
    catch (reason) {
      if (reason instanceof StorefrontError && reason.code === "QUOTE_EXPIRED_OR_CHANGED") quoteIntent.current = null;
      if (reason instanceof StorefrontError && ["CART_CHANGED", "CATALOG_CHANGED", "POLICY_CHANGED", "DELIVERY_CHANGED", "PERSONALIZATION_CHANGED"].includes(reason.code)) resource.reload();
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
      <form method="post" onSubmit={prepare} hidden={!!quote} className={styles.checkoutForm}><fieldset disabled={busy || !!quote}><legend>Fatturazione</legend><p className={styles.help}>{data.account.email} · Account {data.account.kind === "company" ? "azienda" : "privato"}</p><div className={styles.fieldGrid}><label className={styles.wideField}>{data.account.kind === "company" ? "Ragione sociale" : "Nome e cognome"}<input name="billingName" defaultValue={data.account.name} required maxLength={200} /></label>{data.account.kind === "individual" ? <label>Codice fiscale{!data.policy.requireIndividualTaxCode && ", facoltativo"}<input name="taxCode" required={data.policy.requireIndividualTaxCode} maxLength={40} /></label> : <><label>Partita IVA{!data.policy.requireCompanyVat && ", facoltativa"}<input name="vatNumber" required={data.policy.requireCompanyVat} maxLength={40} /></label><label>Codice fiscale, facoltativo<input name="taxCode" maxLength={40} /></label><label>Codice destinatario, facoltativo<input name="recipientCode" maxLength={20} /></label><label>PEC, facoltativa<input name="certifiedEmail" type="email" maxLength={254} /></label></>}</div><AddressFields prefix="billing" name={data.account.name} countries={data.policy.countries} country={billingCountry} onCountry={setBillingCountry} /></fieldset>
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
