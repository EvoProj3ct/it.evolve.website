"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Service = {
    n: string;
    title: string;
    desc: string;
    ghost: string;
    accent: "yellow" | "blue" | "purple";
};

const services: Service[] = [
    { n: "01", title: "Consulenza", desc: "Definiamo obbiettivi, contesto e giusta taglia dell'intervento", ghost: "C", accent: "yellow" },
    { n: "02", title: "Analisi", desc: "Analizziamo e strutturiamo i tuoi processi aziendali", ghost: "A", accent: "blue" },
    { n: "03", title: "Sviluppo", desc: "Costruiamo sistemi digitali e soluzioni digitali su misura", ghost: "S", accent: "purple" },
];

const accentVar = (a: Service["accent"]) =>
    a === "yellow" ? "var(--accent-yellow)" : a === "blue" ? "var(--accent-blue)" : "var(--accent-purple)";

function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Griglia (più “dietro” e larga) */
const X = [6, 12, 18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 96];
const Y = [12, 20, 26, 34, 42, 50, 58, 66, 74, 80, 88];

type Pt = { x: number; y: number };
type Edge = { a: Pt; b: Pt };
const keyOf = (p: Pt) => `${p.x},${p.y}`;

const weights = new Map<string, number>([
    // “dietro” ma utile
    ["6,50", 2.2],
    ["12,50", 2.6],
    ["18,50", 3.0],
    ["26,50", 3.5],
    ["34,50", 3.9],
    ["42,50", 4.2], // split presto (dietro lettera)
    ["50,50", 4.0],
    ["58,50", 3.6],
    ["66,50", 3.2],
    ["74,50", 2.8],
    ["82,50", 2.4],
    ["90,50", 2.0],

    // verticali utili
    ["42,42", 3.2],
    ["42,58", 3.2],
    ["58,42", 2.9],
    ["58,58", 2.9],
    ["74,34", 2.4],
    ["74,66", 2.4],

    // leaf targets “belli”
    ["90,26", 2.2],
    ["90,74", 2.2],
    ["82,20", 2.0],
    ["82,80", 2.0],
]);

function w(p: Pt) {
    return weights.get(keyOf(p)) ?? 1.0;
}

/** neighbors con VINCOLO: mai a sinistra
 *  consentiti: (x+1) oppure (y±1) a parità di x
 */
function neighborsNoLeft(p: Pt): Pt[] {
    const xi = X.indexOf(p.x);
    const yi = Y.indexOf(p.y);
    const out: Pt[] = [];

    // avanti (x+)
    if (xi < X.length - 1) out.push({ x: X[xi + 1], y: p.y });

    // verticali
    if (yi > 0) out.push({ x: p.x, y: Y[yi - 1] });
    if (yi < Y.length - 1) out.push({ x: p.x, y: Y[yi + 1] });

    return out;
}

