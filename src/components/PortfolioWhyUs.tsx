"use client";

import React from "react";

type Accent = "blue" | "purple" | "yellow";

type Feature = {
    title: string;
    desc: string;
    accent: Accent;
    icon: "sliders" | "scale" | "integration" | "quality";
};

const FEATURES: Feature[] = [
    {
        title: "Approccio Sartoriale",
        desc: "Niente pacchetti standard. Costruiamo ed adattiamo soluzioni calibrate su esigenze reali.",
        accent: "yellow",
        icon: "sliders",
    },
    {
        title: "Architettura scalabile",
        desc: "Parti da una base solida e cresci per step. Struttura modulare, roadmap chiara, nessuno spreco.",
        accent: "blue",
        icon: "scale",
    },
    {
        title: "Integrazione Digitale–Fisica",
        desc: "Software, automazioni, NFC, stampa 3D: colleghiamo strumenti e oggetti in un unico ecosistema coerente.",
        accent: "purple",
        icon: "integration",
    },
    {
        title: "Controllo e Continuità",
        desc: "Monitoraggio, ottimizzazione e supporto evolutivo. La consegna non è la fine del progetto.",
        accent: "yellow",
        icon: "quality",
    },
];

function accentToCss(a: Accent) {
    if (a === "yellow") return "var(--accent-yellow)";
    if (a === "purple") return "var(--accent-purple)";
    return "var(--accent-blue)";
}

/** Icone ultra-minimali (segni) */
function MiniIcon({ name }: { name: Feature["icon"] }) {
    const common = {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.75,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    };

    switch (name) {
        case "sliders":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    {/* linee */}
                    <path {...common} d="M4 6h16" />
                    <path {...common} d="M4 12h16" />
                    <path {...common} d="M4 18h16" />

                    {/* cerchi */}
                    <path {...common} d="M8 4a2 2 0 1 0 0.001 0Z" />
                    <path {...common} d="M14 10a2 2 0 1 0 0.001 0Z" />
                    <path {...common} d="M10 16a2 2 0 1 0 0.001 0Z" />
                </svg>
            );
        case "scale":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    {/* cerchio esterno */}
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                    />

                    {/* cerchio interno */}
                    <circle
                        cx="12"
                        cy="12"
                        r="3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                    />
                </svg>
            );
        case "integration":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    {/* elemento fisico (quadrato) */}
                    <rect
                        x="4"
                        y="9"
                        width="6"
                        height="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        rx="1"
                    />

                    {/* elemento digitale (cerchio) */}
                    <circle
                        cx="17"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                    />

                    {/* collegamento */}
                    <path
                        d="M10 12h4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                    />
                </svg>
            );
        case "quality":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    {/* cerchio controllo */}
                    <circle
                        cx="12"
                        cy="12"
                        r="7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                    />

                    {/* check qualità */}
                    <path
                        d="M8 12.5 11 15.5 16 9.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        default:
            return null;
    }
}

export default function PortfolioWhyUs() {
    return (
        <section className="whyUs" aria-label="Perché scegliere Evolve">
            <div className="whyUs-wrap">
                <header className="whyUs-head">
                    <h2 className="whyUs-title">Perché scegliere Evolve?</h2>
                    <p className="whyUs-subtitle">
                        Software, integrazioni e sistemi progettati intorno al tuo contesto.
                    </p>
                </header>

                <div className="whyUs-grid" role="list">
                    {FEATURES.map((f) => (
                        <article
                            key={f.title}
                            className="whyUs-card"
                            style={{ ["--whyus-accent" as any]: accentToCss(f.accent) } as React.CSSProperties}
                            role="listitem"
                        >
                            <div className="whyUs-icon" aria-hidden="true">
                                <MiniIcon name={f.icon} />
                            </div>

                            <h3 className="whyUs-cardTitle">{f.title}</h3>
                            <p className="whyUs-cardDesc">{f.desc}</p>

                            <span className="whyUs-accentLine" aria-hidden="true" />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}