import { ProductNavigation } from "@/components/shop/ShopNavigation";

export default function ELedShopLayout({ children }: { children: React.ReactNode }) {
  return <><ProductNavigation product="e-led" />{children}</>;
}
