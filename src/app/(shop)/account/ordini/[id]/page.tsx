import { notFound } from "next/navigation";
import { ShopOrderDetail } from "@/components/shop/ShopOrders";
export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagamento?: string | string[] }>;
}) {
  const [{ id }, { pagamento }] = await Promise.all([params, searchParams]);
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) notFound();
  return <ShopOrderDetail key={id} id={id} returnedFromStripe={pagamento === "ritorno"} />;
}

