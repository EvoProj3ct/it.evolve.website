"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { isStripeCheckoutUrl, money, paymentSchema, statusLabels, type Order } from "@/lib/ecommerce/contracts";
import { errorText, hidesPreviousData, StorefrontError, storefrontMutate } from "@/lib/ecommerce/browser";
import { cacheShopEntries, orderCacheAge, shopApi, useShopQueryView, useShopStore } from "@/lib/ecommerce/shop-store";
import { ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { PersonalizationText } from "./ShopPersonalization";
import { AddressText, BillingText } from "./ShopAddress";
import { ShopTracking } from "./ShopTracking";
import { OrderStateBadges, ShopOrderCards } from "./ShopOrderCards";
import { PaymentReturnFeedback } from "./PaymentReturnFeedback";
import { paymentConfirmationPending, usePaymentReturn } from "./usePaymentReturn";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

const date = (value: string) => new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "Europe/Rome" }).format(new Date(value));
const groups = { active: "Attivi", received: "Ricevuti", cancelled: "Annullati", all: "Tutti" } as const;
type Group = keyof typeof groups;
export function ShopOrdersList({ compact = false }: { compact?: boolean }) {
  const [group, setGroup] = useState<Group>("active");
  const [cursor, setCursor] = useState("");
  const query = new URLSearchParams();
  if (group !== "all") query.set("group", group);
  if (cursor) query.set("cursor", cursor);
  const resource = useShopQueryView(shopApi.useOrdersQuery(query.toString(), { refetchOnMountOrArgChange: orderCacheAge }));
  const stats = resource.data?.stats;
  const page = resource.data;
  return <section>
    <div className={common.panelHeading}>
      <h2>{compact ? "Ordini attivi" : "I tuoi ordini"}<span>.</span></h2>
      {compact ? <Link href="/account/ordini" className={common.textLink}>Tutti gli ordini <ArrowUpRight size={14} /></Link> :
        <button type="button" className={styles.iconButton} disabled={resource.busy || resource.refreshing} onClick={resource.reload} aria-label="Aggiorna gli ordini"><RefreshCw size={17} /></button>}
    </div>
    {!compact && <div className={styles.orderFilters} role="group" aria-label="Mostra gli ordini">
      {(Object.entries(groups) as [Group, string][]).map(([key, label]) =>
        <button key={key} className={styles.secondary} type="button" aria-pressed={group === key}
          onClick={() => { setGroup(key); setCursor(""); }}>
          {label}{stats && key !== "all" && ` (${stats[key]})`}
        </button>)}
    </div>}
    {stats && <dl className={styles.orderStatistics}>
      <div><dt>Attivi</dt><dd>{stats.active}</dd></div>
      <div><dt>Ricevuti</dt><dd>{stats.received}</dd></div>
      {!compact && <div><dt>Speso al netto dei rimborsi</dt><dd>{money(Math.max(0, stats.paidMinor - stats.refundedMinor))}</dd></div>}
    </dl>}
    <ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next="/account/ordini" />
    {page && <>
      {!page.items.length && <p className={styles.notice}>{cursor ? "Nessun ordine in questa pagina." : group === "all" ? "Non ci sono ancora ordini." : `Nessun ordine tra quelli ${groups[group].toLowerCase()}.`}</p>}
      <ShopOrderCards items={page.items.slice(0, compact ? 3 : 30)} formatDate={date} />
      {!compact && <div className={styles.pagination}>
        {cursor && <button type="button" className={styles.secondary} onClick={() => setCursor("")}>Torna all’inizio</button>}
        {page.nextCursor && <button type="button" className={styles.secondary} onClick={() => setCursor(page.nextCursor!)}>Altri ordini <ArrowRight size={15} /></button>}
      </div>}
    </>}
  </section>;
}

