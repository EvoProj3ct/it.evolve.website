"use client";

import Link from "next/link";
import React from "react";

type TeamMember = {
    id: string;
    name: string;
    role: string;
    bio: string;
    photo: string;
    links: { type: "email" | "linkedin" | "x" | "web"; href: string }[];
};

const TEAM: TeamMember[] = [
    {
        id: "t1",
        name: "Gian Marco Marinelli",
        role: "Consulente informatico",
        bio: "Trasformo processi e idee in soluzioni digitali concrete, veloci da usare e facili da scalare.",
        photo: "/team/team_1.png",
        links: [
            { type: "email", href: "mailto:infoevolvecompany@gmail.com" },
            { type: "linkedin", href: "#" },
            { type: "web", href: "#" },
            { type: "x", href: "#" },
        ],
    },
    {
        id: "t2",
        name: "Emanuele Ienna",
        role: "Project Manager",
        bio: "Potenzio flussi di lavoro e soluzioni digitali per agevolare sistemi di automazione, sicurezza e controllo.",
        photo: "/team/team_2.png",
        links: [
            { type: "email", href: "mailto:infoevolvecompany@gmail.com" },
            { type: "linkedin", href: "#" },
            { type: "web", href: "#" },
            { type: "x", href: "#" },
        ],
    },
    {
        id: "t3",
        name: "Luca De Angelis",
        role: "Amministratore e Progettista 3D",
        bio: "Realizzo soluzioni elettroniche integrate a stampa 3D per unire il fisico con il digitale. ",
        photo: "/team/team_3.png",
        links: [
            { type: "email", href: "mailto:infoevolvecompany@gmail.com" },
            { type: "linkedin", href: "#" },
            { type: "web", href: "#" },
            { type: "x", href: "#" },
        ],
    },
    {
        id: "t4",
        name: "Luca M.",
        role: "Full Stack Developer",
        bio: "Sviluppo automazioni, app e integrazioni su misura: dal prototipo alla produzione con attenzione al dettaglio.",
        photo: "/team/team_4.png",
        links: [
            { type: "email", href: "mailto:infoevolvecompany@gmail.com" },
            { type: "linkedin", href: "#" },
            { type: "web", href: "#" },
            { type: "x", href: "#" },
        ],
    },
];

function Icon({ type }: { type: TeamMember["links"][number]["type"] }) {
    // icone minimal “testuali” (puoi sostituire con lucide-react quando vuoi)
    if (type === "email") return <span aria-hidden>✉</span>;
    if (type === "linkedin") return <span aria-hidden>in</span>;
    if (type === "x") return <span aria-hidden>𝕏</span>;
    return <span aria-hidden>⌁</span>;
}

export function TeamStrip() {
    return (
        <section className="teamStrip-section" aria-label="Team">
            <div className="teamStrip-wrap">
                <div className="teamStrip-head">
                    <div className="teamStrip-kicker">IL NOSTRO TEAM</div>
                    <h2 className="teamStrip-title">L'unione fa la soluzione.</h2>
                    <div className="teamStrip-title">----</div>
                </div>

                <div className="teamStrip-row" role="list">
                {TEAM.map((p) => (
                        <article key={p.id} className="teamStrip-card" role="listitem">
                            <img className="teamStrip-img" src={p.photo} alt={p.name} loading="lazy"/>

                            {/* ✅ copre COMPLETAMENTE l’immagine in hover */}
                            <div className="teamStrip-cover" aria-hidden/>

                            {/* ✅ shape + contenuti (centrati) */}
                            <div className="teamStrip-panel" aria-hidden>
                                <div className="teamStrip-content">
                                    <h3 className="teamStrip-name">{p.name}</h3>
                                    <div className="teamStrip-role">{p.role}</div>
                                    <p className="teamStrip-bio">{p.bio}</p>

                                    <div className="teamStrip-socials" aria-label={`Contatti ${p.name}`}>
                                        {p.links.map((l, idx) => (
                                            <Link
                                                key={`${p.id}-${idx}`}
                                                href={l.href}
                                                target={l.href.startsWith("http") ? "_blank" : undefined}
                                                rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                                                className="teamStrip-socialBtn"
                                                aria-label={l.type}
                                            >
                                                <Icon type={l.type}/>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
