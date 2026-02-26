"use client";

import React, { useMemo } from "react";
import type { GhostDef, GhostId, LbRow } from "./lib/types";
import { GHOSTS } from "./lib/constants";
import { styles } from "./styles";

export function LeaderboardModal(props: {
    open: boolean;
    topN: number;
    loading: boolean;

    rows: LbRow[];
    mySessionId: string | null;

    score: number;
    selected: GhostDef;

    qualify: boolean;
    nameInput: string;
    setNameInput: (v: string) => void;

    submitBusy: boolean;
    onSubmit: () => void;
    onRefresh: () => void;

    onCloseToPick: () => void;
    onReplay: () => void;
}) {
    const {
        open,
        topN,
        loading,
        rows,
        mySessionId,
        score,
        selected,
        qualify,
        nameInput,
        setNameInput,
        submitBusy,
        onSubmit,
        onRefresh,
        onCloseToPick,
        onReplay,
    } = props;

    const ghostById = useMemo(() => {
        const m = new Map<GhostId, GhostDef>();
        for (const g of GHOSTS) m.set(g.id, g);
        return m;
    }, []);

    const lbRows: Array<LbRow | null> = useMemo(
        () => (rows.length ? rows : Array.from({ length: topN }, () => null)),
        [rows, topN]
    );

    const renderAvatar = (ghostId: GhostId) => {
        const g = ghostById.get(ghostId) || GHOSTS[0];
        return (
            <span
                aria-hidden
                style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    borderRadius: 2,
                    background: g.c1,
                    boxShadow: `0 0 0 1px rgba(0,0,0,0.70), 0 0 0 2px ${g.c2} inset`,
                    position: "relative",
                }}
            >
        <span
            style={{
                position: "absolute",
                left: 3,
                top: 5,
                width: 2,
                height: 2,
                background: "rgba(0,0,0,0.90)",
                boxShadow: "6px 0 rgba(0,0,0,0.90)",
            }}
        />
      </span>
        );
    };

    if (!open) return null;

    return (
        <div style={styles.lbOverlay}>
            <div style={styles.lbPanel}>
                <div style={styles.lbTitleRow}>
                    <div style={styles.lbTitle}>TOP {topN} — LEADERBOARD</div>
                    <button type="button" style={styles.lbClose} onClick={onCloseToPick} aria-label="Chiudi e torna alla selezione">
                        ✕
                    </button>
                </div>

                <div style={styles.lbSub}>
          <span style={{ opacity: 0.9 }}>
            Il tuo score: <b style={{ opacity: 1 }}>{score}</b>{" "}
              <span style={{ opacity: 0.8 }}>({selected.label})</span>
          </span>
                    <span style={{ opacity: 0.6 }}> — </span>
                    <span style={{ opacity: 0.75 }}>{loading ? "Caricamento..." : "Aggiornato"}</span>
                </div>

                <div style={styles.lbBox}>
                    <div style={styles.lbHeaderRow}>
                        <div style={styles.lbGridHeader}>
                            <span style={styles.lbColRank}>#</span>
                            <span style={styles.lbColAvatar}></span>
                            <span style={styles.lbColName}>NOME</span>
                            <span style={styles.lbColScore}>SCORE</span>
                        </div>
                    </div>

                    <div style={styles.lbList}>
                        {lbRows.map((row, i) => {
                            const isMine = !!row && !!mySessionId && row.sessionId === mySessionId;
                            return (
                                <div key={row ? row.sessionId : `empty-${i}`} style={{ ...styles.lbRow, ...(isMine ? styles.lbRowMine : null) }}>
                                    <div style={styles.lbGridRow}>
                                        <span style={styles.lbColRank}>{String(i + 1).padStart(2, "0")}</span>
                                        <span style={styles.lbColAvatar}>{row ? renderAvatar(row.ghost) : null}</span>
                                        <span style={styles.lbColName}>{row ? row.name : <span style={{ opacity: 0.35 }}>—</span>}</span>
                                        <span style={styles.lbColScore}>{row ? row.score : <span style={{ opacity: 0.35 }}>—</span>}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {qualify ? (
                    <div style={styles.lbForm}>
                        <div style={{ opacity: 0.92 }}>
                            Sei dentro i <b>TOP {topN}</b> (o la lista non è piena). Inserisci il nome:
                        </div>

                        <div style={styles.lbFormRow}>
                            <div style={styles.lbAvatarBig}>
                                {renderAvatar(selected.id)} <span style={{ opacity: 0.85 }}>{selected.label}</span>
                            </div>

                            <input
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="Nome (max 16)"
                                maxLength={16}
                                style={styles.lbInput}
                            />

                            <button
                                type="button"
                                style={{
                                    ...styles.lbBtn,
                                    opacity: submitBusy || nameInput.trim().length < 2 ? 0.55 : 1,
                                    cursor: submitBusy || nameInput.trim().length < 2 ? "not-allowed" : "pointer",
                                }}
                                disabled={submitBusy || nameInput.trim().length < 2}
                                onClick={onSubmit}
                            >
                                {submitBusy ? "SALVO..." : "SALVA"}
                            </button>
                        </div>

                        <div style={{ fontSize: 11, opacity: 0.65 }}>
                            Tip: premi <b>Enter</b> per salvare.
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: 12, opacity: 0.70 }}>Non sei nei TOP {topN}. Riprova 💾⚡</div>
                )}

                <div style={styles.lbFooter}>
                    <button type="button" style={styles.lbBtnSecondary} onClick={onRefresh}>
                        ↻ Refresh
                    </button>
                    <button type="button" style={styles.lbBtnSecondary} onClick={onReplay}>
                        ▶ Rigioca
                    </button>
                    <button type="button" style={styles.lbBtnSecondary} onClick={onCloseToPick}>
                        ↩ Selezione
                    </button>
                </div>
            </div>
        </div>
    );
}