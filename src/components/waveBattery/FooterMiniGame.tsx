"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { GhostDef, GhostId, LbRow, Phase } from "./lib/types";
import { GHOSTS } from "./lib/constants";
import { createWaveBatteryEngine, type Engine } from "./lib/engine";
import { fetchLeaderboard, submitScore } from "./lib/api";
import { styles } from "./styles";
import { PickCanvas } from "./PickCanvas";
import { RunCanvas } from "./RunCanvas";
import { LeaderboardModal } from "./LeaderboardModal";

const TOP_N = 15;

export default function FooterMiniGame() {
    const [phase, setPhase] = useState<Phase>("pick");
    const [selected, setSelected] = useState<GhostDef>(GHOSTS[0]);
    const [hovered, setHovered] = useState<GhostId | null>(null);

    // engine (single instance)
    const engineRef = useRef<Engine | null>(null);
    if (!engineRef.current) engineRef.current = createWaveBatteryEngine(selected);

    // tiny UI snapshot
    const [snap, setSnap] = useState(engineRef.current.snapshot());

    // ===== Leaderboard state =====
    const [lbOpen, setLbOpen] = useState(false);
    const [lbLoading, setLbLoading] = useState(false);
    const [lb, setLb] = useState<LbRow[]>([]);
    const [mySessionId, setMySessionId] = useState<string | null>(null);
    const [qualify, setQualify] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [submitBusy, setSubmitBusy] = useState(false);

    useMemo(() => (lb.length ? lb : Array.from({ length: TOP_N }, () => null)), [lb]);

    // ✅ FIX: startGame usa il ghost passato, non lo state "selected" (che arriva async)
    const startGame = (ghost: GhostDef) => {
        const eng = engineRef.current!;
        eng.setGhost(ghost);
        eng.reset();

        setSnap(eng.snapshot());

        setLbOpen(false);
        setLb([]);
        setQualify(false);
        setNameInput("");
    };

    const fetchLB = async () => {
        setLbLoading(true);
        const data = await fetchLeaderboard();
        if (data?.ok) {
            setLb(Array.isArray(data.top) ? data.top : []);
            setMySessionId(data.me?.sessionId ?? null);
            if (data.me?.name && !nameInput) setNameInput(data.me.name);
        }
        setLbLoading(false);
    };

    const checkQualification = (top: LbRow[], finalScore: number, sid: string | null) => {
        if (finalScore <= 0) return false;
        if (sid && top.some((r) => r.sessionId === sid)) return true;
        const last = top[top.length - 1]?.score ?? -1;
        return top.length < TOP_N || finalScore > last;
    };

    const doSubmit = async () => {
        const nm = nameInput.trim();
        if (nm.length < 2) return;
        if (submitBusy) return;

        setSubmitBusy(true);
        try {
            await submitScore({ score: engineRef.current!.state.score, name: nm, ghost: selected.id });
            await fetchLB();
            setQualify(false);
        } catch {}
        setSubmitBusy(false);
    };

    // Keyboard input (Space / Enter)
    useEffect(() => {
        if (phase !== "run") return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== "Space" && e.code !== "Enter") return;

            // overlay aperto: Enter salva (se qualify)
            if (!engineRef.current!.state.alive && lbOpen) {
                if (e.code === "Enter" && qualify && nameInput.trim().length >= 2) {
                    e.preventDefault();
                    doSubmit();
                    return;
                }
                if (e.code === "Space" || e.code === "Enter") {
                    e.preventDefault();
                    return;
                }
            }

            // gameover: apri leaderboard
            if (!engineRef.current!.state.alive && (e.code === "Enter" || e.code === "Space")) {
                e.preventDefault();
                setLbOpen(true);
                return;
            }

            if (e.code === "Space") {
                e.preventDefault();
                const eng = engineRef.current!;
                if (eng.state.energy > 0) eng.fireIfCharged();
                else eng.beginHold();
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                engineRef.current!.endHoldAndBank();
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp, { passive: false });

        return () => {
            window.removeEventListener("keydown", onKeyDown as any);
            window.removeEventListener("keyup", onKeyUp as any);
        };
    }, [phase, lbOpen, qualify, nameInput, submitBusy]);

    // open leaderboard => fetch
    useEffect(() => {
        if (!lbOpen) return;
        (async () => {
            await fetchLB();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lbOpen]);

    // when lb updates recompute qualification
    useEffect(() => {
        if (!lbOpen) return;
        setQualify(checkQualification(lb, engineRef.current!.state.score, mySessionId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lb, lbOpen, mySessionId]);

    // update snap while running
    useEffect(() => {
        if (phase !== "run") return;
        let raf: number | null = null;

        const tick = () => {
            setSnap(engineRef.current!.snapshot());
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [phase]);

    const title = phase === "pick" ? "Scegli un fantasmino" : snap.alive ? "KATANA BATTERY" : "GAME OVER";

    return (
        <div style={styles.wrap}>
            <div style={styles.headerRow}>
                <div style={styles.title}>{title}</div>

                {phase === "run" && (
                    <button
                        type="button"
                        style={styles.backBtn}
                        onClick={() => setPhase("pick")}
                        aria-label="Torna alla selezione"
                    >
                        Sel
                    </button>
                )}
            </div>

            {phase === "pick" ? (
                <div style={styles.pickBox}>
                    <PickCanvas
                        hovered={hovered}
                        setHovered={setHovered}
                        onPick={(g) => {
                            setSelected(g);     // UI
                            startGame(g);       // ✅ parte subito col ghost giusto
                            setPhase("run");
                        }}
                    />
                    <div style={styles.hint}>Se fai il nuovo record ti offriamo una birra!</div>
                </div>
            ) : (
                <div style={styles.runBox}>
                    <div style={styles.screen}>
                        <RunCanvas
                            engine={engineRef.current!}
                            onGameOverOpenLeaderboard={() => {
                                setLbOpen(true);
                            }}
                        />
                    </div>

                    <div style={styles.smallHint}>
            <span style={{ opacity: 0.85 }}>
              Punti: <b style={{ opacity: 1 }}>{snap.score}</b>
            </span>
                        <span style={{ opacity: 0.65 }}>
              {" "}
                            —{" "}
                            {snap.alive
                                ? snap.energy > 0
                                    ? "Press Space/click to release (consumes all)"
                                    : "Hold Space/click then release to bank energy"
                                : "Click o Space per aprire TOP 15"}
            </span>
                    </div>
                </div>
            )}

            <LeaderboardModal
                open={lbOpen && !snap.alive}
                topN={TOP_N}
                loading={lbLoading}
                rows={lb}
                mySessionId={mySessionId}
                score={engineRef.current!.state.score}
                selected={selected}
                qualify={qualify}
                nameInput={nameInput}
                setNameInput={setNameInput}
                submitBusy={submitBusy}
                onSubmit={doSubmit}
                onRefresh={fetchLB}
                onCloseToPick={() => {
                    setLbOpen(false);
                    setPhase("pick");
                }}
                onReplay={() => {
                    setLbOpen(false);
                    startGame(selected); // ✅ rigioca col selected corrente
                }}
            />
        </div>
    );
}