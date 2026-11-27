import type { OrderSummary } from "@/lib/ecommerce/contracts";
import { statusLabels } from "@/lib/ecommerce/contracts";
import { OrderStatusGhost, type OrderGhostKind } from "./OrderStatusGhost";
import styles from "./Storefront.module.css";

export const orderGroups = {
  blocked: "In sospeso",
  payable: "In attesa del pagamento",
  waiting: "Pagamento in verifica",
  confirmed: "Confermati",
  progress: "In lavorazione",
  pickup: "Pronti per il ritiro",
  shipping: "In spedizione",
  service_pending: "Servizio da completare",
  received: "Ricevuti",
  closed: "Chiusi",
} as const satisfies Record<OrderGhostKind, string>;

const journey = {
  payable: { step: "payment", label: "In attesa del pagamento" },
  waiting: { step: "payment", label: "Pagamento in verifica" },
  confirmed: { step: "confirmed", label: "Confermato" },
  progress: { step: "progress", label: "In lavorazione" },
  pickup: { step: "handoff", label: "Pronto per il ritiro" },
  shipping: { step: "handoff", label: "Spedito" },
} as const;

type OrderProgressState = {
  kind: OrderGhostKind;
  step: (typeof journey)[keyof typeof journey]["step"] | "received";
  label: string;
};

const refundLabels = {
  refund_pending: "In corso",
  partially_refunded: "Parziale",
  refunded: "Effettuato",
} as const;

function deliveryMode(order: OrderSummary) {
  if (order.deliveryPhase === "ready_for_pickup") return "pickup";
  if (order.deliveryPhase === "shipped") return "shipping";
  return order.deliveryMode;
}

function receiptLabel(mode: OrderSummary["deliveryMode"]) {
  if (mode === "pickup") return "Ritirato";
  if (mode === "service") return "Servizio completato";
  return "Consegnato";
}

export function orderProgressFor(order: OrderSummary): OrderProgressState {
  const { operationalStatus, paymentStatus, fulfillmentStatus, deliveryPhase } = order;
  const confirmed = paymentStatus === "paid" ||
    (["partially_refunded", "refund_pending"].includes(paymentStatus) && (order.payment?.paidMinor ?? 0) > 0);
  const kind = fulfillmentStatus === "fulfilled" || operationalStatus === "completed" ? "received"
    : deliveryPhase === "shipped" ? "shipping"
    : deliveryPhase === "ready_for_pickup" ? "pickup"
    : deliveryPhase === "delivered" ? "service_pending"
    : paymentStatus === "processing" ? "waiting"
    : ["awaiting", "failed", "expired"].includes(paymentStatus) ? "payable"
    : operationalStatus === "in_progress" || fulfillmentStatus === "in_progress" || fulfillmentStatus === "partial" ? "progress"
    : confirmed ? "confirmed"
    : "payable";
  const stage: Omit<OrderProgressState, "kind"> = kind === "received" ? { step: "received", label: receiptLabel(deliveryMode(order)) }
    : kind === "service_pending" ? { step: "handoff", label: `${receiptLabel(deliveryMode(order))} · servizio da completare` }
    : journey[kind];
  if (operationalStatus === "cancelled") return { ...stage, kind: "closed", label: "Annullato" };
  if (operationalStatus === "on_hold") return { ...stage, kind: "blocked", label: "Sospeso" };
  if (kind === "received" || kind === "shipping" || kind === "pickup" || kind === "service_pending") return { ...stage, kind };
  if (paymentStatus === "refunded") return { ...stage, kind: "blocked", label: "Sospeso" };
  if (order.payment?.requiresReview || ["under_review", "disputed"].includes(paymentStatus))
    return { ...stage, kind: "blocked", label: "Ordine in verifica" };
  return { ...stage, kind };
}

export function OrderPaymentBadge({ order }: { order: OrderSummary }) {
  const { paymentStatus } = order;
  const refund = Object.hasOwn(refundLabels, paymentStatus);
  return <span className={styles.orderPaymentBadge} data-state={paymentStatus}>
    <small>{refund ? "Rimborso" : "Pagamento"}</small>
    {refund ? refundLabels[paymentStatus as keyof typeof refundLabels] : paymentStatus === "processing" ? "In elaborazione" : statusLabels[paymentStatus]}
  </span>;
}

export function OrderProgress({ order, compact = false }: { order: OrderSummary; compact?: boolean }) {
  const progress = orderProgressFor(order);
  const mode = deliveryMode(order);
  const steps = [
    { id: "payment", label: "Pagamento" },
    { id: "confirmed", label: "Confermato" },
    { id: "progress", label: "Lavorazione" },
    ...(mode === "service" ? [] : [{ id: "handoff", label: mode === "pickup" ? "Ritiro" : "Spedizione" }]),
    { id: "received", label: mode === "service" || progress.kind === "service_pending" ? "Completato" : receiptLabel(mode) },
  ];
  const currentIndex = steps.findIndex((step) => step.id === progress.step);
  return <div className={styles.orderProgress} data-section={progress.kind} data-compact={compact}>
    <ol className={styles.orderProgressSteps} aria-label="Avanzamento dell’ordine">
      {steps.map((step, index) => {
        const current = index === currentIndex;
        return <li key={step.id} data-complete={index < currentIndex} aria-current={current ? "step" : undefined}>
          {current && <OrderStatusGhost kind={progress.kind} />}
          <i aria-hidden="true" />
          <span>{current ? progress.label : step.label}</span>
        </li>;
      })}
    </ol>
  </div>;
}
