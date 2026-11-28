export const keyringShapeNames = Object.freeze({
  rectangle: "Rettangolo", square: "Quadrato", circle: "Cerchio", triangle: "Triangolo",
  ellipse: "Ellisse", heart: "Cuore", star: "Stella", hexagon: "Esagono", cube: "Cubetto",
});
export const keyringShapes = Object.freeze(Object.keys(keyringShapeNames));
export const keyringTextSizes = Object.freeze(["small", "medium", "large"]);
export const keyringTextOrientations = Object.freeze(["horizontal", "vertical"]);
export const keyringTextSizeNames = Object.freeze({ small: "Piccola", medium: "Media", large: "Grande" });
export const keyringTextOrientationNames = Object.freeze({ horizontal: "Orizzontale", vertical: "Verticale" });
export const keyringReliefNames = Object.freeze({ flat: "Al piano", raised: "Altorilievo", recessed: "Bassorilievo" });
export const keyringReliefs = Object.freeze(Object.keys(keyringReliefNames));
export const keyringFontNames = Object.freeze({
  helvetica: "Helvetica", rounded: "Helvetica Rounded", condensed: "Helvetica Compressa", inter: "Inter", mono: "Geist Mono",
});
export const keyringFonts = Object.freeze(Object.keys(keyringFontNames));
export const keyringRaisedFontName = "Helvetica Bold";
export const keyringSymbolNames = Object.freeze({
  star: "Stella", smile: "Smile", thumb: "Pollice in su", arcade: "Mangiapunti arcade",
  ghost: "Fantasmino", heart: "Cuore · Mi piace", instagram: "Instagram", nfc: "NFC",
  linkedin: "LinkedIn", user: "Profilo", link: "Collegamento",
});
export const keyringSymbolKinds = Object.freeze(Object.keys(keyringSymbolNames));
export const keyringSymbolModeNames = Object.freeze({ outline: "Contorno", fill: "Riempimento", cut: "Formina" });
export const keyringSymbolModes = Object.freeze(Object.keys(keyringSymbolModeNames));
export const keyringSymbolFaces = Object.freeze(["front", "back"]);
export const keyringSymbolLimit = 4;
export const keyringSymbolWidths = Object.freeze({ small: .43, medium: .61, large: .81 });
export const keyringSymbolRadius = (size) => keyringSymbolWidths[size] * .63 + .02;
export const defaultKeyringLettering = Object.freeze({ size: "medium", orientation: "horizontal", relief: "flat", font: "helvetica", x: 0, y: 0 });
const availableSizes = Object.freeze({
  flat: keyringTextSizes, raised: Object.freeze(["large"]), recessed: Object.freeze(["small", "medium"]),
});
export const keyringSizesForRelief = (relief = defaultKeyringLettering.relief) => availableSizes[relief];

const option = (id, label, x, y) => ({ id, label, x, y });
const sides = [
  option("top", "Centro in alto", 0, 1), option("right", "Centro a destra", 1, 0),
  option("bottom", "Centro in basso", 0, -1), option("left", "Centro a sinistra", -1, 0),
];
const corners = (x, y) => [
  option("top-right", "Angolo in alto a destra", x, y), option("top-left", "Angolo in alto a sinistra", -x, y),
  option("bottom-right", "Angolo in basso a destra", x, -y), option("bottom-left", "Angolo in basso a sinistra", -x, -y),
];
const polygonSideHoles = points => points.map(({ x, y }, index) => {
  const next = points[(index + 1) % points.length];
  return option(`edge-${index + 1}`, `Metà lato ${index + 1}`, x + next.x, y + next.y);
});
const starAngles = Array.from({ length: 10 }, (_, index) => Math.PI / 2 - index * Math.PI / 5);
export const keyringStarPoints = Object.freeze(starAngles.map((angle, index) => {
  const radius = index % 2 === 0 ? 1.95 : 1.02;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}));
const starHoles = keyringStarPoints.filter((_, index) => index % 2 === 0)
  .map(({ x, y }, index) => option(`point-${index + 1}`, `Punta ${index + 1}`, x, y))
  .concat(polygonSideHoles(keyringStarPoints));
export const keyringHexagonPoints = Object.freeze(Array.from({ length: 6 }, (_, index) => {
  const angle = (1 - index) * Math.PI / 3;
  return { x: Math.cos(angle) * 1.84, y: Math.sin(angle) * 1.84 };
}));
const hexagonHoles = keyringHexagonPoints
  .map(({ x, y }, index) => option(`corner-${index + 1}`, `Angolo ${index + 1}`, x, y))
  .concat(polygonSideHoles(keyringHexagonPoints));
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
  hexagon: hexagonHoles,
  cube: [...corners(1, 1), ...sides],
};
export function keyringHoleOptions(shape) { return holes[shape]; }
export function keyringHoleName(shape, id) { return holes[shape].find(option => option.id === id)?.label; }
export const keyringHoleIds = Object.freeze([...new Set(Object.values(holes).flatMap(options => options.map(option => option.id)))]);

