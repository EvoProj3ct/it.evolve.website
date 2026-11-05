import type {
  PublicCatalogProduct,
  PublicProductPage,
} from "@evolve/ecommerce-server/catalog";

export interface CatalogDraftInput {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; text: string }[];
  media: {
    publicId: string;
    url: string;
    alt: string;
    width: number;
    height: number;
  }[];
  priceSource: "source" | "online_override";
  onlinePrice: string;
  taxMode: "inclusive" | "exclusive";
  taxRate: string;
  fulfillmentModes: ("shipping" | "pickup" | "service")[];
  revenueCategory:
    | "stampa3d"
    | "consulenza"
    | "sviluppoSoftware"
    | "atlas"
    | "altro";
  revenueVariant: string;
}
export interface CatalogSource {
  id: string;
  name: string;
  code: string;
  kind: "physical" | "service" | null;
  sourcePrice: string | null;
  hash: string;
}
export interface CatalogEditorRecord {
  id: string;
  version: number;
  enabled: boolean;
  publishedRevision: number | null;
  source: CatalogSource | null;
  sourceChanged: boolean;
  draft: CatalogDraftInput | null;
  published: PublicProductPage | null;
}
export interface CatalogListItem {
  id: string;
  productName: string;
  code: string;
  version: number;
  enabled: boolean;
  hasDraft: boolean;
  draftChanged: boolean;
  sourceChanged: boolean;
}
export interface CatalogList {
  items: CatalogListItem[];
  nextCursor: string | null;
}
export type { PublicCatalogProduct, PublicProductPage };
