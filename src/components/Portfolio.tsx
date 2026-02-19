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
        id: "consulenza",
        title: "Consulenza Informatica",
        num: "01",
        accent: "blue",
        body: [
            "La consulenza è il punto di partenza per prendere decisioni consapevoli: analizziamo il contesto operativo",
            "individuiamo criticità e opportunità. Definiamo insieme a te la giusta direzione tecnologica per la tua crescita.",
        ],
        cardTitle: "Strategia Digitale",
        cardText:
            "Affianchiamo le aziende nella comprensione e strutturazione dei propri processi digitali.",
        image: "/portfolio/portfolio_01.png",
    },
    {
        id: "stampa",
        title: "Stampa 3D",
        num: "02",
        accent: "purple",
        body: [
            "Grazie alla stampa 3D, è possibile collegare il digitale al fisico, ampliando le possibilità operative dell'attività.",
            "Ti forniamo strumenti utili o che possono fare colpo sulle persone a cui venderai il tuo prodotto: dal marketing alla gestione dei processi.",
        ],
        cardTitle: "Stampa 3D",
        cardText:
            "Progettiamo e realizziamo soluzioni fisiche tramite stampa 3D integrate con sistemi digitali, anche con integrazioni elettroniche (eLinker, microcontroller).",
        image: "/portfolio/portfolio_02.png",
    },
    {
        id: "sviluppo",
        title: "Sviluppo Software",
        num: "03",
        accent: "yellow",
        body: [
            "Ogni applicazione è pensata per integrarsi con l’operatività quotidiana, adattarsi alla complessità del contesto e crescere nel tempo, evitando soluzioni rigide o sovradimensionate.",
            "Dal backoffice al portale clienti: flussi solidi, sicurezza e integrazioni reali con i tuoi sistemi, sviluppate da professionisti con oltre dieci anni di esperienza nello sviluppo di soluzioni informatiche.",
        ],
        cardTitle: "Sviluppo Software",
        cardText:
            "Progettiamo e sviluppiamo software su misura partendo dai processi reali dell’azienda.",
        image: "/portfolio/portfolio_03.png",
    },
    {
        id: "automation",
        title: "Soluzioni IA",
        num: "04",
        accent: "blue",
        body: [
            "Niente fuffa: soluzioni che ti aiutano davvero a rendere più efficente la tua attività.",
            "L’IA viene utilizzata come strumento di supporto decisionale, automazione o analisi, sempre in modo proporzionato e controllabile.",
        ],
        cardTitle: "Soluzioni IA",
        cardText:
            "Integriamo soluzioni basate su intelligenza artificiale per produrre casi d'uso concreti e misurabili.",
        image: "/portfolio/portfolio_04.png",
    },
    {
        id: "formazione",
        title: "Formazione",
        num: "05",
        accent: "purple",
        body: [
            "La formazione è pensata come parte del progetto: accompagniamo il team nella comprensione degli strumenti, dei flussi e delle logiche operative.",
            "Un sistema funziona davvero solo se chi lo usa lo comprende come se l'avesse fatto lui.",
        ],
        cardTitle: "Formazione",
        cardText:
            "Offriamo formazione mirata per rendere te e i tuoi collaboratori autonomi nell’utilizzo dei sistemi sviluppati.",
        image: "/portfolio/portfolio_05.png",
    },
    {
        id: "gestionali",
        title: "Evolve Atlas",
        num: "06",
        accent: "yellow",
        body: [
            "ATLAS consente di strutturare dati, flussi operativi e relazioni in modo coerente, mantenendo controllo, semplicità e possibilità di evoluzione nel tempo, anche in contesti complessi o in crescita.",
            "E per dimostrarti quanto è utile: lo usiamo in prima persona noi, e per tutto il tempo dello sviluppo lo useremo con te.",
        ],
        cardTitle: "Evolve Atlas",
        cardText:
            "ATLAS è il sistema gestionale sviluppato internamente ad Evolve: un ecosistema modulare, in cui ogni componente è configurato in base al tuo processo aziendale.",
        image: "/portfolio/portfolio_06.png",
    },
    {
        id: "siti",
        title: "Siti Web",
        num: "06",
        accent: "blue",
        body: [
            "Ogni scelta è orientata a chiarezza, usabilità e integrazione con altri sistemi aziendali.",
            "Il risultato è un sito coerente con l'attività, facile da gestire e pronto a evolvere.",
        ],
        cardTitle: "Siti Web",
        cardText:
            "Dal semplice sito vetrina ad una vero e proprio strumento operativo, ogni sito web è realizzato nella giusta taglia.",
        image: "/portfolio/portfolio_07.png",
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

