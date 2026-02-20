"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const NAV_ITEMS = [
    { label: "Home", href: "/" },
    { label: "Chi Siamo", href: "/about" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Contatti", href: "/contact" },
];

export function Navbar() {
    // ✅ show/hide on scroll
    const [hidden, setHidden] = useState(false);
    const lastY = useRef(0);
    const ticking = useRef(false);

    // ✅ mobile menu
    const [mobileOpen, setMobileOpen] = useState(false);
    const closeMobile = () => setMobileOpen(false);
    const toggleMobile = () => setMobileOpen((v) => !v);

    useEffect(() => {
        lastY.current = window.scrollY;

        const onScroll = () => {
            if (ticking.current) return;
            ticking.current = true;

            requestAnimationFrame(() => {
                const y = window.scrollY;
                const delta = y - lastY.current;

                const TOP_LOCK = 24; // sempre visibile vicino al top
                const HIDE_AFTER = 120; // non nascondere subito
                const DELTA_TRIGGER = 8; // evita flicker con scroll micro

                if (y < TOP_LOCK) {
                    setHidden(false);
                } else if (y > HIDE_AFTER) {
                    if (delta > DELTA_TRIGGER) {
                        // scroll DOWN
                        setHidden(true);
                        if (mobileOpen) closeMobile();
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
    }, [mobileOpen]);

    // ✅ lock scroll + ESC close quando menu mobile aperto
    useEffect(() => {
        if (!mobileOpen) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeMobile();
        };
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [mobileOpen]);

    return (
        <>
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
                            onClick={() => {
                                closeMobile();
                            }}
                            className="text-xl tracking-wide text-[#0b1118] hover:text-black transition-colors"
                        >
                            <span className="font-display font-semibold">Evolve</span>
                        </Link>

                        {/* DESKTOP NAV */}
                        <div className="hidden md:flex items-center gap-8 text-sm text-[#0b1118]">
                            {NAV_ITEMS.map((it) => (
                                <Link
                                    key={it.href}
                                    href={it.href}
                                    className="text-[#0b1118] hover:text-black transition-colors"
                                >
                                    {it.label}
                                </Link>
                            ))}
                        </div>

                        {/* MOBILE BURGER */}
                        <button
                            type="button"
                            onClick={toggleMobile}
                            aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
                            aria-expanded={mobileOpen}
                            className="md:hidden grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white/40 hover:bg-white/60 transition"
                        >
                            <div className="relative h-[14px] w-[18px]">
                <span
                    className="absolute left-0 top-0 h-[2px] w-full bg-[#0b1118]"
                    style={{
                        transformOrigin: "center",
                        transform: mobileOpen ? "translateY(6px) rotate(45deg)" : "none",
                        transition: "transform 180ms ease",
                    }}
                />
                                <span
                                    className="absolute left-0 top-[6px] h-[2px] w-full bg-[#0b1118]"
                                    style={{
                                        opacity: mobileOpen ? 0 : 1,
                                        transition: "opacity 160ms ease",
                                    }}
                                />
                                <span
                                    className="absolute left-0 top-[12px] h-[2px] w-full bg-[#0b1118]"
                                    style={{
                                        transformOrigin: "center",
                                        transform: mobileOpen ? "translateY(-6px) rotate(-45deg)" : "none",
                                        transition: "transform 180ms ease",
                                    }}
                                />
                            </div>
                        </button>
                    </nav>
                </div>
            </motion.header>

            {/* MOBILE OVERLAY MENU */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="fixed inset-0 z-[60] md:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* overlay */}
                        <div
                            className="absolute inset-0 bg-black/30"
                            onClick={closeMobile}
                        />

                        {/* panel */}
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute left-0 right-0 top-0 bg-white/85 backdrop-blur-md ring-1 ring-black/5"
                        >
                            <div className="px-6 pt-24 pb-10">
                                <div className="flex flex-col gap-4">
                                    {NAV_ITEMS.map((it) => (
                                        <Link
                                            key={it.href}
                                            href={it.href}
                                            onClick={closeMobile}
                                            className="text-[28px] leading-[1.1] tracking-[-0.02em] text-[#0b1118] hover:text-black transition-colors font-display font-semibold"
                                        >
                                            {it.label}
                                        </Link>
                                    ))}
                                </div>

                                <div className="mt-8 text-sm text-black/50">
                                    © {new Date().getFullYear()} Evolve
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}