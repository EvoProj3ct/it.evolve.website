import { redirect } from "next/navigation";
import { ProductNavigation } from "@/components/shop/ShopNavigation";
import { E_DISK_VISIBLE } from "@/lib/ecommerce/product-visibility";

export default function EDiskShopLayout({ children }: { children: React.ReactNode }) {
  if (!E_DISK_VISIBLE) redirect("/negozio");
  return <><ProductNavigation product="e-disk" />{children}</>;
}
