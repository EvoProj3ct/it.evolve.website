"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type Props = {
    /** supporta "\n" per andare a capo (titolo su 2 righe) */
    text: string;

    /** cambia ad ogni trigger (es: rouletteTrigger) */
    triggerKey: number | string;

    /** durata totale roulette (ms) */
    durationMs?: number;

    /** tick iniziale (ms) - più basso = più veloce all’inizio */
    tickMinMs?: number;

    /** tick finale (ms) - più alto = più lento verso la fine */
    tickMaxMs?: number;

    /** quante lettere colorare (3 colori => max 3) */
    picks?: number;

    /**
     * frazioni [0..1] a cui si fermano i 3 colori (in ordine: giallo, blu, viola).
     * es: [0.62, 0.78, 1] => primo si ferma presto, secondo più tardi, terzo alla fine.
     */
    stopFractions?: [number, number, number];

    className?: string;
};

const ACCENTS = [
    "var(--accent-yellow)", // slot 0
    "var(--accent-blue)",   // slot 1
    "var(--accent-purple)", // slot 2
] as const;

function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

function pickRandomUnique(from: number[], k: number) {
    if (from.length <= k) return from.slice(0, k);
    const out = new Set<number>();
    while (out.size < k) out.add(from[Math.floor(Math.random() * from.length)]);
    return [...out];
}

export function RouletteTitle({
                                  text,
                                  triggerKey,
                                  durationMs = 3100,
                                  tickMinMs = 80,
                                  tickMaxMs = 420,
                                  picks = 3,
                                  stopFractions = [0.62, 0.80, 1],
                                  className,
                              }: Props) {
    const chars = useMemo(() => Array.from(text), [text]);
    const k = Math.min(picks, 3);

    const [slots, setSlots] = useState<number[]>(() =>
        new Array(k).fill(0).map(() => 0)
    );
    const [spinning, setSpinning] = useState(false);

    const timeoutsRef = useRef<number[]>([]);
    const startRef = useRef<number>(0);

    const clearAll = () => {
        timeoutsRef.current.forEach((id) => window.clearTimeout(id));
        timeoutsRef.current = [];
    };

    useEffect(() => {
        return () => clearAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!chars.length) return;

        clearAll();

        // valid = tutte le lettere "colorabili" (no spazi, no newline)
        const valid: number[] = [];
        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i];
            if (ch !== " " && ch !== "\n") valid.push(i);
        }
        if (!valid.length) return;

        // scegliamo le 3 lettere finali (tutte diverse)
        const final = pickRandomUnique(valid, k);

        // seed iniziale
        setSlots(pickRandomUnique(valid, k));
        setSpinning(true);

        startRef.current = performance.now();

        const scheduleTick = () => {
            const now = performance.now();
            const elapsed = now - startRef.current;
            const t = Math.min(1, elapsed / durationMs);

            // rallentamento evidente (globale)
            const eased = easeOutCubic(t);
            const delay = tickMinMs + (tickMaxMs - tickMinMs) * eased;

            // ogni slot si ferma al suo "stopFraction"
            setSlots((prev) => {
                // costruisci una lista di indici disponibili per evitare duplicati tra slot "in movimento"
                const next = [...prev];

                // prima metto quelli già fermi (se la loro frazione è superata)
                for (let s = 0; s < k; s++) {
                    const stopAt = stopFractions[s] ?? 1;
                    if (t >= stopAt) next[s] = final[s];
                }

                // poi randomizzo quelli ancora spinning, evitando collisioni con gli altri slot
                const taken = new Set<number>(next.filter((_, s) => {
                    const stopAt = stopFractions[s] ?? 1;
                    return t >= stopAt; // già fermo => "preso"
                }));

                for (let s = 0; s < k; s++) {
                    const stopAt = stopFractions[s] ?? 1;
                    if (t >= stopAt) continue;

                    // pesco finché non trovo uno libero
                    let candidate = valid[Math.floor(Math.random() * valid.length)];
                    let guard = 0;
                    while (taken.has(candidate) && guard < 16) {
                        candidate = valid[Math.floor(Math.random() * valid.length)];
                        guard++;
                    }
                    next[s] = candidate;
                    taken.add(candidate);
                }

                return next;
            });

            if (t >= 1) {
                setSlots(final);
                setSpinning(false);
                return;
            }

            const id = window.setTimeout(scheduleTick, delay);
            timeoutsRef.current.push(id);
        };

        // avvio
        const first = window.setTimeout(scheduleTick, tickMinMs);
        timeoutsRef.current.push(first);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerKey, text]);

    const slotAtIndex = (idx: number) => {
        const s = slots.indexOf(idx);
        return s === -1 ? null : s; // 0..2
    };

    return (
        <span className={className} aria-label={text}>
      {chars.map((ch, idx) => {
          if (ch === "\n") return <br key={`${triggerKey}-br-${idx}`} />;

          const slot = slotAtIndex(idx);
          const isHot = slot !== null;

          return (
              <motion.span
                  key={`${triggerKey}-${idx}-${ch}`}
                  className="inline-block will-change-transform"
                  animate={
                      isHot
                          ? { y: spinning ? [0, -2, 0] : 0, scale: spinning ? [1, 1.06, 1] : 1 }
                          : { y: 0, scale: 1 }
                  }
                  transition={
                      isHot
                          ? {
                              duration: spinning ? 0.42 : 0.5,
                              repeat: spinning ? Infinity : 0,
                              ease: "easeOut",
                          }
                          : { duration: 0.2 }
                  }
                  style={
                      isHot
                          ? {
                              color: ACCENTS[slot!],
                              textShadow:
                                  "0 0 18px rgba(255,255,255,0.08), 0 0 26px rgba(0,0,0,0.25)",
                          }
                          : undefined
                  }
              >
                  {ch === " " ? "\u00A0" : ch}
              </motion.span>
          );
      })}
    </span>
    );
}
