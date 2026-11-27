import Link from "next/link";
import { ArrowUpRight, Ellipsis, Package } from "lucide-react";
import { linkerBundleSize } from "@evolve/ecommerce-server/keyring-offers";
import { money, statusLabels, type CustomerOrderListItem, type OrderSummary } from "@/lib/ecommerce/contracts";
import { ProductMark } from "./ProductMark";
import { LinkerBundleArtwork } from "./LinkerBundleArtwork";
import styles from "./Storefront.module.css";

const sections = {
  blocked: "Bloccati o da verificare",
  payable: "Da pagare",
  waiting: "In attesa",
  fulfillment: "Da evadere",
  progress: "In lavorazione",
  received: "Evasi",
  closed: "Chiusi",
} as const;

function sectionFor(order: OrderSummary): keyof typeof sections {
  const { operationalStatus, paymentStatus, fulfillmentStatus } = order;
  if (operationalStatus === "cancelled" || paymentStatus === "refunded") return "closed";
  if (operationalStatus === "on_hold" || order.payment?.requiresReview || ["under_review", "disputed"].includes(paymentStatus)) return "blocked";
  if (["awaiting", "expired", "failed"].includes(paymentStatus)) return "payable";
  if (["processing", "refund_pending"].includes(paymentStatus)) return "waiting";
  if (fulfillmentStatus === "fulfilled") return "received";
  if (fulfillmentStatus === "unfulfilled") return "fulfillment";
  return "progress";
}

export function OrderStateBadges({ order }: { order: OrderSummary }) {
  const states = [
    { label: "Ordine", value: order.operationalStatus },
    { label: "Pagamento", value: order.paymentStatus },
    { label: "Evasione", value: order.fulfillmentStatus },
  ];
  return <div className={styles.orderStates}>{states.map(({ label, value }) =>
    <span key={label} data-state={value}><small>{label}</small>
      {label === "Ordine" && value === "on_hold" ? "Bloccato" : statusLabels[value]}
    </span>,
  )}</div>;
}

function OrderProductMarks({ order }: { order: CustomerOrderListItem }) {
  const products = order.products ?? [];
  const extra = Math.max(0, (order.productCount ?? products.length) - products.length);
  return <div className={styles.orderProducts}>
    {products.length ? products.map((product, index) => {
      const bundleSize = linkerBundleSize(product.mark);
      return <span key={index} className={styles.orderProductCircle} role="img" aria-label={product.title} title={product.title}>
        {bundleSize ? <LinkerBundleArtwork size={bundleSize} primary={product.color} secondary={product.secondaryColor} /> :
          product.mark ? <ProductMark product={product.mark} primary={product.color} secondary={product.secondaryColor} /> :
          <Package size={21} strokeWidth={1.4} />}
      </span>;
    }) : <span className={styles.orderProductCircle} aria-hidden="true"><Package size={22} strokeWidth={1.4} /></span>}
    {extra > 0 && <span className={styles.orderProductCircle} role="img" aria-label={`Altri ${extra} articoli`} title={`Altri ${extra} articoli`}><Ellipsis size={20} /></span>}
  </div>;
}

export function ShopOrderCards({ items, formatDate }: {
  items: CustomerOrderListItem[];
  formatDate: (value: string) => string;
}) {
  return <div className={styles.realOrders}>
    {(Object.keys(sections) as (keyof typeof sections)[]).map(section => {
      const orders = items.filter(order => sectionFor(order) === section);
      if (!orders.length) return null;
      return <section key={section} className={styles.orderGroup} data-section={section}>
        <h3><i aria-hidden="true" />{sections[section]}</h3>
        {orders.map(order => <Link href={`/account/ordini/${order.id}`} className={styles.realOrder} key={order.id}>
          <OrderProductMarks order={order} />
          <div className={styles.orderCardBody}>
            <strong>{order.number}</strong><time dateTime={order.placedAt}>{formatDate(order.placedAt)}</time>
            <OrderStateBadges order={order} />
          </div>
          <span className={styles.orderCardTotal}>{money(order.totals.grossMinor)}<ArrowUpRight size={16} aria-hidden="true" /></span>
        </Link>)}
      </section>;
    })}
  </div>;
}
