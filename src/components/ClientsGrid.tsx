"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

type Client = {
    id: string;
    name: string;
    href: string;
    logoSrc?: string;
};

const CLIENTS: Client[] = [
    { id: "c1", name: "Devit", href: "https://www.devit.cloud/", logoSrc: "/clients/logo_devit.png" },
    { id: "c2", name: "Schulz", href: "https://schulzitalia.com", logoSrc: "/clients/logo_schulz.png" },
    { id: "c3", name: "Centro Idea Casa", href: "https://www.centroideacasa.it/", logoSrc: "/clients/logo_centroideacasa.png" },
    { id: "c4", name: "Ediljomida", href: "https://ediljomida.it/", logoSrc: "/clients/logo_ediljomida.png" },
    { id: "c5", name: "Centro Airone", href: "https://www.instagram.com/centroolistico_airone/", logoSrc: "/clients/logo_airone.png" },
    { id: "c6", name: "Billy's", href: "https://www.instagram.com/billys_ristopub/", logoSrc: "/clients/logo_billys.png" },
    { id: "c7", name: "Eurometal", href: "https://www.eurometalvalmontone.it/", logoSrc: "/clients/logo_eurometal.png" },
    { id: "c8", name: "Cliente Y", href: "https://example.com" },
    { id: "c9", name: "Cliente Z", href: "https://example.com" },
    { id: "c10", name: "Cliente W", href: "https://example.com" },
];

export function ClientsGrid() {
    const items = useMemo(() => CLIENTS, []);
    const [active, setActive] = useState<Client | null>(null);
    const [portalEnabled, setPortalEnabled] = useState(false);

    // ✅ enable only for mouse/trackpad (no touch) + not tiny screens
    useEffect(() => {
        const mqFine = window.matchMedia("(pointer: fine)");
        const mqWidth = window.matchMedia("(min-width: 821px)");

        const sync = () => setPortalEnabled(mqFine.matches && mqWidth.matches);
        sync();

        mqFine.addEventListener?.("change", sync);
        mqWidth.addEventListener?.("change", sync);
        return () => {
            mqFine.removeEventListener?.("change", sync);
            mqWidth.removeEventListener?.("change", sync);
        };
    }, []);

    const enter = (c: Client) => {
        if (!portalEnabled) return;
        setActive(c);
    };

    const leave = (id: string) => {
        if (!portalEnabled) return;
        setActive((a) => (a?.id === id ? null : a));
    };

    return (
        <section className="clientsGrid-section" aria-label="I nostri clienti">
            <div className="clientsGrid-wrap">
                <div className="clientsGrid-grid">
                    {items.map((c) => (
                        <Link
                            key={c.id}
                            href={c.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="clientsGrid-cell"
                            aria-label={c.name}
                            onMouseEnter={() => enter(c)}
                            onMouseLeave={() => leave(c.id)}
                            onFocus={() => enter(c)}
                            onBlur={() => leave(c.id)}
                        >
                            <div className="clientsGrid-inner">
                                {c.logoSrc ? (
                                    <img className="clientsGrid-logo" src={c.logoSrc} alt={c.name} loading="lazy" />
                                ) : (
                                    <span className="clientsGrid-fallback">{c.name}</span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ✅ PORTAL (only when enabled) */}
            {/* ...grid... */}

            <AnimatePresence>
                {portalEnabled && active ? (
                    <motion.div
                        key={`portal-${active.id}`}
                        className="clientsGrid-portal"
                        aria-hidden
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14 }}
                    >
                        <div className="clientsGrid-portalBackdrop" />
                        <div className="clientsGrid-portalPulse" />
                        <div className="clientsGrid-portalSparks" />

                        <motion.div
                            key={`card-${active.id}`}
                            className="clientsGrid-portalCard"
                            initial={{ scale: 0.86, y: 14, filter: "blur(10px)" }}
                            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ scale: 0.94, y: 10, filter: "blur(10px)" }}
                            transition={{ duration: 0.22, ease: [0.18, 0.95, 0.25, 1] }}
                        >
                            <div className="clientsGrid-portalGlow" />
                            <div className="clientsGrid-portalFrame">
                                {active.logoSrc ? (
                                    <img className="clientsGrid-portalLogo" src={active.logoSrc} alt="" />
                                ) : (
                                    <div className="clientsGrid-portalFallback">{active.name}</div>
                                )}
                            </div>
                            <div className="clientsGrid-portalLabel">{active.name}</div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </section>
    );
}