"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const homeDropdown = [
    { label: "Main Home", href: "/" },
    { label: "Creative Studio", href: "/creative" },
    { label: "Business Startup", href: "/startup" },
];

const portfolioDropdown = [
    { label: "Stampa 3D", href: "/portfolio/stampa-3d" },
    { label: "ATLAS use cases", href: "/portfolio/atlas-use-cases" },
    { label: "Websites", href: "/portfolio/websites" },
];

function DropdownItem({
                          href,
                          label,
                          onClick,
                      }: {
    href: string;
    label: string;
    onClick: () => void;
}) {
    /**
     * Misure finali (pixel-perfect)
     */
    const TEXT_START_PAD = 32; // spazio fisso prima del testo
    const LINE_LEFT_PAD = 10;
    const LINE_W = 20;
    const GAP_TO_TEXT = 10;

    const NET_TEXT_SHIFT = 6; // piccolo movimento verso destra

    return (
        <Link
            href={href}
            onClick={onClick}
            className="block px-4 py-3 hover:bg-white/5"
            style={{ whiteSpace: "nowrap" }}
        >
            <motion.div
                className="relative inline-flex items-center"
                style={{ whiteSpace: "nowrap" }}
                initial="rest"
                whileHover="hover"
                animate="rest"
            >
                {/* Spazio fisso prima del testo */}
                <div
                    className="relative"
                    style={{ width: TEXT_START_PAD, height: "1em" }}
                >
                    <motion.div
                        className="absolute top-1/2 h-[2px]"
                        style={{
                            left: LINE_LEFT_PAD,
                            width: LINE_W,
                            backgroundColor: "var(--color-accent)",
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

                {/* Testo */}
                <motion.span
                    className="text-foreground/90"
                    style={{ whiteSpace: "nowrap" }}
                    variants={{
                        rest: { x: 0, color: "rgba(238,242,247,0.90)" },
                        hover: { x: NET_TEXT_SHIFT, color: "var(--color-accent)" },
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

    const longestLen = items.reduce(
        (m, it) => Math.max(m, it.label.length),
        0
    );
    const menuMinWidth = `${longestLen + 7}ch`;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : id)}
                className="flex items-center gap-1 hover:text-foreground"
            >
                {label} <span className="text-foreground/60">▾</span>
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
                            {items.map((item) => (
                                <DropdownItem
                                    key={item.href}
                                    href={item.href}
                                    label={item.label}
                                    onClick={closeAll}
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

    return (
        <header className="absolute top-0 left-0 right-0 z-50">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
                <Link
                    href="/"
                    onClick={closeAll}
                    className="text-xl tracking-wide text-foreground"
                >
                    <span className="font-display font-semibold">Evolve</span>
                </Link>

                <div className="flex items-center gap-8 text-sm text-foreground/90">
                    <NavDropdown
                        id="home"
                        label="Home"
                        items={homeDropdown}
                        openId={openId}
                        setOpenId={setOpenId}
                        closeAll={closeAll}
                    />

                    <Link href="/about" onClick={closeAll} className="hover:text-foreground">
                        About
                    </Link>

                    <NavDropdown
                        id="portfolio"
                        label="Portfolio"
                        items={portfolioDropdown}
                        openId={openId}
                        setOpenId={setOpenId}
                        closeAll={closeAll}
                    />

                    <Link href="/blogs" onClick={closeAll} className="hover:text-foreground">
                        Blogs
                    </Link>

                    <Link href="/contact" onClick={closeAll} className="hover:text-foreground">
                        Contact
                    </Link>
                </div>
            </nav>
        </header>
    );
}
