import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { AppRole } from "@/types/roles";

const PUBLIC_PATHS = [
  "/auth/sign-in",
  "/login",
  "/invito",
  "/activate",
  "/nfc/access",
  "/api/auth",
  "/api/invitations/consume",
  "/api/auth/set-password",
  "/api/meta-whatsapp-webhook",
  "/api/twilio-webhook",
];

function deny(req: NextRequest, to = "/auth/sign-in") {
  const url = req.nextUrl.clone();
  url.pathname = to;
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Exact exceptions: each handler verifies OIDC, provider signature or the dedicated
  // worker credential. No namespace-wide bypass and no storefront/staff cookie fallback.
  if (
    pathname === "/api/ecommerce/webhooks/stripe" ||
    pathname === "/api/ecommerce/internal/payment-jobs" ||
    /^\/api\/ecommerce\/internal\/orders\/[A-Za-z0-9_-]{16,80}\/(?:tracking|timeline|deliveries\/[A-Za-z0-9_-]{16,80})$/.test(
      pathname,
    ) ||
    /^\/api\/ecommerce\/internal\/orders\/[A-Za-z0-9_-]{16,80}\/(?:payment-session|payment-status)$/.test(
      pathname,
    ) ||
    pathname === "/api/ecommerce/internal/health" ||
    pathname === "/api/ecommerce/internal/customer-link" ||
    pathname === "/api/ecommerce/internal/customer-identities/reconcile" ||
    [
      "/api/ecommerce/internal/cart",
      "/api/ecommerce/internal/cart/items",
      "/api/ecommerce/internal/checkout-options",
      "/api/ecommerce/internal/quotes",
      "/api/ecommerce/internal/orders",
      "/api/ecommerce/internal/orders/place",
    ].includes(pathname) ||
    /^\/api\/ecommerce\/internal\/orders\/[A-Za-z0-9_-]{16,80}$/.test(
      pathname,
    ) ||
    /^\/api\/ecommerce\/internal\/quotes\/[A-Za-z0-9_-]{16,80}$/.test(
      pathname,
    ) ||
    pathname === "/api/ecommerce/internal/catalog" ||
    /^\/api\/ecommerce\/internal\/catalog\/[A-Za-z0-9_-]{16,80}$/.test(
      pathname,
    ) ||
    (/^\/api\/ecommerce\/internal\/product-pages\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      pathname,
    ) &&
      pathname.length <= 200)
  ) {
    return NextResponse.next();
  }

  // ✅ pubbliche
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 🔒 protezione standard (vale per Pagine e API)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token?.role ?? "") as AppRole | "";

  if (!token) {
    // Staff APIs return JSON instead of redirecting a fetch to the login HTML.
    // A valid token still needs the route's live User/approval/capability check.
    if (
      pathname === "/api/ecommerce/staff" ||
      pathname.startsWith("/api/ecommerce/staff/")
    ) {
      const requestId = crypto.randomUUID();
      return NextResponse.json(
        {
          error: {
            code: "STAFF_AUTH_REQUIRED",
            message: "Accesso Atlas richiesto.",
            requestId,
          },
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Request-Id": requestId,
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Content-Security-Policy":
              "default-src 'none'; frame-ancestors 'none'",
          },
        },
      );
    }
    return deny(req, "/auth/sign-in");
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "Super" && role !== "Amministrazione") {
      return NextResponse.rewrite(new URL("/403", req.url));
    }
  }

  const response = NextResponse.next();
  if (
    /^\/api\/(?:eventi\/(?:consegna_ecommerce|avanzamento_ecommerce)|anagrafiche\/consegne-ecommerce)(?:\/|$)/.test(
      pathname,
    )
  ) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