function OrderPayment({ order, returnedFromStripe }: { order: Order; returnedFromStripe: boolean }) {
  const store = useShopStore();
  const resource = useShopQueryView(shopApi.usePaymentStatusQuery(order.id, { refetchOnMountOrArgChange: orderCacheAge }));
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const intent = useRef<{ revision: number; key: string } | null>(null), lock = useRef(false);
  const payment = resource.data;
  const confirmation = usePaymentReturn(order.id, returnedFromStripe);
  const awaitingConfirmation = returnedFromStripe && paymentConfirmationPending(payment);
  const needsConfirmation = awaitingConfirmation && !hidesPreviousData(resource.error);
  const checkingConfirmation = needsConfirmation && confirmation.checking;
  const allowed = !!payment && !awaitingConfirmation && order.operationalStatus !== "cancelled" && !order.payment?.requiresReview && ["awaiting", "failed", "expired"].includes(payment.paymentStatus) && (!payment.attempt || ["ready", "failed", "expired", "cancelled"].includes(payment.attempt.state));
  const refresh = awaitingConfirmation ? confirmation.recheck : resource.reload;
  async function pay() {
    if (lock.current || !allowed || resource.refreshing) return;
    lock.current = true; setBusy(true); setError("");
    if (!intent.current) intent.current = { revision: payment!.orderRevision, key: crypto.randomUUID() };
    try {
      const result = await storefrontMutate(`/orders/${order.id}/payment-session`, "POST", { expectedRevision: intent.current.revision, idempotencyKey: intent.current.key }, paymentSchema);
      intent.current = null;
      if (result.checkoutUrl && isStripeCheckoutUrl(result.checkoutUrl)) {
        window.location.assign(result.checkoutUrl);
      } else {
        await cacheShopEntries(store, [{ endpointName: "paymentStatus", arg: order.id, value: { ...result, checkoutUrl: null } }]);
      }
    } catch (reason) {
      if (reason instanceof StorefrontError && reason.code === "ORDER_CHANGED") {
        intent.current = null;
        resource.reload();
      }
      setError(errorText(reason));
    }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.orderSection}>
    <PaymentReturnFeedback
      checking={checkingConfirmation}
      confirmed={returnedFromStripe && payment?.paymentStatus === "paid"}
    />
    <div className={common.panelHeading}>
      <h2>Pagamento<span>.</span></h2>
      <button type="button" className={styles.iconButton}
        disabled={busy || resource.busy || resource.refreshing || confirmation.checking}
        onClick={refresh} aria-label="Aggiorna lo stato del pagamento"><RefreshCw size={17} /></button>
    </div>
    <ResourceFeedback busy={resource.busy && !awaitingConfirmation} error={checkingConfirmation ? null : resource.error}
      reload={refresh} next={`/account/ordini/${order.id}`} />
    {payment && <>
      <p className={styles.paymentState}>{awaitingConfirmation ? "In attesa della conferma" : statusLabels[payment.paymentStatus]}</p>
      <div className={styles.moneyPair}>
        <span>Incassato <strong>{money(payment.paidMinor)}</strong></span>
        <span>Rimborsato <strong>{money(payment.refundedMinor)}</strong></span>
      </div>
      {!awaitingConfirmation && ["processing", "refund_pending", "under_review", "disputed"].includes(payment.paymentStatus) &&
        <p className={styles.notice}>Lo stato è in aggiornamento. Puoi rileggerlo senza avviare un altro pagamento.</p>}
      {allowed && <button className={styles.primary} type="button" disabled={busy || resource.refreshing} onClick={() => void pay()}>
        {busy ? "Preparazione…" : payment.attempt?.state === "ready" ? "Riprendi il pagamento" : "Vai al pagamento"}<ArrowUpRight size={18} />
      </button>}
    </>}
    {needsConfirmation && !confirmation.checking && !resource.error && <div className={styles.notice} role="status">
      <p>La conferma del pagamento richiede ancora qualche istante.</p>
      <button type="button" className={styles.secondary} disabled={resource.refreshing} onClick={confirmation.recheck}>Verifica di nuovo</button>
    </div>}
    {error && <p className={styles.error} role="alert">{error} Puoi aggiornare lo stato o ripetere lo stesso tentativo.</p>}
  </section>;
}

export function ShopOrderDetail({ id, returnedFromStripe }: { id: string; returnedFromStripe: boolean }) {
  const resource = useShopQueryView(shopApi.useOrderQuery(id, { refetchOnMountOrArgChange: orderCacheAge }));
  const order = resource.data;
  const fulfillment = new Map(order?.fulfillment.map(item => [item.lineId, item]));
  return <main id="shop-content" className={common.page}><ShopPageHeader title={order?.number || "Il tuo ordine"} description={order ? `Confermato il ${date(order.placedAt)}.` : "Dettagli, pagamento e aggiornamenti della fornitura."} />{returnedFromStripe && !order && resource.busy && <PaymentReturnFeedback checking confirmed={false} />}<ResourceFeedback busy={resource.busy && !returnedFromStripe} error={resource.error} reload={resource.reload} next={`/account/ordini/${id}`} />{order && <><div className={common.panelHeading}><Link href="/account/ordini" className={common.textLink}>Tutti gli ordini <ArrowRight size={14} /></Link><button type="button" className={styles.secondary} disabled={resource.refreshing} onClick={resource.reload}><RefreshCw size={15} /> Aggiorna lo stato</button></div><OrderStateBadges order={order} /><div className={styles.detailGrid}><section className={styles.orderSection}><h2>Le tue scelte<span>.</span></h2><div className={styles.quoteLines}>{order.lines.map(line => <div key={line.lineId}><span>{line.title}<small>{line.quantity} × {money(line.price.unitMinor)} · {line.price.taxMode === "inclusive" ? "IVA inclusa" : "IVA esclusa"}</small>{line.personalization && <PersonalizationText value={line.personalization} />}{fulfillment.has(line.lineId) && <LineFulfillment data={fulfillment.get(line.lineId)!} quantity={line.quantity} />}</span><strong>{money(line.totals.grossMinor)}</strong></div>)}</div><dl className={styles.totals}><div><dt>Imponibile</dt><dd>{money(order.totals.netMinor)}</dd></div><div><dt>IVA</dt><dd>{money(order.totals.taxMinor)}</dd></div>{order.discount && <div><dt>Sconto incluso · {order.discount.code} ({order.discount.percent}%)</dt><dd>−{money(order.discount.amountMinor)}</dd></div>}<div><dt>Totale</dt><dd>{money(order.totals.grossMinor)}</dd></div></dl><div className={styles.addresses}><div><h3>Fatturazione</h3><address><BillingText billing={order.billing} /></address></div>{order.shipping && <div><h3>Spedizione</h3><address><AddressText address={order.shipping} /></address></div>}</div>{order.fulfillmentSelections.map(selection => <p className={styles.notice} key={selection.optionPublicId}><strong>{selection.label}</strong><br />{selection.details}</p>)}</section><OrderPayment key={order.id} order={order} returnedFromStripe={returnedFromStripe} /></div><ShopTracking orderId={order.id} /></>}</main>;
}

function LineFulfillment({ data, quantity }: { data: Order["fulfillment"][number]; quantity: number }) {
  const partial = data.fulfilledQuantity > 0 && data.fulfilledQuantity < quantity;
  return <small>{partial ? "Evasione parziale" : statusLabels[data.state]} · {data.fulfilledQuantity}/{quantity} evasi</small>;
}
