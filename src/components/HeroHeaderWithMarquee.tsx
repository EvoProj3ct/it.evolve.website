"use client";

import React from "react";

type Props = {
    title?: string;
    subtitle?: string;
    /** Testo ripetuto nel banner che scorre */
    tickerText?: string;
    /** Altezza hero */
    heightClassName?: string; // es: "h-[420px]"
};

export default function HeroHeaderWithMarquee({
                                                  title = "Le Migliori Soluzioni.",
                                                  subtitle = "Di Programmazione Sartoriale",
                                                  tickerText = "STRATEGY • UX/UI • WEB APPS • AUTOMATION • CLOUD • DEVOPS •",
                                                  heightClassName = "h-[420px] md:h-[520px]",
                                              }: Props) {
    // duplichiamo per loop perfetto
    const row = `${tickerText} ${tickerText} ${tickerText}`;

    return (
        <section className="w-full bg-white text-black">
            {/* HERO */}
            <div
                className={[
                    "relative w-full overflow-hidden",
                    "flex items-center justify-center",
                    heightClassName,
                ].join(" ")}
            >
                {/* background soft */}
                <div className="absolute inset-0 heroSoftBg" />

                <div className="relative z-10 mx-auto w-full max-w-5xl px-6 text-center">
                    <h1 className="font-display font-extrabold tracking-[-0.03em] leading-[0.98] text-[44px] sm:text-[56px] md:text-[78px] lg:text-[92px] whitespace-pre-line">
                        {title}
                    </h1>

                    <p className="mt-8 text-[14px] sm:text-[16px] md:text-[20px] leading-[1.8] text-black/55 whitespace-pre-line">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* MARQUEE MINIMALE */}
            <div className="w-full border-t border-black/5 bg-white">
                <div className="relative overflow-hidden">
                    {/* fade edges */}
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-14 bg-gradient-to-r from-white to-transparent z-10" />
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-14 bg-gradient-to-l from-white to-transparent z-10" />

                    <div className="marqueeTrack py-3">
                        <div className="marqueeRow text-[11px] md:text-[12px] font-semibold tracking-[0.26em] text-black/35">
                            {row}
                        </div>
                        <div className="marqueeRow text-[11px] md:text-[12px] font-semibold tracking-[0.26em] text-black/35">
                            {row}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
