"use client";

import React, { useEffect, useRef, useState } from "react";

type GhostId = "red" | "green" | "purple" | "white";
type GhostDef = { id: GhostId; label: string; c1: string; c2: string; c3: string };

const GHOSTS: GhostDef[] = [
    { id: "red", label: "Rosso", c1: "#d94b4b", c2: "#a83636", c3: "#f2b1b1" },
    { id: "green", label: "Verde", c1: "#4bd971", c2: "#2fa24b", c3: "#b7f2c6" },
    { id: "purple", label: "Viola", c1: "#7c67ff", c2: "#5847bf", c3: "#c9c2ff" },
    { id: "white", label: "Bianco", c1: "#f2f2f2", c2: "#cfcfcf", c3: "#ffffff" },
];

// sprite 12x12 pieno
const RUNNER_12: number[][] = [
    [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
];

function drawRunnerSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    ghost: GhostDef,
    frame: number
) {
    const body = ghost.c1;
    const shade = ghost.c2;
    const hi = ghost.c3;

    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 12; c++) {
            const v = RUNNER_12[r][c];
            if (!v) continue;

            let color = body;
            if (r <= 1 || c <= 1) color = hi;
            if (c >= 9 || r >= 9) color = shade;

            // bobbing piedi
            const isFoot = r === 10 && (c === 2 || c === 9);
            let yy = y + r * s;
            if (isFoot) yy += frame % 2 === 0 ? 0 : s;

            ctx.fillStyle = color;
            ctx.fillRect(x + c * s, yy, s, s);
        }
    }

    // occhi: due rettangoli neri overlay
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 4 * s, y + 5 * s, 2 * s, 2 * s);
    ctx.fillRect(x + 7 * s, y + 5 * s, 2 * s, 2 * s);
}

type Phase = "pick" | "run";

type Obstacle = {
    x: number;
    w: number;
    h: number;
    hp: 1 | 2 | 3;
    stroke: string;
};

type Wave = {
    active: boolean;
    level: 1 | 2 | 3;
    color: string;
    // semicerchio che avanza:
    // centerX avanza, radius cresce
    cx: number;
    cy: number;
    radius: number;
    speed: number; // px/s
    growth: number; // px/s
    ttl: number; // seconds
};

const FLUO = ["#39ff14", "#00e5ff", "#b400ff", "#00ff9a"];

