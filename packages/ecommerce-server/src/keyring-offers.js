export const linkerBundleSizes = Object.freeze([10, 20, 50, 100, 500]);

export function linkerOfferKind(size) {
  return size === 1 ? "e-linker" : `e-linker-bundle-${size}`;
}

export const linkerOfferKinds = Object.freeze(["e-linker", ...linkerBundleSizes.map(linkerOfferKind)]);

export function isLinkerOfferKind(kind) {
  return linkerOfferKinds.includes(kind);
}

export function linkerBundleSize(kind) {
  return linkerBundleSizes.find(size => linkerOfferKind(size) === kind);
}
