"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const homeDropdown = [
    { label: "Consulenza", href: "/portfolio" },
    { label: "Startup Innovativa", href: "/portfolio" },
    { label: "Formazione", href: "/portfolio" },
];

const portfolioDropdown = [
    { label: "Evolve Atlas", href: "/portfolio" },
    { label: "Stampa 3D", href: "/portfolio" },
    { label: "Siti Web", href: "/portfolio" },
];

function accentForIndex(i: number) {
    const palette = [
        "var(--accent-yellow)",
        "var(--accent-blue)",
        "var(--accent-purple)",
    ];
    return palette[i % palette.length];
}

function DropdownItem({
                          href,
                          label,
                          onClick,
                          accent,
                      }: {
    href: string;
    label: string;
    onClick: () => void;
    accent: string;
}) {
    const TEXT_START_PAD = 32;
    const LINE_LEFT_PAD = 10;
    const LINE_W = 20;
    const NET_TEXT_SHIFT = 6;

    return (
        <Link
            href={href}
            onClick={onClick}
            className="block px-4 py-3 hover:bg-black/[0.04]"
            style={{ whiteSpace: "nowrap" }}
        >
            <motion.div
                className="relative inline-flex items-center"
                style={{ whiteSpace: "nowrap" }}
                initial="rest"
                whileHover="hover"
                animate="rest"
            >
                <div className="relative" style={{ width: TEXT_START_PAD, height: "1em" }}>
                    <motion.div
                        className="absolute top-1/2 h-[2px]"
                        style={{
                            left: LINE_LEFT_PAD,
                            width: LINE_W,
                            backgroundColor: accent,
                            transformOrigin: "left center",
                            marginTop: "-1px",
                        }}
                        variants={{
                            rest: { scaleX: 0 },
                            hover: { scaleX: 1 },
                        }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                </div>

                <motion.span
                    className="text-foreground/90"
                    style={{ whiteSpace: "nowrap" }}
                    variants={{
                        rest: { x: 0, color: "rgba(238,242,247,0.90)" },
                        hover: { x: NET_TEXT_SHIFT, color: accent },
                    }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                >
                    {label}
                </motion.span>
            </motion.div>
        </Link>
    );
}

function NavDropdown({
                         id,
                         label,
                         items,
                         openId,
                         setOpenId,
                         closeAll,
                     }: {
    id: string;
    label: string;
    items: { label: string; href: string }[];
    openId: string | null;
    setOpenId: (v: string | null) => void;
    closeAll: () => void;
}) {
    const isOpen = openId === id;

    const longestLen = items.reduce((m, it) => Math.max(m, it.label.length), 0);
    const menuMinWidth = `${longestLen + 7}ch`;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : id)}
                className="flex items-center gap-1 text-[#0b1118] hover:text-black transition-colors"
            >
                {label} <span className="text-black/50">▾</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-2 mt-3 bg-glass backdrop-blur-md shadow-xl ring-1 ring-white/10"
                        style={{ minWidth: menuMinWidth, width: "max-content" }}
                    >
                        <div className="py-3">
                            {items.map((item, idx) => (
                                <DropdownItem
                                    key={item.href}
                                    href={item.href}
                                    label={item.label}
                                    onClick={closeAll}
                                    accent={accentForIndex(idx)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function Navbar() {
    const [openId, setOpenId] = useState<string | null>(null);
    const closeAll = () => setOpenId(null);

    // ✅ show/hide on scroll
    const [hidden, setHidden] = useState(false);
    const lastY = useRef(0);
    const ticking = useRef(false);

    useEffect(() => {
        lastY.current = window.scrollY;

        const onScroll = () => {
            if (ticking.current) return;
            ticking.current = true;

            requestAnimationFrame(() => {
                const y = window.scrollY;
                const delta = y - lastY.current;

                const TOP_LOCK = 24;        // sempre visibile vicino al top
                const HIDE_AFTER = 120;     // non nascondere subito
                const DELTA_TRIGGER = 8;    // evita flicker con scroll micro

                if (y < TOP_LOCK) {
                    setHidden(false);
                } else if (y > HIDE_AFTER) {
                    if (delta > DELTA_TRIGGER) {
                        // scroll DOWN
                        setHidden(true);
                        if (openId) closeAll();
                    } else if (delta < -DELTA_TRIGGER) {
                        // scroll UP
                        setHidden(false);
                    }
                }

                lastY.current = y;
                ticking.current = false;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openId]);

    return (
        <motion.header
            className="fixed top-0 left-0 right-0 z-50"
            initial={false}
            animate={hidden ? "hidden" : "shown"}
            variants={{
                shown: { y: 0, opacity: 1 },
                hidden: { y: -18, opacity: 0 },
            }}
            transition={{ duration: 0.22, ease: "easeOut" }}
        >
            <div className="bg-white/70 backdrop-blur-md ring-1 ring-black/5">
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                    <Link
                        href="/"
                        onClick={closeAll}
                        className="text-xl tracking-wide text-[#0b1118] hover:text-black transition-colors"
                    >
                        <span className="font-display font-semibold">Evolve</span>
                    </Link>

                    <div className="flex items-center gap-8 text-sm text-[#0b1118]">
                        <NavDropdown
                            id="home"
                            label="Home"
                            items={homeDropdown}
                            openId={openId}
                            setOpenId={setOpenId}
                            closeAll={closeAll}
                        />

                        <Link
                            href="/portfolio"
                            onClick={closeAll}
                            className="text-[#0b1118] hover:text-black transition-colors"
                        >
                            Portfolio
                        </Link>

                        <NavDropdown
                            id="portfolio"
                            label="Prodotti"
                            items={portfolioDropdown}
                            openId={openId}
                            setOpenId={setOpenId}
                            closeAll={closeAll}
                        />

                        <Link
                            href="/blogs"
                            onClick={closeAll}
                            className="text-[#0b1118] hover:text-black transition-colors"
                        >
                            Team
                        </Link>

                        <Link
                            href="/contact"
                            onClick={closeAll}
                            className="text-[#0b1118] hover:text-black transition-colors"
                        >
                            Contatti
                        </Link>
                    </div>
                </nav>
            </div>
        </motion.header>
    );
}
