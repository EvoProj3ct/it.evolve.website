"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import styles from "./Shop.module.css";

type Mark = { key: string; x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
const POINTS = 33;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
function oval(mark: Mark): Point[] {
  return Array.from({ length: POINTS }, (_, i) => {
    const turn = i / (POINTS - 1) * 1.42;
    const angle = -.65 + turn * Math.PI * 2;
    const retrace = clamp((turn - 1) / .42);
    const x = Math.cos(angle) * (mark.width / 2 + 9 + retrace * 1.7);
    const y = Math.sin(angle) * (mark.height / 2 + 5.3 - retrace * .8);
    return { x: mark.x + x + Math.sin(angle * 3 + .7) * 1.05 + retrace * 1.2, y: mark.y + y - x * .055 + Math.cos(angle * 2 - .8) * .95 - retrace * 1.4 };
  });
}
function path(points: Point[]) {
  const n = (v: number) => Math.round(v * 100) / 100;
  let d = `M ${n(points[0].x)} ${n(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], e = points[Math.min(points.length - 1, i + 2)];
    d += ` C ${n(b.x + (c.x - a.x) / 6)} ${n(b.y + (c.y - a.y) / 6)} ${n(c.x - (e.x - b.x) / 6)} ${n(c.y - (e.y - b.y) / 6)} ${n(c.x)} ${n(c.y)}`;
  }
  return d;
}

export function NavInk({ active, navRef }: { active: string | null | undefined; navRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const [mark, setMark] = useState<Mark | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const previous = useRef<Mark | null>(null);
  const liveMark = useRef<Mark | null>(null);
  const livePoints = useRef<Point[]>([]);
  const velocity = useRef<Point>({ x: 0, y: 0 });
  const d = useMotionValue("");
  const length = useMotionValue(1);
  const opacity = useMotionValue(0);
  const progress = useMotionValue(0);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const target = [...nav.querySelectorAll<HTMLElement>("[data-nav-key]")].find(item => item.dataset.navKey === active)?.querySelector<HTMLElement>("[data-nav-label]");
      const width = nav.scrollWidth, height = nav.clientHeight;
      setSize(current => current.width === width && current.height === height ? current : { width, height });
      if (!target || !active) { setMark(null); return; }
      const parent = nav.getBoundingClientRect(), bounds = target.getBoundingClientRect();
      const next = { key: active, x: bounds.left - parent.left + nav.scrollLeft + bounds.width / 2, y: bounds.top - parent.top + bounds.height / 2, width: bounds.width, height: bounds.height };
      setMark(current => current?.key === next.key && Math.abs(current.x - next.x) < .25 && Math.abs(current.y - next.y) < .25 && Math.abs(current.width - next.width) < .25 && Math.abs(current.height - next.height) < .25 ? current : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(nav); nav.querySelectorAll("[data-nav-key]").forEach(item => observer.observe(item));
    measure(); void document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { disposed = true; observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [active, navRef]);
  useEffect(() => {
    if (!mark) { velocity.current = { x: 0, y: 0 }; const fade = animate(opacity, 0, { duration: .15 }); return () => fade.stop(); }
    const next = oval(mark), from = liveMark.current ?? previous.current;
    const same = previous.current?.key === mark.key;
    previous.current = mark;
    if (reduced) {
      livePoints.current = next; liveMark.current = mark; velocity.current = { x: 0, y: 0 };
      d.set(path(next)); length.set(1); opacity.set(1); return;
    }
    if (!from || !d.get()) {
      livePoints.current = next; liveMark.current = mark;
      d.set(path(next)); opacity.set(1);
      const draw = animate(length, [.02, 1], { duration: .5, ease: [.16, 1, .3, 1] });
      return () => draw.stop();
    }
    const start = livePoints.current.length === POINTS ? livePoints.current : oval(from);
    const initialLength = length.get();
    const dx = mark.x - from.x, dy = mark.y - from.y, distance = Math.max(1, Math.hypot(dx, dy));
    const actualDistance = Math.hypot(dx, dy);
    const direction = actualDistance > .001 ? { x: dx / actualDistance, y: dy / actualDistance } : { x: 1, y: 0 };
    const launchVelocity = same ? 0 : clamp((velocity.current.x * dx + velocity.current.y * dy) / (distance * distance), -.65, 1.5);
    progress.jump(0);
    const draw = (value: number) => {
      const phase = clamp(value);
      const melt = same ? 0 : Math.sin(phase * Math.PI) ** 1.1;
      const hop = same ? 0 : Math.sin(phase * Math.PI) * Math.min(8, distance * .045);
      const center = { x: from.x + dx * value, y: from.y + dy * value - hop };
      const impact = same ? 0 : clamp((value - 1) * 1.8, 0, .19);
      const points = start.map((point, i) => {
        const t = i / (POINTS - 1);
        const loopX = (point.x - from.x) * (1 - phase) + (next[i].x - mark.x) * phase;
        const loopY = (point.y - from.y) * (1 - phase) + (next[i].y - mark.y) * phase;
        const along = (t - .5) * Math.min(105, distance * .7);
        const wave = Math.sin(t * Math.PI * 2 - phase * 2.3) * Math.sin(t * Math.PI) * 9;
        const snakeX = direction.x * along - direction.y * wave;
        const snakeY = direction.y * along + direction.x * wave;
        const x = loopX * (1 - melt) + snakeX * melt;
        const y = loopY * (1 - melt) + snakeY * melt;
        const parallel = x * direction.x + y * direction.y;
        const perpendicular = -x * direction.y + y * direction.x;
        return {
          x: center.x + direction.x * parallel * (1 + impact) - direction.y * perpendicular * (1 - impact * .7),
          y: center.y + direction.y * parallel * (1 + impact) + direction.x * perpendicular * (1 - impact * .7),
        };
      });
      livePoints.current = points;
      liveMark.current = { ...mark, x: center.x, y: center.y, width: from.width + (mark.width - from.width) * phase, height: from.height + (mark.height - from.height) * phase };
      velocity.current = { x: dx * progress.getVelocity(), y: dy * progress.getVelocity() };
      d.set(path(points));
      length.set(initialLength + (1 - initialLength) * phase - melt * .32);
    };
    draw(0);
    const unsubscribe = progress.on("change", draw);
    // Tragitto più disteso, con lo stesso rapporto di smorzamento del rimbalzo finale.
    const travel = animate(progress, 1, same ? { duration: .24, ease: [.22, 1, .36, 1] } : { type: "spring", stiffness: 36, damping: 7, mass: 1, velocity: launchVelocity, restDelta: .001, restSpeed: .015 });
    const show = animate(opacity, 1, { duration: .12 });
    return () => { travel.stop(); unsubscribe(); show.stop(); };
  }, [mark, reduced, d, length, opacity, progress]);
  return <svg className={styles.navInk} width={size.width} height={size.height} aria-hidden="true" focusable="false"><motion.path d={d} pathLength={length} opacity={opacity} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
