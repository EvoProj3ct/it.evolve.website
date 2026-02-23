"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RouletteTitle } from "./RouletteTitle";

type Step = {
    title: string;
    body: string;
};

type Props = {
    pill?: string;
    title?: string;
    steps?: Step[];
};

const ACCENTS = [
    "var(--accent-yellow)",
    "var(--accent-blue)",
    "var(--accent-purple)",
] as const;

function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

export default function ChiSiamoTimelineSection({
                                                    pill = "CHI SIAMO",
                                                    title = "Una giovane realtà",
                                                    steps,
                                                }: Props) {
    const [rouletteTrigger, setRouletteTrigger] = useState(0);

    useEffect(() => {
        const id = window.setTimeout(() => setRouletteTrigger((v) => v + 1), 260);
        return () => window.clearTimeout(id);
    }, []);

    const titleText = useMemo(() => title, [title]);

    const STEPS: Step[] = useMemo(
        () =>
            steps ?? [

                {
                    title: "Un approccio Sartoriale",
                    body:
                        "Al centro di ogni progetto c’è un’analisi approfondita del \n" +
                        "contesto operativo del cliente.\n" +
                        "Ogni intervento viene progettato su misura e cucito sui\n" +
                        "processi reali e sugli obiettivi concreti dell’organizzazione.\n\n" +
                        "Lavoriamo con un approccio strutturato e iterativo, ispirato \n" +
                        "ai principi Agile (in particolare Scrum) per garantire \n" +
                        "operatività continua, misurabilità dei risultati e chiarezza nella \n" +
                        "comunicazione lungo tutto il ciclo di vita del progetto. \n",
                },
                {
                    title: "Pianificazione strutturata",
                    body:
                        "Nelle fasi iniziali definiamo con precisione obiettivi,\n" +
                        "priorità e roadmap operative.\n" +
                        "Il lavoro viene suddiviso in incrementi misurabili,\n" +
                        "ciascuno orientato al rilascio di valore concreto.\n\n" +
                        "Al termine di ogni incremento è prevista una fase di \n" +
                        "verifica e revisione con il cliente, utile a validare quanto \n" +
                        "realizzato e ad apportare eventuali correzioni o miglioramenti.\n\n" +
                        "In questo modo modifiche, integrazioni e nuove esigenze \n" +
                        "Il lavoro viene suddiviso in incrementi misurabili,\n" +
                        "vengono gestite in modo ordinato e coerente con la roadmap,\n" +
                        "evitando dispersioni e mantenendo il controllo su tempi e costi.\n",
                },
                {
                    title: "Trasparenza continua",
                    body:
                        "Adottiamo cicli di lavoro brevi con coinvolgimento diretto\n" +
                        "del cliente in ogni fase rilevante.\n" +
                        "Questo consente una condivisione costante di avanzamenti,\n\n" +
                        "decisioni e criticità, garantendo piena visibilità sull’intero processo.\n." +
                        "Ogni ciclo produce un risultato tangibile e verificabile,\n" +
                        "rendendo chiaro lo stato dei lavori e facilitando pianificazioni\n" +
                        "e integrazioni future.\n\n"
                },
            ],
        [steps]
    );

    const containerRef = useRef<HTMLDivElement | null>(null);
    const stepRefs = useRef<(HTMLElement | null)[]>([]);

    // Anchor y relativi al container:
    // - startY: top del primo box
    // - endY[i]: bottom del box i (checkpoint)
    const [startY, setStartY] = useState<number>(0);
    const [endY, setEndY] = useState<number[]>([]);

    // progress per segmento: [start->end0] e poi [end0->end1] ...
    const [segP, setSegP] = useState<number[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);

    // parallax per box (px)
    const [parallax, setParallax] = useState<number[]>([]);

    useEffect(() => {
        let raf = 0;

        const measure = () => {
            const cont = containerRef.current;
            if (!cont) return;

            const contRect = cont.getBoundingClientRect();
            const contTopDoc = window.scrollY + contRect.top;
            const contH = contRect.height || 1;

            const rectsDoc = stepRefs.current.map((el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {
                    top: window.scrollY + r.top,
                    bottom: window.scrollY + r.bottom,
                    height: r.height,
                };
            });

            if (rectsDoc.some((r) => r == null)) return;
            const rects = rectsDoc as { top: number; bottom: number; height: number }[];

            // start = top del primo box
            const start = rects[0].top - contTopDoc;

            // checkpoint = bottom di ogni box
            const ends = rects.map((r) => r.bottom - contTopDoc);

            setStartY(start);
            setEndY(ends);

            // viewport progress anchor: una “linea” dentro lo schermo (leggermente sopra il centro)
            const anchorDoc = window.scrollY + window.innerHeight * 0.56;

            // active: quello che contiene l’anchor, altrimenti quello più vicino
            let aIdx = 0;
            let bestDist = Infinity;

            for (let i = 0; i < rects.length; i++) {
                const { top, bottom } = rects[i];
                if (anchorDoc >= top && anchorDoc <= bottom) {
                    aIdx = i;
                    bestDist = 0;
                    break;
                } else {
                    const d = Math.min(Math.abs(anchorDoc - top), Math.abs(anchorDoc - bottom));
                    if (d < bestDist) {
                        bestDist = d;
                        aIdx = i;
                    }
                }
            }
            setActiveIdx(aIdx);

            // progress segmenti:
            // seg0: start -> end0
            // seg1: end0 -> end1
            // seg2: end1 -> end2
            const anchors: number[] = [rects[0].top, ...rects.map((r) => r.bottom)]; // in doc coords
            const ps: number[] = [];
            // segment count = STEPS.length (start->end0 + between ends)
            for (let i = 0; i < STEPS.length; i++) {
                const A = anchors[i]; // doc y
                const B = anchors[i + 1]; // doc y
                const t = clamp01((anchorDoc - A) / (B - A));
                ps.push(t);
            }
            setSegP(ps);

            // parallax: micro shift in base a distanza dal centro viewport
            const midDoc = window.scrollY + window.innerHeight * 0.52;
            const amp = 10; // px, molto leggero
            const par = rects.map((r) => {
                const center = (r.top + r.bottom) / 2;
                const norm = clamp01(Math.abs(center - midDoc) / (window.innerHeight * 0.9));
                // vicino al centro => 0, lontano => +/- amp
                const dir = center < midDoc ? -1 : 1;
                return dir * norm * amp;
            });
            setParallax(par);
        };

        const onScrollOrResize = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(measure);
        };

        onScrollOrResize();

        window.addEventListener("scroll", onScrollOrResize, { passive: true });
        window.addEventListener("resize", onScrollOrResize);

        const id = window.setTimeout(onScrollOrResize, 220);

        return () => {
            window.removeEventListener("scroll", onScrollOrResize);
            window.removeEventListener("resize", onScrollOrResize);
            window.clearTimeout(id);
            cancelAnimationFrame(raf);
        };
    }, [STEPS.length]);

    // checkpoint pieno quando “raggiunto” = quando seg fino a quel checkpoint è completato
    // checkpoint i (endY[i]) è raggiunto se segP[i] === 1 (per i=0) oppure segP[i] (segmento end(i-1)->end(i)) === 1
    const checkpointDone = (idx: number) => {
        // idx=0: guardo seg0 (start->end0)
        if (idx === 0) return (segP[0] ?? 0) >= 0.999;
        // idx>0: guardo seg idx (end(idx-1)->end(idx))
        return (segP[idx] ?? 0) >= 0.999;
    };

    return (
        <section className="whoMini whoAPL" aria-label="Chi siamo - Timeline">
            <div className="whoMini-hero">
                <div className="whoMini-bg" aria-hidden="true" />

                <div className="whoMini-wrap">
                    <div className="whoMini-pill">{pill}</div>

                    <h1 className="whoMini-title">
                        <RouletteTitle
                            text={titleText}
                            triggerKey={rouletteTrigger}
                            picks={3}
                            durationMs={3200}
                            tickMinMs={85}
                            tickMaxMs={460}
                            stopFractions={[0.62, 0.82, 1]}
                            className="whitespace-pre-wrap"
                        />
                    </h1>

                    {/* ===== APPLE TIMELINE (anchored) ===== */}
                    <div ref={containerRef} className="whoAPL-wrap">
                        {/* STEPS */}
                        <div className="whoAPL-steps">
                            {STEPS.map((s, idx) => {
                                const side = idx % 2 === 0 ? "right" : "left";
                                const isActive = idx === activeIdx;

                                return (
                                    <article
                                        key={idx}
                                        ref={(el) => {
                                            stepRefs.current[idx] = el;
                                        }}
                                        className={[
                                            "whoAPL-step",
                                            side === "right" ? "isRight" : "isLeft",
                                            isActive ? "isActive" : "isDim",
                                        ].join(" ")}
                                        style={
                                            {
                                                // micro parallax (solo translateY)
                                                transform: `translateY(${Math.round((parallax[idx] ?? 0) * 1)}px)`,
                                            } as React.CSSProperties
                                        }
                                    >
                                        <h3 className="whoAPL-title">{s.title}</h3>
                                        <p className="whoAPL-body">{s.body}</p>
                                    </article>
                                );
                            })}
                        </div>

                        {/* TIMELINE OVERLAY */}
                        <div className="whoAPL-lineLayer" aria-hidden="true">
                            {/* segment 0: start (top first box) -> end0 */}
                            {endY.length === STEPS.length && (
                                <>
                                    <div
                                        className="whoAPL-seg"
                                        style={
                                            {
                                                top: `${startY}px`,
                                                height: `${Math.max(0, endY[0] - startY)}px`,
                                            } as React.CSSProperties
                                        }
                                    >
                                        <div className="whoAPL-segBase" />
                                        <div
                                            className="whoAPL-segFill"
                                            style={
                                                {
                                                    height: `${Math.round(((segP[0] ?? 0) * 100))}%`,
                                                    ["--seg-accent" as any]: ACCENTS[0 % ACCENTS.length],
                                                } as React.CSSProperties
                                            }
                                        />
                                    </div>

                                    {/* segments i: end(i-1) -> end(i) */}
                                    {STEPS.slice(1).map((_, i1) => {
                                        const i = i1 + 1; // segment index
                                        const top = endY[i - 1];
                                        const h = Math.max(0, endY[i] - endY[i - 1]);
                                        const accent = ACCENTS[i % ACCENTS.length];
                                        const p = segP[i] ?? 0;

                                        return (
                                            <div
                                                key={`seg-${i}`}
                                                className="whoAPL-seg"
                                                style={
                                                    {
                                                        top: `${top}px`,
                                                        height: `${h}px`,
                                                    } as React.CSSProperties
                                                }
                                            >
                                                <div className="whoAPL-segBase" />
                                                <div
                                                    className="whoAPL-segFill"
                                                    style={
                                                        {
                                                            height: `${Math.round(p * 100)}%`,
                                                            ["--seg-accent" as any]: accent,
                                                        } as React.CSSProperties
                                                    }
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* checkpoint dots at exact END of each box */}
                                    {endY.map((y, idx) => {
                                        const accent = ACCENTS[idx % ACCENTS.length];
                                        const done = checkpointDone(idx);
                                        const isActive = idx === activeIdx;

                                        return (
                                            <div
                                                key={`dot-${idx}`}
                                                className={[
                                                    "whoAPL-dot",
                                                    done ? "isDone" : "",
                                                    isActive ? "isActive" : "",
                                                ].join(" ")}
                                                style={
                                                    {
                                                        top: `${y}px`,
                                                        ["--dot-accent" as any]: accent,
                                                    } as React.CSSProperties
                                                }
                                            >
                                                <span className="whoAPL-dotRing" />
                                                <span className="whoAPL-dotCore" />
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                    {/* ===== /APPLE TIMELINE ===== */}
                </div>
            </div>
        </section>
    );
}