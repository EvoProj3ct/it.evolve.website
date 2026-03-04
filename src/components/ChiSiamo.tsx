"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { RouletteTitle } from "./RouletteTitle";

type Step = {
    title: string;
    body: string;
};

type Props = {
    pill?: string;
    title?: string;
    intro?: string;
    steps?: Step[];
};

const ACCENTS = [
    "var(--accent-yellow, #eab308)",
    "var(--accent-blue, #3b82f6)",
    "var(--accent-purple, #a855f7)",
] as const;

const SCRUM_IMGS = ["/aboutus/scrum1.png", "/aboutus/scrum2.png", "/aboutus/scrum3.png"];

function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
}
function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/**
 * ✅ LOCK ON DOWN:
 * - when element enters viewport -> add .isIn and it stays while scrolling down
 * ✅ REPLAY ONLY ON UP:
 * - only when scrolling UP and element is fully offscreen ABOVE -> remove .isIn + set data-* to reverse entry
 */
function useLockRevealReverse(rootRef?: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const root = rootRef?.current ?? document.documentElement;

        if (prefersReducedMotion()) {
            root.querySelectorAll?.(".reveal, .aplLockText, .aplLockMedia").forEach((el) => {
                (el as HTMLElement).classList.add("isIn");
            });
            return;
        }

        const heroEls = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
        const aplTextEls = Array.from(root.querySelectorAll<HTMLElement>(".aplLockText"));
        const aplMediaEls = Array.from(root.querySelectorAll<HTMLElement>(".aplLockMedia"));

        const allObserved = [...heroEls, ...aplTextEls, ...aplMediaEls];
        if (!allObserved.length) return;

        let lastY = window.scrollY;
        let dir: "down" | "up" = "down";

        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    const el = e.target as HTMLElement;
                    if (!e.isIntersecting) continue;

                    // when it re-enters, just animate in (direction is handled by data attrs)
                    el.classList.add("isIn");

                    // once it has entered, clear "reverse" flags so it stays stable while going down
                    if (el.classList.contains("reveal")) {
                        el.removeAttribute("data-reveal-up");
                    }
                    if (el.classList.contains("aplLockText") || el.classList.contains("aplLockMedia")) {
                        el.removeAttribute("data-up");
                    }
                }
            },
            { root: null, threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
        );

        allObserved.forEach((el) => io.observe(el));

        const onScroll = () => {
            const y = window.scrollY;
            dir = y < lastY ? "up" : "down";
            lastY = y;

            if (dir !== "up") return;

            // reset only if fully above viewport (no flicker)
            for (const el of allObserved) {
                const r = el.getBoundingClientRect();
                const offscreenAbove = r.bottom < -24;
                if (!offscreenAbove) continue;

                el.classList.remove("isIn");

                // mark reverse entry for next time it comes back into view (while scrolling up)
                if (el.classList.contains("reveal")) {
                    el.setAttribute("data-reveal-up", "1");
                }
                if (el.classList.contains("aplLockText") || el.classList.contains("aplLockMedia")) {
                    el.setAttribute("data-up", "1");
                }
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", onScroll);
            io.disconnect();
        };
    }, [rootRef]);
}

