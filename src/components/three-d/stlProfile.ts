import type * as THREE from "three";

export type ProfilePoint = { x: number; y: number };
export type Profile = ProfilePoint[][];

type Edge = { from: string; to: string; count: number };

function edgeKey(from: string, to: string) {
  return from < to ? `${from}|${to}` : `${to}|${from}`;
}

function signedArea(loop: ProfilePoint[]) {
  return loop.reduce((area, point, index) => {
    const next = loop[(index + 1) % loop.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

export function extractStlProfile(geometry: THREE.BufferGeometry): Profile {
  geometry.computeBoundingBox();
  const capZ = geometry.boundingBox?.max.z;
  const positions = geometry.getAttribute("position");
  if (capZ === undefined || !positions) return [];

  const vertices = new Map<string, ProfilePoint>();
  const edges = new Map<string, Edge>();
  const capTolerance = Math.max(0.001, (geometry.boundingBox?.max.z ?? 0) * 0.00001);

  for (let index = 0; index < positions.count; index += 3) {
    if ([0, 1, 2].some((offset) => Math.abs(positions.getZ(index + offset) - capZ) > capTolerance)) continue;

    const keys = [0, 1, 2].map((offset) => {
      const point = { x: positions.getX(index + offset), y: positions.getY(index + offset) };
      const key = `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
      vertices.set(key, point);
      return key;
    });
    for (let corner = 0; corner < 3; corner += 1) {
      const from = keys[corner];
      const to = keys[(corner + 1) % 3];
      const key = edgeKey(from, to);
      const existing = edges.get(key);
      if (existing) existing.count += 1;
      else edges.set(key, { from, to, count: 1 });
    }
  }

  const boundary = [...edges.values()].filter((edge) => edge.count === 1);
  const neighbors = new Map<string, string[]>();
  boundary.forEach(({ from, to }) => {
    neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
    neighbors.set(to, [...(neighbors.get(to) ?? []), from]);
  });

  const used = new Set<string>();
  const loops: Profile = [];
  boundary.forEach(({ from, to }) => {
    if (used.has(edgeKey(from, to))) return;
    const loop: ProfilePoint[] = [];
    let current = from;
    let next = to;
    for (let step = 0; step <= boundary.length; step += 1) {
      loop.push(vertices.get(current)!);
      used.add(edgeKey(current, next));
      current = next;
      if (current === from) break;
      const candidate = neighbors.get(current)?.find((neighbor) => !used.has(edgeKey(current, neighbor)));
      if (!candidate) break;
      next = candidate;
    }
    if (current === from && loop.length >= 3) loops.push(loop);
  });

  if (loops.length === 0) return [];
  loops.sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)));
  const allPoints = loops.flat();
  const minX = Math.min(...allPoints.map((point) => point.x));
  const minY = Math.min(...allPoints.map((point) => point.y));
  const width = Math.max(0.001, Math.max(...allPoints.map((point) => point.x)) - minX);
  const depth = Math.max(0.001, Math.max(...allPoints.map((point) => point.y)) - minY);
  const scale = Math.max(width, depth);
  const xInset = (scale - width) / (2 * scale);
  const yInset = (scale - depth) / (2 * scale);
  return loops.map((loop) => loop.map(({ x, y }) => ({
    x: xInset + (x - minX) / scale,
    y: yInset + (y - minY) / scale,
  })));
}
