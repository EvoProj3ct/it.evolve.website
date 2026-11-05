"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import styles from "./Shop.module.css";

type Mark = { key: string; x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
const mix = (a: Point[], b: Point[], amount: number) => a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * amount, y: p.y + (b[i].y - p.y) * amount }));
function oval(mark: Mark): Point[] {
  return Array.from({ length: 17 }, (_, i) => {
    const angle = -.4 + i / 16 * (Math.PI * 2 + .3);
    const x = Math.cos(angle) * (mark.width / 2 + 9);
    const y = Math.sin(angle) * (mark.height / 2 + 6);
    return { x: mark.x + x + Math.sin(angle * 3) * 1.1, y: mark.y + y - x * .055 + Math.cos(angle * 2) * .7 };
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
  const d = useMotionValue("");
  const length = useMotionValue(1);
  const opacity = useMotionValue(0);
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
    if (!mark) { const fade = animate(opacity, 0, { duration: .15 }); return () => fade.stop(); }
    const next = oval(mark), from = previous.current;
    previous.current = mark;
    if (reduced) { d.set(path(next)); length.set(1); opacity.set(1); return; }
    if (!from || !d.get()) {
      d.set(path(next)); opacity.set(1);
      const draw = animate(length, [.05, 1], { duration: .4, ease: [.22, 1, .36, 1] });
      return () => draw.stop();
    }
    const dx = mark.x - from.x, dy = mark.y - from.y, distance = Math.max(1, Math.hypot(dx, dy));
    const snake = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16, wave = Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI) * 8;
      return { x: from.x + dx * t - dy / distance * wave, y: from.y + dy * t + dx / distance * wave };
    });
    const same = from.key === mark.key;
    const travel = animate(d, same ? [d.get(), path(next)] : [d.get(), path(mix(oval(from), snake, .6)), path(snake), path(mix(snake, next, .6)), path(next)], { duration: same ? .22 : .62, times: same ? [0, 1] : [0, .2, .48, .75, 1], ease: [.45, 0, .2, 1] });
    const flow = animate(length, same ? [length.get(), 1] : [length.get(), .75, .48, .8, 1], { duration: same ? .22 : .62, times: same ? [0, 1] : [0, .2, .48, .75, 1], ease: "easeInOut" });
    const show = animate(opacity, 1, { duration: .12 });
    return () => { travel.stop(); flow.stop(); show.stop(); };
  }, [mark, reduced, d, length, opacity]);
  return <svg className={styles.navInk} width={size.width} height={size.height} aria-hidden="true" focusable="false"><motion.path d={d} pathLength={length} opacity={opacity} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
