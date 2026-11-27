import Link from "next/link";
import { ArrowUpRight, Ellipsis, Package } from "lucide-react";
import { linkerBundleSize } from "@evolve/ecommerce-server/keyring-offers";
import { money, type CustomerOrderListItem } from "@/lib/ecommerce/contracts";
import { ProductMark } from "./ProductMark";
import { LinkerBundleArtwork } from "./LinkerBundleArtwork";
import { OrderPaymentBadge, OrderProgress, orderGroups, orderProgressFor } from "./OrderProgress";
import styles from "./Storefront.module.css";

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
    {(Object.keys(orderGroups) as (keyof typeof orderGroups)[]).map(section => {
      const orders = items.filter(order => orderProgressFor(order).kind === section);
      if (!orders.length) return null;
      return <section key={section} className={styles.orderGroup} data-section={section}>
        <h3><i aria-hidden="true" />{orderGroups[section]}</h3>
        {orders.map(order => <Link href={`/account/ordini/${order.id}`} className={styles.realOrder} key={order.id}>
          <OrderProductMarks order={order} />
          <div className={styles.orderCardBody}>
            <strong>{order.number}</strong><time dateTime={order.placedAt}>{formatDate(order.placedAt)}</time>
          </div>
          <div className={styles.orderCardSummary}>
            <span className={styles.orderCardTotal}>{money(order.totals.grossMinor)}<ArrowUpRight size={16} aria-hidden="true" /></span>
            <OrderPaymentBadge order={order} />
          </div>
          <div className={styles.orderCardProgress}><OrderProgress order={order} compact /></div>
        </Link>)}
      </section>;
    })}
  </div>;
}
