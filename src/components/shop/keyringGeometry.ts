import { defaultKeyringLettering, type KeyringFont, type KeyringLettering, type KeyringShape } from "@evolve/ecommerce-server/keyring-design";
export { keyringDepth, keyringHoleRadius, keyringHoles, keyringOutline } from "@evolve/ecommerce-server/keyring-design";

const letteringAreas: Record<KeyringShape, readonly [width: number, height: number, centerY: number]> = {
  rectangle: [2.55, 1.45, 0], square: [2.08, 1.85, 0], circle: [1.92, 1.67, 0],
  triangle: [1.45, .78, -.45], ellipse: [2.65, 1.18, 0], heart: [1.73, 1.06, -.18],
  star: [1.14, .78, -.015], hexagon: [1.78, 1.48, 0], cube: [1.65, 1.52, 0],
};
const letteringHeights = { small: .22, medium: .34, large: .48 };
export const keyringLetterSpacing = -.015;
export const keyringLetterStackStep = .94;
export type KeyringTypeface = KeyringFont | "bold";

export function keyringTypeface(lettering: KeyringLettering): KeyringTypeface {
  return lettering.relief === "raised" ? "bold" : lettering.font ?? defaultKeyringLettering.font;
}

export function keyringLetteringLayout(shape: KeyringShape, lettering: KeyringLettering, text: string, hasLogo = false) {
  const [areaWidth, fullHeight, areaCenter] = letteringAreas[shape];
  const areaHeight = fullHeight * (hasLogo ? .45 : 1);
  const centerY = areaCenter - (fullHeight - areaHeight) / 2;
  const unit = lettering.relief === "raised" ? .62 : letteringHeights[lettering.size];
  const vertical = lettering.orientation === "vertical";
  const followsLongSide = vertical && (shape === "rectangle" || shape === "ellipse");
  const width = Math.min(followsLongSide ? areaHeight : areaWidth, vertical ? unit * 1.35 : Math.max(unit, text.length * unit * .84));
  const height = Math.min(followsLongSide ? areaWidth : areaHeight, vertical ? Math.max(unit, text.length * unit * 1.32) : unit);
  const travelX = (areaWidth - (followsLongSide ? height : width)) / 2;
  const travelY = (areaHeight - (followsLongSide ? width : height)) / 2;
  const rotation = followsLongSide ? -Math.PI / 2 : 0;
  return { x: travelX * lettering.x / 100, y: centerY + travelY * lettering.y / 100, width, height, rotation, centerY, travelX, travelY };
}

export function keyringLogoLayout(shape: KeyringShape, hasText: boolean) {
  const [width, height, centerY] = letteringAreas[shape];
  return { width: width * .86, height: height * (hasText ? .51 : .9), y: centerY + (hasText ? height * .24 : 0) };
}
