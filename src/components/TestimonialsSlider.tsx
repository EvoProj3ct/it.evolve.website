"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

    // ✅ lock anti-overlap (niente bug di closure)
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

    // ✅ autoplay sempre attivo
    useEffect(() => {
        const AUTOPLAY_MS = 12000;

        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            next();
        }, AUTOPLAY_MS);

        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [next]);

    // ✅ se navighi manualmente, resetta timer (opzionale ma “premium”)
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
                        <div className="testi2-quoteCircle" style={{ ["--testi-accent" as any]: accent }}>
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
                                <p className="testi2-quote">{active.quote}</p>

                                <div className="testi2-author">
                  <span className="testi2-dash" aria-hidden>
                    —
                  </span>
                                    <span className="testi2-name" style={{ color: accent }}>
                    {active.name}
                  </span>
                                    {active.role ? <span className="testi2-role"> · {active.role}</span> : null}
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
                            aria-label="Previous testimonial"
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className="testi2-navBtn"
                            onClick={onNext}
                            aria-label="Next testimonial"
                        >
                            ›
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
