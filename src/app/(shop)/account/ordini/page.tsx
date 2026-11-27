import { ShopOrdersList } from "@/components/shop/ShopOrders";
import { ShopPageHeader } from "@/components/shop/ShopPreviewShared";
import styles from "@/components/shop/CommercePreview.module.css";
export default function OrdersPage() { return <main id="shop-content" className={styles.page}><ShopPageHeader title="I tuoi ordini" /><ShopOrdersList /></main>; }

