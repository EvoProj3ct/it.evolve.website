import { defaultKeyringLettering, keyringHexagonPoints, keyringHoleOptions, keyringStarPoints, type KeyringFont, type KeyringLettering, type KeyringPosition, type KeyringShape } from "@evolve/ecommerce-server/keyring-design";

export const keyringHoleRadius = .16;
const holeInset = .32;
const outlineCache = new Map<KeyringShape, KeyringPosition[]>();
const mix = (from: KeyringPosition, to: KeyringPosition, fraction: number) => ({
  x: from.x + (to.x - from.x) * fraction,
  y: from.y + (to.y - from.y) * fraction,
});

function roundedPolygon(points: readonly KeyringPosition[], radius: number) {
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

export function keyringOutline(shape: KeyringShape) {
  const cached = outlineCache.get(shape);
  if (cached) return cached;
  let points: KeyringPosition[];
  if (shape === "circle" || shape === "ellipse" || shape === "heart") {
    points = Array.from({ length: 80 }, (_, index) => {
      const angle = index * Math.PI / 40;
      if (shape === "heart") return {
        x: 1.87 * Math.sin(angle) ** 3,
        y: .095 * (2.5 + 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)),
      };
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

export const keyringDepth = (shape: KeyringShape) => shape === "cube" ? 2.65 : .13;
const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;
const holeCache = new Map<KeyringShape, ReturnType<typeof createHolePositions>>();

function createHolePositions(shape: KeyringShape) {
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

export function keyringHoles(shape: KeyringShape) {
  const cached = holeCache.get(shape);
  if (cached) return cached;
  const holes = createHolePositions(shape);
  holeCache.set(shape, holes);
  return holes;
}

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
