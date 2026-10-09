"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./GhostMazeHero.module.css";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Maze = { nodes: Point[]; walls: [Point, Point][]; neighbors: number[][] };
type GhostState = {
  at: number;
  next: number;
  previous: number;
  t: number;
  speed: number;
  phase: "chase" | "returning" | "resting" | "respawning";
  phaseStarted: number;
  immuneUntil: number;
};

// Three existing brand colors: green, violet and coral-red (documentation/brand/palette.md).
const GHOST_COLORS = ["#72C94F", "#8567C1", "#FF6666"] as const;
const MAZE_CELL_SIZE = 48;
const GHOST_SAFE_INSET = 18;

function mazeDimensions({ width, height }: Size) {
  // Fixed square cells retain the crisp, consistent maze strokes.
  const cols = clamp(Math.ceil(width / MAZE_CELL_SIZE) + 1, 7, 48);
  const rows = clamp(Math.floor(height / MAZE_CELL_SIZE) + 1, 8, 19);
  return {
    cols,
    rows,
    originX: Math.round((width - cols * MAZE_CELL_SIZE) / 2),
    originY: Math.round((height - rows * MAZE_CELL_SIZE) / 2),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomGenerator(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createMaze({ width, height }: Size): Maze {
  const { cols, rows, originX, originY } = mazeDimensions({ width, height });
  const homeCenter = 2 * cols + cols - 3;
  const homeCells = new Set([homeCenter - 1, homeCenter, homeCenter + 1]);
  const homeEntrance = homeCenter + cols;
  const allowsPassage = (a: number, b: number) => {
    const aIsHome = homeCells.has(a);
    const bIsHome = homeCells.has(b);
    if (!aIsHome && !bIsHome) return true;
    if (aIsHome && bIsHome) return Math.abs(a - b) === 1;
    return (a === homeCenter && b === homeEntrance)
      || (b === homeCenter && a === homeEntrance);
  };
  const nodes: Point[] = Array.from({ length: cols * rows }, (_, index) => ({
    x: originX + (index % cols + 0.5) * MAZE_CELL_SIZE,
    y: originY + (Math.floor(index / cols) + 0.5) * MAZE_CELL_SIZE,
  }));
  const candidates = nodes.map((_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return [
      col > 0 ? index - 1 : -1,
      col < cols - 1 ? index + 1 : -1,
      row > 0 ? index - cols : -1,
      row < rows - 1 ? index + cols : -1,
    ].filter((neighbor) => neighbor >= 0 && allowsPassage(index, neighbor));
  });
  const random = randomGenerator(cols * 917 + rows * 611);
  const visited = new Set([0]);
  const stack = [0];
  const edges: [number, number][] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (a: number, b: number) => {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push([a, b]);
  };

  // A connected maze keeps every ghost on a valid path to the pointer.
  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = candidates[current].filter((neighbor) => !visited.has(neighbor));
    if (!options.length) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(random() * options.length)];
    addEdge(current, next);
    visited.add(next);
    stack.push(next);
  }

  // Loops keep the path toward the pointer responsive without opening every wall.
  candidates.forEach((options, index) => {
    options.forEach((neighbor) => {
      if (neighbor > index && random() < 0.04) addEdge(index, neighbor);
    });
  });

  // Connect the on-screen corridors before the wall outlines are traced.
  // Ghosts can then stay inside visible cells without crossing a drawn wall.
  const safe = nodes.map(({ x, y }) => x >= GHOST_SAFE_INSET && x <= width - GHOST_SAFE_INSET
    && y >= GHOST_SAFE_INSET && y <= height - GHOST_SAFE_INSET);
  const parent = nodes.map((_, index) => index);
  const root = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  const join = (a: number, b: number) => { parent[root(a)] = root(b); };
  edges.forEach(([a, b]) => { if (safe[a] && safe[b]) join(a, b); });
  const connectors: [number, number][] = [];
  candidates.forEach((options, a) => {
    if (!safe[a]) return;
    options.forEach((b) => { if (b > a && safe[b]) connectors.push([a, b]); });
  });
  for (let i = connectors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [connectors[i], connectors[j]] = [connectors[j], connectors[i]];
  }
  connectors.forEach(([a, b]) => {
    if (root(a) === root(b)) return;
    addEdge(a, b);
    join(a, b);
  });

  const neighbors = nodes.map(() => [] as number[]);
  edges.forEach(([a, b]) => {
    neighbors[a].push(b);
    neighbors[b].push(a);
  });

  // Outline the joined corridors. Every line belongs to a closed contour, with no loose wall ends.
  const walls: [Point, Point][] = [];
  const tile = MAZE_CELL_SIZE / 2;
  const tileCols = cols * 2 - 1;
  const tileRows = rows * 2 - 1;
  const tileX = originX + tile / 2;
  const tileY = originY + tile / 2;
  const occupied = new Uint8Array(tileCols * tileRows);
  nodes.forEach((_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    occupied[(row * 2) * tileCols + col * 2] = 1;
  });
  edges.forEach(([a, b]) => {
    const aCol = a % cols;
    const aRow = Math.floor(a / cols);
    const bCol = b % cols;
    const bRow = Math.floor(b / cols);
    occupied[(aRow + bRow) * tileCols + aCol + bCol] = 1;
  });
  const isOccupied = (col: number, row: number) =>
    col >= 0 && col < tileCols && row >= 0 && row < tileRows
      ? occupied[row * tileCols + col] === 1
      : false;

  for (let row = 0; row <= tileRows; row++) {
    let run = -1;
    for (let col = 0; col <= tileCols; col++) {
      const exposed = col < tileCols && isOccupied(col, row - 1) !== isOccupied(col, row);
      if (exposed && run < 0) run = col;
      if (!exposed && run >= 0) {
        const y = tileY + row * tile;
        walls.push([{ x: tileX + run * tile, y }, { x: tileX + col * tile, y }]);
        run = -1;
      }
    }
  }
  for (let col = 0; col <= tileCols; col++) {
    let run = -1;
    for (let row = 0; row <= tileRows; row++) {
      const exposed = row < tileRows && isOccupied(col - 1, row) !== isOccupied(col, row);
      if (exposed && run < 0) run = row;
      if (!exposed && run >= 0) {
        const x = tileX + col * tile;
        walls.push([{ x, y: tileY + run * tile }, { x, y: tileY + row * tile }]);
        run = -1;
      }
    }
  }
  return { nodes, walls, neighbors };
}

function nearestNode(nodes: Point[], point: Point, candidates: number[]) {
  let nearest = candidates[0] ?? 0;
  let best = Infinity;
  candidates.forEach((index) => {
    const node = nodes[index];
    const distance = (node.x - point.x) ** 2 + (node.y - point.y) ** 2;
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  return nearest;
}

function distancesFrom(neighbors: number[][], target: number) {
  const distances = Array(neighbors.length).fill(Infinity) as number[];
  const queue = [target];
  distances[target] = 0;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const neighbor of neighbors[current]) {
      if (distances[neighbor] !== Infinity) continue;
      distances[neighbor] = distances[current] + 1;
      queue.push(neighbor);
    }
  }
  return distances;
}

function Ghost({
  color,
  bodyRef,
  pupilRef,
}: {
  color: string;
  bodyRef: (element: SVGPathElement | null) => void;
  pupilRef: (element: SVGGElement | null) => void;
}) {
  return (
    <g className={styles.ghostShape}>
      <path
        ref={bodyRef}
        d="M-4-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H-3V6H-6V8H-10V-4H-8V-6H-6V-8H-4Z"
        fill={color}
      />
      <rect x="-6" y="-2" width="4" height="5" fill="#FCFDFB" />
      <rect x="2" y="-2" width="4" height="5" fill="#FCFDFB" />
      <g ref={pupilRef}>
        <rect x="-4" y="0" width="2" height="2" fill="#15221A" />
        <rect x="4" y="0" width="2" height="2" fill="#15221A" />
      </g>
    </g>
  );
}

export function GhostMazeHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const lightRef = useRef<SVGCircleElement>(null);
  const maskRef = useRef<SVGCircleElement>(null);
  const ghostRefs = useRef<(SVGGElement | null)[]>([]);
  const ghostBodyRefs = useRef<(SVGPathElement | null)[]>([]);
  const ghostPupilRefs = useRef<(SVGGElement | null)[]>([]);
  const pointerRef = useRef({ x: 600, y: 440, active: false, lastMovedAt: 0 });
  const [size, setSize] = useState<Size>({ width: 1200, height: 720 });
  const maze = useMemo(() => createMaze(size), [size]);
  const homeNode = useMemo(() => {
    const { cols } = mazeDimensions(size);
    return 2 * cols + cols - 3;
  }, [size]);
  const safeGhostNodes = useMemo(() => maze.nodes.reduce<number[]>((safe, point, index) => {
    if (point.x >= GHOST_SAFE_INSET && point.x <= size.width - GHOST_SAFE_INSET
      && point.y >= GHOST_SAFE_INSET && point.y <= size.height - GHOST_SAFE_INSET) safe.push(index);
    return safe;
  }, []), [maze, size]);
  const safeGhostNeighbors = useMemo(() => {
    const safe = new Set(safeGhostNodes);
    return maze.neighbors.map((links, index) => safe.has(index) ? links.filter((next) => safe.has(next)) : []);
  }, [maze, safeGhostNodes]);
  const ghostStarts = useMemo(() => {
    const { cols, rows } = mazeDimensions(size);
    const anchor = Math.floor(rows * (size.width < 640 ? 0.78 : 0.72)) * cols
      + Math.floor(cols * (size.width < 640 ? 0.5 : 0.78));
    return [anchor - 1, anchor + 1, Math.min(maze.nodes.length - 1, anchor + cols)]
      .map((node) => nearestNode(maze.nodes, maze.nodes[clamp(node, 0, maze.nodes.length - 1)], safeGhostNodes));
  }, [maze, safeGhostNodes, size]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (!width || !height) return;
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
      pointerRef.current.x = width < 640 ? width / 2 : width * 0.78;
      pointerRef.current.y = height * (width < 640 ? 0.78 : 0.72);
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const trackPointer = (event: PointerEvent) => {
      const bounds = section.getBoundingClientRect();
      const insideHero = event.clientX >= bounds.left && event.clientX <= bounds.right
        && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      const nav = document.querySelector<HTMLElement>("[data-evolve-nav]");
      const overOpenNav = nav?.dataset.menuOpen === "true" && event.target instanceof Node && nav.contains(event.target);
      if (!insideHero || overOpenNav) {
        if (event.pointerType !== "touch") pointerRef.current.active = false;
        return;
      }
      const pointer = pointerRef.current;
      pointer.x = clamp(event.clientX - bounds.left, 0, bounds.width);
      pointer.y = clamp(event.clientY - bounds.top, 0, bounds.height);
      pointer.active = true;
      pointer.lastMovedAt = performance.now();
    };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    window.addEventListener("pointerdown", trackPointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("pointerdown", trackPointer);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let lockedUntil = 0;
    let touchStartY = 0;
    const isHeroActive = () => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= 96 && bounds.bottom > window.innerHeight * 0.35;
    };
    const goToNextSection = () => {
      const next = section.nextElementSibling;
      if (!(next instanceof HTMLElement)) return;
      lockedUntil = performance.now() + 900;
      next.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0 || event.ctrlKey) return;
      if (performance.now() < lockedUntil) {
        event.preventDefault();
        return;
      }
      if (!(event.target instanceof Node) || !section.contains(event.target)) return;
      if (!isHeroActive()) return;
      event.preventDefault();
      goToNextSection();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      if (touchStartY - endY > 45 && isHeroActive()) goToNextSection();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !lightRef.current || !maskRef.current || ghostRefs.current.some((ghost) => !ghost)) return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ghosts: GhostState[] = ghostStarts.map((at, index) => ({
      at,
      next: at,
      previous: -1,
      t: 0,
      speed: [154, 138, 122][index],
      phase: "chase",
      phaseStarted: 0,
      immuneUntil: 0,
    }));
    let frame = 0;
    let visible = false;
    let previousTime = 0;
    let elapsed = 0;
    let x = size.width * (size.width < 640 ? 0.5 : 0.78);
    let y = size.height * (size.width < 640 ? 0.78 : 0.72);
    let lagX = x;
    let lagY = y;

    const chooseNext = (ghost: GhostState, target: number, index: number) => {
      const options = safeGhostNeighbors[ghost.at];
      if (!options.length) return ghost.at;
      const distances = distancesFrom(safeGhostNeighbors, target);
      return options.reduce((best, option) => {
        const score = distances[option] + (option === ghost.previous ? 0.35 : 0);
        const bestScore = distances[best] + (best === ghost.previous ? 0.35 : 0);
        if (score < bestScore) return option;
        if (score === bestScore && (option + index) % 3 < (best + index) % 3) return option;
        return best;
      }, options[0]);
    };

    const paint = (time: number) => {
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0.016;
      previousTime = time;
      elapsed += delta;
      const pointer = pointerRef.current;
      const restX = size.width * (size.width < 640 ? 0.5 : 0.78);
      const restY = size.height * (size.width < 640 ? 0.78 : 0.72);
      const idleX = restX + Math.sin(elapsed * 0.43) * Math.min(56, size.width * 0.06);
      const idleY = restY + Math.sin(elapsed * 0.37) * 20;
      const targetX = motionQuery.matches ? restX : pointer.active ? pointer.x : idleX;
      const targetY = motionQuery.matches ? restY : pointer.active ? pointer.y : idleY;
      const oldX = x;
      const oldY = y;
      const ease = 1 - Math.exp(-delta * 8);
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      lagX += (x - lagX) * (1 - Math.exp(-delta * 1.7));
      lagY += (y - lagY) * (1 - Math.exp(-delta * 1.7));
      const velocityX = (x - oldX) / delta;
      const velocityY = (y - oldY) / delta;
      const scrollProgress = clamp(-section.getBoundingClientRect().top / (size.height * 0.9), 0, 1);
      const radius = (size.width < 640 ? 160 : 270) + (pointer.active ? 12 : 0) + scrollProgress * 60;
      for (const circle of [lightRef.current, maskRef.current]) {
        circle?.setAttribute("cx", x.toFixed(1));
        circle?.setAttribute("cy", y.toFixed(1));
        circle?.setAttribute("r", radius.toFixed(1));
      }
      const targets = pointer.active ? [
        { x, y },
        { x: clamp(x + velocityX * 0.22, 0, size.width), y: clamp(y + velocityY * 0.22, 0, size.height) },
        { x: lagX, y: lagY },
      ] : [
        { x: clamp(x - 58, 0, size.width), y: clamp(y - 28, 0, size.height) },
        { x: clamp(x + 54, 0, size.width), y: clamp(y + 18, 0, size.height) },
        { x: clamp(x - 16, 0, size.width), y: clamp(y + 62, 0, size.height) },
      ];
      ghosts.forEach((ghost, index) => {
        if (motionQuery.matches) {
          const point = maze.nodes[ghost.at];
          ghostRefs.current[index]?.setAttribute("transform", `translate(${point.x} ${point.y})`);
          return;
        }
        if (ghost.phase !== "resting" && ghost.phase !== "respawning") {
          const returning = ghost.phase === "returning";
          const target = returning ? homeNode : nearestNode(maze.nodes, targets[index], safeGhostNodes);
          let remaining = (returning ? 240 : ghost.speed) * delta;
          while (remaining > 0) {
            if (returning && ghost.at === homeNode && ghost.next === ghost.at) break;
            if (ghost.next === ghost.at) ghost.next = chooseNext(ghost, target, index);
            const from = maze.nodes[ghost.at];
            const to = maze.nodes[ghost.next];
            const length = Math.hypot(to.x - from.x, to.y - from.y);
            if (!length) break;
            const distanceLeft = (1 - ghost.t) * length;
            if (remaining < distanceLeft) {
              ghost.t += remaining / length;
              remaining = 0;
            } else {
              remaining -= distanceLeft;
              ghost.previous = ghost.at;
              ghost.at = ghost.next;
              ghost.next = ghost.at;
              ghost.t = 0;
            }
          }
        }
        const from = maze.nodes[ghost.at];
        const to = maze.nodes[ghost.next];
        const ghostX = from.x + (to.x - from.x) * ghost.t;
        const ghostY = from.y + (to.y - from.y) * ghost.t;

        // Contact leaves just the two pixel eyes, which travel back through the corridors.
        if (ghost.phase === "chase" && pointer.active && time - pointer.lastMovedAt < 160
          && elapsed > ghost.immuneUntil
          && Math.hypot(ghostX - pointer.x, ghostY - pointer.y) < 19) {
          ghost.phase = "returning";
          ghost.phaseStarted = elapsed;
        }
        if (ghost.phase === "returning" && ghost.at === homeNode && ghost.next === ghost.at) {
          ghost.phase = "resting";
          ghost.phaseStarted = elapsed;
        }
        if (ghost.phase === "resting" && elapsed - ghost.phaseStarted >= 1) {
          ghost.phase = "respawning";
          ghost.phaseStarted = elapsed;
        }
        if (ghost.phase === "respawning" && elapsed - ghost.phaseStarted >= 1.12) {
          ghost.phase = "chase";
          ghost.immuneUntil = elapsed + 1.3;
          ghost.previous = -1;
        }

        const body = ghostBodyRefs.current[index];
        if (body) {
          const blinkIsWhite = Math.floor((elapsed - ghost.phaseStarted) / 0.28) % 2 === 0;
          const isRespawning = ghost.phase === "respawning";
          body.setAttribute("opacity", ghost.phase === "returning" || ghost.phase === "resting" ? "0" : "1");
          body.setAttribute("fill", isRespawning ? (blinkIsWhite ? "#EDF4ED" : "#1C2A20") : GHOST_COLORS[index]);
        }
        ghostPupilRefs.current[index]?.setAttribute("transform", `translate(${Math.sign(to.x - from.x)} ${Math.sign(to.y - from.y)})`);
        ghostRefs.current[index]?.setAttribute("transform", `translate(${ghostX.toFixed(1)} ${ghostY.toFixed(1)})`);
      });
      frame = visible ? window.requestAnimationFrame(paint) : 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) {
        previousTime = 0;
        frame = window.requestAnimationFrame(paint);
      } else if (!visible && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(section);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [ghostStarts, homeNode, maze, safeGhostNeighbors, safeGhostNodes, size]);

  return (
    <section
      ref={sectionRef}
      className={styles.hero}
      aria-label="Evolve: consulenza, software e stampa 3D"
    >
      <svg className={styles.scene} viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="ghost-maze-light">
            <stop offset="0%" stopColor="#E7F4E8" stopOpacity="0.54" />
            <stop offset="68%" stopColor="#EDF7EF" stopOpacity="0.31" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ghost-maze-mask">
            <stop offset="0%" stopColor="white" />
            <stop offset="78%" stopColor="white" stopOpacity="0.96" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id="ghost-maze-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width={size.width} height={size.height}>
            <rect width={size.width} height={size.height} fill="black" />
            <circle ref={maskRef} cx={size.width * (size.width < 640 ? 0.5 : 0.78)} cy={size.height * (size.width < 640 ? 0.78 : 0.72)} r="270" fill="url(#ghost-maze-mask)" />
          </mask>
        </defs>
        <circle ref={lightRef} cx={size.width * (size.width < 640 ? 0.5 : 0.78)} cy={size.height * (size.width < 640 ? 0.78 : 0.72)} r="270" fill="url(#ghost-maze-light)" />
        <g mask="url(#ghost-maze-reveal)" className={styles.mazeWalls}>
          {maze.walls.map(([from, to], index) => (
            <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
          ))}
        </g>
      </svg>

      <div className={styles.copyWash} aria-hidden="true" />
      <svg className={styles.ghostLayer} viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden="true">
        {GHOST_COLORS.map((color, index) => (
          <g key={color} ref={(element) => { ghostRefs.current[index] = element; }} transform={`translate(${maze.nodes[ghostStarts[index]].x} ${maze.nodes[ghostStarts[index]].y})`}>
            <Ghost
              color={color}
              bodyRef={(element) => { ghostBodyRefs.current[index] = element; }}
              pupilRef={(element) => { ghostPupilRefs.current[index] = element; }}
            />
          </g>
        ))}
      </svg>

      <div className={styles.copy}>
        <div className={styles.eyebrow}>EVOLVE</div>
        {/* Provisional copy for this visual study; original slides remain in HeroSlider and the inventory. */}
        <h1 className={styles.title}>Consulenza, software<br />e stampa 3D</h1>
        <p className={styles.description}>
          Progettiamo soluzioni integrate con l&apos;IA per migliorare il lavoro della tua azienda.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryLink} href="/about">
            <span>Scopri come</span>
            <svg className={styles.primaryArrow} aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M5 3h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" /></svg>
          </Link>
          <Link className={styles.secondaryLink} href="/contact">
            <span>Parliamo del tuo progetto</span>
            <svg className={styles.secondaryArrow} aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 8h10M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" /></svg>
          </Link>
        </div>
      </div>

    </section>
  );
}
