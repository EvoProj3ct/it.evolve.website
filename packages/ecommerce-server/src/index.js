if (typeof window !== "undefined") {
  throw new Error("ECOMMERCE_SERVER_ONLY");
}

export * from "./identity.js";
export {
  createAtlasCommerceClient,
  atlasCommerceClientFromEnv,
} from "./client.js";
