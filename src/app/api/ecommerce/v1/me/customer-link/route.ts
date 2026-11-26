import { storefrontCustomers } from "@/server/storefront-customers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = (request: Request) => storefrontCustomers.handle(request);
export const POST = GET;