export const keyringHoleRadius = .16;
const holeInset = .32;
const outlineCache = new Map();
const mix = (from, to, fraction) => ({
  x: from.x + (to.x - from.x) * fraction,
  y: from.y + (to.y - from.y) * fraction,
});

function roundedPolygon(points, radius) {
  return points.flatMap((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const start = mix(point, previous, radius / Math.hypot(point.x - previous.x, point.y - previous.y));
    const end = mix(point, next, radius / Math.hypot(point.x - next.x, point.y - next.y));
    return Array.from({ length: 9 }, (_, step) => {
      const t = step / 8;
      return mix(mix(start, point, t), mix(point, end, t), t);
    });
  });
}

function heartOutline() {
  const curves = [
    [{ x: .13, y: .72 }, { x: .42, y: 1.37 }, { x: .92, y: 1.37 }],
    [{ x: 1.44, y: 1.37 }, { x: 1.86, y: 1.04 }, { x: 1.86, y: .55 }],
    [{ x: 1.86, y: -.09 }, { x: 1.1, y: -.66 }, { x: .09, y: -1.32 }],
    [{ x: .052, y: -1.345 }, { x: .028, y: -1.36 }, { x: 0, y: -1.36 }],
  ];
  let start = { x: 0, y: .72 };
  const rightSide = [start];
  for (const [first, second, end] of curves) {
    for (let step = 1; step <= 12; step++) {
      const t = step / 12;
      const middle = mix(first, second, t);
      const nearStart = mix(mix(start, first, t), middle, t);
      const nearEnd = mix(middle, mix(second, end, t), t);
      rightSide.push(mix(nearStart, nearEnd, t));
    }
    start = end;
  }
  return rightSide.concat(rightSide.slice(1, -1).reverse().map(({ x, y }) => ({ x: -x, y })));
}

export function keyringOutline(shape) {
  const cached = outlineCache.get(shape);
  if (cached) return cached;
  let points;
  if (shape === "heart") {
    points = heartOutline();
  } else if (shape === "circle" || shape === "ellipse") {
    points = Array.from({ length: 80 }, (_, index) => {
      const angle = index * Math.PI / 40;
      return { x: (shape === "ellipse" ? 2 : 1.8) * Math.cos(angle), y: (shape === "ellipse" ? 1.24 : 1.8) * Math.sin(angle) };
    });
  } else if (shape === "triangle") {
    points = roundedPolygon([{ x: 0, y: 1.92 }, { x: -1.91, y: -1.38 }, { x: 1.91, y: -1.38 }], .22);
  } else if (shape === "star") {
    points = roundedPolygon(keyringStarPoints, .135);
  } else if (shape === "hexagon") {
    points = roundedPolygon(keyringHexagonPoints, .19);
  } else {
    const x = shape === "rectangle" ? 1.9 : shape === "cube" ? 1.325 : 1.6;
    const y = shape === "square" ? 1.6 : 1.325;
    points = roundedPolygon([{ x: -x, y: -y }, { x, y: -y }, { x, y }, { x: -x, y }], shape === "cube" ? .21 : .4);
  }
  outlineCache.set(shape, points);
  return points;
}

export const keyringDepth = (shape) => shape === "cube" ? 2.65 : .13;
const cross = (ax, ay, bx, by) => ax * by - ay * bx;
const holeCache = new Map();

function createHolePositions(shape) {
  const points = keyringOutline(shape);
  const edges = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return { ...point, dx: next.x - point.x, dy: next.y - point.y };
  });
  return keyringHoleOptions(shape).map(option => {
    const length = Math.hypot(option.x, option.y);
    const dx = option.x / length, dy = option.y / length;
    let edgeDistance = Infinity;
    for (const edge of edges) {
      const determinant = cross(dx, dy, edge.dx, edge.dy);
      if (Math.abs(determinant) < 1e-9) continue;
      const distance = cross(edge.x, edge.y, edge.dx, edge.dy) / determinant;
      const along = cross(edge.x, edge.y, dx, dy) / determinant;
      if (distance > 0 && along >= -1e-8 && along <= 1 + 1e-8) edgeDistance = Math.min(edgeDistance, distance);
    }
    let distance = edgeDistance - holeInset;
    // At acute corners keep the same clearance to both edges.
    for (; distance > 0; distance -= .015) {
      const x = dx * distance, y = dy * distance;
      const clear = edges.every(edge => {
        const t = Math.max(0, Math.min(1, ((x - edge.x) * edge.dx + (y - edge.y) * edge.dy) / (edge.dx ** 2 + edge.dy ** 2)));
        return Math.hypot(x - edge.x - t * edge.dx, y - edge.y - t * edge.dy) >= holeInset;
      });
      if (clear) break;
    }
    return { id: option.id, x: dx * distance, y: dy * distance, dx, dy, reach: edgeDistance - distance };
  });
}

