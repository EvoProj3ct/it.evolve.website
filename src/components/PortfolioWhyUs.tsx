"use client";

import React from "react";

type Accent = "blue" | "purple" | "yellow";

type Feature = {
    title: string;
    desc: string;
    accent: Accent;
    icon: "corner" | "check" | "grid" | "spark";
};

const FEATURES: Feature[] = [
    {
        title: "Design su Misura",
        desc: "Interfacce essenziali e coerenti: brand, UI e UX progettati per essere chiari, veloci e credibili.",
        accent: "yellow",
        icon: "corner",
    },
    {
        title: "Codice di Qualità",
        desc: "Architetture pulite, componenti riusabili, test e review: la qualità è un processo, non un desiderio.",
        accent: "blue",
        icon: "check",
    },
    {
        title: "Pulito & Minimal",
        desc: "Meno rumore, più funzione: esperienza elegante, leggibilità e gerarchie tipografiche curate.",
        accent: "purple",
        icon: "grid",
    },
    {
        title: "Supporto Reale",
        desc: "Siamo presenti dopo la consegna: monitoraggio, evolutive, performance e priorità sempre sotto controllo.",
        accent: "yellow",
        icon: "spark",
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
        case "corner":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    <path {...common} d="M6 18V8a2 2 0 0 1 2-2h10" />
                    <path {...common} d="M6 18h10a2 2 0 0 0 2-2V6" />
                </svg>
            );
        case "check":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    <path {...common} d="M6 12.5 10 16.5 18 8.5" />
                </svg>
            );
        case "grid":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    <path {...common} d="M6 6h5v5H6zM13 6h5v5h-5zM6 13h5v5H6zM13 13h5v5h-5z" />
                </svg>
            );
        case "spark":
            return (
                <svg viewBox="0 0 24 24" className="whyUs-iconSvg" aria-hidden="true">
                    <path {...common} d="M12 3l1.2 5.1L18 10l-4.8 1.9L12 17l-1.2-5.1L6 10l4.8-1.9L12 3Z" />
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
                        Sviluppiamo prodotti digitali solidi e scalabili: design, ingegneria e consegna lavorano insieme,
                        senza frizioni.
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