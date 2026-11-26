import { notFound } from "next/navigation";
import { ShopOrderDetail } from "@/components/shop/ShopOrders";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) notFound(); return <ShopOrderDetail key={id} id={id} />; }

