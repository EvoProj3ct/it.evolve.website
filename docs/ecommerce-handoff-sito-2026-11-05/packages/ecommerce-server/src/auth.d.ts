import type { Mongoose } from "mongoose";
import type { StorefrontPrincipal } from "./index.js";
export type { StorefrontPrincipal } from "./index.js";
export interface StorefrontAccount {
  id: string;
  email: string;
  name: string;
  kind: "individual" | "company";
  phone?: string;
  emailVerified: true;
}
export type StorefrontAuthAction =
  | "csrf"
  | "register"
  | "verify-email"
  | "resend-verification"
  | "login"
  | "logout"
  | "logout-all"
  | "forgot-password"
  | "reset-password"
  | "change-password"
  | "change-email"
  | "confirm-email";
export function createStorefrontAuth(options: {
  mongoose: Mongoose;
  env?: Record<string, string | undefined>;
}): Readonly<{
  handleAuth(request: Request, action: string): Promise<Response>;
  handleProfile(request: Request): Promise<Response>;
  authenticate(
    request: Request,
    options?: { rateLimit?: "read" | "customer-link" },
  ): Promise<StorefrontPrincipal>;
  assertMutation(request: Request): void;
  prepareCommerceRequest(
    request: Request,
    path: string,
    input?: Record<string, unknown>,
  ): Promise<Readonly<{ payload: Record<string, unknown>; assertion: string }>>;
  handleMailDelivery(request: Request): Promise<Response>;
}>;
