"use client";

import React, { useEffect, useRef } from "react";
import type { Engine } from "./lib/engine";
import { drawBg, drawHUD, drawObstacle, drawRunnerSprite, drawWave } from "./lib/render";

export function RunCanvas(props: { engine: Engine; onGameOverOpenLeaderboard: () => void }) {
    const { engine, onGameOverOpenLeaderboard } = props;

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const vw = engine.state.vw;
        const vh = engine.state.vh;

        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        canvas.width = vw * dpr;
        canvas.height = vh * dpr;
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;

        let t0 = performance.now();

        const toCanvasXY = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * vw;
            const y = ((e.clientY - rect.top) / rect.height) * vh;
            return { x, y };
        };

        const hit = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) =>
            x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

        const onPointerDown = (e: PointerEvent) => {
            e.preventDefault();

            // evento: se è "result" non si clicca nulla
            if (engine.state.paused && engine.state.event) {
                if (engine.state.event.phase === "result") return;

                const { x, y } = toCanvasXY(e);
                const btns = engine.state.event.ui.buttons;
                for (let i = 0; i < btns.length; i++) {
                    if (hit(x, y, btns[i])) {
                        engine.chooseEvent(i);
                        return;
                    }
                }
                return;
            }

            if (!engine.state.alive) {
                onGameOverOpenLeaderboard();
                return;
            }

            if (engine.state.energy > 0) engine.fireIfCharged();
            else engine.beginHold();
        };

        const onPointerUp = (e: PointerEvent) => {
            e.preventDefault();
            engine.endHoldAndBank();
        };

        const onPointerLeave = () => {
            if (engine.state.holding) {
                engine.state.holding = false;
                engine.state.holdT = 0;
            }
        };

        canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        window.addEventListener("pointerup", onPointerUp, { passive: false });
        canvas.addEventListener("pointerleave", onPointerLeave);

        const onKeyDown = (e: KeyboardEvent) => {
            if (!engine.state.event || !engine.state.paused) return;
            if (engine.state.event.phase !== "choose") return;

            if (e.code === "ArrowLeft" || e.code === "KeyA") {
                e.preventDefault();
                engine.moveEventSelection(-1);
            } else if (e.code === "ArrowRight" || e.code === "KeyD") {
                e.preventDefault();
                engine.moveEventSelection(1);
            } else if (e.code === "Enter" || e.code === "Space") {
                e.preventDefault();
                engine.confirmEventSelection();
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - t0) / 1000);
            t0 = now;

            engine.update(dt);

            drawBg(ctx, engine.state, dt);

            for (const o of engine.state.obstacles) drawObstacle(ctx, engine.state, o);

            const s = 3;
            const rh = 12 * s;
            const ry = Math.floor(engine.state.groundY - rh);

            drawRunnerSprite(ctx, engine.state.runnerX, ry, s, engine.state.ghost, engine.state.frame);

            if (engine.state.wave.active) drawWave(ctx, engine.state.wave);

            drawHUD(ctx, engine.state);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            canvas.removeEventListener("pointerdown", onPointerDown as any);
            window.removeEventListener("pointerup", onPointerUp as any);
            canvas.removeEventListener("pointerleave", onPointerLeave as any);
            window.removeEventListener("keydown", onKeyDown as any);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [engine, onGameOverOpenLeaderboard]);

    return <canvas ref={canvasRef} />;
}