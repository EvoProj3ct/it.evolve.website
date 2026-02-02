"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Phase = "maze" | "fright" | "reveal";
type Cell = { x: number; y: number };

type Grid = {
    cols: number;
    rows: number;
    // true = wall, false = path
    walls: boolean[][];
};

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}

function key(x: number, y: number) {
    return `${x},${y}`;
}

function neighbors4(x: number, y: number) {
    return [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
    ];
}

// BFS shortest path inside corridors
function bfsPath(grid: Grid, start: Cell, goal: Cell): Cell[] {
    const { cols, rows, walls } = grid;
    const q: Cell[] = [start];
    const prev = new Map<string, string>();
    const seen = new Set<string>([key(start.x, start.y)]);

    const isInside = (c: Cell) => c.x >= 0 && c.x < cols && c.y >= 0 && c.y < rows;
    const isFree = (c: Cell) => !walls[c.y][c.x];

    while (q.length) {
        const cur = q.shift()!;
        if (cur.x === goal.x && cur.y === goal.y) break;

        for (const n of neighbors4(cur.x, cur.y)) {
            if (!isInside(n) || !isFree(n)) continue;
            const k = key(n.x, n.y);
            if (seen.has(k)) continue;
            seen.add(k);
            prev.set(k, key(cur.x, cur.y));
            q.push(n);
        }
    }

    const gk = key(goal.x, goal.y);
    if (!seen.has(gk)) return [start];

    const path: Cell[] = [];
    let curKey = gk;
    while (curKey !== key(start.x, start.y)) {
        const [sx, sy] = curKey.split(",").map(Number);
        path.push({ x: sx, y: sy });
        const p = prev.get(curKey);
        if (!p) break;
        curKey = p;
    }
    path.push(start);
    path.reverse();
    return path;
}

// “Pacman-ish” maze connected
function makeMaze(cols: number, rows: number): Grid {
    const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));

    const carve = (x: number, y: number) => {
        if (x < 0 || x >= cols || y < 0 || y >= rows) return;
        walls[y][x] = false;
    };

    // border ring corridor
    for (let x = 1; x < cols - 1; x++) {
        carve(x, 1);
        carve(x, rows - 2);
    }
    for (let y = 1; y < rows - 1; y++) {
        carve(1, y);
        carve(cols - 2, y);
    }

    // vertical spines + horizontals
    const vLines = [Math.floor(cols * 0.25), Math.floor(cols * 0.5), Math.floor(cols * 0.75)];
    for (const vx of vLines) {
        for (let y = 2; y < rows - 2; y++) carve(vx, y);
    }

    const hLines = [Math.floor(rows * 0.33), Math.floor(rows * 0.66)];
    for (const hy of hLines) {
        for (let x = 2; x < cols - 2; x++) carve(x, hy);
    }

    // pockets
    for (let x = 3; x < cols - 3; x += 4) {
        carve(x, 2);
        carve(x, rows - 3);
    }
    for (let y = 3; y < rows - 3; y += 3) {
        carve(2, y);
        carve(cols - 3, y);
    }

    // center hub
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    for (let dx = -2; dx <= 2; dx++) carve(cx + dx, cy);
    for (let dy = -2; dy <= 2; dy++) carve(cx, cy + dy);

    // rooms
    const carveRect = (x0: number, y0: number, w: number, h: number) => {
        for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) carve(x, y);
    };
    carveRect(3, 3, 4, 2);
    carveRect(cols - 7, 3, 4, 2);
    carveRect(3, rows - 5, 4, 2);
    carveRect(cols - 7, rows - 5, 4, 2);

    // connectivity safety
    const hub: Cell = { x: cx, y: cy };
    const freeCells: Cell[] = [];
    for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) if (!walls[y][x]) freeCells.push({ x, y });

    const reachable = new Set<string>();
    const q: Cell[] = [hub];
    reachable.add(key(hub.x, hub.y));
    while (q.length) {
        const c = q.shift()!;
        for (const n of neighbors4(c.x, c.y)) {
            if (n.x < 0 || n.x >= cols || n.y < 0 || n.y >= rows) continue;
            if (walls[n.y][n.x]) continue;
            const k = key(n.x, n.y);
            if (reachable.has(k)) continue;
            reachable.add(k);
            q.push(n);
        }
    }

    for (const c of freeCells) {
        if (reachable.has(key(c.x, c.y))) continue;
        let x = c.x;
        let y = c.y;
        while (x !== hub.x) {
            x += x < hub.x ? 1 : -1;
            carve(x, y);
        }
        while (y !== hub.y) {
            y += y < hub.y ? 1 : -1;
            carve(x, y);
        }
    }

    return { cols, rows, walls };
}

