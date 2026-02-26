"use client";

import React, { useEffect, useRef } from "react";
import type { GhostDef, GhostId } from "./lib/types";
import { drawRunnerSprite } from "./lib/render";
import { GHOSTS } from "./lib/constants";

export function PickCanvas(props: {
    hovered: GhostId | null;
    setHovered: (id: GhostId | null) => void;
    onPick: (g: GhostDef) => void;
}) {
    const { hovered, setHovered, onPick } = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // render
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const sizeCss = 270;

        canvas.style.width = `${sizeCss}px`;
        canvas.style.height = `${sizeCss}px`;
        canvas.width = sizeCss * dpr;
        canvas.height = sizeCss * dpr;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;

        const cell = sizeCss / 2;
        const s = 6;

        const positions: Array<{ g: GhostDef; gx: 0 | 1; gy: 0 | 1 }> = [
            { g: GHOSTS[0], gx: 0, gy: 0 },
            { g: GHOSTS[1], gx: 1, gy: 0 },
            { g: GHOSTS[2], gx: 0, gy: 1 },
            { g: GHOSTS[3], gx: 1, gy: 1 },
        ];

        const draw = () => {
            ctx.clearRect(0, 0, sizeCss, sizeCss);

            ctx.fillStyle = "rgba(0,0,0,0.24)";
            ctx.fillRect(0, 0, sizeCss, sizeCss);

            ctx.strokeStyle = "rgba(57,255,20,0.25)";
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, sizeCss - 2, sizeCss - 2);

            ctx.globalAlpha = 0.28;
            ctx.strokeStyle = "rgba(0,229,255,0.10)";
            for (let i = 0; i <= sizeCss; i += 10) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, sizeCss);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(sizeCss, i);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            positions.forEach(({ g, gx, gy }) => {
                const ox = gx * cell;
                const oy = gy * cell;
                const hot = hovered === g.id;

                ctx.fillStyle = hot ? "rgba(0,229,255,0.10)" : "rgba(255,255,255,0.04)";
                ctx.fillRect(ox + 8, oy + 8, cell - 16, cell - 16);

                const spriteW = 12 * s;
                const sx = Math.floor(ox + (cell - spriteW) / 2);
                const sy = Math.floor(oy + 28);
                drawRunnerSprite(ctx, sx, sy, s, g, 0);

                const pillW = cell - 26;
                const pillH = 28;
                const px = ox + (cell - pillW) / 2;
                const py = oy + cell - 44;

                ctx.fillStyle = hot ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.34)";
                ctx.fillRect(px, py, pillW, pillH);

                ctx.strokeStyle = hot ? "rgba(0,255,154,0.55)" : "rgba(231,238,247,0.18)";
                ctx.lineWidth = 2;
                ctx.strokeRect(px + 1, py + 1, pillW - 2, pillH - 2);

                ctx.fillStyle = "rgba(231,238,247,0.95)";
                ctx.font =
                    "bold 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(g.label.toUpperCase(), ox + cell / 2, py + pillH / 2);
            });
        };

        draw();
    }, [hovered]);

    // interaction
    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;

        const sizeCss = 270;
        const cell = sizeCss / 2;

        const getCellId = (evt: PointerEvent): GhostId | null => {
            const rect = c.getBoundingClientRect();
            const x = ((evt.clientX - rect.left) / rect.width) * sizeCss;
            const y = ((evt.clientY - rect.top) / rect.height) * sizeCss;

            const cx: 0 | 1 = x < cell ? 0 : 1;
            const cy: 0 | 1 = y < cell ? 0 : 1;

            if (cx === 0 && cy === 0) return "red";
            if (cx === 1 && cy === 0) return "green";
            if (cx === 0 && cy === 1) return "purple";
            if (cx === 1 && cy === 1) return "white";
            return null;
        };

        const onMove = (e: PointerEvent) => setHovered(getCellId(e));
        const onLeave = () => setHovered(null);
        const onClick = (e: PointerEvent) => {
            const id = getCellId(e);
            if (!id) return;
            const g = GHOSTS.find((x) => x.id === id);
            if (!g) return;
            onPick(g);
        };

        c.addEventListener("pointermove", onMove);
        c.addEventListener("pointerleave", onLeave);
        c.addEventListener("pointerdown", onClick);

        return () => {
            c.removeEventListener("pointermove", onMove);
            c.removeEventListener("pointerleave", onLeave);
            c.removeEventListener("pointerdown", onClick);
        };
    }, [onPick, setHovered]);

    return <canvas ref={canvasRef} />;
}