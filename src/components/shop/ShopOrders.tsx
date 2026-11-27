"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CheckCircle2, RefreshCw } from "lucide-react";
import { isStripeCheckoutUrl, money, paymentSchema, statusLabels, type Order, type Payment } from "@/lib/ecommerce/contracts";
import { errorText, hidesPreviousData, StorefrontError, storefrontMutate } from "@/lib/ecommerce/browser";
import { cacheShopEntries, orderCacheAge, shopApi, useShopQueryView, useShopStore } from "@/lib/ecommerce/shop-store";
import { ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { PersonalizationText } from "./ShopPersonalization";
import { OrderAddresses } from "./ShopAddress";
import { ShopTracking } from "./ShopTracking";
import { ShopOrderCards } from "./ShopOrderCards";
import { OrderProgress } from "./OrderProgress";
import { PaymentReturnFeedback } from "./PaymentReturnFeedback";
import { forgetStripeCheckout, rememberStripeCheckout, type ShopPaymentReturn } from "./stripeCheckoutReturn";
import { usePaymentReturn } from "./usePaymentReturn";
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
  const resource = useShopQueryView(shopApi.useOrdersQuery(query.toString(), { refetchOnMountOrArgChange: true }));
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

function OrderPayment({ order, resource, confirmation, paymentReturn }: {
  order: Order;
  resource: ReturnType<typeof useShopQueryView<Payment>>;
  confirmation: ReturnType<typeof usePaymentReturn>;
  paymentReturn: ShopPaymentReturn;
}) {
  const store = useShopStore();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [requestedPayment, setRequestedPayment] = useState(false);
  const intent = useRef<{ revision: number; key: string } | null>(null), lock = useRef(false);
  const payment = resource.data;
  const amounts = payment && payment.orderRevision >= order.revision ? payment : order.payment;
  const paid = order.paymentStatus === "paid";
  const needsPayment = order.operationalStatus !== "cancelled"
    && ["awaiting", "failed", "expired"].includes(order.paymentStatus);
  const awaitingConfirmation = confirmation.returned && ["awaiting", "processing"].includes(order.paymentStatus);
  const needsConfirmation = awaitingConfirmation && !hidesPreviousData(resource.error);
  const checkingConfirmation = needsConfirmation && confirmation.checking;
  const canResumeAfterBrowserBack = paymentReturn === undefined && !confirmation.checking && !confirmation.failure
    && payment?.attempt?.state === "ready" && order.paymentStatus === "awaiting";
  const allowed = confirmation.initialized && !!payment && (!awaitingConfirmation || canResumeAfterBrowserBack)
    && needsPayment && !order.payment?.requiresReview
    && order.paymentStatus === payment.paymentStatus
    && (!payment.attempt || ["ready", "failed", "expired", "cancelled"].includes(payment.attempt.state));
  const refresh = awaitingConfirmation ? confirmation.recheck : resource.reload;
  async function pay() {
    if (lock.current || !payment || !allowed || resource.refreshing) return;
    lock.current = true; setBusy(true); setError("");
    setRequestedPayment(true);
    if (!intent.current) intent.current = { revision: payment.orderRevision, key: crypto.randomUUID() };
    try {
      const result = await storefrontMutate(`/orders/${order.id}/payment-session`, "POST", { expectedRevision: intent.current.revision, idempotencyKey: intent.current.key }, paymentSchema);
      intent.current = null;
      if (result.checkoutUrl && isStripeCheckoutUrl(result.checkoutUrl)) {
        rememberStripeCheckout(order.id);
        window.location.assign(result.checkoutUrl);
      } else {
        await cacheShopEntries(store, [{ endpointName: "paymentStatus", arg: order.id, value: { ...result, checkoutUrl: null } }]);
        if (order.paymentStatus !== result.paymentStatus) store.dispatch(shopApi.util.invalidateTags(["Orders"]));
        if (result.paymentStatus === "paid") forgetStripeCheckout(order.id);
      }
    } catch (reason) {
      if (reason instanceof StorefrontError && ["ORDER_CHANGED", "ORDER_NOT_PAYABLE"].includes(reason.code)) {
        intent.current = null;
        resource.reload();
        store.dispatch(shopApi.util.invalidateTags(["Orders"]));
      }
      setError(errorText(reason));
    }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.orderSection}>
    {!confirmation.returned && <PaymentReturnFeedback checking={false} confirmed={requestedPayment && paid} />}
    <div className={common.panelHeading}>
      <h2>Pagamento<span>.</span></h2>
      <button type="button" className={styles.iconButton}
        disabled={busy || resource.busy || resource.refreshing || confirmation.checking}
        onClick={refresh} aria-label="Aggiorna lo stato del pagamento"><RefreshCw size={17} /></button>
    </div>
    <ResourceFeedback busy={resource.busy && !awaitingConfirmation} error={checkingConfirmation ? null : resource.error ?? (needsConfirmation && hidesPreviousData(confirmation.failure) ? confirmation.failure : null)}
      reload={refresh} next={`/account/ordini/${order.id}`} />
    {paid && <p className={styles.paymentSuccess} role="status"><CheckCircle2 size={22} aria-hidden="true" /> Pagamento effettuato con successo</p>}
    {!paid && <p className={styles.paymentState} role="status">{checkingConfirmation ? "Verifica del pagamento in corso…" : awaitingConfirmation ? "In attesa della conferma" : statusLabels[order.paymentStatus]}</p>}
    <div className={styles.paymentTotal}>
      <span>{needsPayment && !awaitingConfirmation ? "Totale da pagare" : "Totale ordine"}</span>
      <strong>{money(order.totals.grossMinor)}</strong>
    </div>
    {amounts && <div className={styles.moneyPair}>
      <span>Incassato <strong>{money(amounts.paidMinor)}</strong></span>
      <span>Rimborsato <strong>{money(amounts.refundedMinor)}</strong></span>
    </div>}
    {!awaitingConfirmation && ["processing", "refund_pending", "under_review", "disputed"].includes(order.paymentStatus) &&
      <p className={styles.notice}>Lo stato è in aggiornamento. Puoi rileggerlo senza avviare un altro pagamento.</p>}
    {allowed && <button className={styles.primary} type="button" disabled={busy || resource.refreshing} onClick={() => void pay()}>
      {busy ? "Preparazione…" : payment?.attempt?.state === "ready" ? "Riprendi il pagamento" : "Vai al pagamento"}<ArrowUpRight size={18} />
    </button>}
    {needsConfirmation && !confirmation.checking && !resource.error && !hidesPreviousData(confirmation.failure) && <div className={styles.notice} role="status">
      <p>{confirmation.failure ? errorText(confirmation.failure) : "La conferma del pagamento richiede ancora qualche istante."}</p>
      <button type="button" className={styles.secondary} disabled={resource.refreshing} onClick={confirmation.recheck}>Verifica di nuovo</button>
    </div>}
    {error && <p className={styles.error} role="alert">{error} Puoi aggiornare lo stato o ripetere lo stesso tentativo.</p>}
  </section>;
}

export function ShopOrderDetail({ id, paymentReturn }: { id: string; paymentReturn: ShopPaymentReturn }) {
  const store = useShopStore();
  const confirmation = usePaymentReturn(id, paymentReturn);
  const resource = useShopQueryView(shopApi.useOrderQuery(id, { refetchOnMountOrArgChange: true }));
  const paymentEndpoint = shopApi.endpoints.paymentStatus;
  paymentEndpoint.useQuerySubscription(id, {
    skip: !resource.data || !confirmation.initialized || confirmation.checking,
    refetchOnMountOrArgChange: orderCacheAge,
  });
  const paymentState = paymentEndpoint.useQueryState(id);
  const reloadPayment = useCallback(() => {
    void store.dispatch(paymentEndpoint.initiate(id, { subscribe: false, forceRefetch: true }));
  }, [id, paymentEndpoint, store]);
  const payment = useShopQueryView({ ...paymentState, refetch: reloadPayment });
  const currentOrder = resource.data;
  const currentPayment = payment.data;
  const order = currentOrder && currentPayment && currentPayment.orderRevision >= currentOrder.revision
    ? { ...currentOrder, paymentStatus: currentPayment.paymentStatus }
    : currentOrder;
  const returnStatus = order?.paymentStatus ?? currentPayment?.paymentStatus;
  const waitingForPayment = confirmation.returned && (returnStatus === "awaiting" || returnStatus === "processing");
  const progressOrder = order && !order.deliveryMode
    ? { ...order, deliveryMode: order.fulfillmentSelections.find(selection => selection.mode !== "service")?.mode ?? order.fulfillmentSelections[0]?.mode }
    : order;
  return <main id="shop-content" className={common.page}>
    <ShopPageHeader title={order?.number || "Il tuo ordine"} />
    <PaymentReturnFeedback
      checking={confirmation.showOverlay && (!returnStatus || returnStatus === "awaiting" || returnStatus === "processing") && !hidesPreviousData(resource.error)}
      confirmed={confirmation.returned && returnStatus === "paid"}
    />
    <ResourceFeedback busy={resource.busy && !confirmation.returned} error={resource.error} reload={resource.reload} next={`/account/ordini/${id}`} />
    {order && <>
      <div className={common.panelHeading}>
        <div className={styles.orderDetailMeta}>
          <Link href="/account/ordini" className={common.textLink}>Tutti gli ordini <ArrowRight size={14} /></Link>
          <time dateTime={order.placedAt}>Ricevuto il {date(order.placedAt)}</time>
        </div>
        <button type="button" className={styles.secondary} disabled={resource.refreshing || confirmation.checking}
          onClick={waitingForPayment ? confirmation.recheck : resource.reload}>
          <RefreshCw size={15} /> Aggiorna lo stato
        </button>
      </div>
      {progressOrder && <OrderProgress order={progressOrder} />}
      <div className={styles.detailGrid}>
        <section className={styles.orderSection}>
          <h2>Le tue scelte<span>.</span></h2>
          <div className={styles.quoteLines}>{order.lines.map(line => <div key={line.lineId}><span>{line.title}<small>{line.quantity} × {money(line.price.unitMinor)} · {line.price.taxMode === "inclusive" ? "IVA inclusa" : "IVA esclusa"}</small>{line.personalization && <PersonalizationText value={line.personalization} />}</span><strong>{money(line.totals.grossMinor)}</strong></div>)}</div>
          <dl className={styles.totals}><div><dt>Imponibile</dt><dd>{money(order.totals.netMinor)}</dd></div><div><dt>IVA</dt><dd>{money(order.totals.taxMinor)}</dd></div>{order.discount && <div><dt>Sconto incluso · {order.discount.code} ({order.discount.percent}%)</dt><dd>−{money(order.discount.amountMinor)}</dd></div>}<div><dt>Totale</dt><dd>{money(order.totals.grossMinor)}</dd></div></dl>
          <OrderAddresses billing={order.billing} shipping={order.shipping} />
          {order.fulfillmentSelections.map(selection => <p className={styles.notice} key={selection.optionPublicId}><strong>{selection.label}</strong><br />{selection.details}</p>)}
        </section>
        <OrderPayment key={order.id} order={order} resource={payment} confirmation={confirmation} paymentReturn={paymentReturn} />
      </div>
      {!confirmation.showOverlay && <ShopTracking orderId={order.id} />}
    </>}
  </main>;
}
