"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
    text: string;
    triggerKey: number | string;
    durationMs?: number;
    tickMinMs?: number;
    tickMaxMs?: number;
    picks?: number;
    stopFractions?: [number, number, number];
    minSpacing?: number;
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

/* ---------- seeded rng ---------- */
function hashToSeed(input: string) {
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
        if (ch !== " " && ch !== "\n") valid.push(i);
    }
    return valid;
}

function pickSymmetricFinal(
    valid: number[],
    k: number,
    rng: () => number,
    minSpacing: number
) {
    if (valid.length <= k) return valid.slice(0, k);

    const chosen: number[] = [];

    while (chosen.length < k) {
        const candidate = valid[Math.floor(rng() * valid.length)];

        if (
            !chosen.includes(candidate) &&
            chosen.every((c) => !isNear(c, candidate, minSpacing))
        ) {
            chosen.push(candidate);
        }
    }

    return chosen;
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

        const seed = hashToSeed(`${String(triggerKey)}::${text}`);
        const rng = mulberry32(seed);

        const final = pickSymmetricFinal(valid, k, rng, minSpacing);

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

        if (seededStart.length < k) seededStart.splice(0, seededStart.length, ...final);

        setSlots(seededStart);
        setSpinning(true);
        startRef.current = performance.now();

        const scheduleTick = () => {
            const now = performance.now();
            const elapsed = now - startRef.current;
            const t = Math.min(1, elapsed / durationMs);

            const eased = easeOutCubic(t);
            const delay = tickMinMs + (tickMaxMs - tickMinMs) * eased;

            setSlots((prev) => {
                const next = [...prev];

                for (let s = 0; s < k; s++) {
                    const stopAt = stopFractions[s] ?? 1;
                    if (t >= stopAt) next[s] = final[s];
                }

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
        return s === -1 ? null : s;
    };

    return (
        <span className={className} aria-label={text} style={{ whiteSpace: "normal" }}>
      {(() => {
          const out: ReactNode[] = [];
          let i = 0;

          while (i < chars.length) {
              const ch = chars[i];

              if (ch === "\n") {
                  out.push(<br key={`${triggerKey}-br-${i}`} />);
                  i++;
                  continue;
              }

              if (ch === " ") {
                  out.push(
                      <span key={`${triggerKey}-sp-${i}`} className="rtSpace">
                {" "}
              </span>
                  );
                  i++;
                  continue;
              }

              const start = i;

              while (i < chars.length && chars[i] !== " " && chars[i] !== "\n") i++;

              const end = i;

              out.push(
                  <span key={`${triggerKey}-w-${start}`} className="rtWord">
              {chars.slice(start, end).map((wch, local) => {
                  const idx = start + local;
                  const slot = slotAtIndex(idx);
                  const isHot = slot !== null;

                  return (
                      <motion.span
                          key={`${triggerKey}-${idx}-${wch}`}
                          className="rtChar inline-block will-change-transform"
                          animate={
                              isHot
                                  ? {
                                      y: spinning ? [-0.5, 0.5, -0.5] : 0,
                                      scale: spinning ? [1, 1.02, 1] : 1,
                                  }
                                  : { y: 0, scale: 1 }
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
                                      textShadow: "0 0 12px rgba(0,0,0,0.10)",
                                  }
                                  : undefined
                          }
                      >
                          {wch}
                      </motion.span>
                  );
              })}
            </span>
              );
          }

          return out;
      })()}
    </span>
    );
}