function pickWeighted<T>(items: T[], weightFn: (t: T) => number, rng: () => number): T {
    const ws = items.map(weightFn);
    const sum = ws.reduce((a, b) => a + b, 0);
    let r = rng() * sum;
    for (let i = 0; i < items.length; i++) {
        r -= ws[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

function pathFromPoints(points: Pt[]) {
    if (points.length < 2) return "";
    let d = `M${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (a.x !== b.x) d += ` H${b.x}`;
        else d += ` V${b.y}`;
    }
    return d;
}

/** percorso “router-like” che alterna forward/vertical, MAI left */
function buildBranchNoLeft(opts: {
    start: Pt;
    visited: Set<string>;
    addEdge: (a: Pt, b: Pt) => boolean;
    rng: () => number;
    steps: number;
    // probabilità di fare un passo verticale invece che forward quando possibile
    verticalBias: number; // 0..1
}) {
    const { start, visited, addEdge, rng, steps, verticalBias } = opts;

    const pts: Pt[] = [start];
    let c = start;

    for (let i = 0; i < steps; i++) {
        const candAll = neighborsNoLeft(c).filter((n) => !visited.has(keyOf(n)));
        if (candAll.length === 0) break;

        // separa forward vs vertical
        const forward = candAll.filter((n) => n.x > c.x);
        const vertical = candAll.filter((n) => n.x === c.x);

        const chooseFrom =
            vertical.length > 0 && forward.length > 0
                ? (rng() < verticalBias ? vertical : forward)
                : candAll;

        const chosen = pickWeighted(
            chooseFrom,
            (n) => {
                const isForward = n.x > c.x;
                const isVertical = n.x === c.x;

                // forward è sempre “buono”, ma vertical dà quell’effetto reticolo
                const forwardBonus = isForward ? 0.55 : 0.0;
                const verticalBonus = isVertical ? 0.48 : 0.0;

                // jitter piccolo per variabilità
                return w(n) + forwardBonus + verticalBonus + (rng() - 0.5) * 0.14;
            },
            rng
        );

        if (!addEdge(c, chosen)) break;
        c = chosen;
        pts.push(c);
    }

    return { pts, leaf: c };
}

/**
 * TREE 4 step:
 * - Stage1 trunk corto -> split1 PRESTO (dietro lettera)
 * - Stage2 split in 2 (crea split2a/split2b) senza andare left
 * - Stage3 split2a -> 2 rami (no-left, forward/vertical)
 * - Stage4 split2b -> 2 rami (no-left, forward/vertical)
 */
function generateTreeNoLeft4(rng: () => number) {
    const root: Pt = { x: 6, y: 50 };
    const visited = new Set<string>([keyOf(root)]);
    const edges: Edge[] = [];

    const addEdge = (a: Pt, b: Pt) => {
        const kb = keyOf(b);
        if (visited.has(kb)) return false;
        visited.add(kb);
        edges.push({ a, b });
        return true;
    };

    // Split1 “presto” (dietro lettera): tra 26..42
    const split1x = pickWeighted([26, 34, 42], (x) => (x === 42 ? 2.7 : x === 34 ? 2.4 : 2.0), rng);
    const split1: Pt = { x: split1x, y: 50 };

    // Stage1 trunk (solo avanti, mai left)
    const trunkPts: Pt[] = [root];
    let cur = root;
    while (cur.x !== split1.x) {
        const xi = X.indexOf(cur.x);
        const n: Pt = { x: X[Math.min(X.length - 1, xi + 1)], y: 50 };
        addEdge(cur, n);
        cur = n;
        trunkPts.push(cur);
    }

    // Stage2: due rami (up/down) che creano split2, sempre senza left
    const toSplit2 = (from: Pt, dir: "up" | "down") => {
        const pts: Pt[] = [from];
        let c = from;

        // un paio di vertical (1..2)
        const vSteps = pickWeighted([1, 2], (n) => (n === 2 ? 2.2 : 2.0), rng);
        for (let i = 0; i < vSteps; i++) {
            const yi = Y.indexOf(c.y);
            const nextY = dir === "up" ? Y[Math.max(0, yi - 1)] : Y[Math.min(Y.length - 1, yi + 1)];
            const n: Pt = { x: c.x, y: nextY };
            if (!addEdge(c, n)) break;
            c = n;
            pts.push(c);
        }

        // poi un po' avanti (1..2)
        const hSteps = pickWeighted([1, 2], (n) => (n === 2 ? 2.2 : 2.0), rng);
        for (let i = 0; i < hSteps; i++) {
            const xi = X.indexOf(c.x);
            const n: Pt = { x: X[Math.min(X.length - 1, xi + 1)], y: c.y };
            if (!addEdge(c, n)) break;
            c = n;
            pts.push(c);
        }

        return { pts, split2: c };
    };

    const up2 = toSplit2(split1, "up");
    const down2 = toSplit2(split1, "down");

    // Stage3/4: da split2 generiamo 2 rami ciascuno (totale 4 foglie)
    const spawnTwo = (from: Pt) => {
        const stepsA = pickWeighted([4, 5, 6, 7], (n) => (n === 6 ? 2.2 : n === 5 ? 2.1 : 1.7), rng);
        const stepsB = pickWeighted([4, 5, 6, 7], (n) => (n === 6 ? 2.2 : n === 5 ? 2.1 : 1.7), rng);

        // verticalBias leggermente diverso tra i due per variare (ma sempre forward/vertical)
        const a = buildBranchNoLeft({ start: from, visited, addEdge, rng, steps: stepsA, verticalBias: 0.52 });
        const b = buildBranchNoLeft({ start: from, visited, addEdge, rng, steps: stepsB, verticalBias: 0.66 });

        return [a, b];
    };

    const upLeaves = spawnTwo(up2.split2);
    const downLeaves = spawnTwo(down2.split2);

    // net: scaffold per far vedere la griglia + edges reali random
    const netEdgePaths = edges.map((e) => pathFromPoints([e.a, e.b]));
    const scaffold = [
        "M6 50 H96",
        "M42 12 V88",
        "M58 12 V88",
        "M26 20 V80",
        "M74 20 V80",
        "M12 38 H96",
        "M12 62 H96",
    ];

    return {
        netPaths: [...scaffold, ...netEdgePaths],
        nodes: Array.from(visited).map((k) => {
            const [xs, ys] = k.split(",");
            return { x: Number(xs), y: Number(ys) } as Pt;
        }),
        stages: {
            s1: [trunkPts],
            s2: [up2.pts, down2.pts],
            s3: upLeaves.map((x) => x.pts),
            s4: downLeaves.map((x) => x.pts),
        },
    };
}

export function ServicesSection() {
    const [runByCard, setRunByCard] = useState<Record<string, number>>({});
    const [graphByCard, setGraphByCard] = useState<Record<string, ReturnType<typeof generateTreeNoLeft4>>>({});

    return (
        <section className="theme-light" style={{ background: "#ECF3E9" }}>
            <div className="services-wrap">
                <div className="services-pad">
                    <div className="services-grid">
                        {services.map((s) => {
                            const baseSeed = useMemo(() => parseInt(s.n, 10) * 99991, [s.n]);
                            const runId = runByCard[s.n] ?? 0;
                            const graph = graphByCard[s.n];

                            // tempi ok + overlap per fluidità
                            const t1 = 0.34;
                            const t2 = 0.34;
                            const t3 = 0.32;
                            const t4 = 0.32;

                            const overlap = 0.14;
                            const s1t = 0;
                            const s2t = Math.max(0, t1 - overlap);
                            const s3t = Math.max(0, s2t + t2 - overlap);
                            const s4t = Math.max(0, s3t + t3 - overlap);

                            const ease = ".18 .95 .25 1";

                            return (
                                <div
                                    key={s.n}
                                    className="service-card group"
                                    style={
                                        {
                                            ["--ghost-accent" as any]: accentVar(s.accent),
                                        } as React.CSSProperties
                                    }
                                    onMouseEnter={() => {
                                        const seed = baseSeed + Date.now();
                                        const rng = mulberry32(seed);
                                        const g = generateTreeNoLeft4(rng);

                                        setGraphByCard((prev) => ({ ...prev, [s.n]: g }));
                                        setRunByCard((prev) => ({ ...prev, [s.n]: (prev[s.n] ?? 0) + 1 }));
                                    }}
                                >
                                    <div className="service-tech" aria-hidden>
                                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                                            <defs>
                                                <filter id={`glow-${s.n}`} x="-50%" y="-50%" width="200%" height="200%">
                                                    <feGaussianBlur stdDeviation="1.0" result="b" />
                                                    <feMerge>
                                                        <feMergeNode in="b" />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                            </defs>

                                            {graph?.netPaths.map((d, i) => (
                                                <path key={`net-${runId}-${i}`} d={d} className="tech-net" />
                                            ))}

                                            {graph?.nodes.map((p, i) => (
                                                <circle key={`node-${runId}-${i}`} cx={p.x} cy={p.y} r="1.0" className="tech-node" />
                                            ))}

                                            {(
                                                [
                                                    { ptsList: graph?.stages.s1 ?? [], dur: t1, begin: s1t, dotR: 1.35, haloR: 3.8, stagger: 0.02 },
                                                    { ptsList: graph?.stages.s2 ?? [], dur: t2, begin: s2t, dotR: 1.18, haloR: 3.0, stagger: 0.03 },
                                                    { ptsList: graph?.stages.s3 ?? [], dur: t3, begin: s3t, dotR: 1.12, haloR: 2.8, stagger: 0.03 },
                                                    { ptsList: graph?.stages.s4 ?? [], dur: t4, begin: s4t, dotR: 1.12, haloR: 2.8, stagger: 0.03 },
                                                ] as const
                                            ).map((st, si) =>
                                                st.ptsList.map((pts, i) => {
                                                    const d = pathFromPoints(pts);
                                                    const delay = st.begin + i * st.stagger;
                                                    return (
                                                        <g key={`stage-${si}-${runId}-${i}`}>
                                                            <path
                                                                d={d}
                                                                className="tech-route-active"
                                                                pathLength={100}
                                                                filter={`url(#glow-${s.n})`}
                                                                style={{ animationDuration: `${st.dur}s`, animationDelay: `${delay}s` }}
                                                            />
                                                            <g className="tech-dot" filter={`url(#glow-${s.n})`}>
                                                                <circle r={st.dotR} fill="white" fillOpacity="0.9">
                                                                    <animateMotion
                                                                        dur={`${st.dur}s`}
                                                                        begin={`${delay}s`}
                                                                        fill="freeze"
                                                                        keySplines={ease}
                                                                        calcMode="spline"
                                                                        keyTimes="0;1"
                                                                        path={d}
                                                                    />
                                                                </circle>
                                                                <circle r={st.haloR} fill="white" fillOpacity="0.10">
                                                                    <animateMotion
                                                                        dur={`${st.dur}s`}
                                                                        begin={`${delay}s`}
                                                                        fill="freeze"
                                                                        keySplines={ease}
                                                                        calcMode="spline"
                                                                        keyTimes="0;1"
                                                                        path={d}
                                                                    />
                                                                </circle>
                                                            </g>
                                                        </g>
                                                    );
                                                })
                                            )}
                                        </svg>
                                    </div>

                                    <div className="service-ghost-layer">
                                        <div className="relative">
                                            <div className="service-ghost-text">{s.ghost}</div>
                                            <motion.div
                                                className="service-ghost-underline"
                                                initial={{ scaleX: 0 }}
                                                whileHover={{ scaleX: 1 }}
                                                transition={{ duration: 0.16, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="service-n">{s.n}</div>
                                        <h3 className="service-title">{s.title}</h3>
                                        <p className="service-desc">{s.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}