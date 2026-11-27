"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Package } from "lucide-react";
import { errorText, loginHref, StorefrontError } from "@/lib/ecommerce/browser";
import type { PersonalizationSummary } from "@/lib/ecommerce/contracts";
import type { ConfiguratorKind, PublicCatalogProduct } from "@evolve/ecommerce-server/catalog";
import { isLinkerOfferKind, linkerBundleSize } from "@evolve/ecommerce-server/keyring-offers";
import { GhostLoading } from "@/components/GhostLoading";
import { LinkerBundleArtwork } from "./LinkerBundleArtwork";
import { ProductMark } from "./ProductMark";
import styles from "./CommercePreview.module.css";
import live from "./Storefront.module.css";

export function ShopPageHeader({ title, showAccountLink = true }: { title: string; showAccountLink?: boolean }) {
  return <><div className={styles.topline}><Link href="/shop/e-linker" className={styles.backLink}><ArrowLeft size={15} /> Torna agli oggetti</Link>{showAccountLink && <Link href="/account" className={styles.textLink}>Il tuo spazio <ArrowUpRight size={13} /></Link>}</div><header className={styles.pageHeading}><h1>{title}<span>.</span></h1></header></>;
}

function catalogProductMark(product?: PublicCatalogProduct, slug = product?.slug): ConfiguratorKind | undefined {
  if (product?.configurator) return product.configurator;
  if (isLinkerOfferKind(slug) || slug === "e-led" || slug === "e-disk" || slug === "e-disk-disc" || slug === "e-disk-bundle") return slug;
  for (const label of [slug, product?.name, product?.code]) {
    const key = label?.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (key === "elinker" || key === "elk") return "e-linker";
    if (key === "eled") return "e-led";
  }
}

export function CatalogArtwork({ product }: { product?: PublicCatalogProduct }) {
  const mark = catalogProductMark(product);
  const bundleSize = linkerBundleSize(mark);
  const theme = isLinkerOfferKind(mark) ? "e-linker" : mark;
  return <div className={`${styles.artwork} ${live.catalogArt}`} data-product={theme} data-illustrated={!!mark} aria-hidden="true">
    {bundleSize ? <LinkerBundleArtwork size={bundleSize} /> : mark ? <ProductMark product={mark} />
      : product?.image ? <img src={product.image.url} alt="" width={product.image.width} height={product.image.height} loading="lazy" referrerPolicy="no-referrer" />
      : <Package size={42} strokeWidth={.85} />}
  </div>;
}

export function CartProductArtwork({ product, personalization, slug }: {
  product?: PublicCatalogProduct;
  personalization?: Pick<PersonalizationSummary, "color" | "details">;
  slug?: string;
}) {
  const details = personalization?.details;
  const mark = details?.kind ?? catalogProductMark(product, product?.slug ?? slug);
  if (!mark) return <CatalogArtwork product={product} />;
  const bundleSize = linkerBundleSize(mark);
  const secondary = details && "secondaryColor" in details ? details.secondaryColor : undefined;

  return <div className={`${styles.artwork} ${styles.cartProductMark}`} aria-hidden="true">
    {bundleSize ? <LinkerBundleArtwork size={bundleSize} primary={personalization?.color} secondary={secondary} /> : <ProductMark
      product={mark}
      primary={personalization?.color}
      secondary={secondary}
    />}
  </div>;
}
export function ResourceFeedback({ error, busy = false, reload, next = "/account" }: { error: unknown; busy?: boolean; reload?: () => void; next?: string }) {
  if (busy) return <GhostLoading />;
  if (!error) return null;
  const login = error instanceof StorefrontError && error.status === 401;
  return <div className={live.feedback} role="alert"><h2>{login ? "Entra nel tuo spazio." : "Un momento, riproviamo."}</h2><p>{errorText(error)}</p>{login ? <div><Link href={loginHref(next)} className={live.primary} prefetch={false}>Accedi <ArrowUpRight size={17} /></Link><Link href="/account/register" prefetch={false}>Crea il tuo account</Link></div> : reload && <button type="button" className={live.secondary} onClick={reload}>Aggiorna</button>}</div>;
}
