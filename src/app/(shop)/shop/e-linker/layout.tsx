import { ProductNavigation } from "@/components/shop/ShopNavigation";

export default function ELinkerShopLayout({ children }: { children: React.ReactNode }) {
  return <><ProductNavigation product="e-linker" />{children}</>;
}
