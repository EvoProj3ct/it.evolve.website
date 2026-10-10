"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./LayerPrintScene.module.css";

type Point = { x: number; y: number };

const layerCount = 19;
const prebuiltLayers = 11;
const layerHeight = 11;
const footprint: readonly Point[] = [
  { x: 220, y: 475 },
  { x: 430, y: 518 },
  { x: 565, y: 430 },
  { x: 355, y: 387 },
];

function corners(layer: number): Point[] {
  return footprint.map(({ x, y }) => ({ x, y: y - layer * layerHeight }));
}

function points(pointsToJoin: Point[]) {
  return pointsToJoin.map(({ x, y }) => `${x},${y}`).join(" ");
}

function perimeterPath(layer: number) {
  const [a, b, c, d] = corners(layer);
  return `M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${d.x} ${d.y} Z`;
}

function pointOnPerimeter(layer: number, fraction: number): Point {
  const vertices = corners(layer);
  const lengths = vertices.map((point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = Math.min(1, Math.max(0, fraction)) * total;

  for (let index = 0; index < vertices.length; index += 1) {
    const length = lengths[index];
    if (remaining <= length || index === vertices.length - 1) {
      const from = vertices[index];
      const to = vertices[(index + 1) % vertices.length];
      const amount = Math.min(1, remaining / length);
      return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount };
    }
    remaining -= length;
  }

  return vertices[0];
}

export function LayerPrintScene({ progress }: { progress: number }) {
  const targetRef = useRef(progress);
  const currentRef = useRef(progress);
  const frameRef = useRef<number | null>(null);
  const [visibleProgress, setVisibleProgress] = useState(progress);

  useEffect(() => {
    targetRef.current = progress;
    if (frameRef.current !== null) return;

    const tick = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      const next = Math.abs(target - current) < .0005 ? target : current + (target - current) * .08;
      currentRef.current = next;
      setVisibleProgress(next);
      frameRef.current = next === target ? null : window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
  }, [progress]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const scaled = Math.min(layerCount, prebuiltLayers + Math.max(0, visibleProgress) * (layerCount - prebuiltLayers));
  const completeCount = Math.floor(scaled);
  const activeLayer = Math.min(layerCount - 1, completeCount);
  const partial = completeCount === layerCount ? 1 : scaled - completeCount;
  const nozzle = pointOnPerimeter(activeLayer, partial);
  const topCorners = corners(layerCount - 1);

  return (
    <div className={styles.scene}>
      <svg className={styles.drawing} viewBox="90 105 620 520" role="img" aria-label="Una testina traccia i livelli di un cubo in prospettiva">
        <g className={styles.guides}>
          <polygon points={points(corners(0))} />
          <polygon points={points(topCorners)} />
          {footprint.map((point, index) => (
            <line key={index} x1={point.x} y1={point.y} x2={topCorners[index].x} y2={topCorners[index].y} />
          ))}
        </g>

        {Array.from({ length: completeCount }, (_, index) => {
          const [a, b, c, d] = corners(index);
          return (
            <g key={index} className={styles.layer}>
              <polygon className={styles.front} points={points([a, b, { x: b.x, y: b.y + layerHeight }, { x: a.x, y: a.y + layerHeight }])} />
              <polygon className={styles.side} points={points([b, c, { x: c.x, y: c.y + layerHeight }, { x: b.x, y: b.y + layerHeight }])} />
              <polygon className={styles.top} points={points([a, b, c, d])} />
              <path d={perimeterPath(index)} />
            </g>
          );
        })}

        {completeCount < layerCount && (
          <path
            className={styles.activePath}
            d={perimeterPath(activeLayer)}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - partial}
          />
        )}

        <g className={styles.nozzle} transform={`translate(${nozzle.x} ${nozzle.y})`}>
          <path className={styles.nozzleBody} d="M -19 -76 H 19 V -48 H 13 V -28 H 8 L 5 -15 H -5 L -8 -28 H -13 V -48 H -19 Z" />
          <path className={styles.nozzleTip} d="M -5 -15 H 5 L 2 -5 L 0 0 L -2 -5 Z" />
          <path className={styles.nozzleDetail} d="M -12 -48 H 12 M -8 -28 H 8" />
          <circle className={styles.contact} r="3" />
        </g>
      </svg>
    </div>
  );
}
