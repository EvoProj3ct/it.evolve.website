"use client";

import { useEffect, useRef, useState } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { printedModel } from "./modelAssets";
import { extractStlProfile, type Profile, type ProfilePoint } from "./stlProfile";
import styles from "./LayerPrintScene.module.css";

type Point = { x: number; y: number };

const layerCount = 19;
const prebuiltLayers = 11;
const layerHeight = 11;
let profilePromise: Promise<Profile> | null = null;

function loadProfile() {
  profilePromise ??= new STLLoader().loadAsync(printedModel.url).then((geometry) => {
    try {
      return extractStlProfile(geometry);
    } finally {
      geometry.dispose();
    }
  }).catch((error) => {
    profilePromise = null;
    throw error;
  });
  return profilePromise;
}

function project({ x, y }: ProfilePoint, layer: number): Point {
  return { x: 150 + x * 290 + y * 135, y: 445 + x * 55 - y * 118 - layer * layerHeight };
}

function points(pointsToJoin: Point[]) {
  return pointsToJoin.map(({ x, y }) => `${x},${y}`).join(" ");
}

function profilePath(profile: Profile, layer: number) {
  return profile.map((loop) => {
    const [first, ...rest] = loop.map((point) => project(point, layer));
    return `M ${first.x} ${first.y} ${rest.map(({ x, y }) => `L ${x} ${y}`).join(" ")} Z`;
  }).join(" ");
}

function pointOnPerimeter(vertices: Point[], fraction: number): Point {
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

export function LayerPrintScene({ progress, exitOffset = 0 }: { progress: number; exitOffset?: number }) {
  const targetRef = useRef(progress);
  const currentRef = useRef(progress);
  const frameRef = useRef<number | null>(null);
  const [visibleProgress, setVisibleProgress] = useState(progress);
  const [profile, setProfile] = useState<Profile>([]);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadProfile().then((loaded) => {
      if (!active) return;
      setProfile(loaded);
      setProfileError(loaded.length === 0);
    }).catch(() => {
      if (active) setProfileError(true);
    });
    return () => { active = false; };
  }, []);

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
  if (profile.length === 0) {
    return <div className={styles.scene}>{profileError && <span className={styles.fallback}>Modello di stampa non disponibile</span>}</div>;
  }

  const outer = profile[0];
  const nozzle = pointOnPerimeter(outer.map((point) => project(point, activeLayer)), partial);
  const walls = profile.flatMap((loop, loopIndex) => loop.map((point, index) => {
    const next = loop[(index + 1) % loop.length];
    const topFrom = project(point, scaled - 1);
    const topTo = project(next, scaled - 1);
    return {
      key: `${loopIndex}-${index}`,
      points: points([topFrom, topTo, project(next, -1), project(point, -1)]),
      middleY: (topFrom.y + topTo.y) / 2,
      front: topTo.x > topFrom.x,
    };
  })).sort((a, b) => a.middleY - b.middleY);

  return (
    <div className={styles.scene}>
      <div className={styles.motion} style={{ transform: `translate3d(0, -${exitOffset}px, 0)` }}>
      <svg className={styles.drawing} viewBox="90 45 620 580" role="img" aria-label="Una testina stampa il profilo di un modello 3D strato dopo strato">
        <g className={styles.guides}>
          <path d={profilePath(profile, 0)} />
          <path d={profilePath(profile, layerCount - 1)} />
          {outer.filter((_, index) => index % 5 === 0).map((point, index) => {
            const start = project(point, 0);
            const end = project(point, layerCount - 1);
            return <line key={index} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
          })}
        </g>

        {walls.map((wall) => (
          <polygon key={wall.key} className={wall.front ? styles.front : styles.side} points={wall.points} />
        ))}
        {Array.from({ length: completeCount }, (_, index) => {
          return <path key={index} className={styles.contour} d={profilePath(profile, index)} />;
        })}
        <path className={styles.top} d={profilePath(profile, scaled - 1)} fillRule="evenodd" />
        <path className={styles.topOutline} d={profilePath(profile, scaled - 1)} />

        {completeCount < layerCount && (
          <path
            className={styles.activePath}
            d={profilePath([outer], activeLayer)}
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
    </div>
  );
}
