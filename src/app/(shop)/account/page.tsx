import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShopProfile } from "@/components/shop/ShopProfile";

export default async function AccountPage() {
  const session = (await cookies()).get("__Host-storefront_session")?.value;
  if (!session) redirect("/account/login");
  return <ShopProfile />;
}

