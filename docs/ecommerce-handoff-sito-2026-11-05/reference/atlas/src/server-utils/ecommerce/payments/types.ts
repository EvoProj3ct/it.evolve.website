export interface CustomerPaymentStatus {
  orderPublicId: string;
  orderRevision: number;
  paymentStatus: string;
  attempt: null | { id: string; state: string; expiresAt: string | null };
  paidMinor: number;
  refundedMinor: number;
  checkoutUrl: string | null;
}
export interface StaffPaymentAttempt {
  id: string;
  orderPublicId: string;
  orderNumber: string;
  orderRevision: number;
  name: string;
  state: string;
  active: boolean;
  amountMinor: number;
  refundedMinor: number;
  mode: string;
  method: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  nextReconcileAt: string | null;
  reviewCode: string | null;
  lastErrorCode: string | null;
  providerSessionId: string | null;
  providerPaymentId: string | null;
}
export interface StaffPaymentsPage {
  items: StaffPaymentAttempt[];
  nextCursor: string | null;
}
export interface StaffPaymentDetails {
  paymentPosted: boolean;
  attempt: StaffPaymentAttempt;
  paymentStatus: string;
  operationalStatus: string;
  refunds: {
    id: string;
    amountMinor: number;
    state: string;
    reason: string;
    createdAt: string;
    reviewCode: string | null;
  }[];
  adjustments: {
    id: string;
    amountMinor: number;
    netMinor: number;
    taxMinor: number;
    confirmedAt: string;
  }[];
  failedEvents: number;
}
