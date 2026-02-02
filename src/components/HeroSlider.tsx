"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FillButton } from "./FillButton";
import { HeroSocials } from "./HeroSocials";
import { RouletteTitle } from "./RouletteTitle";

type Slide = {
    titleTop: string;
    titleBottom: string;
    subtitle: string;
    cta: string;
    imageUrl: string;
};

// ====== SLIDES (stabili) ======
const SLIDES: Slide[] = [
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
];

const IMAGE_URLS = SLIDES.map((s) => s.imageUrl);

// ====== PRELOAD (parte subito, al load del modulo) ======
const _preloadCache = new Map<string, Promise<void>>();

function preloadAndDecode(src: string) {
    if (_preloadCache.has(src)) return _preloadCache.get(src)!;

    const p = new Promise<void>((resolve) => {
        const img = new Image();
        img.src = src;

        // prova ad alzare la priorità (non supportato ovunque, ma innocuo)
        try {
            (img as any).fetchPriority = "high";
        } catch {}

        const done = () => resolve();

        const anyImg = img as any;
        if (typeof anyImg.decode === "function") {
            anyImg
                .decode()
                .then(done)
                .catch(() => {
                    if (img.complete) return done();
                    img.onload = done;
                    img.onerror = done;
                });
        } else {
            if (img.complete) return done();
            img.onload = done;
            img.onerror = done;
        }
    });

    _preloadCache.set(src, p);
    return p;
}

// kick immediato
const PRELOAD_ALL = Promise.all(IMAGE_URLS.map(preloadAndDecode)).then(() => undefined);

export function HeroSlider() {
    const slides = useMemo(() => SLIDES, []);

    const [i, setI] = useState(0);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [isAnimating, setIsAnimating] = useState(false);

    const [contentReady, setContentReady] = useState(true);
    const [imagesReady, setImagesReady] = useState(false);

    const [navId, setNavId] = useState(0);

    // roulette
    const [rouletteTrigger, setRouletteTrigger] = useState(0);
    const firstRouletteDoneRef = useRef(false);

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

    const FIRST_ROULETTE_DELAY = 520;

    // ✅ aspetta il preload (che però è già partito PRIMA del primo render)
    useEffect(() => {
        let cancelled = false;
        PRELOAD_ALL.finally(() => {
            if (cancelled) return;
            setImagesReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

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
                dir === 1 ? `-${Math.round(PUSH * 0.72)}%` : `${Math.round(PUSH * 0.72)}%`,
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
     * WIPE
     */
    const wipeVariants = {
        enter: (dir: 1 | -1) => ({
            clipPath: dir === 1 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)",
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

    const fadeInText = (delay: number) => ({
        delay,
        duration: 0.95,
        ease: [0.22, 0.0, 0.15, 1] as any,
    });

    // ✅ prima roulette: parte dopo che le immagini sono davvero pronte (così non “strozza” la prima transizione)
    useEffect(() => {
        if (firstRouletteDoneRef.current) return;
        if (!imagesReady) return;

        const id = window.setTimeout(() => {
            setRouletteTrigger((v) => v + 1);
            firstRouletteDoneRef.current = true;
        }, FIRST_ROULETTE_DELAY);

        return () => window.clearTimeout(id);
    }, [imagesReady]);

    const go = useCallback(
        (dir: 1 | -1) => {
            if (isAnimating) return;

            setIsAnimating(true);
            setContentReady(false);
            setDirection(dir);

            setNavId((v) => v + 1);
            setI((v) => (v + dir + slides.length) % slides.length);

            if (firstRouletteDoneRef.current) {
                setRouletteTrigger((v) => v + 1);
            }
        },
        [isAnimating, slides.length]
    );

    const prev = () => go(-1);
    const next = () => go(1);

    const titleText = `${slide.titleTop}\n${slide.titleBottom}`;

    return (
        <section className="relative h-[100svh] w-full overflow-hidden bg-black">
            {/* ✅ Preload DOM “visibile ma invisibile”: aiuta alcuni browser a non fare flash con background-image */}
            <div
                aria-hidden
                className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-px w-px opacity-0"
            >
                {IMAGE_URLS.map((src) => (
                    <img
                        key={src}
                        src={src}
                        alt=""
                        decoding="async"
                        loading="eager"
                        // @ts-ignore
                        fetchPriority="high"
                    />
                ))}
            </div>

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
                        {/* ✅ OVERSCAN: elimina la riga nera all’inizio del wipe (gap/antialias) */}
                        <motion.div
                            className="absolute bg-cover bg-center"
                            style={{
                                inset: "-2px", // <— importantissimo per eliminare il “pezzetto nero” al bordo del clip
                                backgroundColor: "#000",
                                backgroundImage: `url(${slide.imageUrl})`,
                                willChange: "transform",
                                transform: "translateZ(0)",
                                backfaceVisibility: "hidden",
                            }}
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
                                            <RouletteTitle
                                                text={titleText}
                                                triggerKey={rouletteTrigger}
                                                picks={3}
                                                durationMs={3300}
                                                tickMinMs={85}
                                                tickMaxMs={460}
                                                stopFractions={[0.62, 0.82, 1]}
                                                className="whitespace-pre-wrap"
                                            />
                                        </motion.h1>

                                        <div className="min-h-[170px] md:min-h-[190px]">
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

            {/* Socials */}
            <div className="absolute bottom-10 left-10 z-20 hidden md:flex items-center gap-3">
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
