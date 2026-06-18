"use client";

import type { ReactNode } from "react";

type Props = {
    text: string;
    triggerKey?: number | string;
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

export function RouletteTitle({
    text,
    picks = 3,
    className,
}: Props) {
    const chars = Array.from(text);
    const stride = Math.max(1, picks);

    return (
        <span className={className} aria-label={text} style={{ whiteSpace: "normal" }}>
            {(() => {
                const out: ReactNode[] = [];
                let i = 0;

                while (i < chars.length) {
                    const ch = chars[i];

                    if (ch === "\n") {
                        out.push(<br key={`br-${i}`} />);
                        i++;
                        continue;
                    }

                    if (ch === " ") {
                        out.push(<span key={`sp-${i}`} className="rtSpace"> </span>);
                        i++;
                        continue;
                    }

                    const start = i;
                    while (i < chars.length && chars[i] !== " " && chars[i] !== "\n") i++;

                    const end = i;

                    out.push(
                        <span key={`w-${start}`} className="rtWord">
                            {chars.slice(start, end).map((wch, local) => {
                                const idx = start + local;
                                const shouldColor = idx % stride === 0;
                                const colorIdx = stride > 1
                                    ? Math.floor(idx / stride) % ACCENTS.length
                                    : idx % ACCENTS.length;

                                return (
                                    <span
                                        key={`${idx}-${wch}`}
                                        className="rtChar inline-block"
                                        style={
                                            shouldColor
                                                ? {
                                                    color: ACCENTS[colorIdx],
                                                    textShadow: "0 0 10px rgba(114,201,79,0.18)",
                                                }
                                                : undefined
                                        }
                                    >
                                        {wch}
                                    </span>
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
