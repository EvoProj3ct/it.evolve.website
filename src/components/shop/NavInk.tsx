"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import styles from "./Shop.module.css";

type Mark = { key: string; x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
export type NavInkPress = { key: string; serial: number };
const POINTS = 97;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
function oval(mark: Mark, startAngle = -.65, chaos = 0, seed = 0): Point[] {
  return Array.from({ length: POINTS }, (_, i) => {
    const t = i / (POINTS - 1);
    // Il gesto gira in senso antiorario; sul clic aggiunge spire allo stesso filo.
    const angle = startAngle - t * (1.42 + chaos * 4.8) * Math.PI * 2;
    const retrace = clamp((t * 1.42 - 1) / .42);
    const rx = (mark.width / 2 + 9 + retrace * 1.7) * (1 - chaos * .22 + chaos * .12 * Math.sin(t * 19 + seed));
    const ry = (mark.height / 2 + 5.3 - retrace * .8) * (1 + chaos * .12 * Math.sin(t * 23 + seed));
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    return {
      x: mark.x + x + Math.sin(angle * 3 + .7) * 1.05 + retrace * 1.2 + chaos * Math.sin(t * 11.3 + seed) * mark.width * .22,
      y: mark.y + y - x * .055 + Math.cos(angle * 2 - .8) * .95 - retrace * 1.4 + chaos * Math.sin(t * 14.7 + seed) * 4.5,
    };
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

function readMark(nav: HTMLElement, key: string | null | undefined): Mark | null {
  const target = [...nav.querySelectorAll<HTMLElement>("[data-nav-key]")].find(item => item.dataset.navKey === key)?.querySelector<HTMLElement>("[data-nav-label]");
  if (!target || !key) return null;
  const parent = nav.getBoundingClientRect(), bounds = target.getBoundingClientRect();
  return { key, x: bounds.left - parent.left + nav.scrollLeft + bounds.width / 2, y: bounds.top - parent.top + bounds.height / 2, width: bounds.width, height: bounds.height };
}

export function NavInk({ active, navRef, pressed = null }: { active: string | null | undefined; navRef: RefObject<HTMLElement | null>; pressed?: NavInkPress | null }) {
  const reduced = useReducedMotion();
  const [mark, setMark] = useState<Mark | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const previous = useRef<Mark | null>(null);
  const liveMark = useRef<Mark | null>(null);
  const livePoints = useRef<Point[]>([]);
  const liveAngle = useRef(-.65);
  const velocity = useRef<Point>({ x: 0, y: 0 });
  const handledPress = useRef<NavInkPress | null>(null);
  const pressTarget = useRef<Mark | null>(null);
  const stopHover = useRef<(() => void) | null>(null);
  const stopPress = useRef<(() => void) | null>(null);
  const d = useMotionValue("");
  const length = useMotionValue(1);
  const opacity = useMotionValue(0);
  const progress = useMotionValue(0);
  const pressProgress = useMotionValue(0);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const width = nav.scrollWidth, height = nav.clientHeight;
      setSize(current => current.width === width && current.height === height ? current : { width, height });
      const next = readMark(nav, active);
      if (!next) { setMark(null); return; }
      setMark(current => current?.key === next.key && Math.abs(current.x - next.x) < .25 && Math.abs(current.y - next.y) < .25 && Math.abs(current.width - next.width) < .25 && Math.abs(current.height - next.height) < .25 ? current : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(nav); nav.querySelectorAll("[data-nav-key]").forEach(item => observer.observe(item));
    measure(); void document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => { disposed = true; observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [active, navRef]);
  useEffect(() => {
    if (!mark) {
      stopPress.current?.();
      velocity.current = { x: 0, y: 0 };
      const fade = animate(opacity, 0, { duration: .15 });
      const stop = () => { fade.stop(); if (stopHover.current === stop) stopHover.current = null; };
      stopHover.current = stop;
      return stop;
    }
    const from = liveMark.current ?? previous.current;
    const same = previous.current?.key === mark.key;
    const dx = from ? mark.x - from.x : 0, dy = from ? mark.y - from.y : 0;
    const actualDistance = Math.hypot(dx, dy), distance = Math.max(1, actualDistance);
    const angle = !same && from && actualDistance > 1 ? Math.atan2(-dy, -dx) : liveAngle.current;
    const next = oval(mark, angle);
    if (reduced) {
      stopPress.current?.();
      previous.current = mark; liveAngle.current = angle; livePoints.current = next; liveMark.current = mark; velocity.current = { x: 0, y: 0 };
      d.jump(path(next)); length.jump(1); opacity.jump(1); return;
    }
    const clicked = pressTarget.current;
    if (clicked?.key === mark.key && Math.abs(clicked.x - mark.x) < 3 && Math.abs(clicked.y - mark.y) < 3 && Math.abs(clicked.width - mark.width) < 3) return;
    stopPress.current?.();
    previous.current = mark; liveAngle.current = angle;
    if (!from || !d.get()) {
      livePoints.current = next; liveMark.current = mark;
      d.set(path(next)); opacity.set(1);
      const draw = animate(length, [.02, 1], { duration: .5, ease: [.16, 1, .3, 1] });
      const stop = () => { draw.stop(); if (stopHover.current === stop) stopHover.current = null; };
      stopHover.current = stop;
      return stop;
    }
    const start = livePoints.current.length === POINTS ? livePoints.current : oval(from, angle);
    const initialLength = length.get(), initialOpacity = opacity.get();
    const direction = actualDistance > .001 ? { x: dx / actualDistance, y: dy / actualDistance } : { x: 1, y: 0 };
    const launchVelocity = same ? 0 : clamp((velocity.current.x * dx + velocity.current.y * dy) / (distance * distance), -.5, 1.15);
    let furthestPhase = 0;
    progress.jump(0);
    const draw = (value: number) => {
      // Il filo si richiude una sola volta. Il rimbalzo muove la forma senza riaprirla.
      const phase = furthestPhase = Math.max(furthestPhase, clamp(value));
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
        const x = loopX * (1 - melt) + (direction.x * along - direction.y * wave) * melt;
        const y = loopY * (1 - melt) + (direction.y * along + direction.x * wave) * melt;
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
      // Nessuna cancellazione dalla punta: il segno continua nel verso del gesto.
      length.set(initialLength + (1 - initialLength) * phase);
      opacity.set(initialOpacity + (1 - initialOpacity) * phase);
    };
    draw(0);
    const unsubscribe = progress.on("change", draw);
    const travel = animate(progress, 1, same ? { duration: .24, ease: [.22, 1, .36, 1] } : { type: "spring", stiffness: 22, damping: 5.5, mass: 1, velocity: launchVelocity, restDelta: .001, restSpeed: .015 });
    const stop = () => { travel.stop(); unsubscribe(); if (stopHover.current === stop) stopHover.current = null; };
    stopHover.current = stop;
    return stop;
  }, [mark, reduced, d, length, opacity, progress]);

  useEffect(() => {
    const nav = navRef.current;
    if (!pressed || !nav || handledPress.current === pressed) return;
    const target = readMark(nav, pressed.key);
    if (!target) return;
    handledPress.current = pressed;
    stopHover.current?.(); stopPress.current?.();
    const from = liveMark.current ?? target;
    const dx = target.x - from.x, dy = target.y - from.y;
    const angle = from.key !== target.key && Math.hypot(dx, dy) > 1 ? Math.atan2(-dy, -dx) : liveAngle.current;
    liveAngle.current = angle; previous.current = target; velocity.current = { x: 0, y: 0 };
    const circle = oval(target, angle);
    if (reduced) {
      livePoints.current = circle; liveMark.current = target;
      d.jump(path(circle)); length.jump(1); opacity.jump(1); return;
    }
    const start = livePoints.current.length === POINTS ? livePoints.current : oval(from, angle);
    const initialLength = length.get(), initialOpacity = opacity.get();
    const seed = pressed.serial % 11 * .37;
    pressTarget.current = target;
    pressProgress.jump(0);
    const draw = (value: number) => {
      const gather = smooth(value / .18);
      const grow = smooth((value - .1) / .4);
      const settle = smooth((value - .72) / .28);
      const squeeze = 1 - .14 * Math.sin(Math.PI * clamp(value / .3));
      const cloud = oval(target, angle, grow, seed);
      const center = { x: from.x + dx * gather, y: from.y + dy * gather };
      const points = start.map((point, i) => {
        const x = (point.x * (1 - gather) + cloud[i].x * gather) * (1 - settle) + circle[i].x * settle;
        const y = (point.y * (1 - gather) + cloud[i].y * gather) * (1 - settle) + circle[i].y * settle;
        return { x: center.x + (x - center.x) * squeeze, y: center.y + (y - center.y) * squeeze };
      });
      livePoints.current = points;
      liveMark.current = { ...target, x: center.x, y: center.y, width: from.width + (target.width - from.width) * gather, height: from.height + (target.height - from.height) * gather };
      d.set(path(points)); length.set(initialLength + (1 - initialLength) * gather);
      opacity.set(clamp(initialOpacity + (1 - initialOpacity) * gather - .28 * grow * (1 - settle)));
    };
    draw(0);
    const unsubscribe = pressProgress.on("change", draw);
    const bloom = animate(pressProgress, 1, { duration: 1.85, ease: "linear", onComplete: () => {
      unsubscribe();
      if (stopPress.current === stop) { pressTarget.current = null; stopPress.current = null; }
    } });
    const stop = () => {
      bloom.stop(); unsubscribe();
      if (stopPress.current === stop) { pressTarget.current = null; stopPress.current = null; }
    };
    stopPress.current = stop;
    return stop;
  }, [pressed, navRef, reduced, d, length, opacity, pressProgress]);

  return <svg className={styles.navInk} width={size.width} height={size.height} aria-hidden="true" focusable="false">
    <motion.path d={d} pathLength={length} opacity={opacity} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
