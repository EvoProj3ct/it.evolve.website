"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import styles from "./KnowledgeConstellation.module.css";

type Point = { x: number; y: number };
type Concept = {
  name: string;
  text: string;
  desktop: Point;
};

const concepts: Concept[] = [
  { name: "Analisi", text: "Partiamo dal lavoro reale: osserviamo processi, vincoli e obiettivi prima di scegliere gli strumenti.", desktop: { x: 85, y: 390 } },
  { name: "Informazione", text: "Rendiamo accessibili temi tecnici e novità, con parole chiare e occasioni di confronto.", desktop: { x: 300, y: 190 } },
  { name: "Consulenza", text: "Mettiamo a fuoco il problema insieme a te e definiamo un percorso che abbia senso per la tua organizzazione.", desktop: { x: 300, y: 570 } },
  { name: "Formazione ed eventi", text: "Condividiamo metodi e strumenti con corsi, seminari e incontri, perché l'innovazione continui anche dopo il nostro intervento.", desktop: { x: 520, y: 85 } },
  { name: "Dati", text: "Organizziamo le informazioni perché siano affidabili, reperibili e davvero utili nel lavoro quotidiano.", desktop: { x: 520, y: 275 } },
  { name: "Progettazione", text: "Traduciamo un'esigenza in un sistema chiaro: flussi, interfacce e integrazioni vengono pensati come un insieme.", desktop: { x: 520, y: 470 } },
  { name: "Prototipazione", text: "Rendiamo le idee verificabili presto, con prove concrete prima di investire nella soluzione finale.", desktop: { x: 520, y: 650 } },
  { name: "Sicurezza", text: "Consideriamo accessi, dati e continuità fin dall'inizio, come parte del progetto e non come aggiunta finale.", desktop: { x: 800, y: 100 } },
  { name: "Modelli locali", text: "Valutiamo quando eseguire modelli nei tuoi ambienti, considerando riservatezza, prestazioni e costi operativi.", desktop: { x: 800, y: 275 } },
  { name: "Agenti IA", text: "Progettiamo assistenti capaci di usare informazioni e strumenti per svolgere compiti definiti, con confini verificabili.", desktop: { x: 800, y: 390 } },
  { name: "Sviluppo", text: "Costruiamo software su misura intorno alle persone che lo useranno, con attenzione a manutenzione e crescita.", desktop: { x: 800, y: 470 } },
  { name: "Stampa 3D", text: "Diamo forma a componenti e prototipi per testare, adattare e migliorare un oggetto nel mondo reale.", desktop: { x: 800, y: 650 } },
  { name: "ATLAS", text: "Il nostro gestionale modulare mette in relazione dati, flussi operativi e persone, adattandosi al processo aziendale.", desktop: { x: 1160, y: 470 } },
  { name: "Automazione", text: "Affidiamo alle macchine le attività ripetitive, lasciando alle persone il controllo delle decisioni.", desktop: { x: 1160, y: 575 } },
  { name: "Integrazioni elettroniche", text: "Colleghiamo software e oggetti fisici: sensori, lettori e dispositivi entrano nello stesso flusso di lavoro.", desktop: { x: 1160, y: 650 } },
];

// A single left-to-right tree keeps the conceptual journey readable and the
// main connections free of crossings at every viewport size.
const links: [number, number][] = [
  [0, 1], [0, 2],
  [1, 3], [1, 4], [2, 5], [2, 6],
  [4, 7], [4, 8], [4, 9], [5, 10], [6, 11],
  [10, 12], [10, 13], [10, 14],
];

// A printed prototype may also carry sensors and electronics.
const crossLinks: [number, number][] = [[11, 14]];
const allLinks = [...links, ...crossLinks];

function isUpperBranch(index: number) {
  let current = index;
  while (current !== 0) {
    if (current === 1) return true;
    const parent = links.find(([, child]) => child === current);
    if (!parent) return false;
    current = parent[0];
  }
  return false;
}

const depths = concepts.map((_, index) => {
  let depth = 0;
  let current = index;
  while (current !== 0) {
    current = links.find(([, child]) => child === current)![0];
    depth++;
  }
  return depth;
});

const edgeDelays = links.map(([parent], index) =>
  0.45 + depths[parent] * 0.9 + links.slice(0, index).filter(([other]) => depths[other] === depths[parent]).length * 0.1,
);

const nodeDelays = concepts.map((_, index) => index === 0 ? 0.8 : edgeDelays[links.findIndex(([, child]) => child === index)] + 0.78);