export function keyringHoles(shape) {
  const cached = holeCache.get(shape);
  if (cached) return cached;
  const holes = createHolePositions(shape);
  holeCache.set(shape, holes);
  return holes;
}

export function keyringSymbolFitsSurface(shape, holeId, symbol) {
  const { x, y } = symbol;
  const centerX = x / 100, centerY = y / 100;
  const radius = keyringSymbolRadius(symbol.size);
  const cut = symbol.mode === "cut";
  if (cut && (symbol.size !== "small" || symbol.relief !== "flat" || Math.hypot(centerX, centerY) < .81 + radius))
    return false;
  const holes = keyringHoles(shape);
  const hole = holes.find(point => point.id === holeId) ?? holes[0];
  if (Math.hypot(centerX - hole.x, centerY - hole.y) < keyringHoleRadius + radius + .14) return false;
  const outline = keyringOutline(shape);
  let inside = false;
  let edgeDistance = Infinity;
  for (let index = 0; index < outline.length; index++) {
    const a = outline[index], b = outline[(index + 1) % outline.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) continue;
    const position = Math.max(0, Math.min(1, ((centerX - a.x) * dx + (centerY - a.y) * dy) / lengthSquared));
    edgeDistance = Math.min(edgeDistance, Math.hypot(centerX - a.x - dx * position, centerY - a.y - dy * position));
    if ((a.y > centerY) !== (b.y > centerY) && centerX < a.x + dx * (centerY - a.y) / dy) inside = !inside;
  }
  return inside && edgeDistance >= radius + .1 && (!cut || edgeDistance <= radius + .28);
}

export function keyringSymbolsOverlap(a, b) {
  return (a.face === b.face || a.mode === "cut" || b.mode === "cut") &&
    Math.hypot(a.x - b.x, a.y - b.y) / 100 < keyringSymbolRadius(a.size) + keyringSymbolRadius(b.size) + .08;
}

function symbolPositionLabel(symbol) {
  const x = symbol.face === "back" ? -symbol.x : symbol.x;
  const vertical = symbol.y > 25 ? "in alto" : symbol.y < -25 ? "in basso" : "";
  const horizontal = x > 25 ? "a destra" : x < -25 ? "a sinistra" : "";
  return [vertical, horizontal].filter(Boolean).join(" ") || "al centro";
}

const limits = {
  rectangle: [[18, 15, 10], [10, 7, 5]], square: [[16, 12, 8], [11, 8, 5]],
  circle: [[14, 10, 7], [10, 7, 5]], triangle: [[12, 8, 5], [7, 5, 3]],
  ellipse: [[17, 12, 8], [8, 6, 4]], heart: [[13, 9, 6], [8, 6, 4]],
  star: [[10, 7, 5], [7, 5, 3]], hexagon: [[14, 10, 7], [10, 7, 5]],
  cube: [[12, 9, 6], [10, 7, 5]],
};
export const keyringMaxTextLength = 20;
export function keyringTextLimit(shape, orientation, size, relief = defaultKeyringLettering.relief) {
  const original = limits[shape][orientation === "vertical" ? 1 : 0][keyringTextSizes.indexOf(size)];
  return original + (relief === "raised" ? 0 : orientation === "horizontal" && size !== "large" ? 2 : 1);
}
export const keyringLetteringPattern = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .!?&+@#'_-]+$/u;
export function cleanKeyringLettering(text) {
  return text.normalize("NFC").replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 .!?&+@#'_-]/gu, "");
}

export function keyringDesignLabels(shape, inscription, details) {
  const faceLabel = (label, text, style) => {
    if (!text) return undefined;
    const attributes = style && [
      keyringTextOrientationNames[style.orientation].toLowerCase(), keyringTextSizeNames[style.size].toLowerCase(),
      style.relief && keyringReliefNames[style.relief],
      style.relief === "raised" ? keyringRaisedFontName : style.font && keyringFontNames[style.font],
    ].filter(Boolean);
    return attributes?.length ? `${label} «${text}» · ${attributes.join(", ")}` : `${label} «${text}»`;
  };
  const hole = details.hole && keyringHoleName(shape, details.hole);
  return [
    keyringShapeNames[shape],
    hole && `Foro · ${hole}`,
    faceLabel("Fronte", inscription, details.front),
    faceLabel("Retro", details.back?.text, details.back),
    ...((details.symbols ?? []).map((symbol, index) => [
      `Simbolo ${index + 1}`, keyringSymbolNames[symbol.kind], keyringSymbolModeNames[symbol.mode],
      keyringTextSizeNames[symbol.size], symbol.mode !== "cut" && keyringReliefNames[symbol.relief],
      `${symbol.face === "front" ? "Fronte" : "Retro"} ${symbolPositionLabel(symbol)}`,
    ].filter(Boolean).join(" · "))),
  ].filter(Boolean);
}