function pickFreeCell(grid: Grid, near?: Cell): Cell {
    const { cols, rows, walls } = grid;
    if (!near) {
        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                if (!walls[y][x]) return { x, y };
            }
        }
        return { x: 1, y: 1 };
    }

    let best: Cell | null = null;
    let bestD = Infinity;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (walls[y][x]) continue;
            const d = Math.abs(x - near.x) + Math.abs(y - near.y);
            if (d < bestD) {
                bestD = d;
                best = { x, y };
            }
        }
    }
    return best ?? { x: 1, y: 1 };
}

function GhostMark({ color, size = 22 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: "block" }}>
            <path
                d="M32 7c-11.6 0-21 9.4-21 21v25.3c0 1.4 1.6 2.3 2.8 1.5l6.2-4.4 6.1 4.4c.7.5 1.6.5 2.3 0l5.6-4 5.6 4c.7.5 1.6.5 2.3 0l6.1-4.4 6.2 4.4c1.2.8 2.8-.1 2.8-1.5V28c0-11.6-9.4-21-21-21Z"
                fill={color}
            />
            <circle cx="25" cy="29" r="7.2" fill="#ffffff" />
            <circle cx="41" cy="29" r="7.2" fill="#ffffff" />
            <circle cx="27.8" cy="31.5" r="3.6" fill="rgba(17,24,39,0.95)" />
            <circle cx="43.8" cy="31.5" r="3.6" fill="rgba(17,24,39,0.95)" />
        </svg>
    );
}

/** fallback leggero: solo 3 puntini bianchi su grigio */
function LightDots() {
    return (
        <div style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.9)",
                        display: "block",
                    }}
                    animate={{ opacity: [0.18, 1, 0.18] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.16 }}
                />
            ))}
        </div>
    );
}

function MazeCanvas({
                        grid,
                        cellPx,
                        hole,
                        dotActive,
                    }: {
    grid: Grid;
    cellPx: number;
    hole: { x: number; y: number; w: number; h: number };
    dotActive: number; // 0..2
}) {
    const { cols, rows, walls } = grid;
    const w = cols * cellPx;
    const h = rows * cellPx;

    const inHole = (x: number, y: number) => x >= hole.x && x < hole.x + hole.w && y >= hole.y && y < hole.y + hole.h;

    const wallRects: { x: number; y: number }[] = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (!walls[y][x]) continue;
            if (inHole(x, y)) continue; // buco fatto coi mattoni
            wallRects.push({ x, y });
        }
    }

    // dots-mattoni nella parte alta del buco
    const dotsRow = hole.y + 1;
    const dotsStartX = hole.x + Math.floor((hole.w - 3) / 2);

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
            <rect x="0" y="0" width={w} height={h} fill="transparent" />

            {wallRects.map((r, i) => (
                <rect
                    key={i}
                    x={r.x * cellPx}
                    y={r.y * cellPx}
                    width={cellPx}
                    height={cellPx}
                    rx={cellPx * 0.32}
                    ry={cellPx * 0.32}
                    fill="rgba(255,255,255,0.92)"
                />
            ))}

            {/* 3 “puntini” coi MATTONI */}
            {[0, 1, 2].map((i) => (
                <rect
                    key={`dot-${i}`}
                    x={(dotsStartX + i) * cellPx}
                    y={dotsRow * cellPx}
                    width={cellPx}
                    height={cellPx}
                    rx={cellPx * 0.32}
                    ry={cellPx * 0.32}
                    fill="rgba(255,255,255,0.92)"
                    opacity={i === dotActive ? 1 : 0.22}
                />
            ))}

            <rect x="0" y="0" width={w} height={h} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>
    );
}