function pointFor(index: number, layout: "desktop" | "mobile"): Point {
  const point = concepts[index].desktop;
  return layout === "desktop" ? point : {
    x: 28 + (point.x - 85) * 300 / 1075,
    y: 65 + (point.y - 85) * 770 / 595,
  };
}

function originFor(layout: "desktop" | "mobile"): Point {
  return layout === "mobile" ? { x: 8, y: pointFor(0, layout).y } : { x: 20, y: 390 };
}

function edgePoints(from: number, to: number, layout: "desktop" | "mobile"): Point[] {
  const reversed = !allLinks.some(([a, b]) => a === from && b === to);
  const a = reversed ? to : from;
  const b = reversed ? from : to;
  const start = pointFor(a, layout);
  const end = pointFor(b, layout);
  let points: Point[];

  if (a === 11 && b === 14) {
    const detour = layout === "mobile" ? 880 : 737;
    points = [start, { x: start.x, y: detour }, { x: end.x, y: detour }, end];
  } else if (a === 10 && b === 14) {
    const turnX = start.x + (end.x - start.x) * .38;
    points = [start, { x: turnX, y: start.y }, { x: turnX, y: end.y }, end];
  } else if (start.y === end.y) {
    points = [start, end];
  } else {
    const siblings = links.filter(([parent]) => parent === a);
    const sibling = siblings.findIndex(([, child]) => child === b);
    const fraction = a === 10 && b === 13 ? .68 : .34 + Math.max(0, sibling) * .15;
    const turnX = start.x + (end.x - start.x) * fraction;
    points = [start, { x: turnX, y: start.y }, { x: turnX, y: end.y }, end];
  }
  return reversed ? points.reverse() : points;
}

function pointsPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(points: Point[]) {
  return points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
}

