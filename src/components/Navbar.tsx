"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SupportChat } from "@/components/SupportChat"; // ✅ aggiusta path se serve

const NAV_ITEMS = [
    { label: "Home", href: "/" },
    { label: "Chi Siamo", href: "/about" },
    { label: "Servizi", href: "/portfolio" },
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
    const openMobile = () => setMobileOpen(true);

    // ✅ chat
    const [chatOpen, setChatOpen] = useState(false);
    const closeChat = () => setChatOpen(false);
    const openChat = () => setChatOpen(true);

    // ---- scroll show/hide
    useEffect(() => {
        lastY.current = window.scrollY;

        const onScroll = () => {
            if (ticking.current) return;
            ticking.current = true;

            requestAnimationFrame(() => {
                const y = window.scrollY;
                const delta = y - lastY.current;

                const TOP_LOCK = 24;
                const HIDE_AFTER = 120;
                const DELTA_TRIGGER = 8;

                if (y < TOP_LOCK) {
                    setHidden(false);
                } else if (y > HIDE_AFTER) {
                    if (delta > DELTA_TRIGGER) {
                        setHidden(true);
                        if (mobileOpen) closeMobile();
                    } else if (delta < -DELTA_TRIGGER) {
                        setHidden(false);
                    }
                }

                lastY.current = y;
                ticking.current = false;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
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
                <div className="bg-[#72C94F]/50 backdrop-blur-md ring-1 ring-black/5 relative">
                    {/* ✅ Logo: sempre a sinistra, con più margine */}
                    <div className="absolute left-6 sm:left-10 top-0 h-full flex items-center z-10">
                        <Link href="/" onClick={closeMobile} className="flex items-center">
              <span className="inline-flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center">
                <Image
                    src="/logoEvolve.png"
                    alt="Evolve logo"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                    priority
                />
              </span>
                        </Link>
                    </div>

                    {/* ✅ CHAT ICON: SOLO DESKTOP, assoluta estrema destra (non sposta nulla) */}
                    <div className="hidden md:flex absolute right-6 sm:right-10 top-0 h-full items-center z-20">
                        <button
                            type="button"
                            onClick={openChat}
                            className="navChatBtn"
                            aria-label="Apri chat assistenza"
                        >
              <span className="navChatIcon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                      d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                  />
                  <path
                      d="M8 8h8M8 12h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                  />
                </svg>
              </span>
                        </button>
                    </div>

                    {/* ✅ Nav: padding-left per il logo assoluto + padding-right per chat assoluta (desktop only) */}
                    <nav className="navbarShell navbarShellRight mx-auto flex max-w-6xl items-center px-6 py-5">
                        {/* ✅ BRAND: testo statico */}
                        <Link
                            href="/"
                            onClick={closeMobile}
                            className="navbarBrand hidden md:inline-flex text-xl tracking-wide text-[#0b1118] transition-colors"
                        >
              <span className="font-display font-semibold whitespace-nowrap">
                Evolve
              </span>
                        </Link>

                        {/* DESKTOP NAV */}
                        <div className="hidden md:flex items-center gap-8 text-sm text-[#0b1118] ml-auto">
                            {NAV_ITEMS.map((it) => (
                                <Link key={it.href} href={it.href} className="navGlowLink">
                                    {it.label}
                                </Link>
                            ))}
                        </div>

                        {/* ✅ MOBILE: chat a sinistra del burger (NON sovrapposta) */}
                        <div className="md:hidden ml-auto flex items-center gap-2">
                            <button
                                type="button"
                                onClick={openChat}
                                className="navChatBtn"
                                aria-label="Apri chat assistenza"
                            >
                <span className="navChatIcon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M8 8h8M8 12h6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                  </svg>
                </span>
                            </button>

                            <button
                                type="button"
                                onClick={openMobile}
                                aria-label="Apri menu"
                                aria-expanded={mobileOpen}
                                className={[
                                    "grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-[#72C94F]/50 backdrop-blur-md transition",
                                    "hover:bg-[#72C94F]/60",
                                    mobileOpen ? "opacity-0 pointer-events-none" : "opacity-100",
                                ].join(" ")}
                            >
                                <div className="relative h-[18px] w-[18px]">
                                    <span className="absolute left-0 top-0 h-[2px] w-full bg-[#0b1118]" />
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-full bg-[#0b1118]" />
                                    <span className="absolute left-0 bottom-0 h-[2px] w-full bg-[#0b1118]" />
                                </div>
                            </button>
                        </div>
                    </nav>
                </div>
            </motion.header>

            {/* ✅ X sopra la tendina: FIXED + z-index altissimo */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.button
                        type="button"
                        onClick={closeMobile}
                        aria-label="Chiudi menu"
                        className="md:hidden navCloseFixed"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                        <div className="relative h-[18px] w-[18px]">
                            <span className="absolute left-0 top-1/2 h-[2px] w-full bg-[#0b1118] -translate-y-1/2 rotate-45" />
                            <span className="absolute left-0 top-1/2 h-[2px] w-full bg-[#0b1118] -translate-y-1/2 -rotate-45" />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

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
                        <div className="absolute inset-0 bg-black/30" onClick={closeMobile} />

                        {/* panel */}
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute left-0 right-0 top-0 bg-[#72C94F]/50 backdrop-blur-md ring-1 ring-black/5"
                        >
                            <div className="px-6 pt-24 pb-10">
                                <div className="flex flex-col gap-4">
                                    {NAV_ITEMS.map((it) => (
                                        <Link
                                            key={it.href}
                                            href={it.href}
                                            onClick={closeMobile}
                                            className="navGlowLink navGlowLinkMobile text-[28px] leading-[1.1] tracking-[-0.02em] text-[#0b1118] transition-colors font-display font-semibold"
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

            {/* ✅ SUPPORT CHAT */}
            <SupportChat open={chatOpen} onClose={closeChat} />
        </>
    );
}