export default function FooterMiniGame() {
    const [phase, setPhase] = useState<Phase>("pick");
    const [selected, setSelected] = useState<GhostDef>(GHOSTS[0]);
    const [hovered, setHovered] = useState<GhostId | null>(null);

    const pickCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const runCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);

    const scoreRef = useRef(0);
    const [scoreUI, setScoreUI] = useState(0);

    const aliveRef = useRef(true);
    const [aliveUI, setAliveUI] = useState(true);

    // CHARGE mantenuta (0..1)
    const chargingRef = useRef(false);
    const chargeRef = useRef(0);
    const [chargeUI, setChargeUI] = useState(0);

    // wave
    const waveRef = useRef<Wave>({
        active: false,
        level: 1,
        color: "#00e5ff",
        cx: 0,
        cy: 0,
        radius: 0,
        speed: 0,
        growth: 0,
        ttl: 0,
    });

    // obstacles
    const obstaclesRef = useRef<Obstacle[]>([]);
    const frameRef = useRef(0);

    // time scaling
    const elapsedRef = useRef(0);

    // matrix streaks
    const streaksRef = useRef(
        Array.from({ length: 26 }).map((_, i) => ({
            x: (i * 17) % 320,
            y: Math.random() * 180,
            len: 18 + Math.random() * 60,
            spd: 20 + Math.random() * 60,
            a: 0.08 + Math.random() * 0.18,
        }))
    );

    // ---------- PICK RENDER ----------
    useEffect(() => {
        if (phase !== "pick") return;
        const canvas = pickCanvasRef.current;
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

        const draw = (ctx2: CanvasRenderingContext2D) => {
            ctx2.clearRect(0, 0, sizeCss, sizeCss);

            ctx2.fillStyle = "rgba(0,0,0,0.24)";
            ctx2.fillRect(0, 0, sizeCss, sizeCss);

            ctx2.strokeStyle = "rgba(57,255,20,0.25)";
            ctx2.lineWidth = 2;
            ctx2.strokeRect(1, 1, sizeCss - 2, sizeCss - 2);

            ctx2.globalAlpha = 0.28;
            ctx2.strokeStyle = "rgba(0,229,255,0.10)";
            for (let i = 0; i <= sizeCss; i += 10) {
                ctx2.beginPath(); ctx2.moveTo(i, 0); ctx2.lineTo(i, sizeCss); ctx2.stroke();
                ctx2.beginPath(); ctx2.moveTo(0, i); ctx2.lineTo(sizeCss, i); ctx2.stroke();
            }
            ctx2.globalAlpha = 1;

            positions.forEach(({ g, gx, gy }) => {
                const ox = gx * cell;
                const oy = gy * cell;
                const hot = hovered === g.id;

                ctx2.fillStyle = hot ? "rgba(0,229,255,0.10)" : "rgba(255,255,255,0.04)";
                ctx2.fillRect(ox + 8, oy + 8, cell - 16, cell - 16);

                const spriteW = 12 * s;
                const sx = Math.floor(ox + (cell - spriteW) / 2);
                const sy = Math.floor(oy + 28);
                drawRunnerSprite(ctx2, sx, sy, s, g, 0);

                const pillW = cell - 26;
                const pillH = 28;
                const px = ox + (cell - pillW) / 2;
                const py = oy + cell - 44;

                ctx2.fillStyle = hot ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.34)";
                ctx2.fillRect(px, py, pillW, pillH);

                ctx2.strokeStyle = hot ? "rgba(0,255,154,0.55)" : "rgba(231,238,247,0.18)";
                ctx2.lineWidth = 2;
                ctx2.strokeRect(px + 1, py + 1, pillW - 2, pillH - 2);

                ctx2.fillStyle = "rgba(231,238,247,0.95)";
                ctx2.font =
                    "bold 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
                ctx2.textAlign = "center";
                ctx2.textBaseline = "middle";
                ctx2.fillText(g.label.toUpperCase(), ox + cell / 2, py + pillH / 2);
            });
        };

        draw(ctx);
    }, [phase, hovered]);

    // ---------- PICK INTERACTION ----------
    useEffect(() => {
        if (phase !== "pick") return;

        const canvas = pickCanvasRef.current;
        if (!canvas) return;
        const c = canvas;

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
            setSelected(g);
            startGame();
            setPhase("run");
        };

        c.addEventListener("pointermove", onMove);
        c.addEventListener("pointerleave", onLeave);
        c.addEventListener("pointerdown", onClick);

        return () => {
            c.removeEventListener("pointermove", onMove);
            c.removeEventListener("pointerleave", onLeave);
            c.removeEventListener("pointerdown", onClick);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // ---------- GAME HELPERS ----------
    const startGame = () => {
        scoreRef.current = 0;
        setScoreUI(0);

        aliveRef.current = true;
        setAliveUI(true);

        chargingRef.current = false;
        chargeRef.current = 0;
        setChargeUI(0);

        waveRef.current = {
            active: false,
            level: 1,
            color: "#00e5ff",
            cx: 0,
            cy: 0,
            radius: 0,
            speed: 0,
            growth: 0,
            ttl: 0,
        };

        obstaclesRef.current = [];
        frameRef.current = 0;
        elapsedRef.current = 0;

        streaksRef.current = Array.from({ length: 26 }).map((_, i) => ({
            x: (i * 17) % 320,
            y: Math.random() * 180,
            len: 18 + Math.random() * 60,
            spd: 20 + Math.random() * 60,
            a: 0.08 + Math.random() * 0.18,
        }));
    };

    const chargeLevel = (t01: number): 0 | 1 | 2 | 3 => {
        if (t01 <= 0.001) return 0;
        if (t01 >= 0.92) return 3;
        if (t01 >= 0.55) return 2;
        return 1;
    };

    const beginCharge = () => {
        if (!aliveRef.current) return;
        chargingRef.current = true;
    };

    const releaseWave = () => {
        if (!aliveRef.current) return;

        const lvl = chargeLevel(chargeRef.current);
        if (lvl === 0) return; // niente da rilasciare

        // set wave params by level
        const color = lvl === 1 ? "#00e5ff" : lvl === 2 ? "#39ff14" : "#b400ff";
        const speed = lvl === 1 ? 240 : lvl === 2 ? 310 : 390; // più veloce del mondo
        const growth = lvl === 1 ? 180 : lvl === 2 ? 250 : 340; // semicerchio cresce
        const ttl = lvl === 1 ? 0.28 : lvl === 2 ? 0.34 : 0.40;

        // spawn davanti al runner
        const runnerX = 56;
        const groundY = 180 - 26;
        const rw = 12 * 3;
        const cx = runnerX + rw + 6;
        const cy = groundY - 10;

        waveRef.current = {
            active: true,
            level: lvl as 1 | 2 | 3,
            color,
            cx,
            cy,
            radius: lvl === 1 ? 10 : lvl === 2 ? 14 : 18,
            speed,
            growth,
            ttl,
        };

        // consuma charge
        chargingRef.current = false;
        chargeRef.current = 0;
        setChargeUI(0);
    };

    const cancelCharge = () => {
        chargingRef.current = false;
    };

    // keyboard hold/release
    useEffect(() => {
        if (phase !== "run") return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                if (!chargingRef.current && aliveRef.current) beginCharge();
            }
            if (!aliveRef.current && (e.code === "Enter" || e.code === "Space")) {
                e.preventDefault();
                startGame();
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                if (aliveRef.current) releaseWave();
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp, { passive: false });

        return () => {
            window.removeEventListener("keydown", onKeyDown as any);
            window.removeEventListener("keyup", onKeyUp as any);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // ---------- RUN LOOP ----------
    useEffect(() => {
        if (phase !== "run") return;

        const canvas = runCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const vw = 320;
        const vh = 180;

        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        canvas.width = vw * dpr;
        canvas.height = vh * dpr;
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;

        let t0 = performance.now();

        const groundY = vh - 26;
        const runnerX = 56;

        const spawnObstacle = () => {
            const score = scoreRef.current;

            // gap
            const hardChance = Math.min(0.30, 0.10 + score * 0.012);
            const gap = Math.random() < hardChance ? rand(54, 76) : rand(88, 150);

            const last = obstaclesRef.current[obstaclesRef.current.length - 1];
            const startX = last ? last.x + last.w + gap : vw + 80;

            // hp grows with score/time
            const t = Math.min(0.62, score * 0.016 + elapsedRef.current * 0.002);
            const roll = Math.random();
            const hp: 1 | 2 | 3 = roll < 0.55 - t * 0.25 ? 1 : roll < 0.85 ? 2 : 3;

            const baseH = 14;
            const layer = 10;
            const h = baseH + (hp - 1) * layer;
            const w = 16;

            const stroke = FLUO[Math.floor(Math.random() * FLUO.length)];
            obstaclesRef.current.push({ x: startX, w, h, hp, stroke });
        };

        for (let i = 0; i < 6; i++) spawnObstacle();

        const drawBg = (ctx2: CanvasRenderingContext2D, dt: number) => {
            ctx2.fillStyle = "#000";
            ctx2.fillRect(0, 0, vw, vh);

            // grid
            ctx2.globalAlpha = 0.16;
            ctx2.strokeStyle = "rgba(57,255,20,0.12)";
            for (let x = 0; x <= vw; x += 16) {
                ctx2.beginPath();
                ctx2.moveTo(x, 0);
                ctx2.lineTo(x, vh);
                ctx2.stroke();
            }
            ctx2.strokeStyle = "rgba(0,229,255,0.08)";
            for (let y = 0; y <= vh; y += 16) {
                ctx2.beginPath();
                ctx2.moveTo(0, y);
                ctx2.lineTo(vw, y);
                ctx2.stroke();
            }
            ctx2.globalAlpha = 1;

            // streaks
            const streaks = streaksRef.current;
            for (const s of streaks) {
                s.y += s.spd * dt;
                if (s.y - s.len > vh) {
                    s.y = -rand(10, 60);
                    s.len = 18 + Math.random() * 70;
                    s.spd = 18 + Math.random() * 70;
                    s.a = 0.08 + Math.random() * 0.22;
                    s.x = (Math.random() * vw) | 0;
                }
                ctx2.globalAlpha = s.a;
                ctx2.fillStyle = "rgba(57,255,20,1)";
                for (let k = 0; k < s.len; k += 6) ctx2.fillRect(s.x, Math.floor(s.y - k), 2, 4);
            }
            ctx2.globalAlpha = 1;

            // scanlines
            ctx2.globalAlpha = 0.08;
            ctx2.fillStyle = "rgba(0,229,255,1)";
            for (let y = 0; y < vh; y += 2) ctx2.fillRect(0, y, vw, 1);
            ctx2.globalAlpha = 1;

            // ground line
            ctx2.strokeStyle = "rgba(0,255,154,0.35)";
            ctx2.lineWidth = 1;
            ctx2.beginPath();
            ctx2.moveTo(0, groundY + 1);
            ctx2.lineTo(vw, groundY + 1);
            ctx2.stroke();
        };

        const drawObstacle = (ctx2: CanvasRenderingContext2D, o: Obstacle) => {
            const x = Math.floor(o.x);
            const y = Math.floor(groundY - o.h);

            ctx2.fillStyle = "#000";
            ctx2.fillRect(x, y, o.w, o.h);

            ctx2.strokeStyle = o.stroke;
            ctx2.lineWidth = 2;
            ctx2.strokeRect(x + 1, y + 1, o.w - 2, o.h - 2);

            // layers
            ctx2.globalAlpha = 0.6;
            ctx2.fillStyle = o.stroke;
            for (let i = 1; i < o.hp; i++) {
                const ly = y + i * 10;
                ctx2.fillRect(x + 2, ly, o.w - 4, 1);
            }
            ctx2.globalAlpha = 1;

            ctx2.globalAlpha = 0.75;
            ctx2.fillStyle = o.stroke;
            ctx2.fillRect(x + 3, y + 3, 2, 2);
            ctx2.fillRect(x + o.w - 5, y + o.h - 5, 2, 2);
            ctx2.globalAlpha = 1;
        };

        const collide = (rx: number, ry: number, rw: number, rh: number, o: Obstacle) => {
            const ox = o.x;
            const oy = groundY - o.h;
            return rx < ox + o.w && rx + rw > ox && ry < oy + o.h && ry + rh > oy;
        };

        const waveHitsObstacle = (w: Wave, o: Obstacle) => {
            // approssimazione veloce:
            // se l'arco (semicerchio) arriva “in prossimità” del box dell'ostacolo
            const ox = o.x;
            const oy = groundY - o.h;
            const ow = o.w;
            const oh = o.h;

            // punto più vicino del rettangolo al centro del cerchio
            const closestX = clamp(w.cx, ox, ox + ow);
            const closestY = clamp(w.cy, oy, oy + oh);

            const dx = closestX - w.cx;
            const dy = closestY - w.cy;
            const dist2 = dx * dx + dy * dy;

            // semicerchio: consideriamo solo punti "davanti" (x >= cx)
            const inFront = closestX >= w.cx - 2;
            return inFront && dist2 <= w.radius * w.radius;
        };

        const applyWaveDamage = (lvl: 1 | 2 | 3, o: Obstacle) => {
            o.hp = Math.max(0, o.hp - lvl) as any;
        };

        const drawWave = (ctx2: CanvasRenderingContext2D, w: Wave) => {
            // disegno semicerchio (solo bordo + glow)
            ctx2.globalAlpha = 0.9;
            ctx2.strokeStyle = w.color;
            ctx2.lineWidth = 2;

            ctx2.beginPath();
            // semicerchio verso destra: da -90 a +90 gradi
            ctx2.arc(w.cx, w.cy, w.radius, -Math.PI / 2, Math.PI / 2);
            ctx2.stroke();

            // glow doppio
            ctx2.globalAlpha = 0.35;
            ctx2.strokeStyle = w.color;
            ctx2.lineWidth = 5;
            ctx2.beginPath();
            ctx2.arc(w.cx, w.cy, w.radius + 2, -Math.PI / 2, Math.PI / 2);
            ctx2.stroke();

            ctx2.globalAlpha = 1;
        };

        const drawHUD = (ctx2: CanvasRenderingContext2D) => {
            // score
            ctx2.fillStyle = "rgba(0,0,0,0.45)";
            ctx2.fillRect(8, 8, 150, 22);
            ctx2.strokeStyle = "rgba(0,229,255,0.35)";
            ctx2.lineWidth = 2;
            ctx2.strokeRect(9, 9, 148, 20);

            ctx2.fillStyle = "rgba(231,238,247,0.95)";
            ctx2.font =
                "bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
            ctx2.textAlign = "left";
            ctx2.textBaseline = "middle";
            ctx2.fillText(`SCORE ${scoreRef.current}`, 16, 19);

            // charge
            const x = 8;
            const y = 34;
            const w = 180;
            const h = 22;

            ctx2.fillStyle = "rgba(0,0,0,0.45)";
            ctx2.fillRect(x, y, w, h);
            ctx2.strokeStyle = "rgba(0,229,255,0.30)";
            ctx2.lineWidth = 2;
            ctx2.strokeRect(x + 1, y + 1, w - 2, h - 2);

            // segmenti
            const segGap = 3;
            const segW = Math.floor((w - 10 - segGap * 2) / 3);
            const sx = x + 5;
            const sy = y + 5;
            const sh = h - 10;

            const lvl = chargeLevel(chargeRef.current);

            for (let i = 0; i < 3; i++) {
                const filled = i < lvl;
                const segX = sx + i * (segW + segGap);

                // colore “in base al livello raggiunto”
                let col = "rgba(255,255,255,0.08)";
                if (filled) col = i === 0 ? "rgba(0,229,255,0.75)" : i === 1 ? "rgba(57,255,20,0.75)" : "rgba(180,0,255,0.75)";

                ctx2.fillStyle = col;
                ctx2.fillRect(segX, sy, segW, sh);

                ctx2.strokeStyle = "rgba(57,255,20,0.20)";
                ctx2.lineWidth = 1;
                ctx2.strokeRect(segX, sy, segW, sh);
            }

            // testo istruzioni sotto barra (come richiesto)
            ctx2.fillStyle = "rgba(231,238,247,0.75)";
            ctx2.font =
                "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
            ctx2.textAlign = "left";
            ctx2.textBaseline = "top";
            const msg = lvl === 0 ? "HOLD SPACE TO CHARGE" : "PRESS SPACE TO RELEASE";
            ctx2.fillText(msg, x + 6, y + h + 6);

            if (!aliveRef.current) {
                ctx2.fillStyle = "rgba(0,0,0,0.55)";
                ctx2.fillRect(0, 0, vw, vh);

                ctx2.fillStyle = "rgba(231,238,247,0.95)";
                ctx2.textAlign = "center";
                ctx2.font =
                    "bold 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
                ctx2.fillText("GAME OVER", vw / 2, 86);
                ctx2.font =
                    "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
                ctx2.fillText("click / enter per restart", vw / 2, 106);
            }
        };

        // pointer hold/release
        const onPointerDown = (e: PointerEvent) => {
            e.preventDefault();
            if (!aliveRef.current) {
                startGame();
                return;
            }
            beginCharge();
        };
        const onPointerUp = (e: PointerEvent) => {
            e.preventDefault();
            if (aliveRef.current) releaseWave();
        };
        const onPointerLeave = () => {
            if (chargingRef.current) cancelCharge();
        };

        canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        window.addEventListener("pointerup", onPointerUp, { passive: false });
        canvas.addEventListener("pointerleave", onPointerLeave);

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - t0) / 1000);
            t0 = now;

            frameRef.current++;
            elapsedRef.current += dt;

            // CHARGE: lenta, mantenuta finché tieni
            if (aliveRef.current && chargingRef.current) {
                chargeRef.current = Math.min(1, chargeRef.current + dt * 0.40);
                // UI update “a scatti” per non setState ogni frame
                if (Math.abs(chargeUI - chargeRef.current) > 0.02) setChargeUI(chargeRef.current);
            }

            // velocità aumenta col tempo + punteggio
            const speed =
                88 +
                Math.min(85, scoreRef.current * 2.0) +
                Math.min(55, elapsedRef.current * 1.6);

            // spawn
            const obs = obstaclesRef.current;
            const rightMost = obs.reduce((m, o) => Math.max(m, o.x), 0);
            if (rightMost < vw + 260) spawnObstacle();

            // move obstacles
            if (aliveRef.current) for (const o of obs) o.x -= speed * dt;
            while (obs.length && obs[0].x + obs[0].w < -40) obs.shift();

            // update wave
            const wv = waveRef.current;
            if (wv.active) {
                wv.ttl -= dt;
                wv.cx += wv.speed * dt; // va avanti più veloce del mondo
                wv.radius += wv.growth * dt;

                // colpisce e “spazza”
                for (const o of obs) {
                    if (o.hp > 0 && waveHitsObstacle(wv, o)) {
                        applyWaveDamage(wv.level, o);
                    }
                }

                // rimuovi distrutti + score
                let destroyed = 0;
                obstaclesRef.current = obstaclesRef.current.filter((o) => {
                    if (o.hp <= 0) {
                        destroyed++;
                        return false;
                    }
                    return true;
                });
                if (destroyed > 0) {
                    scoreRef.current += destroyed;
                    setScoreUI(scoreRef.current);
                }

                if (wv.ttl <= 0 || wv.cx - wv.radius > vw + 20) {
                    wv.active = false;
                }
            }

            // draw
            drawBg(ctx, dt);

            // runner fixed on ground
            const s = 3;
            const rw = 12 * s;
            const rh = 12 * s;
            const ry = Math.floor(groundY - rh);
            drawRunnerSprite(ctx, runnerX, ry, s, selected, frameRef.current);

            // obstacles + collision with runner
            for (const o of obstaclesRef.current) {
                drawObstacle(ctx, o);
                if (aliveRef.current && collide(runnerX, ry, rw, rh, o)) {
                    aliveRef.current = false;
                    setAliveUI(false);
                    chargingRef.current = false;
                }
            }

            // wave draw on top
            if (wv.active) drawWave(ctx, wv);

            // runner rim
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = "rgba(0,255,154,0.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(runnerX - 1, ry - 1, rw + 2, rh + 2);
            ctx.globalAlpha = 1;

            // HUD
            drawHUD(ctx);

            // score/charge UI sync (non continuo)
            if (scoreUI !== scoreRef.current) setScoreUI(scoreRef.current);
            if (Math.abs(chargeUI - chargeRef.current) > 0.08) setChargeUI(chargeRef.current);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            canvas.removeEventListener("pointerdown", onPointerDown as any);
            window.removeEventListener("pointerup", onPointerUp as any);
            canvas.removeEventListener("pointerleave", onPointerLeave as any);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, selected, chargeUI, scoreUI]);

    useEffect(() => {
        if (phase === "run") startGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    return (
        <div style={styles.wrap}>
            <div style={styles.headerRow}>
                <div style={styles.title}>
                    {phase === "pick" ? "Scegli un fantasmino" : aliveUI ? "WAVE KATANA" : "GAME OVER"}
                </div>

                {phase === "run" && (
                    <button
                        type="button"
                        style={styles.backBtn}
                        onClick={() => setPhase("pick")}
                        aria-label="Torna alla selezione"
                    >
                        ↩
                    </button>
                )}
            </div>

            {phase === "pick" ? (
                <div style={styles.pickBox}>
                    <canvas ref={pickCanvasRef} style={styles.pickCanvas} />
                    <div style={styles.hint}>Hover per evidenziare, click per selezionare.</div>
                </div>
            ) : (
                <div style={styles.runBox}>
                    <div style={styles.screen}>
                        <canvas ref={runCanvasRef} style={styles.runCanvas} />
                    </div>
                    <div style={styles.smallHint}>
            <span style={{ opacity: 0.85 }}>
              Punti: <b style={{ opacity: 1 }}>{scoreUI}</b>
            </span>
                        <span style={{ opacity: 0.65 }}>
              {" "}—{" "}
                            {aliveUI ? "Hold Space / hold click to charge, release to fire" : "Click o Enter per ricominciare"}
            </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------- utils ----------
function rand(a: number, b: number) {
    return Math.floor(a + Math.random() * (b - a + 1));
}

function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
}

// ---------- styles ----------
const styles: Record<string, React.CSSProperties> = {
    wrap: { display: "grid", gap: 10 },
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
};