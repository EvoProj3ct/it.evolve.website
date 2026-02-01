"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type Phase = "bar" | "split" | "cut" | "reveal";

export function IntroLoader() {
    const [show, setShow] = useState(true);
    const [phase, setPhase] = useState<Phase>("bar");

    // ---- TIMING (ms) ----
    const BAR_TO_SPLIT = 650;
    const SPLIT_TO_CUT = 350;

    // CUT: durata totale della “corsa” della linea fullscreen
    const CUT_DURATION = 900;

    // niente gap: reveal parte subito dopo cut
    const AFTER_CUT_HOLD = 0;

    // tende (coerenti con i transition sotto)
    const CURTAIN_DELAY_S = 0.0; // <<< se vuoi “subito dopo”, metti 0
    const CURTAIN_DURATION_S = 0.5;

    // ---- OVERLAP (ms) ----
    // Quanto prima far partire la fase successiva (sovrapposizione controllata).
    // Aumenta questi valori per rendere tutto più "attaccato" e fluido.
    const OVERLAP_SPLIT_MS = 180;   // cut parte leggermente prima che split "finisca"
    const OVERLAP_REVEAL_MS = 440; // reveal parte mentre cut sta ancora finendo (consigliato 120-200)
    const OVERLAP_HIDE_MS = 0;     // opzionale: per smontare overlay un filo prima/dopo

    useEffect(() => {
        const splitAt = BAR_TO_SPLIT;

        // cut parte prima (overlap con split)
        const cutAt = BAR_TO_SPLIT + SPLIT_TO_CUT - OVERLAP_SPLIT_MS;

        // reveal parte prima della fine del cut (overlap cut->reveal)
        const revealAt = cutAt + CUT_DURATION + AFTER_CUT_HOLD - OVERLAP_REVEAL_MS;

        const hideAt =
            revealAt +
            Math.round((CURTAIN_DELAY_S + CURTAIN_DURATION_S) * 1000) +
            120 -
            OVERLAP_HIDE_MS;

        const t1 = setTimeout(() => setPhase("split"), splitAt);
        const t2 = setTimeout(() => setPhase("cut"), cutAt);
        const t3 = setTimeout(() => setPhase("reveal"), revealAt);
        const t4 = setTimeout(() => setShow(false), hideAt);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, []);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-[9999] bg-transparent"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 1 }}
                    transition={{ duration: 0 }}
                >
                    {/* TENDA TOP */}
                    <motion.div
                        className="absolute left-0 top-0 h-1/2 w-full bg-[#20222b]"
                        initial={{ y: "0%" }}
                        animate={{ y: phase === "reveal" ? "-105%" : "0%" }}
                        transition={{
                            duration: CURTAIN_DURATION_S,
                            delay: CURTAIN_DELAY_S,
                            ease: [0.90, 0.0, 1.0, 0.45],
                        }}
                    />

                    {/* TENDA BOTTOM */}
                    <motion.div
                        className="absolute left-0 bottom-0 h-1/2 w-full bg-[#20222b]"
                        initial={{ y: "0%" }}
                        animate={{ y: phase === "reveal" ? "105%" : "0%" }}
                        transition={{
                            duration: CURTAIN_DURATION_S,
                            delay: CURTAIN_DELAY_S,
                            ease: [0.90, 0.0, 1.0, 0.45],
                        }}
                    />

                    {/* Barra “piccola” al centro (sparisce appena parte CUT) */}
                    <div className="absolute left-1/2 top-1/2 w-[420px] max-w-[70vw] -translate-x-1/2 -translate-y-1/2">
                        <motion.div
                            className="relative h-[2px] w-full bg-white/10 overflow-hidden"
                            animate={{ opacity: phase === "cut" || phase === "reveal" ? 0 : 1 }}
                            transition={{ duration: 0.08 }} // rapido = niente overlap/flicker
                        >
                            {/* Fase 1: fill */}
                            <motion.div
                                className="absolute left-0 top-0 h-full bg-emerald-300/90"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.55, ease: "easeOut" }}
                            />

                            {/* Fase 2: split */}
                            <motion.div
                                className="absolute left-1/2 top-0 h-full bg-emerald-300/90"
                                initial={{ width: "0%", x: "-50%" }}
                                animate={
                                    phase === "split"
                                        ? { width: "50%", x: "-100%" }
                                        : { width: "0%", opacity: 0 }
                                }
                                transition={{ duration: 0.35, ease: "easeOut" }}
                            />
                            <motion.div
                                className="absolute left-1/2 top-0 h-full bg-emerald-300/90"
                                initial={{ width: "0%", x: "-50%" }}
                                animate={
                                    phase === "split"
                                        ? { width: "50%", x: "0%" }
                                        : { width: "0%", opacity: 0 }
                                }
                                transition={{ duration: 0.35, ease: "easeOut" }}
                            />
                        </motion.div>
                    </div>

                    {/* LINEA FULLSCREEN: sempre montata -> zero flicker */}
                    <motion.div
                        className="
              fixed left-0 top-1/2 z-[10000]
              h-[2px] w-screen -translate-y-1/2
              bg-emerald-300
              [transform:translateZ(0)]
              will-change-transform
            "
                        initial={{ opacity: 0, scaleX: 0, x: 0 }}
                        animate={
                            phase === "cut"
                                ? {
                                    // sbiadisce lentamente DURANTE la corsa
                                    opacity: [1, 0.42, 0.5, 0.12, 0.01, 0],
                                    // si apre subito a full width, poi resta
                                    scaleX: [0, 0.5, 1, 1, 1, 1],
                                }
                                : phase === "reveal"
                                    ? {
                                        // quando parte il reveal, la linea è già quasi sparita
                                        opacity: 0,
                                        scaleX: 1,
                                        x: 0,
                                    }
                                    : {
                                        opacity: 0,
                                        scaleX: 0,
                                        x: 0,
                                    }
                        }
                        transition={
                            phase === "cut"
                                ? {
                                    duration: CUT_DURATION / 1000,
                                    ease: [0.62, 1, 0.36, 1],
                                    times: [0, 0.18, 0.36, 0.58, 0.8, 1],
                                }
                                : { duration: 0.1 }
                        }
                        style={{ transformOrigin: "center" }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
