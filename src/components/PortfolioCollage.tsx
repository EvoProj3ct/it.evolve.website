"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";

type CollageItem = {
    id: string;
    src: string;
    alt: string;
    tagTop: string;
    tagBottom: string;
    variant: string;
    slot:
        | "side-left"
        | "side-right"
        | "top-1"
        | "top-2"
        | "top-3"
        | "bot-1"
        | "bot-2"
        | "bot-3";
};

type Pt = { x: number; y: number };

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}

function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Build a reticular orthogonal polyline and return:
 * - full path d (for traveler)
 * - pts (all vertices, including from + to)
 * - segments: each segment as its own path d (so we can animate step-by-step)
 */
function buildReticularSegments(from: Pt, to: Pt, seed: number) {
    const rng = mulberry32(seed);
    const snap = (v: number, step: number) => Math.round(v / step) * step;

    const step = Math.max(
        18,
        Math.min(
            26,
            snap((Math.abs(to.x - from.x) + Math.abs(to.y - from.y)) / 14, 2)
        )
    );

    const fx = snap(from.x, step);
    const fy = snap(from.y, step);
    const tx = snap(to.x, step);
    const ty = snap(to.y, step);

    // intermediate columns (2..4)
    const span = Math.max(step * 2, Math.abs(tx - fx));
    const nCols = span > 420 ? 4 : span > 280 ? 3 : 2;

    const cols: number[] = [];
    for (let i = 1; i <= nCols; i++) {
        const t = i / (nCols + 1);
        const jitter = (rng() - 0.5) * 0.22;
        const x = snap(fx + (tx - fx) * (t + jitter), step);
        cols.push(clamp(x, Math.min(fx, tx), Math.max(fx, tx)));
    }
    const uniqCols = Array.from(new Set(cols)).sort((a, b) => a - b);

    // intermediate rows (1..2)
    const rowJ = (rng() - 0.5) * 0.55;
    const midY1 = snap(fy + (ty - fy) * (0.38 + rowJ * 0.10), step);
    const midY2 = snap(fy + (ty - fy) * (0.70 - rowJ * 0.10), step);
    const rows = [midY1, midY2]
        .map((y) =>
            clamp(y, Math.min(fy, ty) - step * 2, Math.max(fy, ty) + step * 2)
        )
        .filter((y, i, arr) => arr.indexOf(y) === i);

    // build orthogonal polyline points
    const pts: Pt[] = [{ x: fx, y: fy }];
    let cx = fx;
    let cy = fy;

    const goH = (x: number) => {
        if (x < cx) return; // no-left
        cx = x;
        pts.push({ x: cx, y: cy });
    };
    const goV = (y: number) => {
        cy = y;
        pts.push({ x: cx, y: cy });
    };

    uniqCols.forEach((x, i) => {
        goH(x);
        const y = rows[i % rows.length];
        if (Math.abs(y - cy) > 0.1 && rng() > 0.18) goV(y);
    });

    goH(tx);
    if (Math.abs(ty - cy) > 0.1) goV(ty);

    // end at exact to for nicer anchoring
    pts.push({ x: to.x, y: to.y });

    // full path (for traveler)
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }

    // segments (each step)
    const segments = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const sd = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        segments.push({ d: sd, a, b, i });
    }

    // nodes at each vertex except the first one
    const nodes = pts.slice(1).map((p, i) => ({ ...p, i }));

    return { d, pts, segments, nodes, segCount: Math.max(1, pts.length - 1) };
}

