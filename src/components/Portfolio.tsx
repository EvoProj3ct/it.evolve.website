"use client";

import React, { useMemo, useState } from "react";

type Accent = "blue" | "yellow" | "purple";

export type PortfolioSection = {
    id: string;
    title: string;
    num: string;
    accent: Accent;
    body: string[];
    cardTitle: string;
    cardText: string;
    image: string;
};

const SECTIONS: PortfolioSection[] = [
    {
        id: "strategy",
        title: "Strategia Digitale",
        num: "01",
        accent: "blue",
        body: [
            "Progettiamo roadmap, priorità e KPI per trasformare obiettivi di business in prodotti digitali misurabili.",
            "Dal workshop iniziale alle milestone: chiarezza, velocità e allineamento con il team interno.",
        ],
        cardTitle: "Strategia Digitale",
        cardText:
            "Analisi, posizionamento e roadmap: scegliamo cosa costruire, quando, e perché — con metriche e trade-off espliciti.",
        image: "/portfolio/portfolio_01.png",
    },
    {
        id: "product",
        title: "Prodotto & UX",
        num: "02",
        accent: "purple",
        body: [
            "Interfacce essenziali e coerenti: UX pragmatica, design system e prototipi rapidi per validare prima di sviluppare.",
            "Riduciamo complessità e attrito: esperienze chiare, accessibili e immediate.",
        ],
        cardTitle: "Prodotto & UX",
        cardText:
            "Wireframe, prototipi e design system: uniamo estetica e usabilità per esperienze che ‘si capiscono’ al primo colpo.",
        image: "/portfolio/portfolio_02.png",
    },
    {
        id: "webapps",
        title: "Web App su Misura",
        num: "03",
        accent: "yellow",
        body: [
            "Costruiamo applicazioni moderne (Next.js/React) con performance, SEO e scalabilità in mente.",
            "Dal backoffice al portale clienti: flussi solidi, sicurezza e integrazioni reali con i tuoi sistemi.",
        ],
        cardTitle: "Web App su Misura",
        cardText:
            "Architetture pulite, componenti riusabili e release rapide: dal prototipo alla produzione senza sorprese.",
        image: "/portfolio/portfolio_03.png",
    },
    {
        id: "automation",
        title: "Automazioni & Integrazioni",
        num: "04",
        accent: "blue",
        body: [
            "Integriamo CRM, ERP, e-commerce, pagamenti, email e strumenti interni con automazioni affidabili.",
            "Meno lavoro manuale, meno errori: pipeline, webhook, code, job schedulati e monitoraggio.",
        ],
        cardTitle: "Automazioni & Integrazioni",
        cardText:
            "Connettiamo API e servizi: flussi robusti, retry, logging e osservabilità per far funzionare tutto ‘sempre’.",
        image: "/portfolio/portfolio_04.png",
    },
    {
        id: "cloud",
        title: "Cloud & DevOps",
        num: "05",
        accent: "purple",
        body: [
            "CI/CD, ambienti e deployment: rendiamo le release noiose (nel senso buono).",
            "Sicurezza, backup, alerting e cost control: la produzione deve dormire tranquilla.",
        ],
        cardTitle: "Cloud & DevOps",
        cardText:
            "Infrastructure as Code, pipeline e monitoraggio: più affidabilità, meno downtime, più prevedibilità.",
        image: "/portfolio/portfolio_05.png",
    },
];

function accentToCssValue(a: Accent) {
    if (a === "yellow") return "var(--accent-yellow, #f5c400)";
    if (a === "purple") return "var(--accent-purple, #7c3aed)";
    return "var(--accent-blue, #2563eb)";
}

export default function Portfolio() {
    const DATA = SECTIONS;
    const fallbackDefault = DATA[2]?.id ?? DATA[0]?.id;

    const [activeId, setActiveId] = useState(fallbackDefault);

    const active = useMemo(
        () => DATA.find((s) => s.id === activeId) ?? DATA[0],
        [activeId, DATA]
    );

    const lead1 =
        "Siamo un team di sviluppo informatico che unisce strategia, design e ingegneria per costruire prodotti digitali solidi e scalabili.";
    const lead2 =
        "Lavoriamo fianco a fianco con i clienti: iterazione rapida, scelte chiare e attenzione maniacale ai dettagli che contano.";

    const accent = accentToCssValue(active.accent);

    return (
        <section
            className="portfolio"
            aria-label="Portfolio"
            style={{ ["--portfolio-accent" as any]: accent } as React.CSSProperties}
        >
            <div className="portfolio-wrap">
                <div className="portfolio-grid">
                    {/* LEFT */}
                    <div>
                        <p className="portfolio-intro">{lead1}</p>
                        <p className="portfolio-intro">{lead2}</p>

                        <nav aria-label="Sezioni portfolio">
                            <ul className={`portfolio-list ${activeId ? "hasActive" : ""}`}>
                                {DATA.map((s) => {
                                    const isActive = s.id === activeId;
                                    return (
                                        <li key={s.id}>
                                            <button
                                                type="button"
                                                className={`portfolio-item ${isActive ? "isActive" : ""}`}
                                                onClick={() => setActiveId(s.id)}
                                                aria-current={isActive ? "page" : undefined}
                                            >
                                                <span className="portfolio-label">{s.title}</span>
                                                <span className="portfolio-index" aria-hidden>
                          {s.num}
                        </span>
                                                <span className="portfolio-underline" aria-hidden />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </div>

                    {/* RIGHT */}
                    <div className="portfolio-right">
                        <div className="portfolio-media">
                            <img key={active.image} src={active.image} alt={active.title} loading="eager" />
                        </div>

                        {/* CARD tra lista e immagine */}
                        <aside className="portfolio-card" aria-label="Dettaglio">
                            <h3>{active.cardTitle}</h3>
                            <p>{active.cardText}</p>

                            <div className="portfolio-card-body" aria-label="Descrizione">
                                {active.body.map((p, i) => (
                                    <p key={i}>{p}</p>
                                ))}
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </section>
    );
}
