export const linkerBundleSizes: readonly [10, 20, 50, 100, 500];
export type LinkerBundleSize = (typeof linkerBundleSizes)[number];
export type LinkerOfferKind = "e-linker" | `e-linker-bundle-${LinkerBundleSize}`;
export const linkerOfferKinds: readonly ["e-linker", ...Exclude<LinkerOfferKind, "e-linker">[]];
export function linkerOfferKind(size: 1 | LinkerBundleSize): LinkerOfferKind;
export function isLinkerOfferKind(kind: unknown): kind is LinkerOfferKind;
export function linkerBundleSize(kind: unknown): LinkerBundleSize | undefined;
