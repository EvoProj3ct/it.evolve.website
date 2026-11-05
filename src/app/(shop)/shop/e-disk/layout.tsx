import { ProductNavigation } from "@/components/shop/ShopNavigation";

export default function EDiskShopLayout({ children }: { children: React.ReactNode }) {
  return <><ProductNavigation product="e-disk" />{children}</>;
}
