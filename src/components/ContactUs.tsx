"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RouletteTitle } from "./RouletteTitle";

type Accent = "blue" | "purple" | "yellow";

function accentToCss(a: Accent) {
    if (a === "yellow") return "var(--accent-yellow)";
    if (a === "purple") return "var(--accent-purple)";
    return "var(--accent-blue)";
}

function IconMail() {
    return (
        <svg viewBox="0 0 24 24" className="contactMini-icon" aria-hidden="true">
            <path
                d="M4.5 7.5h15v9h-15z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M5 8l7 6 7-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconPin() {
    return (
        <svg viewBox="0 0 24 24" className="contactMini-icon" aria-hidden="true">
            <path
                d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M12 10.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
            />
        </svg>
    );
}

export default function ContactPage() {
    const email = "infoevolvecompany@gmail.com";
    const phone = "+39 3928440618";
    const address1 = "Roma — Italia";
    const address2 = "Disponibili da remoto in tutta Europa.";

    const cardsWrapRef = useRef<HTMLDivElement | null>(null);
    const firstCardRef = useRef<HTMLDivElement | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [padTop, setPadTop] = useState(0);
    const [railH, setRailH] = useState(0);

    const [rouletteTrigger, setRouletteTrigger] = useState(0);
    const rouletteStarted = useRef(false);

    useEffect(() => {
        if (rouletteStarted.current) return;
        rouletteStarted.current = true;
        const id = window.setTimeout(() => setRouletteTrigger((v) => v + 1), 260);
        return () => window.clearTimeout(id);
    }, []);

    useEffect(() => {
        const wrap = cardsWrapRef.current;
        const first = firstCardRef.current;
        if (!wrap || !first) return;

        const readGapPx = () => {
            const cs = window.getComputedStyle(wrap);
            const rowGap = cs.rowGap || cs.gap || "0px";
            const n = Number.parseFloat(rowGap);
            return Number.isFinite(n) ? n : 0;
        };

        const compute = () => {
            const gapPx = readGapPx();
            const firstH = first.getBoundingClientRect().height;
            const wrapH = wrap.getBoundingClientRect().height;

            const p = Math.ceil(firstH + gapPx);
            setPadTop(p);
            setRailH(Math.max(0, Math.ceil(wrapH - p)));
        };

        compute();

        const ro = new ResizeObserver(compute);
        ro.observe(first);
        ro.observe(wrap);

        window.addEventListener("resize", compute);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", compute);
        };
    }, []);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = 0;
        v.play().catch(() => {});
    }, []);

    return (
        <main className="contactMini">
            {/* HERO */}
            <section className="contactMini-hero" aria-label="Contatti">
                <div className="contactMini-bg" aria-hidden="true" />

                <div className="contactMini-wrap">
                    <div className="contactMini-pill">CONTATTI</div>

                    <h1 className="contactMini-title">
                        <RouletteTitle
                            text={"Parliamo della tua idea."}
                            triggerKey={rouletteTrigger}
                            picks={3}
                            durationMs={2600}
                            tickMinMs={80}
                            tickMaxMs={420}
                            stopFractions={[0.64, 0.84, 1]}
                            className="whitespace-pre-wrap"
                        />
                    </h1>
                </div>
            </section>

            {/* BODY */}
            <section className="contactMini-body" aria-label="Dettagli contatto">
                <div className="contactMini-wrap contactMini-grid">
                    {/* LEFT (✅ video incasellato sopra Scrivici...) */}
                    <div
                        className="contactMini-left contactLeftWithVideo"
                        style={
                            padTop
                                ? ({
                                    paddingTop: padTop,
                                    minHeight: railH || undefined,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                } as React.CSSProperties)
                                : undefined
                        }
                    >
                        {/* ✅ video header della colonna sinistra */}
                        <div className="contactLeftVideo" aria-hidden="true">
                            <div className="contactLeftVideo-media">
                                <video
                                    ref={videoRef}
                                    className="contactLeftVideo-video"
                                    src="/video/phantomsend.mp4"
                                    autoPlay
                                    muted
                                    playsInline
                                    preload="auto"
                                    loop={false}
                                />
                                <div className="contactLeftVideo-whiteMask" aria-hidden="true" />
                            </div>
                        </div>

                        {/* contenuto che deve “partire sotto” */}
                        <div style={{ display: "grid", gap: 12 }}>
                            <h2 className="contactMini-h2">Scrivici quando vuoi.</h2>
                            <p className="contactMini-p">
                                Portiamo il tuo lavoro e quello della tua azienda a tutto un altro livello.
                            </p>
                            <p className="contactMini-p">Sei pronto a fare il salto di qualità?</p>
                        </div>

                        <div className="contactMini-ctaRow" style={{ marginTop: 18 }}>
                            <Link
                                className="contactMini-cta"
                                href={`mailto:${email}`}
                                style={{ ["--cta-accent" as any]: accentToCss("blue") } as React.CSSProperties}
                            >
                                Scrivi una mail
                            </Link>

                            <Link
                                className="contactMini-cta isGhost"
                                href="/portfolio"
                                style={{ ["--cta-accent" as any]: accentToCss("purple") } as React.CSSProperties}
                            >
                                Vedi portfolio
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT (solo cards, come prima) */}
                    <div ref={cardsWrapRef} className="contactMini-cards">
                        <div
                            ref={firstCardRef}
                            className="contactMini-card"
                            style={{ ["--card-accent" as any]: accentToCss("yellow") } as React.CSSProperties}
                        >
                            <div className="contactMini-cardTop">
                                <IconMail />
                            </div>

                            <div className="contactMini-cardBody">
                                <div className="contactMini-cardTitle">Dicci Ciao</div>
                                <a className="contactMini-link" href={`mailto:${email}`}>
                                    {email}
                                </a>
                                <a className="contactMini-link" href={`tel:${phone.replace(/\s+/g, "")}`}>
                                    {phone}
                                </a>
                            </div>

                            <span className="contactMini-accentLine" aria-hidden="true" />
                        </div>

                        <div
                            className="contactMini-card"
                            style={{ ["--card-accent" as any]: accentToCss("blue") } as React.CSSProperties}
                        >
                            <div className="contactMini-cardTop">
                                <IconPin />
                            </div>

                            <div className="contactMini-cardBody">
                                <div className="contactMini-cardTitle">Location</div>
                                <div className="contactMini-muted">{address1}</div>
                                <div className="contactMini-muted">{address2}</div>
                            </div>

                            <span className="contactMini-accentLine" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </section>

            <style jsx global>{`
        /* Mobile: niente offset */
        @media (max-width: 1023px) {
          .contactMini-left {
            padding-top: 0 !important;
            min-height: auto !important;
            display: block !important;
          }
          .contactMini-ctaRow {
            margin-top: 22px !important;
          }
        }

        /* ======================================================
           VIDEO INCASELLATO SOPRA “Scrivici quando vuoi.” (SINISTRA)
           ====================================================== */
        :root {
          --leftVideoH: min(28vh, 240px);
        }

        .contactLeftWithVideo {
          position: relative;
          padding-top: calc(var(--leftVideoH) + 18px);
        }

        .contactLeftVideo {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: var(--leftVideoH);
          pointer-events: none;
          z-index: 0;
        }

        .contactLeftVideo-media {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;

          -webkit-mask-image:
            linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%),
            linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
          mask-image:
            linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%),
            linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }

        .contactLeftVideo-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 18%;
          transform: scale(1.02);
          transform-origin: center;
          user-select: none;
        }

        .contactLeftVideo-whiteMask {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.92) 0%,
              rgba(255, 255, 255, 0.58) 38%,
              rgba(255, 255, 255, 0.22) 72%,
              rgba(255, 255, 255, 0.00) 100%
            ),
            radial-gradient(
              1200px 520px at 50% 35%,
              rgba(255, 255, 255, 0.55) 0%,
              rgba(255, 255, 255, 0.00) 70%
            );
          mix-blend-mode: screen;
          opacity: 1;
        }

        /* contenuto sopra al video */
        .contactLeftWithVideo > *:not(.contactLeftVideo) {
          position: relative;
          z-index: 1;
        }

        @media (max-width: 640px) {
          :root { --leftVideoH: min(22vh, 190px); }
          .contactLeftVideo-video { object-position: 50% 16%; }
        }
      `}</style>
        </main>
    );
}