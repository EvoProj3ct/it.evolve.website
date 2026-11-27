import type { NextConfig } from "next";
import { E_DISK_VISIBLE } from "./src/lib/ecommerce/product-visibility";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    if (E_DISK_VISIBLE) return [];
    return ["/shop/e-disk/:path*", "/utils/e-disk/:path*", "/shop/brand/e-disk.svg"].map(source => ({
      source,
      destination: "/negozio",
      permanent: false,
    }));
  },
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; form-action 'self'; base-uri 'self'" },
    ];
    return ["/account/:path*", "/shop/profilo", "/shop/carrello", "/shop/checkout", "/carrello", "/checkout"].map(source => ({ source, headers: privateHeaders }));
  },
};

export default nextConfig;