export function PortfolioCollage() {
    const items: CollageItem[] = useMemo(
        () => [
            {
                id: "side-left",
                slot: "side-left",
                variant: "side",
                src: "/collage/product_stampa3d.png",
                alt: "Left",
                tagTop: "STAMPA 3D",
                tagBottom: "PROGETTAZIONE & PROTOTIPAZIONE",
            },
            {
                id: "top-1",
                slot: "top-1",
                variant: "center",
                src: "/collage/product_ai.png",
                alt: "Top 1",
                tagTop: "ESPERTI AI",
                tagBottom: "Agenti AI e chatbot",
            },
            {
                id: "top-2",
                slot: "top-2",
                variant: "center",
                src: "/collage/product_formazione.png",
                alt: "Top 2",
                tagTop: "FORMAZIONE",
                tagBottom: "Sulle nuove tecnologie",
            },
            {
                id: "top-3",
                slot: "top-3",
                variant: "center",
                src: "/collage/product_atlas.png",
                alt: "Top 3",
                tagTop: "ATLAS",
                tagBottom: "Gestione e Controllo",
            },
            {
                id: "bot-1",
                slot: "bot-1",
                variant: "center",
                src: "/collage/product_consulenza.png",
                alt: "Bottom 1",
                tagTop: "CONSULENZA",
                tagBottom: "Perché innovare conta",
            },
            {
                id: "bot-2",
                slot: "bot-2",
                variant: "center",
                src: "/collage/product_elettronica.png",
                alt: "Bottom 2",
                tagTop: "INTEGRAZIONI ELETTRONICHE",
                tagBottom: "RFID, NFC, SCANNER E BARCODE",
            },
            {
                id: "bot-3",
                slot: "bot-3",
                variant: "center",
                src: "/collage/product_elinker.png",
                alt: "Bottom 3",
                tagTop: "PORTACHIAVI INTELLIGENTI",
                tagBottom: "CON E-LINKER HAI I TUOI DATI SEMPRE CON TE",
            },
            {
                id: "side-right",
                slot: "side-right",
                variant: "side",
                src: "/collage/product_ecommerce.png",
                alt: "Right",
                tagTop: "E-COMMERCE",
                tagBottom: "Funzionali, misurabili, scalabili",
            },
        ],
        []
    );

    const gridRef = useRef<HTMLDivElement | null>(null);
    const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [activeId, setActiveId] = useState<string | null>(null);

    const [isCoarse, setIsCoarse] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia?.("(pointer: coarse)");
        const update = () => setIsCoarse(!!mq?.matches);
        update();
        mq?.addEventListener?.("change", update);
        return () => mq?.removeEventListener?.("change", update);
    }, []);

    type Route = {
        fullD: string;
        segments: Array<{ d: string; i: number }>;
        nodes: Array<{ x: number; y: number; i: number }>;
        segCount: number;
        idx: number;
    };

    const [routes, setRoutes] = useState<Route[]>([]);

    const computeConnections = useCallback(
        (fromId: string) => {
            const grid = gridRef.current;
            const fromEl = tileRefs.current[fromId];
            if (!grid || !fromEl) return [];

            const g = grid.getBoundingClientRect();
            const a = fromEl.getBoundingClientRect();

            const from: Pt = {
                x: a.left - g.left + a.width * 0.76,
                y: a.top - g.top + a.height * 0.30,
            };

            const targets = items
                .filter((it) => it.id !== fromId)
                .map((it) => {
                    const el = tileRefs.current[it.id];
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const to: Pt = {
                        x: r.left - g.left + r.width * 0.24,
                        y: r.top - g.top + r.height * 0.68,
                    };
                    return { id: it.id, to };
                })
                .filter(Boolean) as Array<{ id: string; to: Pt }>;

            const out: Route[] = targets.map((t, idx) => {
                const seed = (fromId.length * 9973 + idx * 131 + t.id.length * 97) >>> 0;
                const built = buildReticularSegments(from, t.to, seed);
                return {
                    fullD: built.d,
                    segments: built.segments.map((s) => ({ d: s.d, i: s.i })),
                    nodes: built.nodes,
                    segCount: built.segCount,
                    idx,
                };
            });

            return out;
        },
        [items]
    );

    const onEnter = (id: string) => {
        setActiveId(id);
        setRoutes(computeConnections(id));
    };

    const onLeave = () => {
        setActiveId(null);
        setRoutes([]);
    };

    const onTapTile = (id: string) => {
        if (!isCoarse) return;
        setActiveId((cur) => (cur === id ? null : id));
    };

    useEffect(() => {
        if (!activeId) return;
        const update = () => setRoutes(computeConnections(activeId));
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, { passive: true });
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update);
        };
    }, [activeId, computeConnections]);

    // timings: segment-by-segment
    const segDur = 0.085;     // seconds per segment
    const routeStagger = 0.06; // seconds between routes (slight fan-out)
    const baseDelay = 0.06;   // seconds

    return (
        <section className="collage-section">
            <div className="collage-wrap">
                <div className="collage-head">
                    <div className="collage-kicker">LE NOSTRE COMPETENZE</div>
                    <div className="collage-title">Approccio Interdisciplinare e Smart</div>
                </div>

                <div className="collage-grid-wrap">
                    {/* connections under tiles */}
                    <div className={["collage-links", activeId ? "is-on" : ""].join(" ")}>
                        <svg className="collage-links-svg-px" aria-hidden>
                            <defs>
                                <filter id="collageGlow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="2.0" result="b" />
                                    <feMerge>
                                        <feMergeNode in="b" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {routes.map((r, routeIndex) => {
                                const routeDelay = baseDelay + routeIndex * routeStagger;
                                const totalDur = Math.max(0.35, r.segCount * segDur);

                                return (
                                    <g key={`${activeId ?? "none"}-route-${r.idx}`}>
                                        {/* base rail (static, faint) */}
                                        <path d={r.fullD} className="collage-link-rail" />

                                        {/* STEP PATH: animate each segment sequentially */}
                                        {r.segments.map((seg) => {
                                            const d = routeDelay + seg.i * segDur;
                                            return (
                                                <path
                                                    key={`seg-${r.idx}-${seg.i}`}
                                                    d={seg.d}
                                                    className="collage-link-seg"
                                                    filter="url(#collageGlow)"
                                                    pathLength={100}
                                                    style={
                                                        {
                                                            ["--segDur" as any]: `${segDur}s`,
                                                            ["--segDelay" as any]: `${d}s`,
                                                        } as React.CSSProperties
                                                    }
                                                />
                                            );
                                        })}

                                        {/* TRAVELER: continuous leader dot synced with total duration */}
                                        <g className="collage-traveler" filter="url(#collageGlow)">
                                            <circle r="3.0" className="collage-traveler-core">
                                                <animateMotion
                                                    dur={`${totalDur}s`}
                                                    begin={`${routeDelay}s`}
                                                    fill="freeze"
                                                    keySplines=".18 .95 .25 1"
                                                    calcMode="spline"
                                                    keyTimes="0;1"
                                                    path={r.fullD}
                                                />
                                            </circle>
                                            <circle r="7.0" className="collage-traveler-halo">
                                                <animateMotion
                                                    dur={`${totalDur}s`}
                                                    begin={`${routeDelay}s`}
                                                    fill="freeze"
                                                    keySplines=".18 .95 .25 1"
                                                    calcMode="spline"
                                                    keyTimes="0;1"
                                                    path={r.fullD}
                                                />
                                            </circle>
                                        </g>

                                        {/* NODES: appear when the leader reaches each vertex (per-node delay) */}
                                        {r.nodes.slice(0, 18).map((p) => {
                                            // node i corresponds to segment i completion (after segDur*(i+1))
                                            const nd = routeDelay + (p.i + 1) * segDur;
                                            return (
                                                <circle
                                                    key={`node-${r.idx}-${p.i}`}
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r="2.0"
                                                    className="collage-link-node"
                                                    filter="url(#collageGlow)"
                                                    style={
                                                        {
                                                            ["--nodeDelay" as any]: `${nd}s`,
                                                        } as React.CSSProperties
                                                    }
                                                />
                                            );
                                        })}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    <div className="collage-grid" ref={gridRef}>
                        {items.map((it) => (
                            <div
                                key={it.id}
                                ref={(el) => {
                                    tileRefs.current[it.id] = el;
                                }}
                                className={[
                                    "collage-tile",
                                    it.variant === "side" ? "collage-tile-side" : "collage-tile-center",
                                    `collage-slot-${it.slot}`,
                                    activeId === it.id ? "is-active" : "",
                                ].join(" ")}
                                onMouseEnter={() => onEnter(it.id)}
                                onMouseLeave={onLeave}
                                onClick={() => onTapTile(it.id)}
                            >
                                <img className="collage-img" src={it.src} alt={it.alt} />

                                {/* LABEL: desktop hover; mobile fixed */}
                                <div className="collage-label">
                                    <div className="collage-label-top">{it.tagTop}</div>
                                    <div className="collage-label-bottom">{it.tagBottom}</div>
                                </div>

                                <div className="collage-tech-overlay" aria-hidden>
                                    <div className="collage-tech-grid" />
                                    <div className="collage-tech-nodes" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}