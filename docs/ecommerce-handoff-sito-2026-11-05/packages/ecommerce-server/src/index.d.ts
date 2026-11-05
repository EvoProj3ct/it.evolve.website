export interface VercelTrustPolicy {
  readonly issuer: string;
  readonly audience: string;
  readonly subject: string;
  readonly environment: string;
  readonly projectId: string;
  readonly ownerId: string;
  readonly shopId: string;
}
export interface CommerceServicePrincipal {
  readonly kind: "service";
  readonly service: "storefront-site";
  readonly shopId: string;
  readonly projectId: string;
  readonly environment: string;
}
export interface StorefrontPrincipal {
  readonly kind: "storefront";
  readonly shopId: string;
  readonly accountId: string;
  readonly sessionId: string;
  readonly publicId: string;
  readonly credentialVersion: number;
  readonly accessVersion: number;
}
export class CommerceServiceError extends Error {
  constructor(status: number, code: string, message: string);
  readonly status: number;
  readonly code: string;
}
export function readVercelTrustPolicy(
  env: Record<string, string | undefined>,
  options?: { audienceVariable?: string; callerPrefix?: string },
): VercelTrustPolicy;
export function readStorefrontDatabaseConfig(
  env: Record<string, string | undefined>,
): Readonly<{ uri: string; dbName: string }>;
export function verifyVercelServiceIdentity(
  authorization: string | null | undefined,
  policy: VercelTrustPolicy,
): Promise<CommerceServicePrincipal>;
export function commerceRequestId(): string;
export function commerceJson(
  data: unknown,
  options?: {
    status?: number;
    requestId?: string;
    headers?: Record<string, string>;
  },
): Response;
export function commerceErrorResponse(
  error: unknown,
  requestId?: string,
): Response;
export function assertServerToServerRequest(request: Request): void;
export interface AtlasCommerceClient {
  customerLink(
    principal: StorefrontPrincipal,
    options?: { resolve?: boolean },
  ): Promise<import("./customers.js").PublicCustomerLink>;
  reconcileCustomers(): Promise<
    import("./customers.js").CustomerReconciliationResult
  >;
  catalog(options?: {
    limit?: number;
    cursor?: string;
  }): Promise<import("./catalog.js").PublicCatalogList>;
  product(id: string): Promise<import("./catalog.js").PublicCatalogProduct>;
  productPage(slug: string): Promise<import("./catalog.js").PublicProductPage>;
  probe(): Promise<
    Readonly<{ service: "atlas-ecommerce-internal"; status: "ok"; version: 1 }>
  >;
}
export function createAtlasCommerceClient(options: {
  origin: string;
  audience?: string;
  timeoutMs?: number;
  protectionBypassSecret?: string;
}): AtlasCommerceClient;
export function atlasCommerceClientFromEnv(
  env: Record<string, string | undefined>,
): AtlasCommerceClient;
export const STOREFRONT_COLLECTIONS: Readonly<
  Record<
    | "accounts"
    | "accountProfiles"
    | "accountAccess"
    | "authStates"
    | "sessionAccess"
    | "sessions"
    | "authTokens"
    | "registrationProfiles"
    | "authRateLimits"
    | "authDeliveries"
    | "authAudit"
    | "identityEvents"
    | "carts"
    | "commandInbox"
    | "commandReceipts"
    | "catalogViews"
    | "productPageViews"
    | "orderViews"
    | "trackingViews"
    | "operationViews",
    string
  >
>;
export function assertStorefrontCollectionAccess(
  collection: string,
  operation: "find" | "insert" | "update" | "delete",
): void;
