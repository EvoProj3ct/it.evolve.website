import "server-only";
import { storefrontCustomerHandlersFromEnv } from "@evolve/ecommerce-server/customers";
import { storefrontAuth } from "./storefront-auth";
export const storefrontCustomers = storefrontCustomerHandlersFromEnv({ auth: storefrontAuth, env: process.env });
