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
     */
    stopFractions?: [number, number, number];

    /** evita lettere adiacenti (consigliato) */
    minSpacing?: number; // default 2 => almeno 1 lettera in mezzo

    className?: string;
};

const ACCENTS = [
    "var(--accent-yellow)",
    "var(--accent-blue)",
    "var(--accent-purple)",
] as const;

/* ---------- easing ---------- */
function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

/* ---------- seeded rng: deterministico ---------- */
function hashToSeed(input: string) {
    // hash semplice ma stabile
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function isNear(a: number, b: number, minSpacing: number) {
    return Math.abs(a - b) < minSpacing;
}

function buildValidIndices(chars: string[]) {
    const valid: number[] = [];
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        // non colorare spazi e newline
        if (ch !== " " && ch !== "\n") valid.push(i);
    }
    return valid;
}

/**
 * Picks “simmetrici”:
 * - prova a scegliere un centro “buono”
 * - poi due laterali con distanza simile (centro - d, centro + d)
 * - se non possibile, fallback: migliori 3 distribuiti
 */
function pickSymmetricFinal(
    valid: number[],
    chars: string[],
    k: number,
    rng: () => number,
    minSpacing: number
) {
    if (k <= 1) return [valid[Math.floor(rng() * valid.length)]];
    if (valid.length <= k) return valid.slice(0, k);

    const min = valid[0];
    const max = valid[valid.length - 1];

    // helper: check se idx esiste in valid
    const set = new Set(valid);
    const isOk = (idx: number, chosen: number[]) =>
        set.has(idx) &&
        !chosen.includes(idx) &&
        chosen.every((c) => !isNear(c, idx, minSpacing));

    // candidate centers: evita primissimi/ultimissimi 10% (più elegante)
    const lo = min + Math.round((max - min) * 0.12);
    const hi = min + Math.round((max - min) * 0.88);
    const centers = valid.filter((v) => v >= lo && v <= hi);

    // shuffle centers deterministico
    const shuffledCenters = centers
        .map((c) => ({ c, r: rng() }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.c);

    // 1) tenta centro + due laterali simmetriche
    for (const center of shuffledCenters) {
        const chosen: number[] = [];
        if (!isOk(center, chosen)) continue;
        chosen.push(center);

        if (k === 2) {
            // scegli un lato con distanza elegante
            const d = Math.max(2, Math.round((max - min) * (0.18 + rng() * 0.18)));
            const cand1 = center - d;
            const cand2 = center + d;
            if (isOk(cand2, chosen)) chosen.push(cand2);
            else if (isOk(cand1, chosen)) chosen.push(cand1);
            else continue;
            return chosen;
        }

        // k >= 3
        // prova varie distanze (da “medio” a “ampio”)
        const base = 0.16 + rng() * 0.18; // 16%..34%
        const d0 = Math.max(3, Math.round((max - min) * base));

        const ds = [
            d0,
            Math.max(3, Math.round(d0 * 0.85)),
            Math.max(3, Math.round(d0 * 1.15)),
            Math.max(3, Math.round(d0 * 0.7)),
            Math.max(3, Math.round(d0 * 1.3)),
        ];

        for (const d of ds) {
            const left = center - d;
            const right = center + d;

            if (isOk(left, chosen) && isOk(right, chosen)) {
                chosen.push(left, right);
                // ordine slot: 0..2 (giallo, blu, viola)
                // esteticamente: metti il BLU al centro (più “calmo”), giallo/viola ai lati
                // => slot1 = center, slot0 = left, slot2 = right (o viceversa)
                const out = [left, center, right].slice(0, k);
                return out;
            }
        }
    }

    // 2) fallback: 3 punti distribuiti (quartili) + spacing
    const targets = k === 3 ? [0.25, 0.5, 0.75] : [0.33, 0.66];
    const out: number[] = [];
    for (const t of targets) {
        const wanted = min + Math.round((max - min) * t);
        // trova indice valido più vicino
        let best = valid[0];
        let bestD = Infinity;
        for (const v of valid) {
            const d = Math.abs(v - wanted);
            if (d < bestD && isOk(v, out)) {
                best = v;
                bestD = d;
            }
        }
        out.push(best);
    }

    // se ancora manca (caso k=3 ma spacing difficile), riempi random con regole
    while (out.length < k) {
        const candidate = valid[Math.floor(rng() * valid.length)];
        if (isOk(candidate, out)) out.push(candidate);
    }

    // blu al centro (se k=3)
    if (out.length === 3) {
        out.sort((a, b) => a - b);
        return [out[0], out[1], out[2]];
    }
    return out.slice(0, k);
}

export function RouletteTitle({
                                  text,
                                  triggerKey,
                                  durationMs = 3000,
                                  tickMinMs = 70,
                                  tickMaxMs = 380,
                                  picks = 3,
                                  stopFractions = [0.62, 0.82, 1],
                                  minSpacing = 2,
                                  className,
                              }: Props) {
    const chars = useMemo(() => Array.from(text), [text]);
    const k = Math.min(picks, 3);

    const [slots, setSlots] = useState<number[]>(() => new Array(k).fill(0));
    const [spinning, setSpinning] = useState(false);

    const timeoutsRef = useRef<number[]>([]);
    const startRef = useRef<number>(0);

    const clearAll = () => {
        timeoutsRef.current.forEach((id) => window.clearTimeout(id));
        timeoutsRef.current = [];
    };

    useEffect(() => () => clearAll(), []);

    useEffect(() => {
        if (!chars.length) return;

        clearAll();

        const valid = buildValidIndices(chars);
        if (!valid.length) return;

        // ✅ RNG deterministico: testo + trigger
        const seed = hashToSeed(`${String(triggerKey)}::${text}`);
        const rng = mulberry32(seed);

        // ✅ final picks “simmetrici” / bilanciati
        const final = pickSymmetricFinal(valid, chars, k, rng, minSpacing);

        // seed iniziale (anche questa deterministica)
        // scegli k indici random ma con spacing
        const seededStart: number[] = [];
        let guard = 0;
        while (seededStart.length < k && guard < 200) {
            const c = valid[Math.floor(rng() * valid.length)];
            if (
                !seededStart.includes(c) &&
                seededStart.every((x) => !isNear(x, c, minSpacing))
            ) {
                seededStart.push(c);
            }
            guard++;
        }
        if (seededStart.length < k) {
            // fallback
            seededStart.splice(0, seededStart.length, ...final);
        }

        setSlots(seededStart);
        setSpinning(true);
        startRef.current = performance.now();

        const scheduleTick = () => {
            const now = performance.now();
            const elapsed = now - startRef.current;
            const t = Math.min(1, elapsed / durationMs);

            // rallentamento “smooth”
            const eased = easeOutCubic(t);
            const delay = tickMinMs + (tickMaxMs - tickMinMs) * eased;

            setSlots((prev) => {
                const next = [...prev];

                // 1) blocca quelli arrivati alla frazione di stop
                for (let s = 0; s < k; s++) {
                    const stopAt = stopFractions[s] ?? 1;
                    if (t >= stopAt) next[s] = final[s];
                }

                // 2) randomizza gli altri, evitando collisioni e adiacenze
                const taken = new Set<number>();
                for (let s = 0; s < k; s++) {
                    const stopAt = stopFractions[s] ?? 1;
                    if (t >= stopAt) taken.add(next[s]);
                }

                for (let s = 0; s < k; s++) {
                    const stopAt = stopFractions[s] ?? 1;
                    if (t >= stopAt) continue;

                    let candidate = valid[Math.floor(rng() * valid.length)];
                    let g = 0;

                    while (
                        (taken.has(candidate) ||
                            next.some((x, j) => j !== s && isNear(x, candidate, minSpacing))) &&
                        g < 24
                        ) {
                        candidate = valid[Math.floor(rng() * valid.length)];
                        g++;
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
                  // ✅ movimento più “brutal/minimal”: micro-breath, niente rimbalzino continuo
                  animate={
                      isHot
                          ? {
                              y: spinning ? [-0.5, 0.5, -0.5] : 0,
                              scale: spinning ? [1, 1.02, 1] : 1,
                              opacity: 1,
                          }
                          : { y: 0, scale: 1, opacity: 1 }
                  }
                  transition={
                      isHot
                          ? {
                              duration: spinning ? 0.9 : 0.2,
                              repeat: spinning ? Infinity : 0,
                              ease: "easeInOut",
                          }
                          : { duration: 0.12 }
                  }
                  style={
                      isHot
                          ? {
                              color: ACCENTS[slot!],
                              // glow SUPER soft (no neon)
                              textShadow: "0 0 12px rgba(0,0,0,0.10)",
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