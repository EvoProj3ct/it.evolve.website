import { storefrontCustomers } from "@/server/storefront-customers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const POST = (request: Request) => storefrontCustomers.handleReconciliation(request);