export function IntroLoaderGhosts() {
    const [show, setShow] = useState(true);
    const [phase, setPhase] = useState<Phase>("maze");

    const curtainColor = "#20222b";

    // tempi (ok come li vuoi)
    const MAZE_TIME = 1200;
    const FRIGHT_TIME = 900;
    const REVEAL_DELAY = 110;
    const CURTAIN_DURATION_S = 0.4;

    const TILE_MS_NORMAL = 160;
    const TILE_MS_FRIGHt = 50;

    const cols = 30;
    const rows = 14;
    const grid = useMemo(() => makeMaze(cols, rows), [cols, rows]);

    // calcolo cellPx prima possibile (ma resta client)
    const [cellPx, setCellPx] = useState(0);

    const computeCellPx = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pad = 28;
        const maxCellW = Math.floor((vw - pad * 2) / cols);
        const maxCellH = Math.floor((vh - pad * 2) / rows);
        return clamp(Math.min(maxCellW, maxCellH), 16, 44);
    };

    useLayoutEffect(() => {
        setCellPx(computeCellPx());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onResize = () => setCellPx(computeCellPx());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ se hai messo lo splash SSR, lo togliamo quando il loader monta
    useEffect(() => {
        const el = document.getElementById("ssr-splash");
        if (el) el.remove();
    }, []);

    // ghost positions
    const [g1, setG1] = useState<Cell>(() => pickFreeCell(grid, { x: 2, y: 2 }));
    const [g2, setG2] = useState<Cell>(() => pickFreeCell(grid, { x: cols - 3, y: 2 }));
    const [g3, setG3] = useState<Cell>(() => pickFreeCell(grid, { x: cols - 3, y: rows - 3 }));

    const hub = useMemo<Cell>(() => ({ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }), [cols, rows]);

    const goalsRef = useRef<{ g1: Cell; g2: Cell; g3: Cell }>({
        g1: hub,
        g2: { x: 2, y: rows - 3 },
        g3: { x: cols - 3, y: 2 },
    });

    const pickNewGoal = (who: "g1" | "g2" | "g3") => {
        const anchors: Cell[] = [
            { x: 2, y: 2 },
            { x: cols - 3, y: 2 },
            { x: 2, y: rows - 3 },
            { x: cols - 3, y: rows - 3 },
            hub,
            { x: Math.floor(cols * 0.25), y: Math.floor(rows * 0.33) },
            { x: Math.floor(cols * 0.75), y: Math.floor(rows * 0.66) },
        ];
        const target = anchors[(Math.random() * anchors.length) | 0];
        goalsRef.current[who] = pickFreeCell(grid, target);
    };

    // brick-dots state
    const [dotActive, setDotActive] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setDotActive((v) => (v + 1) % 3), 220);
        return () => window.clearInterval(id);
    }, []);

    // phases
    useEffect(() => {
        const frightAt = MAZE_TIME;
        const revealAt = frightAt + FRIGHT_TIME + REVEAL_DELAY;
        const hideAt = revealAt + Math.round(CURTAIN_DURATION_S * 1000) + 120;

        const t1 = setTimeout(() => setPhase("fright"), frightAt);
        const t2 = setTimeout(() => setPhase("reveal"), revealAt);
        const t3 = setTimeout(() => setShow(false), hideAt);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    // movement
    useEffect(() => {
        if (!show) return;

        let alive = true;
        const tick = () => {
            if (!alive) return;

            const tileMs = phase === "fright" ? TILE_MS_FRIGHt : TILE_MS_NORMAL;

            const stepOne = (pos: Cell, who: "g1" | "g2" | "g3") => {
                const goal = goalsRef.current[who];
                const path = bfsPath(grid, pos, goal);
                if (path.length <= 1) {
                    pickNewGoal(who);
                    return pos;
                }
                return path[1];
            };

            setG1((p) => stepOne(p, "g1"));
            setG2((p) => stepOne(p, "g2"));
            setG3((p) => stepOne(p, "g3"));

            window.setTimeout(tick, tileMs);
        };

        pickNewGoal("g1");
        pickNewGoal("g2");
        pickNewGoal("g3");

        const id = window.setTimeout(tick, 60);

        return () => {
            alive = false;
            window.clearTimeout(id);
        };
    }, [grid, phase, show]);

    // ✅ buco più alto per avere “spazio nero sotto i puntini” per LOADING grande
    const holeW = 13;
    const holeH = 5;
    const hole = {
        x: Math.floor(cols / 2) - Math.floor(holeW / 2),
        y: Math.floor(rows / 2) - Math.floor(holeH / 2),
        w: holeW,
        h: holeH,
    };

    // ✅ UNA SOLA TRANSIZIONE: colorati -> bianchi e stop
    const ghostsAreWhite = phase !== "maze";

    // se cellPx non è pronto: overlay leggerissimo (mai mostrare la home “da sotto”)
    const mazeReady = cellPx > 0;

    const mazeW = cols * (mazeReady ? cellPx : 1);
    const mazeH = rows * (mazeReady ? cellPx : 1);
    const toPx = (c: Cell) => ({
        x: c.x * cellPx + cellPx / 2,
        y: c.y * cellPx + cellPx / 2,
    });

    // posizione testo LOADING nel buco, sotto i puntini
    const holePx = mazeReady
        ? {
            left: hole.x * cellPx,
            top: hole.y * cellPx,
            width: hole.w * cellPx,
            height: hole.h * cellPx,
        }
        : { left: 0, top: 0, width: 0, height: 0 };

    const loadingTopPx = mazeReady ? (hole.y + 3.25) * cellPx : 0; // sotto dotsRow=hole.y+1

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0"
                    style={{
                        zIndex: 9999,
                        background: curtainColor, // ✅ copre sempre la pagina sotto
                    }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 1 }}
                    transition={{ duration: 0 }}
                >
                    {/* fallback super leggero mentre il maze non è pronto */}
                    {!mazeReady && (
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                display: "grid",
                                placeItems: "center",
                                zIndex: 30000,
                                pointerEvents: "none",
                            }}
                        >
                            <LightDots />
                        </div>
                    )}

                    {/* MAZE */}
                    {mazeReady && (
                        <motion.div
                            style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 20000,
                                display: "grid",
                                placeItems: "center",
                                pointerEvents: "none",
                            }}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: phase === "reveal" ? 0 : 1 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                            <div
                                style={{
                                    width: mazeW,
                                    height: mazeH,
                                    maxWidth: "92vw",
                                    maxHeight: "86vh",
                                    transform: "translateZ(0)",
                                    filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.35))",
                                }}
                            >
                                {/* background behind maze */}
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: -18,
                                        borderRadius: 22,
                                        background: "rgba(43,45,54,0.65)",
                                        border: "1px solid rgba(255,255,255,0.10)",
                                        backdropFilter: "blur(8px)",
                                    }}
                                />

                                <div style={{ position: "relative", width: mazeW, height: mazeH }}>
                                    <MazeCanvas grid={grid} cellPx={cellPx} hole={hole} dotActive={dotActive} />

                                    {/* LOADING grande nel buco sotto i puntini */}
                                    <motion.div
                                        style={{
                                            position: "absolute",
                                            left: holePx.left + holePx.width / 2,
                                            top: loadingTopPx,
                                            transform: "translate(-50%, -50%)",
                                            fontSize: Math.round(cellPx * 0.62),
                                            letterSpacing: "0.22em",
                                            fontWeight: 900,
                                            textTransform: "uppercase",
                                            color: "rgba(255,255,255,0.86)",
                                            textShadow: "0 18px 40px rgba(0,0,0,0.35)",
                                            pointerEvents: "none",
                                            whiteSpace: "nowrap",
                                        }}
                                        animate={{ opacity: [0.35, 1, 0.35] }}
                                        transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        LOADING
                                    </motion.div>

                                    {/* pellet flash */}
                                    <motion.div
                                        style={{
                                            position: "absolute",
                                            left: "50%",
                                            top: "50%",
                                            width: 10,
                                            height: 10,
                                            borderRadius: 999,
                                            background: "#fff",
                                            transform: "translate(-50%,-50%)",
                                        }}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={phase === "fright" ? { opacity: [0, 1, 0], scale: [0.8, 1.7, 1.0] } : { opacity: 0 }}
                                        transition={{ duration: 0.28, ease: "easeOut" }}
                                    />

                                    {/* ghosts */}
                                    {[
                                        { pos: g1, base: "#facc15" },
                                        { pos: g2, base: "#2563eb" },
                                        { pos: g3, base: "#a855f7" },
                                    ].map((g, i) => {
                                        const p = toPx(g.pos);
                                        const size = clamp(Math.round(cellPx * 0.66), 16, 26);

                                        return (
                                            <motion.div
                                                key={i}
                                                style={{
                                                    position: "absolute",
                                                    left: p.x,
                                                    top: p.y,
                                                    transform: "translate(-50%,-60%)",
                                                    willChange: "transform",
                                                    filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.28))",
                                                }}
                                                animate={phase === "fright" ? { scale: [1, 1.05, 1], rotate: [0, -2, 2, 0] } : { scale: 1, rotate: 0 }}
                                                transition={phase === "fright" ? { duration: 0.16, repeat: 6, ease: "easeInOut" } : { duration: 0.1 }}
                                            >
                                                <GhostMark color={ghostsAreWhite ? "#ffffff" : g.base} size={size} />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* tende */}
                    <motion.div
                        style={{
                            position: "fixed",
                            left: 0,
                            top: 0,
                            width: "100vw",
                            height: "50vh",
                            background: curtainColor,
                            zIndex: 10000,
                            transform: "translateZ(0)",
                        }}
                        initial={{ y: "0%" }}
                        animate={{ y: phase === "reveal" ? "-105%" : "0%" }}
                        transition={{ duration: CURTAIN_DURATION_S, delay: 0, ease: [0.9, 0.0, 1.0, 0.45] }}
                    />
                    <motion.div
                        style={{
                            position: "fixed",
                            left: 0,
                            bottom: 0,
                            width: "100vw",
                            height: "50vh",
                            background: curtainColor,
                            zIndex: 10000,
                            transform: "translateZ(0)",
                        }}
                        initial={{ y: "0%" }}
                        animate={{ y: phase === "reveal" ? "105%" : "0%" }}
                        transition={{ duration: CURTAIN_DURATION_S, delay: 0, ease: [0.9, 0.0, 1.0, 0.45] }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
