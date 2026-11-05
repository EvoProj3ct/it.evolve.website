import { internalCustomerLinkHandler } from "@/server-utils/ecommerce/customers/internal-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request) {
  return internalCustomerLinkHandler(request);
}
