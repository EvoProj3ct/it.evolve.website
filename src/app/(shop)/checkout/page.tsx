import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
import { ShopCheckout } from "@/components/shop/ShopCheckout";
import { storefrontLegal } from "@/server/storefront-legal";
export default async function CheckoutPage() {
  if (!(await cookies()).get("__Host-storefront_session")?.value)
    redirect("/account/login?next=%2Fcarrello");
  const { checkoutTermsPath, checkoutTermsVersion } = storefrontLegal();
  return <ShopCheckout termsPath={checkoutTermsPath} termsVersion={checkoutTermsVersion} />;
}

