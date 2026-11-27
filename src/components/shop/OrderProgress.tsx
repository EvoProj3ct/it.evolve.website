import { statusLabels, type OrderSummary } from "@/lib/ecommerce/contracts";
import { deliveryMode, orderProgressFor, receiptLabel } from "@/lib/ecommerce/order-progress";
import { OrderStatusGhost } from "./OrderStatusGhost";
import styles from "./Storefront.module.css";

const refundLabels = {
  refund_pending: "In corso",
  partially_refunded: "Parziale",
  refunded: "Effettuato",
} as const;

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
    ...(mode === "service" ? [] : [{ id: "handoff", label: mode === "pickup" ? "Ritiro disponibile" : mode === "shipping" ? "Spedizione" : "Consegna" }]),
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