export default function ChiSiamoTimelineSection({
                                                    pill = "CHI SIAMO",
                                                    title = "Una giovane realtà",
                                                    intro = "Evolve nasce nel 2025 dalla passione per le nuove tecnologie e per la visione di un'evoluzione sostenibile che esse possono portare se accompagnate da un utilizzo consapevole. La nostra Mission è quella di creare innovazione e rendere la digitalizzazione alla portata di tutte le Piccole e Medie Imprese attraverso sistemi homemade modulari, flessibili e scalabili.",
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
                    title: "Un approccio sartoriale",
                    body:
                        "Partiamo sempre dal contesto: persone, processi e obiettivi reali.\n" +
                        "Costruiamo soluzioni su misura, con iterazioni rapide e feedback continuo.\n\n" +
                        "Il risultato è un lavoro solido, misurabile e chiaro: roadmap trasparenti, rilasci frequenti e priorità sempre allineate al valore.",
                },
                {
                    title: "Pianificazione strutturata",
                    body:
                        "Definiamo obiettivi, priorità e una roadmap pragmatica.\n" +
                        "Scomponiamo il lavoro in incrementi piccoli e verificabili, riducendo rischi e sorprese.\n\n" +
                        "Ogni step si chiude con una revisione: validiamo insieme e decidiamo la mossa successiva con ordine e controllo su tempi e costi.",
                },
                {
                    title: "Trasparenza continua",
                    body:
                        "Cicli brevi, aggiornamenti costanti e decisioni documentate.\n" +
                        "Niente “scatole nere”: sai sempre cosa stiamo facendo, perché e cosa arriva dopo.\n\n" +
                        "Ogni ciclo produce un output tangibile, pronto per evolvere senza attrito.",
                },
            ],
        [steps]
    );

    // HERO + TIMELINE lock/replay behavior
    const outerRef = useRef<HTMLDivElement | null>(null);
    useLockRevealReverse(outerRef);

    // TIMELINE refs for line geometry
    const containerRef = useRef<HTMLDivElement | null>(null);
    const stepTextRefs = useRef<(HTMLElement | null)[]>([]);

    const [startY, setStartY] = useState<number>(0);
    const [endY, setEndY] = useState<number>(0);
    const [fillH, setFillH] = useState<number>(0);

    /** Measure timeline bounds (single continuous line). */
    useEffect(() => {
        let raf = 0;

        const measure = () => {
            const cont = containerRef.current;
            if (!cont) return;

            const contRect = cont.getBoundingClientRect();
            const contTopDoc = window.scrollY + contRect.top;

            const first = stepTextRefs.current[0];
            const last = stepTextRefs.current[STEPS.length - 1];
            if (!first || !last) return;

            const r1 = first.getBoundingClientRect();
            const rN = last.getBoundingClientRect();

            const start = window.scrollY + r1.top - contTopDoc;
            const end = window.scrollY + rN.bottom - contTopDoc;

            setStartY(start);
            setEndY(end);

            const anchorDoc = window.scrollY + window.innerHeight * 0.56;
            const fillDoc = clamp(anchorDoc, contTopDoc + start, contTopDoc + end);
            setFillH(Math.max(0, fillDoc - (contTopDoc + start)));
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

    return (
        <section className="whoMini whoAPL" aria-label="Chi siamo - Timeline">
            <div ref={outerRef} className="whoMini-hero">
                <div className="whoMini-wrap">
                    {/* =========================
              HERO
             ========================= */}
                    <div className="whoMini-header">
                        <div className="whoMini-pill reveal" data-reveal="left">
                            {pill}
                        </div>

                        {/* ✅ FIX: niente spezzate a metà parola */}
                        <h1 className="whoMini-title whoMini-titleNoMidWordBreak reveal" data-reveal="left">
                            <RouletteTitle
                                text={titleText}
                                triggerKey={rouletteTrigger}
                                picks={3}
                                durationMs={3200}
                                tickMinMs={85}
                                tickMaxMs={460}
                                stopFractions={[0.62, 0.82, 1]}
                                className="whoMini-titleText"
                            />
                        </h1>
                    </div>

                    <div className="whoMini-underTitleImgWrap reveal" data-reveal="right" aria-hidden="true">
                        <div className="whoMini-underTitleImgFrame">
                            <Image
                                src="/aboutus/aboutus.png"
                                alt=""
                                fill
                                priority
                                className="whoMini-underTitleImgEl"
                                sizes="100vw"
                            />
                        </div>
                    </div>

                    <p className="whoMini-subtitle reveal" data-reveal="left">
                        {intro}
                    </p>

                    <div className="whoMini-afterHeroGap" />

                    {/* =========================
              TIMELINE (LOCKED)
             ========================= */}
                    <div ref={containerRef} className="whoAPL-wrap">
                        <div className="whoAPL-steps">
                            {STEPS.map((s, idx) => {
                                const textLeft = idx % 2 === 1;
                                const accent = ACCENTS[idx % ACCENTS.length];
                                const imgSrc = SCRUM_IMGS[idx % SCRUM_IMGS.length];

                                return (
                                    <div
                                        key={idx}
                                        className={["whoAPL-row", textLeft ? "isTextLeft" : "isTextRight"].join(" ")}
                                        style={{ ["--row-accent" as any]: accent } as React.CSSProperties}
                                    >
                                        {/* MEDIA */}
                                        <div className="whoAPL-mediaCell">
                                            <div className="aplLockMedia">
                                                <Image
                                                    src={imgSrc}
                                                    alt={`Scrum phase ${idx + 1}`}
                                                    fill
                                                    priority={idx === 0}
                                                    className="whoAPL-mediaImg"
                                                    sizes="(max-width: 980px) 92vw, 520px"
                                                />
                                            </div>
                                        </div>

                                        {/* TEXT */}
                                        <article
                                            ref={(el) => {
                                                stepTextRefs.current[idx] = el;
                                            }}
                                            className="aplLockText"
                                            data-side={textLeft ? "left" : "right"}
                                        >
                                            <h3 className="whoAPL-title">{s.title}</h3>
                                            <p className="whoAPL-body">{s.body}</p>
                                        </article>
                                    </div>
                                );
                            })}
                        </div>

                        {/* LINE ONLY */}
                        <div className="whoAPL-lineLayer" aria-hidden="true">
                            {endY > startY && (
                                <>
                                    <div
                                        className="whoAPL-segBaseLine"
                                        style={{
                                            top: `${startY}px`,
                                            height: `${Math.max(0, endY - startY)}px`,
                                        }}
                                    />
                                    <div
                                        className="whoAPL-segFillLine"
                                        style={{
                                            top: `${startY}px`,
                                            height: `${clamp(fillH, 0, Math.max(0, endY - startY))}px`,
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                    {/* /TIMELINE */}
                </div>
            </div>
        </section>
    );
}
