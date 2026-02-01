"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FillButton } from "./FillButton";

type Slide = {
    titleTop: string;
    titleBottom: string;
    subtitle: string;
    cta: string;
    imageUrl: string;
};

export function HeroSlider() {
    const slides: Slide[] = useMemo(
        () => [
            {
                titleTop: "Unique",
                titleBottom: "brand stories",
                subtitle:
                    "If you need to redesign your new project, new visual strategy, ux structure or you do have some cool ideas for collaboration.",
                cta: "LOOK MORE",
                imageUrl: "/hero/slide1.jpg",
            },
            {
                titleTop: "Digital",
                titleBottom: "Design Awards",
                subtitle:
                    "If you need to redesign your new project, new visual strategy, ux structure or you do have some cool ideas for collaboration.",
                cta: "LOOK MORE",
                imageUrl: "/hero/slide2.jpg",
            },
            {
                titleTop: "Creative",
                titleBottom: "Studio Works",
                subtitle:
                    "If you need to redesign your new project, new visual strategy, ux structure or you do have some cool ideas for collaboration.",
                cta: "LOOK MORE",
                imageUrl: "/hero/slide3.jpg",
            },
        ],
        []
    );

    const [i, setI] = useState(0);
    const slide = slides[i];

    const prev = () => setI((v) => (v - 1 + slides.length) % slides.length);
    const next = () => setI((v) => (v + 1) % slides.length);

    return (
        <section className="relative h-[100svh] w-full overflow-hidden">
            {/* Background image: entra da destra a sinistra */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={slide.imageUrl}
                    initial={{ x: "100%" }}
                    animate={{ x: "0%" }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${slide.imageUrl})` }}
                    />
                    {/* overlay scuro + diagonali (simili allo screenshot) */}
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.0)_0%,rgba(0,0,0,0.0)_55%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.55)_100%)]" />
                </motion.div>
            </AnimatePresence>

            {/* Content */}
            <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-6">
                <div className="max-w-2xl">
                    {/* Titolo: appare dopo che l’immagine è “entrata” */}
                    <motion.h1
                        key={slide.titleTop + slide.titleBottom}
                        initial={{ opacity: 0, y: 26 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, duration: 0.45, ease: "easeOut" }}
                        className="font-display text-6xl leading-[0.95] tracking-tight text-white md:text-7xl"
                    >
                        <span className="block font-extrabold">{slide.titleTop}</span>
                        <span className="block font-extrabold">{slide.titleBottom}</span>
                    </motion.h1>

                    <motion.p
                        key={slide.subtitle}
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.62, duration: 0.4, ease: "easeOut" }}
                        className="mt-7 max-w-xl text-white/80"
                    >
                        {slide.subtitle}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.78, duration: 0.35, ease: "easeOut" }}
                        className="mt-10"
                    >
                        <FillButton>{slide.cta}</FillButton>
                    </motion.div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 md:block">
                <button
                    onClick={prev}
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/20 text-white hover:bg-black/35"
                    aria-label="Previous"
                >
                    ‹
                </button>
            </div>
            <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 md:block">
                <button
                    onClick={next}
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-accent/20 text-white hover:bg-accent/30"
                    aria-label="Next"
                >
                    ›
                </button>
            </div>

            {/* Counter */}
            <div className="absolute bottom-8 right-10 z-20 font-display text-white/80">
                <span className="text-4xl font-semibold">{i + 1}</span>
                <span className="ml-2 text-2xl">,</span>
                <span className="ml-2 text-2xl">{slides.length}</span>
            </div>
        </section>
    );
}
