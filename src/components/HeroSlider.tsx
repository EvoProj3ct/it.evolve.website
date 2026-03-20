"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FillButton } from "./FillButton";
import { HeroSocials } from "./HeroSocials";
import { RouletteTitle } from "./RouletteTitle";

type SlidePill = {
    text: string;
    href?: string;
    ariaLabel?: string;
};

type Slide = {
    pill: SlidePill;
    titleTop: string;
    titleBottom: string;
    subtitle: string;
    cta: string;
    ctaHref: string;
    imageUrl: string;
};

// ====== SLIDES (stabili) ======
const SLIDES: Slide[] = [
    {
        pill: { text: "CONSULENZA" },
        titleTop: "Tecnologia",
        titleBottom: "Sartoriale",
        subtitle:
            "Studiamo, strutturiamo e digitalizziamo i processi aziendali con soluzioni scalabili su misura.",
        cta: "SCOPRI COME",
        ctaHref: "/about",
        imageUrl: "/hero/slide1.png",
    },
    {
        pill: { text: "ANALISI" },
        titleTop: "La Giusta",
        titleBottom: "Taglia",
        subtitle:
            "Niente spese superflue. Analizziamo il tuo progetto per offrirti la taglia di sviluppo, dalla S alla XL, proporzionata alle tue reali esigenze.",
        cta: "IL NOSTRO METODO",
        ctaHref: "/about",
        imageUrl: "/hero/slide2.png",
    },
    {
        pill: { text: "SVILUPPO" },
        titleTop: "Disegnato",
        titleBottom: "Per Te",
        subtitle:
            "Grazie ad ATLAS, il nostro ecosistema modulare e scalabile, ti forniamo un prodotto solo tuo: dati, processi, operatività, tutto pensato per farti sentire a casa.",
        cta: "SCOPRI ATLAS",
        ctaHref: "/portfolio",
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

const PRELOAD_ALL = Promise.all(IMAGE_URLS.map(preloadAndDecode)).then(
    () => undefined
);

// --- swipe helpers ---
const swipePower = (offset: number, velocity: number) =>
    Math.abs(offset) * velocity;

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

    /**
     * ✅ GLOW (radiazione) verde — ULTRA intensa
     */
    const GLOW_HEX = "#72C94F";

    const glowTitleStyle: React.CSSProperties = {
        color: "#0b0b0b",
        WebkitTextStroke: "1.6px rgba(114,201,79,0.72)",
        textShadow: `
      0 0 6px  rgba(114,201,79,0.85),
      0 0 14px rgba(114,201,79,0.70),
      0 0 28px rgba(114,201,79,0.55),
      0 0 46px rgba(114,201,79,0.38),
      0 0 70px rgba(114,201,79,0.24)
    `,
    };

    const glowBodyStyle: React.CSSProperties = {
        color: "rgba(11,11,11,0.94)",
        WebkitTextStroke: "1.1px rgba(114,201,79,0.58)",
        textShadow: `
      0 0 5px  rgba(114,201,79,0.70),
      0 0 12px rgba(114,201,79,0.55),
      0 0 24px rgba(114,201,79,0.40),
      0 0 40px rgba(114,201,79,0.28)
    `,
    };

    const glowUIStyle: React.CSSProperties = {
        color: "#0b0b0b",
        WebkitTextStroke: "0.95px rgba(114,201,79,0.52)",
        textShadow: `
      0 0 5px  rgba(114,201,79,0.78),
      0 0 12px rgba(114,201,79,0.58),
      0 0 24px rgba(114,201,79,0.40),
      0 0 40px rgba(114,201,79,0.26)
    `,
    };

    /**
     * AUTOPLAY
     * - cooldown dopo interazione: 10s
     */
    const AUTOPLAY_COOLDOWN_MS = 10_000;
    const autoplayTimerRef = useRef<number | null>(null);

    const clearAutoplayTimer = () => {
        if (autoplayTimerRef.current) {
            window.clearTimeout(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }
    };

    const scheduleAutoplay = useCallback(() => {
        clearAutoplayTimer();
        autoplayTimerRef.current = window.setTimeout(() => {
            if (!imagesReady) return;
            if (isAnimating) {
                scheduleAutoplay();
                return;
            }
            go(1, "auto");
        }, AUTOPLAY_COOLDOWN_MS);
    }, [imagesReady, isAnimating]);

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

    useEffect(() => {
        if (!imagesReady) return;
        scheduleAutoplay();
        return () => clearAutoplayTimer();
    }, [imagesReady, scheduleAutoplay]);

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
     * WIPE
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

    const fadeInText = (delay: number) => ({
        delay,
        duration: 0.95,
        ease: [0.22, 0.0, 0.15, 1] as any,
    });

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
        (dir: 1 | -1, reason: "user" | "auto" = "user") => {
            if (isAnimating) return;

            if (reason === "user") scheduleAutoplay();

            setIsAnimating(true);
            setContentReady(false);
            setDirection(dir);

            setNavId((v) => v + 1);
            setI((v) => (v + dir + slides.length) % slides.length);

            if (firstRouletteDoneRef.current) {
                setRouletteTrigger((v) => v + 1);
            }
        },
        [isAnimating, slides.length, scheduleAutoplay]
    );

    const prev = () => go(-1, "user");
    const next = () => go(1, "user");

    const titleText = `${slide.titleTop}\n${slide.titleBottom}`;

    return (
        <section className="relative h-[100svh] w-full overflow-hidden bg-white">
            {/* ✅ Preload DOM “visibile ma invisibile” */}
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
                        scheduleAutoplay();
                    }}
                >
                    {/* ✅ SWIPE LAYER */}
                    <motion.div
                        className="absolute inset-0 z-0"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.08}
                        onPointerDown={() => scheduleAutoplay()}
                        onDragEnd={(_, info) => {
                            if (isAnimating) return;

                            const offset = info.offset.x;
                            const velocity = info.velocity.x;

                            const power = swipePower(offset, velocity);
                            const SWIPE_THRESHOLD = 650;

                            if (power > SWIPE_THRESHOLD) {
                                if (offset > 0) prev();
                                else next();
                            } else {
                                scheduleAutoplay();
                            }
                        }}
                    />

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
                        {/* BG */}
                        <motion.img
                            src={slide.imageUrl}
                            alt=""
                            draggable={false}
                            className="
                              absolute inset-0 h-full w-full
                              object-contain object-center
                              md:object-cover md:object-center
                              bg-white
                            "
                            style={{
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

                        {/* Overlay (lamelle bianche) */}
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_52%,rgba(255,255,255,0.10)_52%,rgba(255,255,255,0.10)_64%,rgba(255,255,255,0)_64%,rgba(255,255,255,0)_100%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_68%,rgba(255,255,255,0.08)_68%,rgba(255,255,255,0.08)_78%,rgba(255,255,255,0)_78%,rgba(255,255,255,0)_100%)]" />

                        {/* Content */}
                        <motion.div
                            className="relative z-10 mx-auto h-full w-full"
                            custom={direction}
                            variants={contentParallaxVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={bgTransition as any}
                        >
                            <div className="h-full w-full pt-[clamp(90px,12vh,150px)] pb-[clamp(60px,8vh,90px)]">
                                <div className="mx-auto w-[min(94vw,1180px)]">
                                    {/* Pill */}
                                    {slide.pill.href ? (
                                        <Link
                                            href={slide.pill.href}
                                            aria-label={slide.pill.ariaLabel ?? slide.pill.text}
                                            onClick={() => scheduleAutoplay()}
                                            className="contactMini-pill !border-black/30 !bg-transparent !text-black/90 inline-flex"
                                            style={{
                                                ...glowUIStyle,
                                                WebkitTextStroke: "0.6px rgba(114,201,79,0.20)",
                                            }}
                                        >
                                            {slide.pill.text}
                                        </Link>
                                    ) : (
                                        <div
                                            className="contactMini-pill !border-black/30 !bg-transparent !text-black/90"
                                            style={{
                                                ...glowUIStyle,
                                                WebkitTextStroke: "0.6px rgba(114,201,79,0.20)",
                                            }}
                                        >
                                            {slide.pill.text}
                                        </div>
                                    )}

                                    {/* ✅ UPDATED TEXT LAYOUT */}
                                    <div className="mt-[22px] max-w-[1020px] flex flex-col min-h-[62svh] md:min-h-[66svh]">
                                        <motion.h1
                                            className="
                        font-display font-extrabold
                        tracking-[-0.04em]
                        leading-[0.98]
                        text-[clamp(60px,7.8vw,98px)] md:text-[clamp(52px,6.6vw,92px)]
                        max-w-[18ch]
                        [white-space:normal]
                        [word-break:keep-all]
                        [overflow-wrap:normal]
                        [hyphens:none]
                      "
                                            style={glowTitleStyle}
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

                                        <div className="mt-auto pt-[clamp(26px,6vh,72px)] md:pt-[clamp(112px,20vh,240px)]">
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
                          max-w-[74ch] md:max-w-[66ch]
                          text-[clamp(18px,4.6vw,22px)] md:text-[18px]
                          leading-[1.75] md:leading-[1.9]
                          tracking-[0.01em]
                          [white-space:normal]
                          [word-break:keep-all]
                          [overflow-wrap:normal]
                          [hyphens:none]
                        "
                                                style={glowBodyStyle}
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
                                                className="pt-7 md:pt-10"
                                            >
                                                <Link href={slide.ctaHref} onClick={() => scheduleAutoplay()}>
                                                    <FillButton>{slide.cta}</FillButton>
                                                </Link>
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
            <HeroSocials isDisabled={isAnimating} />

            {/* Controls */}
            <div className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 md:block">
                <button
                    onClick={prev}
                    className="grid h-12 w-12 place-items-center rounded-full border bg-transparent hover:bg-black/10"
                    aria-label="Previous"
                    style={{
                        opacity: isAnimating ? 0.55 : 1,
                        cursor: "pointer",
                        borderColor: "rgba(0,0,0,0.30)",
                        ...glowUIStyle,
                    }}
                >
                    ‹
                </button>
            </div>

            <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 md:block">
                <button
                    onClick={next}
                    className="grid h-12 w-12 place-items-center rounded-full border bg-transparent hover:bg-black/10"
                    aria-label="Next"
                    style={{
                        opacity: isAnimating ? 0.55 : 1,
                        cursor: "pointer",
                        borderColor: "rgba(0,0,0,0.30)",
                        ...glowUIStyle,
                    }}
                >
                    ›
                </button>
            </div>

            {/* Counter */}
            <div
                className="absolute bottom-8 right-10 z-20 font-display"
                style={{
                    ...glowUIStyle,
                    color: "rgba(11,11,11,0.85)",
                    WebkitTextStroke: "0.6px rgba(114,201,79,0.18)",
                }}
            >
                <span className="text-4xl font-semibold">{i + 1}</span>
                <span className="ml-2 text-2xl">,</span>
                <span className="ml-2 text-2xl">{slides.length}</span>
            </div>

            {/* debug */}
            <span className="sr-only">{GLOW_HEX}</span>
        </section>
    );
}