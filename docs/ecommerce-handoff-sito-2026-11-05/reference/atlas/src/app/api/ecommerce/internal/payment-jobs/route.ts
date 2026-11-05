import { paymentJobsHandler } from "@/server-utils/ecommerce/payments/jobs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  return paymentJobsHandler(request);
}
