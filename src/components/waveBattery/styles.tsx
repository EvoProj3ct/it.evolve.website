import React from "react";

export const styles: Record<string, React.CSSProperties> = {
    wrap: { display: "grid", gap: 10, position: "relative" }, // overlay
    headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
    title: {
        fontSize: 13,
        letterSpacing: 1.0,
        opacity: 0.9,
        fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    backBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        border: "1px solid rgba(231,238,247,0.18)",
        background: "rgba(0,0,0,0.20)",
        color: "rgba(231,238,247,0.9)",
        cursor: "pointer",
    },
    pickBox: { display: "grid", gap: 10 },
    pickCanvas: {
        borderRadius: 14,
        border: "1px solid rgba(231,238,247,0.18)",
        background: "rgba(0,0,0,0.20)",
        imageRendering: "pixelated",
        display: "block",
    },
    hint: { fontSize: 12, opacity: 0.7 },
    runBox: { display: "grid", gap: 10 },
    screen: {
        width: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(231,238,247,0.18)",
        background: "rgba(0,0,0,0.20)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    },
    runCanvas: {
        width: "100%",
        height: "auto",
        aspectRatio: "16 / 9",
        display: "block",
        imageRendering: "pixelated",
    },
    smallHint: { fontSize: 12, opacity: 0.75 },

    // ===== LEADERBOARD MODAL (fuori dal canvas) =====
    lbOverlay: {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 14,
        background: "rgba(0,0,0,0.55)",
    },

    lbPanel: {
        width: "min(560px, 96vw)",
        maxHeight: "calc(100vh - 28px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: 6,
        border: "2px solid rgba(0,255,154,0.55)",
        background: "rgba(0,0,0,0.88)",
        boxShadow: "0 0 0 2px rgba(0,0,0,0.85) inset, 0 20px 70px rgba(0,0,0,0.65)",
        padding: 12,
        fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },

    lbTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
    lbTitle: { fontSize: 12, letterSpacing: 1.4, opacity: 0.95 },

    lbClose: {
        width: 34,
        height: 28,
        borderRadius: 4,
        border: "2px solid rgba(231,238,247,0.22)",
        background: "rgba(0,0,0,0.35)",
        color: "rgba(231,238,247,0.95)",
        cursor: "pointer",
    },

    lbSub: {
        fontSize: 11,
        opacity: 0.82,
        marginTop: 8,
        marginBottom: 10,
        padding: "6px 8px",
        borderRadius: 4,
        border: "1px solid rgba(231,238,247,0.10)",
        background: "rgba(0,0,0,0.35)",
    },

    lbBox: {
        borderRadius: 4,
        border: "2px solid rgba(231,238,247,0.12)",
        background: "rgba(0,0,0,0.35)",
        padding: 10,
        flex: "1 1 auto",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
    },

    lbHeaderRow: {
        position: "sticky",
        top: 0,
        zIndex: 2,
        background: "rgba(0,0,0,0.92)",
        borderRadius: 4,
        padding: "6px 8px",
        border: "1px solid rgba(57,255,20,0.22)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.7) inset",
    },

    lbGridHeader: {
        display: "grid",
        gridTemplateColumns: "34px 22px 1fr 80px",
        alignItems: "center",
        gap: 10,
        fontSize: 11,
        letterSpacing: 1.0,
        opacity: 0.95,
    },

    lbList: {
        marginTop: 8,
        display: "grid",
        gap: 6,
        overflowY: "auto",
        paddingRight: 8,
        flex: "1 1 auto",
        minHeight: 0,
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(0,255,154,0.55) rgba(0,0,0,0.35)",
    },

    lbRow: {
        borderRadius: 4,
        border: "1px solid rgba(231,238,247,0.12)",
        background: "rgba(0,0,0,0.18)",
        padding: "6px 8px",
    },

    lbRowMine: {
        background: "rgba(0,229,255,0.14)",
        border: "1px solid rgba(0,255,154,0.55)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.65) inset",
    },

    lbGridRow: {
        display: "grid",
        gridTemplateColumns: "34px 22px 1fr 80px",
        alignItems: "center",
        gap: 10,
        fontSize: 12,
    },

    lbColRank: { opacity: 0.9 },
    lbColAvatar: { display: "grid", placeItems: "center" },
    lbColName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.95 },
    lbColScore: { textAlign: "right", opacity: 0.95 },

    lbForm: {
        display: "grid",
        gap: 8,
        marginTop: 10,
        padding: "8px 10px",
        borderRadius: 4,
        border: "1px solid rgba(0,229,255,0.18)",
        background: "rgba(0,0,0,0.35)",
    },

    lbFormRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

    lbAvatarBig: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 4,
        border: "1px solid rgba(231,238,247,0.14)",
        background: "rgba(0,0,0,0.30)",
        fontSize: 12,
    },

    lbInput: {
        flex: "1 1 180px",
        height: 34,
        borderRadius: 4,
        border: "2px solid rgba(231,238,247,0.18)",
        background: "rgba(0,0,0,0.35)",
        color: "rgba(231,238,247,0.92)",
        padding: "0 10px",
        outline: "none",
        fontSize: 12,
    },

    lbBtn: {
        height: 34,
        padding: "0 12px",
        borderRadius: 4,
        border: "2px solid rgba(0,255,154,0.55)",
        background: "rgba(0,0,0,0.35)",
        color: "rgba(231,238,247,0.95)",
        letterSpacing: 1.0,
        cursor: "pointer",
    },

    lbFooter: {
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
        marginTop: 10,
        flexWrap: "wrap",
        paddingTop: 6,
    },

    lbBtnSecondary: {
        height: 32,
        padding: "0 10px",
        borderRadius: 4,
        border: "2px solid rgba(231,238,247,0.16)",
        background: "rgba(0,0,0,0.30)",
        color: "rgba(231,238,247,0.9)",
        cursor: "pointer",
        fontSize: 12,
    },
};