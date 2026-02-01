"use client";

import React, { useMemo, useRef, useState } from "react";

type CollageItem = {
    id: string;
    src: string;
    alt: string;
    tagTop: string;
    tagBottom: string;
    variant: string;
    slot:
        | "side-left"
        | "side-right"
        | "top-1"
        | "top-2"
        | "top-3"
        | "bot-1"
        | "bot-2"
        | "bot-3";
};

export function PortfolioCollage() {
    const items: CollageItem[] = useMemo(
        () => [
            {
                id: "side-left",
                slot: "side-left",
                variant: "side",
                src: "/collage/product1.png",
                alt: "Left",
                tagTop: "BRAND DESIGN",
                tagBottom: "MINIMAL & CLEAN",
            },
            {
                id: "top-1",
                slot: "top-1",
                variant: "center",
                src: "/collage/product_ai.png",
                alt: "Top 1",
                tagTop: "ESPERTI AI",
                tagBottom: "Agenti e Chatbot",
            },
            {
                id: "top-2",
                slot: "top-2",
                variant: "center",
                src: "/collage/product_formazione.png",
                alt: "Top 2",
                tagTop: "FORMAZIONE",
                tagBottom: "Sulle nuove Tecnologie",
            },
            {
                id: "top-3",
                slot: "top-3",
                variant: "center",
                src: "/collage/product_atlas.png",
                alt: "Top 3",
                tagTop: "ATLAS",
                tagBottom: "Gestione e Controllo",
            },
            {
                id: "bot-1",
                slot: "bot-1",
                variant: "center",
                src: "/collage/product_consulenza.png",
                alt: "Bottom 1",
                tagTop: "CONSULENZA",
                tagBottom: "Perché Innovare Conta",
            },
            {
                id: "bot-2",
                slot: "bot-2",
                variant: "center",
                src: "/collage/product_elettronica.png",
                alt: "Bottom 2",
                tagTop: "INTEGRAZIONI ELETTRONICHE",
                tagBottom: "RFID, NFC, SCANNER E BARCODE",
            },
            {
                id: "bot-3",
                slot: "bot-3",
                variant: "center",
                src: "/collage/product_elinker.png",
                alt: "Bottom 3",
                tagTop: "PORTACHIAVI INTELLIGENTI",
                tagBottom: "CON E-LINKER HAI I TUOI DATI SEMPRE CON TE",
            },
            {
                id: "side-right",
                slot: "side-right",
                variant: "side",
                src: "/collage/product1.png",
                alt: "Right",
                tagTop: "E-COMMERCE",
                tagBottom: "BELLI E FUNZIONALI",
            },
        ],
        []
    );

    const [active, setActive] = useState<CollageItem | null>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const raf = useRef<number | null>(null);

    const onMove = (e: React.MouseEvent) => {
        const x = e.clientX + 18;
        const y = e.clientY + 18;

        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => setPos({ x, y }));
    };

    return (
        <section className="collage-section">
            <div className="collage-wrap">
                <div className="collage-head">
                    <div className="collage-kicker">LE NOSTRE COMPETENZE</div>
                    <div className="collage-title">Approccio Interdisciplinare e Smart</div>
                </div>

                <div className="collage-grid">
                    {items.map((it) => (
                        <div
                            key={it.id}
                            className={[
                                "collage-tile",
                                it.variant === "side" ? "collage-tile-side" : "collage-tile-center",
                                `collage-slot-${it.slot}`,
                            ].join(" ")}
                            onMouseEnter={() => setActive(it)}
                            onMouseLeave={() => setActive(null)}
                            onMouseMove={onMove}
                        >
                            <img className="collage-img" src={it.src} alt={it.alt} />
                        </div>
                    ))}
                </div>
            </div>

            {active && (
                <div className="collage-tooltip" style={{ left: pos.x, top: pos.y }}>
                    <div className="collage-badge-top">{active.tagTop}</div>
                    <div className="collage-badge-bottom">{active.tagBottom}</div>
                </div>
            )}
        </section>
    );
}
