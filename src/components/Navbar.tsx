"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SupportChat } from "@/components/SupportChat"; // ✅ aggiusta path se serve

const NAV_ITEMS = [
    { label: "Home", href: "/" },
    { label: "Chi Siamo", href: "/about" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Contatti", href: "/contact" },
];

/** ✅ Brand typewriter loop (hover-safe) */
const BRAND_BASE = "Evolve";
const BRAND_PHRASES = ["Think Deeper", "Think To Evolve"];
const BRAND_LOOP = [BRAND_BASE, ...BRAND_PHRASES];

function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

    // ✅ brand hover typewriter (NO restart due to width collapse)
    const [brandHover, setBrandHover] = useState(false);
    const [brandText, setBrandText] = useState(BRAND_BASE);

    // width “fixed” so hover area never collapses during delete
    const [brandW, setBrandW] = useState<number | null>(null);
    const brandMeasureRef = useRef<HTMLSpanElement | null>(null);

    // timers for brand animation
    const brandTimersRef = useRef<number[]>([]);
    const brandStateRef = useRef({
        phraseIdx: 0, // index in BRAND_LOOP
        phase: "idle" as "idle" | "typing" | "deleting",
        char: 0,
    });

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

    // ✅ measure max width of brand phrases ONCE (same font/weight/size)
    useEffect(() => {
        if (!brandMeasureRef.current) return;

        const all = BRAND_LOOP.map((s) => s + "|"); // include cursor
        let maxW = 0;

        for (const s of all) {
            brandMeasureRef.current.textContent = s;
            const w = brandMeasureRef.current.getBoundingClientRect().width;
            if (w > maxW) maxW = w;
        }

        setBrandW(Math.ceil(maxW));
        // restore
        brandMeasureRef.current.textContent = "";
    }, []);

    const clearBrandTimers = () => {
        brandTimersRef.current.forEach((t) => window.clearTimeout(t));
        brandTimersRef.current = [];
    };

    const schedule = (fn: () => void, ms: number) => {
        const t = window.setTimeout(fn, ms);
        brandTimersRef.current.push(t);
    };

    // ✅ brand loop logic
    useEffect(() => {
        clearBrandTimers();

        // leave hover => stop and reset to base (but do NOT “fight” while leaving)
        if (!brandHover) {
            brandStateRef.current = { phraseIdx: 0, phase: "idle", char: BRAND_BASE.length };
            setBrandText(BRAND_BASE);
            return;
        }

        // start from current state (don’t restart due to rerenders)
        const run = () => {
            const st = brandStateRef.current;
            const phrase = BRAND_LOOP[st.phraseIdx];

            // tuning
            const TYPE_MS = 42;
            const DEL_MS = 28;
            const HOLD_FULL_MS = 900;
            const HOLD_EMPTY_MS = 180;

            if (st.phase === "idle") {
                // ensure we start typing next phrase (if we are on base already, go to next)
                // if currently exactly base, move to next phrase
                if (st.phraseIdx === 0) st.phraseIdx = 1;
                st.phase = "typing";
                st.char = 0;
            }

            if (st.phase === "typing") {
                st.char = Math.min(phrase.length, st.char + 1);
                setBrandText(phrase.slice(0, st.char));

                if (!brandHover) return;

                if (st.char >= phrase.length) {
                    st.phase = "deleting";
                    schedule(run, HOLD_FULL_MS);
                } else {
                    schedule(run, TYPE_MS);
                }
                return;
            }

            if (st.phase === "deleting") {
                st.char = Math.max(0, st.char - 1);
                setBrandText(phrase.slice(0, st.char));

                if (!brandHover) return;

                if (st.char <= 0) {
                    // next phrase
                    st.phraseIdx = (st.phraseIdx + 1) % BRAND_LOOP.length;
                    if (st.phraseIdx === 0) st.phraseIdx = 1; // skip base during hover loop
                    st.phase = "typing";
                    st.char = 0;
                    schedule(run, HOLD_EMPTY_MS);
                } else {
                    schedule(run, DEL_MS);
                }
                return;
            }
        };

        // init state for hover start
        brandStateRef.current = { phraseIdx: 0, phase: "idle", char: BRAND_BASE.length };
        setBrandText(BRAND_BASE);

        schedule(run, 120);

        return () => clearBrandTimers();
    }, [brandHover]);

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
                        {/* ✅ BRAND: hover typewriter loop (safe area fixed width) */}
                        <Link
                            href="/"
                            onClick={closeMobile}
                            className="navbarBrand hidden md:inline-flex text-xl tracking-wide text-[#0b1118] transition-colors"
                            onMouseEnter={() => setBrandHover(true)}
                            onMouseLeave={() => setBrandHover(false)}
                        >
              <span className="relative inline-flex items-center px-2">
                {/* hidden measurer to compute max width */}
                  <span
                      ref={brandMeasureRef}
                      className="font-display font-semibold invisible absolute left-0 top-0 whitespace-nowrap"
                      aria-hidden="true"
                  />
                <span
                    className="font-display font-semibold whitespace-nowrap"
                    style={brandW ? { width: brandW } : undefined}
                >
                  {brandText}
                    <span className="inline-block translate-y-[1px] ml-[2px] opacity-70">
                    |
                  </span>
                </span>
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