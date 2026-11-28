import { Path, Shape, ShapeUtils, Vector2 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { keyringSymbolWidths, type KeyringSymbol } from "@evolve/ecommerce-server/keyring-design";
import { keyringSymbolArtwork, keyringSymbolStroke } from "./keyringSymbols";

const contoursByPath = new Map<string, Vector2[][][]>();

function symbolContours(path: string) {
  const cached = contoursByPath.get(path);
  if (cached) return cached;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${path}"/></svg>`;
  const shapes = new SVGLoader().parse(svg).paths[0].toShapes();
  const contours = shapes.map(shape => {
    const { shape: outline, holes } = shape.extractPoints(10);
    return [outline, ...holes].map(points => points.filter((point, index) =>
      point.distanceToSquared(points[(index + points.length - 1) % points.length]) > 1e-8));
  });
  contoursByPath.set(path, contours);
  return contours;
}

function offsetContour(points: Vector2[], distance: number) {
  const sign = ShapeUtils.isClockWise(points) ? -1 : 1;
  return points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const incoming = new Vector2(previous.y - point.y, point.x - previous.x).normalize().multiplyScalar(sign);
    const outgoing = new Vector2(point.y - next.y, next.x - point.x).normalize().multiplyScalar(sign);
    const join = incoming.add(outgoing).normalize();
    return point.clone().addScaledVector(join, distance / Math.max(.48, join.dot(outgoing)));
  });
}

export function keyringSymbolShapes(symbol: KeyringSymbol): Shape[] {
  const { outline, details } = keyringSymbolArtwork[symbol.kind];
  const scale = keyringSymbolWidths[symbol.size] / 100;
  const pointsFor = (points: Vector2[]) => points.map(point => new Vector2((point.x - 50) * scale, (50 - point.y) * scale));
  const toShape = ([outer, ...holes]: Vector2[][]) => {
    const shape = new Shape(pointsFor(outer));
    shape.closePath();
    shape.holes = holes.map(hole => {
      const path = new Path(pointsFor(hole));
      path.closePath();
      return path;
    });
    return shape;
  };
  if (symbol.mode === "cut") return symbolContours(outline).map(toShape);
  if (symbol.mode === "fill") return symbolContours(`${outline} ${details ?? ""}`).map(toShape);
  const [profile] = symbolContours(outline).map(toShape);
  const outlinePoints = profile.getPoints();
  const inner = offsetContour(outlinePoints.slice(0, -1), keyringSymbolStroke / 2);
  const stroke = new Shape(offsetContour(outlinePoints.slice(0, -1), -keyringSymbolStroke / 2));
  stroke.closePath();
  const innerPath = new Path(inner);
  innerPath.closePath();
  stroke.holes.push(innerPath);
  return [stroke, ...(details ? symbolContours(details).map(toShape) : [])];
}
