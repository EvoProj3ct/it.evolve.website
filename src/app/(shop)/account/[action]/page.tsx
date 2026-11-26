import { notFound } from "next/navigation";
import { ShopAuthForm, type AuthAction } from "@/components/shop/ShopAuthForm";
import { AUTH_PAGE_ACTIONS } from "@/lib/ecommerce/auth-pages";
import { storefrontLegal } from "@/server/storefront-legal";

export default async function AccountActionPage({ params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!AUTH_PAGE_ACTIONS.includes(action as AuthAction)) notFound();
  return <ShopAuthForm key={action} action={action as AuthAction} legal={storefrontLegal()} />;
}
