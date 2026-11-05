import type { AtlasCommerceClient } from "./index.js";
export interface PublicCatalogMedia {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}
export interface PublicCatalogProduct {
  id: string;
  slug: string;
  code: string;
  name: string;
  kind: "physical" | "service";
  description: string;
  price: {
    currency: "EUR";
    unitAmountCents: number;
    taxMode: "inclusive" | "exclusive";
    unitNetCents: number;
    unitTaxCents: number;
    unitGrossCents: number;
    taxRateBasisPoints: number;
  };
  revision: number;
  fulfillmentModes: ("shipping" | "pickup" | "service")[];
  publishedAt: string;
  image?: PublicCatalogMedia;
}
export interface PublicProductPage extends PublicCatalogProduct {
  content: {
    title: string;
    summary: string;
    sections: { heading: string; text: string }[];
    media: PublicCatalogMedia[];
  };
}
export interface PublicCatalogList {
  items: PublicCatalogProduct[];
  nextCursor: string | null;
}
export function validatePublicCatalogProduct(
  value: unknown,
): PublicCatalogProduct;
export function validatePublicCatalogProduct(
  value: unknown,
  withContent: true,
): PublicProductPage;
export function validatePublicCatalogList(value: unknown): PublicCatalogList;
export function publicProductFromViews(
  catalog: unknown,
  page: unknown,
): PublicCatalogProduct;
export function publicProductFromViews(
  catalog: unknown,
  page: unknown,
  withContent: true,
): PublicProductPage;
export function parseCatalogQuery(url: string): {
  limit: number;
  cursor?: string;
};
export function createStorefrontCatalogHandlers(
  client: AtlasCommerceClient,
): Readonly<{
  catalog(request: Request): Promise<Response>;
  product(request: Request, id: string): Promise<Response>;
  productPage(request: Request, slug: string): Promise<Response>;
}>;
export function storefrontCatalogHandlersFromEnv(
  env: Record<string, string | undefined>,
): ReturnType<typeof createStorefrontCatalogHandlers>;
