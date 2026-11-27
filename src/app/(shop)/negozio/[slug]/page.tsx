import { notFound } from "next/navigation";
import { ShopCatalogProduct } from "@/components/shop/ShopCatalog";
import { E_DISK_VISIBLE, isEDiskReference } from "@/lib/ecommerce/product-visibility";
export const dynamic = "force-dynamic";
export default async function CatalogProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (!E_DISK_VISIBLE && isEDiskReference(slug))) notFound();
  return <ShopCatalogProduct key={slug} slug={slug} />;
}

