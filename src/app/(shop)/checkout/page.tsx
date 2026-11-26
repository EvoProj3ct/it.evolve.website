import type { Metadata } from "next";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
import { ShopCheckout } from "@/components/shop/ShopCheckout";
import { storefrontLegal } from "@/server/storefront-legal";
export default function CheckoutPage() {
  const { checkoutTermsPath, checkoutTermsVersion } = storefrontLegal();
  return <ShopCheckout termsPath={checkoutTermsPath} termsVersion={checkoutTermsVersion} />;
}

