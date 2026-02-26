import type { EventKind, EventOptionId, EventState, GameState } from "./types";
import { clampInt, rand } from "./utils";

const RESULT_TTL = 1.1;

function mkUI(vw: number, vh: number, optionCount: number) {
    const panelW = 268;
    const panelH = 118;
    const x = Math.floor((vw - panelW) / 2);
    const y = Math.floor((vh - panelH) / 2) - 2;

    const btnGap = 10;
    const btnH = 24;
    const btnY = y + panelH - 12 - btnH;

    const totalBtnW = panelW - 16 * 2;
    const btnW =
        optionCount === 2
            ? Math.floor((totalBtnW - btnGap) / 2)
            : Math.floor((totalBtnW - btnGap * 2) / 3);

    const btnX0 = x + 16;

    const buttons = Array.from({ length: optionCount }).map((_, i) => ({
        x: btnX0 + i * (btnW + btnGap),
        y: btnY,
        w: btnW,
        h: btnH,
    }));

    return {
        panel: { x, y, w: panelW, h: panelH },
        buttons,
    };
}

function amountFromScore(score: number, fracMin: number, fracMax: number) {
    if (score <= 0) return 1;
    const a = Math.max(1, Math.floor(score * fracMin));
    const b = Math.max(a, Math.floor(score * fracMax));
    return rand(a, b);
}

export function canSpawnChoosePower(st: GameState) {
    // “smette di apparire quando anche solo uno dei due è a tre”
    return st.stars < 3 && st.doubles < 3;
}

export function pickRandomEventKind(st: GameState): EventKind {
    const kinds: Array<{ k: EventKind; w: number; ok: boolean }> = [
        { k: "beggar", w: 30, ok: st.score >= 4 },
        { k: "choosePower", w: 18, ok: canSpawnChoosePower(st) && st.score >= 2 },
        { k: "doubleOrNothing", w: 16, ok: st.score >= 6 },
        { k: "stumbleLose", w: 18, ok: st.score >= 3 },
        { k: "foundGain", w: 18, ok: true },
    ];

    const pool = kinds.filter((x) => x.ok);
    const sum = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * sum;
    for (const it of pool) {
        r -= it.w;
        if (r <= 0) return it.k;
    }
    return pool[0]?.k ?? "foundGain";
}

export function createEvent(st: GameState, kind: EventKind): EventState {
    const vw = st.vw;
    const vh = st.vh;

    if (kind === "beggar") {
        const ask = amountFromScore(st.score, 1 / 3, 2 / 3);
        return {
            kind,
            title: "UN MENDICANTE",
            body: `TI CHIEDE ${ask} PUNTI. ACCETTI?`,
            amount: ask,
            options: [
                { id: "ACCEPT", label: "ACCETTA" },
                { id: "REFUSE", label: "RIFIUTA" },
            ],
            selectedIndex: 0,
            ui: mkUI(vw, vh, 2),
            phase: "choose",
        };
    }

    if (kind === "choosePower") {
        return {
            kind,
            title: "SCELTA RAPIDA",
            body: "SCEGLI IL PREMIO.",
            amount: 0,
            options: [
                { id: "STAR", label: "STELLA +" },
                { id: "DOUBLE", label: "DOUBLE +" },
            ],
            selectedIndex: 0,
            ui: mkUI(vw, vh, 2),
            phase: "choose",
        };
    }

    if (kind === "doubleOrNothing") {
        return {
            kind,
            title: "LASCIA O RADDOPPIA",
            body: "VUOI GIOCARE IL TUO SCORE?",
            amount: 0,
            options: [
                { id: "LEAVE", label: "LASCIA" },
                { id: "BET", label: "RADDOPPIA" },
            ],
            selectedIndex: 0,
            ui: mkUI(vw, vh, 2),
            phase: "choose",
        };
    }

    if (kind === "stumbleLose") {
        const lose = amountFromScore(st.score, 1 / 12, 1 / 6);
        return {
            kind,
            title: "INCIAMPO!",
            body: `PERDI ${lose} PUNTI.`,
            amount: lose,
            options: [
                { id: "ACCEPT", label: "OK" },
                { id: "REFUSE", label: "..." },
            ],
            selectedIndex: 0,
            ui: mkUI(vw, vh, 2),
            phase: "choose",
        };
    }

    const gain = amountFromScore(st.score, 1 / 12, 1 / 6);
    return {
        kind: "foundGain",
        title: "CHE CULO!",
        body: `TROVI ${gain} PUNTI.`,
        amount: gain,
        options: [
            { id: "ACCEPT", label: "OK" },
            { id: "REFUSE", label: "..." },
        ],
        selectedIndex: 0,
        ui: mkUI(vw, vh, 2),
        phase: "choose",
    };
}

