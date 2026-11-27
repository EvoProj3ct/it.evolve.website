"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Package } from "lucide-react";
import { errorText, loginHref, StorefrontError } from "@/lib/ecommerce/browser";
import type { PersonalizationSummary } from "@/lib/ecommerce/contracts";
import type { PublicCatalogProduct } from "@evolve/ecommerce-server/catalog";
import { ProductMark } from "./ProductMark";
import styles from "./CommercePreview.module.css";
import live from "./Storefront.module.css";

export function ShopPageHeader({ title, description }: { title: string; description: string }) {
  return <><div className={styles.topline}><Link href="/negozio" className={styles.backLink}><ArrowLeft size={15} /> Torna agli oggetti</Link><Link href="/account" className={styles.textLink}>Il tuo spazio <ArrowUpRight size={13} /></Link></div><header className={styles.pageHeading}><h1>{title}<span>.</span></h1><p>{description}</p></header></>;
}
export function CatalogArtwork({ product }: { product?: PublicCatalogProduct }) {
  return <div className={`${styles.artwork} ${live.catalogArt}`} aria-hidden="true">{product?.image ? <img src={product.image.url} alt="" width={product.image.width} height={product.image.height} loading="lazy" referrerPolicy="no-referrer" /> : <Package size={42} strokeWidth={.85} />}</div>;
}

export function CartProductArtwork({ product, personalization, slug }: {
  product?: PublicCatalogProduct;
  personalization?: Pick<PersonalizationSummary, "color" | "details">;
  slug?: string;
}) {
  const details = personalization?.details;
  const productSlug = product?.slug ?? slug;
  const slugKind = productSlug === "e-linker" || productSlug === "e-led" ||
    productSlug === "e-disk" || productSlug === "e-disk-disc" || productSlug === "e-disk-bundle"
    ? productSlug : undefined;
  const mark = details?.kind ?? product?.configurator ?? slugKind;
  if (!mark) return <CatalogArtwork product={product} />;

  return <div className={`${styles.artwork} ${styles.cartProductMark}`} aria-hidden="true">
    <ProductMark
      product={mark}
      primary={personalization?.color}
      secondary={details && "secondaryColor" in details ? details.secondaryColor : undefined}
    />
  </div>;
}
export function ResourceFeedback({ error, busy = false, reload, next = "/account" }: { error: unknown; busy?: boolean; reload?: () => void; next?: string }) {
  if (busy) return <p className={live.loading} role="status"><i />Caricamento…</p>;
  if (!error) return null;
  const login = error instanceof StorefrontError && error.status === 401;
  return <div className={live.feedback} role="alert"><h2>{login ? "Entra nel tuo spazio." : "Un momento, riproviamo."}</h2><p>{errorText(error)}</p>{login ? <div><Link href={loginHref(next)} className={live.primary} prefetch={false}>Accedi <ArrowUpRight size={17} /></Link><Link href="/account/register" prefetch={false}>Crea il tuo account</Link></div> : reload && <button type="button" className={live.secondary} onClick={reload}>Aggiorna</button>}</div>;
}
