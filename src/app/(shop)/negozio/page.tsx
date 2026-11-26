import type { Metadata } from "next";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Oggetti e connessioni · Evolve Shop" };
export default function CatalogPage() { return <ShopCatalog />; }

