import "server-only";
import { storefrontCatalogHandlersFromEnv } from "@evolve/ecommerce-server/catalog";
export const storefrontCatalog = storefrontCatalogHandlersFromEnv(process.env);
