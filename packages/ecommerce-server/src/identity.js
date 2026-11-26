if (typeof window !== "undefined") throw new Error("ECOMMERCE_SERVER_ONLY");

export { CommerceServiceError } from "./errors.js";
export {
  readVercelTrustPolicy,
  readStorefrontDatabaseConfig,
} from "./config.js";
export { verifyVercelServiceIdentity } from "./workload.js";
export {
  commerceJson,
  commerceErrorResponse,
  commerceRequestId,
  assertServerToServerRequest,
} from "./http.js";
export {
  STOREFRONT_COLLECTIONS,
  assertStorefrontCollectionAccess,
} from "./collections.js";
