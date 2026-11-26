if (typeof window !== "undefined") throw new Error("ECOMMERCE_SERVER_ONLY");

export {
  createAtlasCommerceClient,
  atlasCommerceClientFromEnv,
} from "./client.js";
export { CommerceServiceError } from "./errors.js";
