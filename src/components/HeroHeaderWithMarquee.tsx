"use client";

import React, { useEffect, useRef, useState } from "react";
import { RouletteTitle } from "./RouletteTitle"; // ⬅️ metti il path giusto

type Props = {
    pill?: string;
    title?: string;
    subtitle?: string;
    tickerText?: string;
};

export default function HeroHeaderWithMarquee({
                                                  pill = "Portfolio",
                                                  title = "Le Migliori Soluzioni.",
                                                  subtitle = "Di Programmazione Sartoriale",
                                                  tickerText = "CONSULENZA • UX/UI • WEB APPS • ATLAS • CLOUD • INNOVAZIONE AI • METODO SCRUM • PROGETTAZIONE 3D • FORMAZIONE • STUDIO TECNICO • SISTEMI COMPLESSI",
                                              }: Props) {
    const row = `${tickerText} ${tickerText} ${tickerText}`;

    // ✅ roulette: trigger una volta (no loop ad ogni render)
    const [rouletteTrigger, setRouletteTrigger] = useState(0);
    const rouletteStarted = useRef(false);

    useEffect(() => {
        if (rouletteStarted.current) return;
        rouletteStarted.current = true;

        const id = window.setTimeout(() => setRouletteTrigger((v) => v + 1), 240);
        return () => window.clearTimeout(id);
    }, []);

    return (
        <section className="heroMarquee">
            {/* HERO (stile contact) */}
            <div className="heroMarquee-hero">
                {/* bg tipo contact */}
                <div className="heroMarquee-bg" aria-hidden="true" />

                <div className="heroMarquee-wrap">
                    <div className="heroMarquee-pill">{pill}</div>

                    {/* ✅ RouletteTitle dentro H1 */}
                    <h1 className="heroMarquee-title">
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

                    <p className="heroMarquee-subtitle">{subtitle}</p>
                </div>
            </div>

            {/* MARQUEE nero */}
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