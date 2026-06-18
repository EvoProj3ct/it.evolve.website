"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Testimonial = {
    id: string;
    quote: string;
    name: string;
    role?: string;
    accent?: "yellow" | "blue" | "purple";
};

const ACCENT_VAR: Record<NonNullable<Testimonial["accent"]>, string> = {
    yellow: "var(--accent-yellow)",
    blue: "var(--accent-blue)",
    purple: "var(--accent-purple)",
};

/* -------------------------------------------
   TechType (inline)
   - typewriter per-char + micro “electric glow”
   - re-trigger via triggerKey (use active.id)
------------------------------------------- */
/* Seeded PRNG (mulberry32) — deterministico tra server e client */
function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h = h & h;
    }
    return Math.abs(h);
}

function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function TechType({
                      text,
                      triggerKey,
                      stepMs = 14,
                      jitterMs = 22,
                      className = "",
                  }: {
    text: string;
    triggerKey: string | number;
    stepMs?: number;
    jitterMs?: number;
    className?: string;
}) {
    const tokens = useMemo(() => text.split(/(\s+)/), [text]);

    const charDelays = useMemo(() => {
        const seed = typeof triggerKey === "string"
            ? hashCode(triggerKey)
            : Math.abs(triggerKey);
        const rng = mulberry32(seed + text.length + stepMs + jitterMs);
        const delays: number[] = [];
        let ci = 0;
        for (const tok of tokens) {
            if (!/^\s+$/.test(tok)) {
                for (const _ch of Array.from(tok)) {
                    delays.push(ci * stepMs + rng() * jitterMs);
                    ci++;
                }
            }
        }
        return delays;
    }, [tokens, triggerKey, stepMs, jitterMs, text]);

    let delayIdx = 0;

    return (
        <motion.span
            key={triggerKey}
            className={`techType ${className}`}
            style={{
                whiteSpace: "normal",
                wordBreak: "keep-all",
                overflowWrap: "normal",
                hyphens: "none",
            }}
        >
            <span className="techType-scan" />

            {tokens.map((tok, tIdx) => {
                if (/^\s+$/.test(tok)) {
                    return (
                        <span key={`ws-${tIdx}`} className="techType-ws">
              {tok}
            </span>
                    );
                }

                const chars = Array.from(tok);

                return (
                    <span
                        key={`w-${tIdx}`}
                        className="techType-word"
                        style={{ display: "inline-block", whiteSpace: "nowrap" }}
                    >
            {chars.map((ch, cIdx) => {
                const delayMs = charDelays[delayIdx];
                delayIdx += 1;

                return (
                    <span
                        key={`${tIdx}-${cIdx}-${ch}`}
                        className="techType-char"
                        style={{ animationDelay: `${delayMs}ms, ${delayMs}ms` }}
                    >
                  {ch}
                </span>
                );
            })}
          </span>
                );
            })}
        </motion.span>
    );
}

