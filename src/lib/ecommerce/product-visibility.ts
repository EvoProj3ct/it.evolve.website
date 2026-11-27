// Enable this when e-disk and its offers are ready for the storefront.
export const E_DISK_VISIBLE = false;

const shopProductIds = ["e-disk", "e-linker", "e-led"] as const;
export type ProductId = (typeof shopProductIds)[number];
export const visibleShopProducts = shopProductIds.filter(id => E_DISK_VISIBLE || id !== "e-disk");

export function isEDiskReference(value?: string) {
  return typeof value === "string" && /(?:^|[\s._\u2010-\u2015-])e[\s._\u2010-\u2015-]*disk(?:$|[\s._\u2010-\u2015-])/i.test(value);
}

export function isStorefrontProductVisible(product: { configurator?: string; slug?: string; code?: string; name?: string }) {
  return E_DISK_VISIBLE || ![product.configurator, product.slug, product.code, product.name].some(isEDiskReference);
}
