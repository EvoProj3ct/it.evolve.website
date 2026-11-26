import "server-only";
import { createTrackingClient } from "@evolve/ecommerce-server/tracking";
import { storefrontAuth } from "./storefront-auth";
export const trackingClient = () => createTrackingClient({ auth: storefrontAuth, env: process.env });
