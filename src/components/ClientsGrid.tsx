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
    { id: "c1", name: "Devit", href: "https://www.devit.cloud/", logoSrc: "/clients/logo_devit.png" },
    { id: "c2", name: "Schulz", href: "https://schulzitalia.com", logoSrc: "/clients/logo_schulz.png" },
    { id: "c3", name: "Centro Idea Casa", href: "https://www.centroideacasa.it/", logoSrc: "/clients/logo_centroideacasa.png"},
    { id: "c4", name: "Ediljomida", href: "https://ediljomida.it/", logoSrc: "/clients/logo_ediljomida.png" },
    { id: "c5", name: "Centro Airone", href: "https://www.instagram.com/centroolistico_airone/", logoSrc: "/clients/logo_airone.png" },
    { id: "c6", name: "Billy's", href: "https://www.instagram.com/billys_ristopub/", logoSrc: "/clients/logo_billys.png" },
    { id: "c7", name: "Eurometal", href: "https://www.eurometalvalmontone.it/", logoSrc: "/clients/logo_eurometal.png"  },
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
