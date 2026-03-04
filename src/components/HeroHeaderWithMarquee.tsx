"use client";

import React, { useEffect, useRef, useState } from "react";
import { RouletteTitle } from "./RouletteTitle";

type Props = {
    pill?: string;
    title?: string;
    subtitle?: string;
    tickerText?: string;
    bannerSrc?: string;
};

function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/**
 * LOCK ON DOWN, REPLAY ONLY ON UP
 */
function useLockRevealReverse(rootRef: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const root = rootRef.current;
        if (!root) return;

        const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
        if (!els.length) return;

        if (prefersReducedMotion()) {
            els.forEach((el) => el.classList.add("isIn"));
            return;
        }

        let lastY = window.scrollY;

        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    const el = e.target as HTMLElement;
                    el.classList.add("isIn");
                    el.removeAttribute("data-reveal-up");
                }
            },
            { root: null, threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
        );

        els.forEach((el) => io.observe(el));

        const onScroll = () => {
            const y = window.scrollY;
            const dir: "up" | "down" = y < lastY ? "up" : "down";
            lastY = y;

            if (dir !== "up") return;

            for (const el of els) {
                const r = el.getBoundingClientRect();
                const offscreenAbove = r.bottom < -24;
                if (!offscreenAbove) continue;

                el.classList.remove("isIn");
                el.setAttribute("data-reveal-up", "1");
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            io.disconnect();
        };
    }, [rootRef]);
}

export default function HeroHeaderWithMarquee({
                                                  pill = "Portfolio",
                                                  title = "Soluzioni su Misura",
                                                  subtitle = "",
                                                  tickerText = "CONSULENZA • UX/UI • WEB APPS • ATLAS • CLOUD • INNOVAZIONE AI • METODO SCRUM • PROGETTAZIONE 3D • FORMAZIONE • STUDIO TECNICO • SISTEMI COMPLESSI •",
                                                  bannerSrc = "/portfolio/portfolio_banner1.png",
                                              }: Props) {
    const row = `${tickerText} ${tickerText} ${tickerText}`;

    const [rouletteTrigger, setRouletteTrigger] = useState(0);
    const rouletteStarted = useRef(false);

    const scopeRef = useRef<HTMLElement | null>(null);
    useLockRevealReverse(scopeRef);

    useEffect(() => {
        if (rouletteStarted.current) return;
        rouletteStarted.current = true;

        const id = window.setTimeout(() => setRouletteTrigger((v) => v + 1), 240);
        return () => window.clearTimeout(id);
    }, []);

    return (
        <section ref={scopeRef as any} className="heroMarquee">
            <div className="heroMarquee-hero">
                <div className="heroMarquee-bg" aria-hidden="true" />

                {/* ✅ Spacer IN FLOW: determina l’altezza, MA NON spinge il contenuto (grid layering) */}
                <div className="heroMarquee-bannerSpacer" aria-hidden="true">
                    <img
                        className="heroMarquee-bannerSpacerImg"
                        src={bannerSrc}
                        alt=""
                        loading="eager"
                        decoding="async"
                    />
                </div>

                {/* ✅ Banner VISIVO: absolute + reveal identico al tuo originale */}
                <div className="heroMarquee-bannerBg reveal" data-reveal="right" aria-hidden="true">
                    <img
                        className="heroMarquee-bannerBgImg"
                        src={bannerSrc}
                        alt=""
                        loading="eager"
                        decoding="async"
                    />
                    <div className="heroMarquee-bannerBgOverlay" aria-hidden="true" />
                </div>

                {/* ✅ Contenuto sopra: posizione IDENTICA a prima (padding rimesso qui) */}
                <div className="heroMarquee-contentLayer">
                    <div className="heroMarquee-wrap heroMarquee-wrapRel">
                        <div className="heroMarquee-content">
                            <div className="heroMarquee-pill reveal" data-reveal="left">
                                {pill}
                            </div>

                            <h1 className="heroMarquee-title reveal" data-reveal="left">
                                <RouletteTitle
                                    text={title}
                                    triggerKey={rouletteTrigger}
                                    picks={3}
                                    durationMs={2600}
                                    tickMinMs={80}
                                    tickMaxMs={420}
                                    stopFractions={[0.64, 0.84, 1]}
                                    className="whitespace-pre-wrap"
                                />
                            </h1>

                            <p className="heroMarquee-subtitle reveal" data-reveal="left">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="heroMarquee-band" aria-label="Ticker">
                <div className="heroMarquee-bandInner">
                    <div className="heroMarquee-fade heroMarquee-fadeLeft" aria-hidden="true" />
                    <div className="heroMarquee-fade heroMarquee-fadeRight" aria-hidden="true" />

                    <div className="marquee">
                        <div className="marqueeInner">
                            <span className="marqueeItem">{row}</span>
                            <span className="marqueeItem" aria-hidden="true">
                {row}
              </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}