function pointAlong(points: Point[], traveled: number): Point {
  let remaining = traveled;
  for (let index = 1; index < points.length; index++) {
    const length = distance(points[index - 1], points[index]);
    if (remaining <= length) {
      const fraction = length ? remaining / length : 0;
      return { x: points[index - 1].x + (points[index].x - points[index - 1].x) * fraction,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * fraction };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

type Segment = { a: Point; b: Point };

function wireRoute(from: Point, to: Point, layout: "desktop" | "mobile"): Point[] {
  const wires = [[originFor(layout), pointFor(0, layout)], ...allLinks.map(([a, b]) => edgePoints(a, b, layout))];
  const segments: Segment[] = wires.flatMap((points) => points.slice(1).map((point, index) => ({ a: points[index], b: point })));
  const key = (point: Point) => `${point.x.toFixed(4)}:${point.y.toFixed(4)}`;
  const vertices = new Map<string, Point>();
  const add = (point: Point) => { vertices.set(key(point), point); };
  add(from);
  add(to);
  segments.forEach(({ a, b }) => { add(a); add(b); });

  // Include every visible T-junction, including ones in the middle of a wire.
  for (let first = 0; first < segments.length; first++) {
    for (let second = first + 1; second < segments.length; second++) {
      const a = segments[first];
      const b = segments[second];
      const horizontal = Math.abs(a.a.y - a.b.y) < .0001;
      const otherHorizontal = Math.abs(b.a.y - b.b.y) < .0001;
      if (horizontal === otherHorizontal) continue;
      const h = horizontal ? a : b;
      const v = horizontal ? b : a;
      if (v.a.x >= Math.min(h.a.x, h.b.x) - .0001 && v.a.x <= Math.max(h.a.x, h.b.x) + .0001
        && h.a.y >= Math.min(v.a.y, v.b.y) - .0001 && h.a.y <= Math.max(v.a.y, v.b.y) + .0001) {
        add({ x: v.a.x, y: h.a.y });
      }
    }
  }

  const allPoints = [...vertices.values()];
  const neighbors = new Map<string, { key: string; length: number }[]>();
  const connect = (a: Point, b: Point) => {
    const first = key(a);
    const second = key(b);
    const length = distance(a, b);
    if (length < .0001 || first === second) return;
    neighbors.set(first, [...(neighbors.get(first) ?? []), { key: second, length }]);
    neighbors.set(second, [...(neighbors.get(second) ?? []), { key: first, length }]);
  };
  for (const segment of segments) {
    const horizontal = Math.abs(segment.a.y - segment.b.y) < .0001;
    const onWire = allPoints.filter((point) => horizontal
      ? Math.abs(point.y - segment.a.y) < .0001 && point.x >= Math.min(segment.a.x, segment.b.x) - .0001 && point.x <= Math.max(segment.a.x, segment.b.x) + .0001
      : Math.abs(point.x - segment.a.x) < .0001 && point.y >= Math.min(segment.a.y, segment.b.y) - .0001 && point.y <= Math.max(segment.a.y, segment.b.y) + .0001);
    onWire.sort((a, b) => horizontal ? a.x - b.x : a.y - b.y);
    for (let index = 1; index < onWire.length; index++) connect(onWire[index - 1], onWire[index]);
  }

  const start = key(from);
  const end = key(to);
  const costs = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  while (true) {
    let current: string | null = null;
    let cost = Infinity;
    for (const [candidate, value] of costs) {
      if (!visited.has(candidate) && value < cost) { current = candidate; cost = value; }
    }
    if (current === null || current === end) break;
    visited.add(current);
    for (const neighbor of neighbors.get(current) ?? []) {
      const next = cost + neighbor.length;
      if (next < (costs.get(neighbor.key) ?? Infinity)) {
        costs.set(neighbor.key, next);
        previous.set(neighbor.key, current);
      }
    }
  }
  if (!costs.has(end)) return [from];
  const route = [end];
  while (route[0] !== start) route.unshift(previous.get(route[0])!);
  return route.map((vertex) => vertices.get(vertex)!);
}

function PixelGhost() {
  return (
    <g className={styles.ghostSprite} aria-hidden="true">
      <path d="M-4-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H-3V6H-6V8H-10V-4H-8V-6H-6V-8H-4Z" fill="#72C94F" />
      <rect x="-6" y="-2" width="4" height="5" fill="#F9FFF7" />
      <rect x="2" y="-2" width="4" height="5" fill="#F9FFF7" />
      <rect x="-4" y="0" width="2" height="2" fill="#13221A" />
      <rect x="4" y="0" width="2" height="2" fill="#13221A" />
    </g>
  );
}

type TravelMotion = { points: Point[]; traveled: number; lastTime: number; frame: number };

function TravelGhost({ layout, target, trip, reducedMotion }: {
  layout: "desktop" | "mobile"; target: number | null; trip: number; reducedMotion: boolean;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Point>(originFor(layout));
  const motionRef = useRef<TravelMotion | null>(null);
  const width = layout === "mobile" ? 360 : 1400;
  const height = layout === "mobile" ? 900 : 760;

  useEffect(() => {
    if (target === null || trip === 0) return;
    const element = elementRef.current;
    if (!element) return;
    element.style.opacity = "1";
    const place = (point: Point) => {
      element.style.left = `${point.x / width * 100}%`;
      element.style.top = `${point.y / height * 100}%`;
    };

    const previous = motionRef.current;
    if (previous) {
      window.cancelAnimationFrame(previous.frame);
      positionRef.current = pointAlong(previous.points, previous.traveled);
    }

    if (reducedMotion) {
      motionRef.current = null;
      positionRef.current = pointFor(target, layout);
      place(positionRef.current);
      return;
    }

    const points = wireRoute(positionRef.current, pointFor(target, layout), layout);
    const length = pathLength(points);
    if (length < .0001) {
      positionRef.current = pointFor(target, layout);
      place(positionRef.current);
      motionRef.current = null;
      return;
    }

    const motion: TravelMotion = { points, traveled: 0, lastTime: 0, frame: 0 };
    motionRef.current = motion;
    const step = (time: number) => {
      if (motionRef.current !== motion) return;
      const elapsed = motion.lastTime ? Math.min(48, time - motion.lastTime) / 1000 : 0;
      motion.lastTime = time;
      motion.traveled = Math.min(length, motion.traveled + elapsed * (layout === "mobile" ? 340 : 510));
      positionRef.current = pointAlong(points, motion.traveled);
      place(positionRef.current);
      if (motion.traveled < length) motion.frame = window.requestAnimationFrame(step);
      else motionRef.current = null;
    };
    motion.frame = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(motion.frame);
    };
  }, [layout, target, trip, reducedMotion, width, height]);

  useEffect(() => () => {
    if (motionRef.current) window.cancelAnimationFrame(motionRef.current.frame);
  }, []);

  const origin = originFor(layout);
  return <div ref={elementRef} className={styles.travelGhost} style={{ left: `${origin.x / width * 100}%`, top: `${origin.y / height * 100}%` }} aria-hidden="true">
    <svg viewBox="-11 -11 22 21" width="22" height="21" focusable="false"><PixelGhost /></svg>
  </div>;
}

type GraphProps = {
  layout: "desktop" | "mobile";
  active: number | null;
  selected: number | null;
  routeTarget: number | null;
  trip: number;
  reducedMotion: boolean;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
};

function Graph({ layout, active, selected, routeTarget, trip, reducedMotion, onHover, onSelect }: GraphProps) {
  const mobile = layout === "mobile";
  const width = mobile ? 360 : 1400;
  const height = mobile ? 900 : 760;
  const origin = originFor(layout);
  const hoverPath = active === null ? null : pointsPath(wireRoute(origin, pointFor(active, layout), layout));
  const selectedPath = routeTarget === null ? null : pointsPath(wireRoute(origin, pointFor(routeTarget, layout), layout));

  return (
    <div className={`${styles.graph} ${mobile ? styles.mobileGraph : styles.desktopGraph}`}>
      <svg className={styles.graphLines} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`constellation-line-${layout}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2={height}>
            <stop stopColor="#6ACD51" stopOpacity="0.23" />
            <stop offset="0.5" stopColor="#D5E8D7" stopOpacity="0.31" />
            <stop offset="1" stopColor="#72C94F" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <path className={styles.link} pathLength={1} style={{ animationDelay: "0.06s" }} d={pointsPath([origin, pointFor(0, layout)])} stroke={`url(#constellation-line-${layout})`} fill="none" />
        <circle className={styles.origin} cx={origin.x} cy={origin.y} r="2.6" />
        {links.map(([a, b], index) => {
          return <path
            key={`${a}-${b}`}
            className={styles.link}
            pathLength={1}
            style={{ animationDelay: `${edgeDelays[index]}s` }}
            d={pointsPath(edgePoints(a, b, layout))}
            stroke={`url(#constellation-line-${layout})`}
            fill="none"
          />;
        })}
        {crossLinks.map(([a, b]) =>
          <path key={`${a}-${b}`} className={styles.link}
            pathLength={1} style={{ animationDelay: "4.25s" }} d={pointsPath(edgePoints(a, b, layout))}
            stroke={`url(#constellation-line-${layout})`} fill="none" />
        )}
        {hoverPath && <path key={active} d={hoverPath} pathLength={1} className={styles.activeRoute} />}
        {selectedPath && <path d={selectedPath} className={styles.route} />}
      </svg>
      <TravelGhost layout={layout} target={routeTarget} trip={trip} reducedMotion={reducedMotion} />
      {concepts.map((concept, index) => {
        const point = pointFor(index, layout);
        return (
          <button
            key={concept.name}
            type="button"
            data-constellation-node={index}
            className={`${styles.node} ${active === index ? styles.nodeActive : ""} ${selected === index ? styles.nodeSelected : ""}`}
            style={{ left: `${point.x / width * 100}%`, top: `${point.y / height * 100}%`, animationDelay: `${nodeDelays[index]}s` }}
            aria-label={`Scopri ${concept.name}`}
            aria-expanded={selected === index}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(index)}
          >
            <span className={styles.nodeHalo} />
            <span className={styles.nodeCore} />
            <span className={styles.nodeLabel}>{concept.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function KnowledgeConstellation() {
  const sectionRef = useRef<HTMLElement>(null);
  const clientsSnapRef = useRef(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [routeTarget, setRouteTarget] = useState<number | null>(null);
  const [trip, setTrip] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [composed, setComposed] = useState(false);
  const active = hovered;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    if (query.matches) setComposed(true);
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || composed) return;
    let settleTimer = 0;
    const checkSettled = () => {
      const rect = section.getBoundingClientRect();
      if (Math.abs(rect.top) <= 4 && rect.height <= window.innerHeight + 4) {
        setComposed(true);
      }
    };
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(checkSettled, 190);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(settleTimer);
    };
  }, [composed]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const statementIncomplete = () => {
      const previous = section.previousElementSibling;
      return previous instanceof HTMLElement && previous.hasAttribute("data-brand-statement")
        && previous.dataset.typingComplete !== "true"
        && previous.getBoundingClientRect().bottom > window.innerHeight * 0.35;
    };
    let snapTimer = 0;
    let lastScrollY = window.scrollY;
    let settlingTimer = 0;
    const snap = () => {
      if (statementIncomplete()) return;
      const rect = section.getBoundingClientRect();
      if (rect.top >= window.innerHeight * 0.95
        || rect.top < -window.innerHeight * 0.35
        || (rect.top <= 2 && composed)) return;
      section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      snapTimer = window.setTimeout(() => { snapTimer = 0; }, 900);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || statementIncomplete()) return;
      const top = section.getBoundingClientRect().top;
      if (event.deltaY <= 0 || event.ctrlKey || top > window.innerHeight + 8
        || top < -window.innerHeight * 0.35 || (top <= 2 && composed)) return;
      event.preventDefault();
      if (snapTimer) return;
      section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      snapTimer = window.setTimeout(() => { snapTimer = 0; }, 900);
    };
    const onScroll = () => {
      const movingDown = window.scrollY > lastScrollY + 1;
      lastScrollY = window.scrollY;
      if ((!movingDown && composed) || snapTimer) return;
      window.clearTimeout(settlingTimer);
      settlingTimer = window.setTimeout(snap, 220);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    if (!composed) settlingTimer = window.setTimeout(snap, 220);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(snapTimer);
      window.clearTimeout(settlingTimer);
    };
  }, [composed, reducedMotion]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !composed) return;
    let lockedUntil = 0;
    let touchStartY = 0;
    const nextSection = () => {
      const next = section.nextElementSibling;
      return next instanceof HTMLElement && next.hasAttribute("data-clients-section") ? next : null;
    };
    const goToClients = () => {
      const next = nextSection();
      if (!next) return;
      clientsSnapRef.current = true;
      lockedUntil = performance.now() + 950;
      next.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0 || event.ctrlKey) return;
      if (performance.now() < lockedUntil) {
        event.preventDefault();
        return;
      }
      if (clientsSnapRef.current || !nextSection()) return;
      const rect = section.getBoundingClientRect();
      if (Math.abs(rect.top) > 4 || rect.bottom < window.innerHeight - 4) return;
      event.preventDefault();
      goToClients();
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.target instanceof Node && section.contains(event.target)) {
        touchStartY = event.touches[0]?.clientY ?? 0;
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (clientsSnapRef.current || !nextSection()) return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const rect = section.getBoundingClientRect();
      if (touchStartY - endY > 45 && rect.top <= 8 && rect.bottom > window.innerHeight * .35) {
        goToClients();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [composed, reducedMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || selected === null) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setSelected(null);
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [selected]);

  const select = (index: number) => {
    setRouteTarget(index);
    if (routeTarget !== index) setTrip((current) => current + 1);
    setSelected(index);
  };

  const moveLight = (event: PointerEvent<HTMLElement>) => {
    const section = sectionRef.current;
    if (!section || event.pointerType === "touch") return;
    const node = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-constellation-node]")
      : null;
    setHovered(node ? Number(node.dataset.constellationNode) : null);
    const rect = section.getBoundingClientRect();
    section.style.setProperty("--light-x", `${event.clientX - rect.left}px`);
    section.style.setProperty("--light-y", `${event.clientY - rect.top}px`);
  };

  return (
    <section ref={sectionRef} className={`${styles.section} ${composed ? styles.composed : ""}`} aria-labelledby="constellation-title" onPointerMove={moveLight} onPointerLeave={() => setHovered(null)}>
      <div className={styles.intro}>
        <h2 id="constellation-title">Nel metodo Evolve tutto è connesso.</h2>
      </div>
      <Graph layout="desktop" active={active} selected={selected} routeTarget={routeTarget} trip={trip} reducedMotion={reducedMotion} onHover={setHovered} onSelect={select} />
      <Graph layout="mobile" active={active} selected={selected} routeTarget={routeTarget} trip={trip} reducedMotion={reducedMotion} onHover={setHovered} onSelect={select} />
      {selected !== null && (
        <aside className={`${styles.detail} ${isUpperBranch(selected) ? styles.detailBelow : ""}`} aria-labelledby="concept-title" key={selected}>
          <div className={styles.detailTop}>
            <span>EVOLVE / {String(selected + 1).padStart(2, "0")}</span>
            <button type="button" className={styles.close} aria-label="Chiudi scheda" onClick={() => setSelected(null)}>×</button>
          </div>
          <div className={styles.detailMarker} aria-hidden="true" />
          <h3 id="concept-title">{concepts[selected].name}</h3>
          <p>{concepts[selected].text}</p>
        </aside>
      )}
    </section>
  );
}