function grantStar(st: GameState) {
    st.stars = clampInt(st.stars + 1, 0, 3);
}

function grantDouble(st: GameState) {
    st.doubles = clampInt(st.doubles + 1, 0, 3);
}

export function applyEventChoice(st: GameState, ev: EventState, choiceId: EventOptionId) {
    // ✅ mostra esito e resta in pausa finché ttl finisce
    const showResult = (title: string, body: string) => {
        ev.phase = "result";
        ev.result = { title, body, ttl: RESULT_TTL };
        // stop hold "appiccicoso"
        st.holding = false;
        st.holdT = 0;
    };

    if (ev.kind === "beggar") {
        const ask = Math.max(1, ev.amount);

        if (choiceId === "ACCEPT") {
            st.score = Math.max(0, st.score - ask);

            const roll = Math.random();

            if (roll < 0.55) {
                if (st.stars < 3) {
                    grantStar(st);
                    showResult("BENEDIZIONE", "TI REGALA UNA STELLA ★");
                } else {
                    grantDouble(st);
                    showResult("BENEDIZIONE", "TI REGALA UN DOUBLE 2x");
                }
            } else if (roll < 0.90) {
                if (st.doubles < 3) {
                    grantDouble(st);
                    showResult("RICOMPENSA", "TI REGALA UN DOUBLE 2x");
                } else {
                    grantStar(st);
                    showResult("RICOMPENSA", "TI REGALA UNA STELLA ★");
                }
            } else {
                const bonus = Math.max(1, Math.floor(ask / 2));
                st.score += bonus;
                showResult("BENEDIZIONE", `TI DONA ${bonus} PUNTI.`);
            }

            return;
        }

        if (choiceId === "REFUSE") {
            const roll = Math.random();

            if (roll < 0.05) {
                st.alive = false;
                showResult("STREGONE!", "TI FA SPARIRE...");
                return;
            }

            if (roll < 0.55) {
                st.score = Math.max(0, st.score - ask);
                showResult("BOTTE!", `TI PRENDE ${ask} PUNTI.`);
                return;
            }

            if (st.stars > 0) {
                st.stars -= 1;
                showResult("MALEDIZIONE", "PERDI UNA STELLA ★");
            } else {
                const loss = Math.max(1, Math.floor(ask / 2));
                st.score = Math.max(0, st.score - loss);
                showResult("MALEDIZIONE", `PERDI ${loss} PUNTI.`);
            }
            return;
        }
    }

    if (ev.kind === "choosePower") {
        if (choiceId === "STAR") {
            grantStar(st);
            showResult("SCELTA", "OTTENUTA STELLA ★");
            return;
        }
        if (choiceId === "DOUBLE") {
            grantDouble(st);
            showResult("SCELTA", "OTTENUTO DOUBLE 2x");
            return;
        }
    }

    if (ev.kind === "doubleOrNothing") {
        if (choiceId === "LEAVE") {
            showResult("OK", "TI SALVI.");
            return;
        }
        if (choiceId === "BET") {
            if (Math.random() < 0.5) {
                st.score = st.score * 2;
                showResult("VINCI!", "SCORE RADDOPPIATO.");
            } else {
                st.score = 0;
                showResult("PERSO!", "SCORE AZZERATO.");
            }
            return;
        }
    }

    if (ev.kind === "stumbleLose") {
        const loss = Math.max(1, ev.amount);
        st.score = Math.max(0, st.score - loss);
        showResult("OUCH", `PERDI ${loss} PUNTI.`);
        return;
    }

    if (ev.kind === "foundGain") {
        const gain = Math.max(1, ev.amount);
        st.score += gain;
        showResult("FORTUNA", `TROVI ${gain} PUNTI.`);
        return;
    }

    // fallback
    showResult("OK", "...");
}