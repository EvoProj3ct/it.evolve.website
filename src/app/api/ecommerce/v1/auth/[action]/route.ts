import { handleStorefrontAuth } from "@/server/storefront-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, { params }: Context) { return handleStorefrontAuth(request, (await params).action); }
export async function POST(request: Request, { params }: Context) { return handleStorefrontAuth(request, (await params).action); }