export function TestimonialsSlider() {
    const items: Testimonial[] = useMemo(
        () => [
            {
                id: "t1",
                quote:
                    "La nostra missione è rendere le nuove tecnologie accessibili alle Piccole e Medie Imprese.",
                name: "Emanuele Ienna",
                role: "Project Manager",
                accent: "purple",
            },
            {
                id: "t2",
                quote:
                    "Evolve nasce dalla passione per la tecnologia e dall'evoluzione che può portare con un utilizzo consapevole.",
                name: "Gian Marco Marinelli",
                role: "Consulente informatico",
                accent: "yellow",
            },
            {
                id: "t3",
                quote:
                    "Ho visto negli anni molte imprese alle prese con attività disorganizzate e ripetitive. Evolve vuole aiutarle a gestirle al meglio.",
                name: "Luca De Angelis",
                role: "Amministratore e progettista 3D",
                accent: "blue",
            },
            {
                id: "t4",
                quote:
                    "Troviamo il punto di incontro tra le esigenze di un'attività e la tecnologia giusta per agevolare il lavoro.",
                name: "Luca Marinelli",
                role: "Full Stack Developer",
                accent: "yellow",
            },
        ],
        []
    );

    const total = items.length;

    const [i, setI] = useState(0);
    const [dir, setDir] = useState<1 | -1>(1);

    // ✅ lock anti-overlap
    const lockRef = useRef(false);
    const timerRef = useRef<number | null>(null);

    const active = items[i];
    const accent = active.accent ? ACCENT_VAR[active.accent] : "var(--accent-blue)";

    const go = useCallback(
        (nextDir: 1 | -1) => {
            if (lockRef.current) return;
            lockRef.current = true;

            setDir(nextDir);
            setI((v) => (v + nextDir + total) % total);
        },
        [total]
    );

    const prev = () => go(-1);
    const next = () => go(1);

    // ✅ autoplay
    useEffect(() => {
        const AUTOPLAY_MS = 12000;

        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => next(), AUTOPLAY_MS);

        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [next]);

    // ✅ manual nav resets timer
    const restartTimer = useCallback(() => {
        const AUTOPLAY_MS = 5000;
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => next(), AUTOPLAY_MS);
    }, [next]);

    const onPrev = () => {
        prev();
        restartTimer();
    };
    const onNext = () => {
        next();
        restartTimer();
    };

    const ghostNumber = String(i + 1).padStart(2, "0");

    return (
        <section className="testi2-section">
            <div className="testi2-wrap">
                <div className="testi2-ghost" aria-hidden>
                    {ghostNumber}
                </div>

                <div className="testi2-grid">
                    {/* LEFT */}
                    <div className="testi2-left">
                        <div
                            className="testi2-quoteCircle"
                            style={{ ["--testi-accent" as any]: accent }}
                        >
                            <svg className="testi2-quoteSvg" viewBox="0 0 120 90" aria-hidden>
                                <path d="M52 80H18c-2 0-4-2-4-4V50c0-17 9-30 26-38l7 11c-11 6-16 14-16 24v3h21c2 0 4 2 4 4v22c0 2-2 4-4 4Z" />
                                <path d="M106 80H72c-2 0-4-2-4-4V50c0-17 9-30 26-38l7 11c-11 6-16 14-16 24v3h21c2 0 4 2 4 4v22c0 2-2 4-4 4Z" />
                            </svg>
                        </div>
                    </div>

                    {/* CENTER */}
                    <div className="testi2-center">
                        <AnimatePresence initial={false} mode="wait" custom={dir}>
                            <motion.div
                                key={active.id}
                                custom={dir}
                                initial={{ opacity: 0, y: 8, x: dir === 1 ? 14 : -14 }}
                                animate={{ opacity: 1, y: 0, x: 0 }}
                                exit={{ opacity: 0, y: -6, x: dir === 1 ? -14 : 14 }}
                                transition={{ duration: 0.38, ease: [0.22, 0.0, 0.15, 1] }}
                                onAnimationComplete={() => {
                                    lockRef.current = false;
                                }}
                            >
                                {/* tech type + scanline (green electric) */}
                                <p
                                    className="testi2-quote"
                                    style={{ ["--tech-accent" as any]: accent }}
                                >
                                    <TechType
                                        text={active.quote}
                                        triggerKey={active.id}
                                        stepMs={14}
                                        jitterMs={22}
                                    />
                                </p>

                                <div className="testi2-author">
                  <span className="testi2-dash" aria-hidden>
                    —
                  </span>

                                    <span className="testi2-name" style={{ color: accent }}>
                    <TechType
                        text={active.name}
                        triggerKey={`${active.id}-name`}
                        stepMs={22}
                        jitterMs={16}
                    />
                  </span>

                                    {active.role ? (
                                        <span className="testi2-role"> · {active.role}</span>
                                    ) : null}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* RIGHT */}
                    <div className="testi2-right">
                        <button
                            type="button"
                            className="testi2-navBtn"
                            onClick={onPrev}
                            aria-label="Testimonial precedente"
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className="testi2-navBtn"
                            onClick={onNext}
                            aria-label="Testimonial successivo"
                        >
                            ›
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}