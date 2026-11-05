import type { createStorefrontAuth } from "./auth.js";
export interface PublicCustomerLink {
  status: "pending" | "linked" | "review_required" | "blocked";
  checkoutReady: boolean;
  message: string;
}
export interface CustomerReconciliationResult {
  planned: number;
  processed: number;
  deferred: number;
  failed: number;
}
export function storefrontCustomerHandlersFromEnv(options: {
  auth: ReturnType<typeof createStorefrontAuth>;
  env?: Record<string, string | undefined>;
}): Readonly<{
  handle(request: Request): Promise<Response>;
  handleReconciliation(request: Request): Promise<Response>;
}>;
