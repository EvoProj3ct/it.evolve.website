export const keyringShapeNames = Object.freeze({
  rectangle: "Rettangolo", square: "Quadrato", circle: "Cerchio", triangle: "Triangolo",
  ellipse: "Ellisse", heart: "Cuore", star: "Stella", cube: "Cubetto",
});
export const keyringShapes = Object.freeze(Object.keys(keyringShapeNames));
export const keyringTextSizes = Object.freeze(["small", "medium", "large"]);
export const keyringTextOrientations = Object.freeze(["horizontal", "vertical"]);
export const keyringTextSizeNames = Object.freeze({ small: "Piccola", medium: "Media", large: "Grande" });
export const keyringTextOrientationNames = Object.freeze({ horizontal: "Orizzontale", vertical: "Verticale" });
export const defaultKeyringLettering = Object.freeze({ size: "medium", orientation: "horizontal", x: 0, y: 0 });

const option = (id, label, x, y) => ({ id, label, x, y });
const sides = [
  option("top", "Centro in alto", 0, 1), option("right", "Centro a destra", 1, 0),
  option("bottom", "Centro in basso", 0, -1), option("left", "Centro a sinistra", -1, 0),
];
const corners = (x, y) => [
  option("top-right", "Angolo in alto a destra", x, y), option("top-left", "Angolo in alto a sinistra", -x, y),
  option("bottom-right", "Angolo in basso a destra", x, -y), option("bottom-left", "Angolo in basso a sinistra", -x, -y),
];
const starAngles = Array.from({ length: 10 }, (_, index) => Math.PI / 2 - index * Math.PI / 5);
export const keyringStarPoints = Object.freeze(starAngles.map((angle, index) => {
  const radius = index % 2 === 0 ? 1.95 : 1.02;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}));
const starHoles = keyringStarPoints.filter((_, index) => index % 2 === 0)
  .map(({ x, y }, index) => option(`point-${index + 1}`, `Punta ${index + 1}`, x, y))
  .concat(keyringStarPoints.map(({ x, y }, index) => {
    const next = keyringStarPoints[(index + 1) % keyringStarPoints.length];
    return option(`edge-${index + 1}`, `Metà lato ${index + 1}`, x + next.x, y + next.y);
  }));
const holes = {
  rectangle: [...corners(1.9, 1.325), ...sides],
  square: [...corners(1, 1), ...sides],
  circle: sides,
  triangle: [
    option("top-point", "Punta in alto", 0, 1), option("bottom-right", "Angolo in basso a destra", 1.86, -1.38),
    option("bottom-left", "Angolo in basso a sinistra", -1.86, -1.38), sides[2],
    option("upper-left-edge", "Metà lato sinistro", -.93, .24), option("upper-right-edge", "Metà lato destro", .93, .24),
  ],
  ellipse: sides,
  heart: [
    option("curve-right", "Curva in alto a destra", 1, .82), option("curve-left", "Curva in alto a sinistra", -1, .82),
    option("bottom-point", "Punta in basso", 0, -1), sides[1], sides[3],
  ],
  star: starHoles,
  cube: [...corners(1, 1), ...sides],
};
export function keyringHoleOptions(shape) { return holes[shape]; }
export function keyringHoleName(shape, id) { return holes[shape].find(option => option.id === id)?.label; }
export const keyringHoleIds = Object.freeze([...new Set(Object.values(holes).flatMap(options => options.map(option => option.id)))]);

const limits = {
  rectangle: [[18, 15, 10], [10, 7, 5]], square: [[16, 12, 8], [11, 8, 5]],
  circle: [[14, 10, 7], [10, 7, 5]], triangle: [[12, 8, 5], [7, 5, 3]],
  ellipse: [[17, 12, 8], [8, 6, 4]], heart: [[13, 9, 6], [8, 6, 4]],
  star: [[10, 7, 5], [7, 5, 3]], cube: [[12, 9, 6], [10, 7, 5]],
};
export function keyringTextLimit(shape, orientation, size) {
  return limits[shape][orientation === "vertical" ? 1 : 0][keyringTextSizes.indexOf(size)];
}
export const keyringLetteringPattern = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .!?&+@#'_-]+$/u;
export function cleanKeyringLettering(text) {
  return text.normalize("NFC").replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 .!?&+@#'_-]/gu, "");
}

export function keyringDesignLabels(shape, inscription, details) {
  const faceLabel = (label, text, style) => text && `${label} «${text}»${style ? ` · ${keyringTextOrientationNames[style.orientation].toLowerCase()}, ${keyringTextSizeNames[style.size].toLowerCase()}` : ""}`;
  const hole = details.hole && keyringHoleName(shape, details.hole);
  return [
    keyringShapeNames[shape],
    hole && `Foro · ${hole}`,
    faceLabel("Fronte", inscription, details.front),
    faceLabel("Retro", details.back?.text, details.back),
  ].filter(Boolean);
}
