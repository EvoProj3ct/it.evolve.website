import type { PublicQuote } from "../checkout/types";
export interface CommerceOrderSummary {
  id: string;
  number: string;
  revision: number;
  placedAt: string;
  operationalStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totals: PublicQuote["totals"];
  payment?: {
    paidMinor: number;
    refundedMinor: number;
    paidAt?: string;
    method?: string;
    requiresReview: boolean;
  };
}
export interface CommerceOrder extends CommerceOrderSummary {
  lines: (PublicQuote["lines"][number] & {
    productPublicId: string;
    listingRevision: number;
  })[];
  billing: PublicQuote["billing"];
  shipping?: PublicQuote["shipping"];
  fulfillmentSelections: PublicQuote["fulfillmentSelections"];
  termsVersion: string;
  fulfillment: {
    lineId: string;
    state: string;
    fulfilledQuantity: number;
    shippedQuantity: number;
  }[];
}
export interface StaffOrderList {
  items: (CommerceOrderSummary & { name: string; email: string })[];
  nextCursor: string | null;
}
export interface StaffOrderDetails {
  order: CommerceOrder;
  customerId: string;
  revenue: null | {
    id: string;
    status: string;
    category: string;
    variant: string;
    expectedTotals: PublicQuote["totals"];
    requiresReview: boolean;
  };
  accounting: { lineId: string; category: string; variant: string }[];
  events: { action: string; occurredAt: string }[];
}
