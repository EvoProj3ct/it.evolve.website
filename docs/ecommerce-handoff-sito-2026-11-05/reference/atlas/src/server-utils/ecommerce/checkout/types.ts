import type {
  MoneyTotals,
  PriceSnapshot,
} from "@evolve/ecommerce-server/persistence";
export interface CheckoutPolicyForm {
  publicId: string | null;
  revision: number | null;
  enabled: boolean;
  termsVersion: string;
  countries: string[];
  maxLines: number;
  maxQuantity: number;
  maxGross: string;
  quoteTtlMinutes: number;
  requireIndividualTaxCode: boolean;
  requireCompanyVat: boolean;
  mixedRevenueCategory: string;
  mixedRevenueVariant: string;
  options: {
    publicId: string | null;
    enabled: boolean;
    mode: "shipping" | "pickup" | "service";
    label: string;
    details: string;
    countries: string[];
    amount: string;
    taxMode: "inclusive" | "exclusive" | "";
    taxRate: string;
    revenueCategory: string;
    revenueVariant: string;
  }[];
}
export interface StaffCartList {
  items: {
    id: string;
    name: string;
    email: string;
    status: "active" | "expired" | "converted";
    revision: number;
    lines: number;
    units: number;
    expiresAt: string;
  }[];
  nextCursor: string | null;
}
export interface CartPreview {
  id: string | null;
  convertedOrderPublicId?: string;
  revision: number;
  status: string;
  expiresAt: string | null;
  requiresReview: boolean;
  previewTotals: MoneyTotals | null;
  items: {
    productPublicId: string;
    listingRevision: number | null;
    currentListingRevision?: number;
    title?: string;
    code?: string;
    kind?: string;
    quantity: number;
    state: string;
    price?: PriceSnapshot;
    totals?: MoneyTotals;
  }[];
}
export interface PublicQuote {
  id: string;
  cartPublicId: string;
  cartRevision: number;
  policyRevision: number;
  termsVersion: string;
  createdAt: string;
  expiresAt: string;
  lines: {
    lineId: string;
    title: string;
    code: string;
    kind: string;
    quantity: number;
    price: PriceSnapshot;
    totals: MoneyTotals;
  }[];
  totals: MoneyTotals;
  billing: {
    name: string;
    email: string;
    kind: string;
    taxCode?: string;
    vatNumber?: string;
    recipientCode?: string;
    certifiedEmail?: string;
    address: DeliveryAddress;
  };
  shipping?: DeliveryAddress;
  fulfillmentSelections: {
    optionPublicId: string;
    mode: string;
    label: string;
    details: string;
    price: PriceSnapshot;
  }[];
}
export interface DeliveryAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  region?: string;
  country: string;
}
export interface StaffCartDetails {
  cart: CartPreview;
  owner: { name: string; email: string };
  quotes: (PublicQuote & { status: string })[];
}
