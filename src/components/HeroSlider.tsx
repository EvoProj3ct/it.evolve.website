"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FillButton } from "./FillButton";
import { HeroSocials } from "./HeroSocials";

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
                titleTop: "Tecnologia",
                titleBottom: "Sartoriale",
                subtitle:
                    "Studiamo, strutturiamo e digitalizziamo i processi aziendali con soluzioni scalabili su misura.",
                cta: "SCOPRI COME",
                imageUrl: "/hero/slide1.png",
            },
            {
                titleTop: "La Giusta",
                titleBottom: "Taglia",
                subtitle:
                    "Niente spese superflue. Analizziamo il tuo progetto per offrirti la taglia di sviluppo, dalla S alla XL, proporzionata alle tue reali esigenze.",
                cta: "IL NOSTRO METODO",
                imageUrl: "/hero/slide2.png",
            },
            {
                titleTop: "Disegnato",
                titleBottom: "Per Te",
                subtitle:
                    "Grazie ad ATLAS, il nostro ecosistema modulare e scalabile, ti forniamo un prodotto solo tuo: dati, processi, operatività, tutto pensato per farti sentire a casa.",
                cta: "SCOPRI ATLAS",
                imageUrl: "/hero/slide3.png",
            },
        ],
        []
    );

    /**
     * ✅ Preload immagini (evita flash/nero in produzione)
     */
    useEffect(() => {
        slides.forEach((s) => {
            const img = new Image();
            img.src = s.imageUrl;
        });
    }, [slides]);

    const [i, setI] = useState(0);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [contentReady, setContentReady] = useState(true);

    const [navId, setNavId] = useState(0);

    const slide = slides[i];

    /**
     * TUNING
     */
    const PUSH = 202;
    const SHOVE = 15;

    const PANEL_DUR = 9.85;
    const WIPE_DUR = 1.42;
    const BG_DUR = 1.62;

    const descDelayAfterStop = 0.54;
    const btnDelayAfterStop = 0.96;

    const rise = 14;

    /**
     * ✅ PUSH con decelerazione
     */
    const panelVariants = {
        enter: (_dir: 1 | -1) => ({
            x: "0%",
            scale: 1,
            opacity: 1,
            zIndex: 3,
        }),
        center: {
            x: "0%",
            scale: 1,
            opacity: 1,
            zIndex: 3,
        },
        exit: (dir: 1 | -1) => ({
            x: [
                "0%",
                dir === 1 ? `-${SHOVE}%` : `${SHOVE}%`,
                dir === 1
                    ? `-${Math.round(PUSH * 0.72)}%`
                    : `${Math.round(PUSH * 0.72)}%`,
                dir === 1 ? `-${PUSH}%` : `${PUSH}%`,
            ],
            scale: [1, 0.996, 0.992, 0.988],
            opacity: [1, 0.6, 0.32, 0.18],
            zIndex: 1,
        }),
    };

    const panelTransition = {
        x: {
            duration: PANEL_DUR,
            times: [0, 0.14, 0.52, 1],
            ease: [0.22, 0.0, 0.15, 1] as any,
        },
        scale: {
            duration: PANEL_DUR,
            times: [0, 0.2, 0.6, 1],
            ease: [0.22, 0.0, 0.15, 1] as any,
        },
        opacity: {
            duration: PANEL_DUR,
            times: [0, 0.18, 0.55, 1],
            ease: [0.22, 0.0, 0.15, 1] as any,
        },
    };

    /**
     * Titolo: dissolve SOLO in uscita
     */
    const titleVariants = {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: [1, 0.15, 0] },
    };

    const titleTransition = {
        opacity: {
            duration: 1.45,
            times: [0, 0.55, 1],
            ease: [0.25, 0.0, 0.2, 1] as any,
        },
    };

    /**
     * WIPE VERTICALE
     */
    const wipeVariants = {
        enter: (dir: 1 | -1) => ({
            clipPath:
                dir === 1 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)",
        }),
        center: { clipPath: "inset(0% 0% 0% 0%)" },
        exit: (_dir: 1 | -1) => ({ clipPath: "inset(0% 0% 0% 0%)" }),
    };

    const wipeTransition = {
        duration: WIPE_DUR,
        ease: [0.25, 0.9, 0.25, 1] as any,
    };

    /**
     * BG + CONTENT micro-parallax
     */
    const bgVariants = {
        enter: (dir: 1 | -1) => ({
            scale: 1.07,
            x: dir === 1 ? 24 : -24,
        }),
        center: { scale: 1, x: 0 },
        exit: (_dir: 1 | -1) => ({}),
    };

    const contentParallaxVariants = {
        enter: (dir: 1 | -1) => ({ x: dir === 1 ? 13 : -13 }),
        center: { x: 0 },
        exit: (_dir: 1 | -1) => ({}),
    };

    const bgTransition = {
        duration: BG_DUR,
        ease: [0.2, 0.7, 0.2, 1] as any,
    };

    /**
     * ✅ NEW: dissolvenza IN più evidente per descrizione e bottone
     */
    const fadeInText = (delay: number) => ({
        delay,
        duration: 0.95,
        ease: [0.22, 0.0, 0.15, 1] as any,
    });

    const go = (dir: 1 | -1) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setContentReady(false);
        setDirection(dir);

        setNavId((v) => v + 1);
        setI((v) => (v + dir + slides.length) % slides.length);
    };

    const prev = () => go(-1);
    const next = () => go(1);

    return (
        <section className="relative h-[100svh] w-full overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="sync">
                <motion.div
                    key={navId}
                    custom={direction}
                    variants={panelVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={panelTransition as any}
                    className="absolute inset-0"
                    style={{ transformOrigin: "center center" }}
                    onAnimationStart={() => {
                        setIsAnimating(true);
                        setContentReady(false);
                    }}
                    onAnimationComplete={() => {
                        setIsAnimating(false);
                        setContentReady(true);
                    }}
                >
                    <motion.div
                        custom={direction}
                        variants={wipeVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={wipeTransition as any}
                        className="absolute inset-0 overflow-hidden"
                        style={{ willChange: "clip-path" }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${slide.imageUrl})` }}
                            custom={direction}
                            variants={bgVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={bgTransition as any}
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/35" />
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.35)_45%,rgba(0,0,0,0.10)_75%,rgba(0,0,0,0)_100%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_52%,rgba(255,255,255,0.10)_52%,rgba(255,255,255,0.10)_64%,rgba(255,255,255,0)_64%,rgba(255,255,255,0)_100%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_68%,rgba(255,255,255,0.08)_68%,rgba(255,255,255,0.08)_78%,rgba(255,255,255,0)_78%,rgba(255,255,255,0)_100%)]" />

                        {/* Content */}
                        <motion.div
                            className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-8 md:px-10"
                            custom={direction}
                            variants={contentParallaxVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={bgTransition as any}
                        >
                            <div className="w-full -translate-y-2 md:-translate-y-6">
                                <div className="max-w-[760px]">
                                    <div className="flex flex-col gap-10 md:gap-12">
                                        <motion.h1
                                            className="
                        font-display font-extrabold text-white
                        text-6xl md:text-7xl
                        leading-[1.06] md:leading-[1.08]
                        tracking-[-0.015em]
                      "
                                            variants={titleVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={titleTransition as any}
                                        >
                                            <span className="block">{slide.titleTop}</span>
                                            <span className="block">{slide.titleBottom}</span>
                                        </motion.h1>

                                        <div className="min-h-[170px] md:min-h-[190px]">
                                            {/* ✅ Descrizione */}
                                            <motion.p
                                                key={`sub-${navId}`}
                                                initial={{ opacity: 0, y: rise }}
                                                animate={
                                                    contentReady
                                                        ? { opacity: 1, y: 0, pointerEvents: "auto" }
                                                        : { opacity: 0, y: rise, pointerEvents: "none" }
                                                }
                                                transition={
                                                    contentReady
                                                        ? fadeInText(descDelayAfterStop)
                                                        : { duration: 0.12 }
                                                }
                                                className="
                          max-w-[640px]
                          text-white/80
                          text-base md:text-lg
                          leading-[1.8] md:leading-[1.9]
                          font-light
                          tracking-[0.01em]
                        "
                                            >
                                                {slide.subtitle}
                                            </motion.p>

                                            {/* ✅ Bottone */}
                                            <motion.div
                                                key={`cta-${navId}`}
                                                initial={{ opacity: 0, y: rise }}
                                                animate={
                                                    contentReady
                                                        ? { opacity: 1, y: 0, pointerEvents: "auto" }
                                                        : { opacity: 0, y: rise, pointerEvents: "none" }
                                                }
                                                transition={
                                                    contentReady
                                                        ? fadeInText(btnDelayAfterStop)
                                                        : { duration: 0.12 }
                                                }
                                                className="pt-8 md:pt-10"
                                            >
                                                <FillButton>{slide.cta}</FillButton>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            {/* ✅ Socials (Instagram / TikTok / LinkedIn) */}
            <div
                className={[
                    "absolute bottom-10 left-10 z-20 hidden md:flex items-center gap-3",
                ].join(" ")}
            >
                <HeroSocials isDisabled={isAnimating} />
            </div>

            {/* Controls */}
            <div className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 md:block">
                <button
                    onClick={prev}
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-transparent text-white hover:bg-white/10"
                    aria-label="Previous"
                    style={{ opacity: isAnimating ? 0.55 : 1, cursor: "pointer" }}
                >
                    ‹
                </button>
            </div>

            <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 md:block">
                <button
                    onClick={next}
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-transparent text-white hover:bg-white/10"
                    aria-label="Next"
                    style={{ opacity: isAnimating ? 0.55 : 1, cursor: "pointer" }}
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
