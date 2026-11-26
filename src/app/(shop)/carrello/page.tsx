import type { Metadata } from "next";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
import { ShopCart } from "@/components/shop/ShopCart";
export default function CartPage() { return <ShopCart />; }

