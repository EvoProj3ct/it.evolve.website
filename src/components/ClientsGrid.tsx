"use client";

import React from "react";
import Link from "next/link";

type Client = {
    id: string;
    name: string;          // fallback + alt
    href: string;          // link click
    logoSrc?: string;      // opzionale
};

const CLIENTS: Client[] = [
    { id: "c1", name: "Devit", href: "https://finance.yahoo.com"},
    { id: "c2", name: "Dropcam", href: "https://schulzitalia.com", logoSrc: "/clients/schulz.png" },
    { id: "c3", name: "Centro Idea Casa", href: "https://www.centroideacasa.it/", logoSrc: "/clients/cic.png"},
    { id: "c4", name: "Edil Iomida", href: "https://www.amazon.com"},
    { id: "c5", name: "Centro Airone", href: "https://www.amd.com"},
    { id: "c6", name: "Billy's", href: "https://www.cisco.com" },
    { id: "c7", name: "Cliente X", href: "https://example.com" },
    { id: "c7", name: "Cliente Y", href: "https://example.com" },
    { id: "c7", name: "Cliente Z", href: "https://example.com" },
    { id: "c7", name: "Cliente W", href: "https://example.com" },
];

export function ClientsGrid() {
    return (
        <section className="clientsGrid-section" aria-label="I nostri clienti">
            <div className="clientsGrid-wrap">
                {/* opzionale: titolo piccolo */}
                {/* <div className="clientsGrid-kicker">I NOSTRI CLIENTI</div> */}

                <div className="clientsGrid-grid">
                    {CLIENTS.map((c) => (
                        <Link
                            key={c.id}
                            href={c.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="clientsGrid-cell"
                            aria-label={c.name}
                        >
                            {c.logoSrc ? (
                                <img className="clientsGrid-logo" src={c.logoSrc} alt={c.name} loading="lazy" />
                            ) : (
                                <span className="clientsGrid-fallback">{c.name}</span>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
