"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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

            const isFoot = r === 10 && (c === 2 || c === 9);
            let yy = y + r * s;
            if (isFoot) yy += frame % 2 === 0 ? 0 : s;

            ctx.fillStyle = color;
            ctx.fillRect(x + c * s, yy, s, s);
        }
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(x + 4 * s, y + 5 * s, 2 * s, 2 * s);
    ctx.fillRect(x + 7 * s, y + 5 * s, 2 * s, 2 * s);
}

type Phase = "pick" | "run";

type Obstacle = {
    x: number;
    w: number;
    h: number;
    hp: number;
    stroke: string;
};

type Wave = {
    active: boolean;
    power: 1 | 2 | 3;
    color: string;
    cx: number;
    cy: number;
    radius: number;
    speed: number;
    growth: number;
    ttl: number;
};

const FLUO = ["#39ff14", "#00e5ff", "#b400ff", "#00ff9a"];

type LbRow = { sessionId: string; score: number; name: string; ghost: GhostId };
type LeaderboardPayload = {
    ok: true;
    top: LbRow[];
    me: { sessionId: string; bestScore: number | null; name: string | null; ghost: GhostId | null };
};

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

    // ENERGY 0..5
    const energyRef = useRef(0);
    const [energyUI, setEnergyUI] = useState(0);

    // HOLD meter 0..1 (solo mentre tieni premuto)
    const holdingRef = useRef(false);
    const holdTRef = useRef(0);
    const [holdUI, setHoldUI] = useState(0);

    // cooldown
    const COOLDOWN_S = 0.65;
    const cooldownRef = useRef(0);
    const [cooldownUI, setCooldownUI] = useState(0);

    const waveRef = useRef<Wave>({
        active: false,
        power: 1,
        color: "#00e5ff",
        cx: 0,
        cy: 0,
        radius: 0,
        speed: 0,
        growth: 0,
        ttl: 0,
    });

    const obstaclesRef = useRef<Obstacle[]>([]);
    const frameRef = useRef(0);
    const elapsedRef = useRef(0);

    const blinkRef = useRef(0); // per testo lampeggiante

    const streaksRef = useRef(
        Array.from({ length: 26 }).map((_, i) => ({
            x: (i * 17) % 320,
            y: Math.random() * 180,
            len: 18 + Math.random() * 60,
            spd: 14 + Math.random() * 45,
            a: 0.07 + Math.random() * 0.18,
        }))
    );

    // ===== Leaderboard state =====
    const [lbOpen, setLbOpen] = useState(false);
    const [lbLoading, setLbLoading] = useState(false);
    const [lb, setLb] = useState<LbRow[]>([]);
    const [mySessionId, setMySessionId] = useState<string | null>(null);
    const [qualify, setQualify] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [submitBusy, setSubmitBusy] = useState(false);
    const TOP_N = 15;

    const ghostById = useMemo(() => {
        const m = new Map<GhostId, GhostDef>();
        for (const g of GHOSTS) m.set(g.id, g);
        return m;
    }, []);

    const lbRows: Array<LbRow | null> = useMemo(
        () => (lb.length ? lb : Array.from({ length: TOP_N }, () => null)),
        [lb, TOP_N]
    );

    const fetchLeaderboard = async () => {
        setLbLoading(true);
        try {
            const res = await fetch("/api/leaderboard", { method: "GET" });
            const data = (await res.json()) as LeaderboardPayload;
            if (data?.ok) {
                setLb(Array.isArray(data.top) ? data.top : []);
                setMySessionId(data.me?.sessionId ?? null);
                if (data.me?.name && !nameInput) setNameInput(data.me.name);
            }
        } catch {}
        setLbLoading(false);
    };

    const checkQualification = (top: LbRow[], finalScore: number, sid: string | null) => {
        if (finalScore <= 0) return false;

        // se già in top con lo stesso sid -> ok (aggiorni nome/avatar)
        if (sid && top.some((r) => r.sessionId === sid)) return true;

        const last = top[top.length - 1]?.score ?? -1;
        return top.length < TOP_N || finalScore > last;
    };

    const submitScore = async () => {
        const nm = nameInput.trim();
        if (nm.length < 2) return;
        if (submitBusy) return;

        setSubmitBusy(true);
        try {
            await fetch("/api/score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    score: scoreRef.current,
                    name: nm,
                    ghost: selected.id,
                }),
            });

            await fetchLeaderboard();
            setQualify(false);
        } catch {}
        setSubmitBusy(false);
    };

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
                ctx2.beginPath();
                ctx2.moveTo(i, 0);
                ctx2.lineTo(i, sizeCss);
                ctx2.stroke();
                ctx2.beginPath();
                ctx2.moveTo(0, i);
                ctx2.lineTo(sizeCss, i);
                ctx2.stroke();
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

    // ---------- HELPERS ----------
    const startGame = () => {
        scoreRef.current = 0;
        setScoreUI(0);

        aliveRef.current = true;
        setAliveUI(true);

        energyRef.current = 0;
        setEnergyUI(0);

        holdingRef.current = false;
        holdTRef.current = 0;
        setHoldUI(0);

        cooldownRef.current = 0;
        setCooldownUI(0);

        waveRef.current.active = false;

        obstaclesRef.current = [];
        frameRef.current = 0;
        elapsedRef.current = 0;
        blinkRef.current = 0;

        // leaderboard overlay reset
        setLbOpen(false);
        setLb([]);
        setQualify(false);
        setNameInput("");

        streaksRef.current = Array.from({ length: 26 }).map((_, i) => ({
            x: (i * 17) % 320,
            y: Math.random() * 180,
            len: 18 + Math.random() * 60,
            spd: 14 + Math.random() * 45,
            a: 0.07 + Math.random() * 0.18,
        }));
    };

    const powerFromEnergy = (e: number): 1 | 2 | 3 => {
        if (e >= 5) return 3;
        if (e >= 3) return 2;
        return 1;
    };

    const beginHoldCharge = () => {
        if (!aliveRef.current) return;
        if (cooldownRef.current > 0) return;
        if (energyRef.current >= 5) return;
        holdingRef.current = true;
    };

    // mappa holdT (0..1) a gained (0..5)
    const gainedFromHold = (t: number) => {
        if (t >= 0.92) return 5;
        if (t >= 0.78) return 4;
        if (t >= 0.62) return 3;
        if (t >= 0.40) return 2;
        if (t >= 0.20) return 1;
        return 0;
    };

    const bankCharge = () => {
        if (!aliveRef.current) return;
        if (!holdingRef.current) return;

        holdingRef.current = false;

        const t = holdTRef.current;
        const gained = gainedFromHold(t);

        if (gained > 0) {
            energyRef.current = clampInt(energyRef.current + gained, 0, 5);
            setEnergyUI(energyRef.current);
        }

        holdTRef.current = 0;
        setHoldUI(0);
    };

    const fireIfCharged = () => {
        if (!aliveRef.current) return;
        if (cooldownRef.current > 0) return;
        if (energyRef.current <= 0) return;

        const power = powerFromEnergy(energyRef.current);
        const color = power === 1 ? "#00e5ff" : power === 2 ? "#39ff14" : "#b400ff";

        const speed = power === 1 ? 270 : power === 2 ? 340 : 430;
        const growth = power === 1 ? 200 : power === 2 ? 285 : 380;
        const ttl = power === 1 ? 0.32 : power === 2 ? 0.38 : 0.46;

        const groundY = 180 - 26;
        const runnerX = 56;
        const s = 3;
        const rw = 12 * s;

        waveRef.current = {
            active: true,
            power,
            color,
            cx: runnerX + rw + 8,
            cy: groundY - 10,
            radius: power === 1 ? 12 : power === 2 ? 16 : 20,
            speed,
            growth,
            ttl,
        };

        energyRef.current = 0;
        setEnergyUI(0);

        cooldownRef.current = COOLDOWN_S;
        setCooldownUI(COOLDOWN_S);
    };

    const goToPickOnGameOverAction = () => {
        setPhase("pick");
    };

    // ---------- INPUT: SPACE / ENTER ----------
    useEffect(() => {
        if (phase !== "run") return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== "Space" && e.code !== "Enter") return;

            if (!aliveRef.current && lbOpen) {
                if (e.code === "Enter" && qualify && nameInput.trim().length >= 2) {
                    e.preventDefault();
                    submitScore();
                    return;
                }
                if (e.code === "Space" || e.code === "Enter") {
                    e.preventDefault();
                    return;
                }
            }

            if (!aliveRef.current && (e.code === "Enter" || e.code === "Space")) {
                e.preventDefault();
                setLbOpen(true);
                return;
            }

            if (e.code === "Space") {
                e.preventDefault();
                if (energyRef.current > 0) fireIfCharged();
                else beginHoldCharge();
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                bankCharge();
            }
        };

        window.addEventListener("keydown", onKeyDown, { passive: false });
        window.addEventListener("keyup", onKeyUp, { passive: false });

        return () => {
            window.removeEventListener("keydown", onKeyDown as any);
            window.removeEventListener("keyup", onKeyUp as any);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, lbOpen, qualify, nameInput, submitBusy]);

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

        const maxHpAtTime = (t: number) => {
            if (t < 14) return 1;
            if (t < 30) return 2;
            if (t < 50) return 3;
            if (t < 75) return 4;
            return 5;
        };

        const spawnObstacle = () => {
            const t = elapsedRef.current;
            const score = scoreRef.current;

            const early = t < 14;
            const gap = early ? rand(170, 260) : Math.random() < 0.25 ? rand(70, 95) : rand(95, 170);

            const last = obstaclesRef.current[obstaclesRef.current.length - 1];
            const startX = last ? last.x + last.w + gap : vw + 200;

            const hpMax = maxHpAtTime(t);
            let hp = 1;

            if (hpMax >= 2 && Math.random() < (t < 22 ? 0.10 : 0.24)) hp = 2;
            if (hpMax >= 3 && Math.random() < (t < 38 ? 0.06 : 0.18)) hp = 3;
            if (hpMax >= 4 && Math.random() < (t < 58 ? 0.04 : 0.14)) hp = 4;
            if (hpMax >= 5 && Math.random() < (t < 80 ? 0.03 : 0.10)) hp = 5;

            if (hpMax >= 3 && score > 22 && Math.random() < 0.10) hp = Math.min(hpMax, hp + 1);

            const baseH = 14;
            const layer = 9;
            const h = baseH + (hp - 1) * layer;
            const w = hp >= 4 ? 18 : 16;

            const stroke = FLUO[Math.floor(Math.random() * FLUO.length)];
            obstaclesRef.current.push({ x: startX, w, h, hp, stroke });
        };

        for (let i = 0; i < 4; i++) spawnObstacle();

        const drawBg = (ctx2: CanvasRenderingContext2D, dt: number) => {
            ctx2.fillStyle = "#000";
            ctx2.fillRect(0, 0, vw, vh);

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

            const streaks = streaksRef.current;
            for (const s of streaks) {
                s.y += s.spd * dt;
                if (s.y - s.len > vh) {
                    s.y = -rand(10, 60);
                    s.len = 18 + Math.random() * 70;
                    s.spd = 14 + Math.random() * 55;
                    s.a = 0.07 + Math.random() * 0.22;
                    s.x = (Math.random() * vw) | 0;
                }
                ctx2.globalAlpha = s.a;
                ctx2.fillStyle = "rgba(57,255,20,1)";
                for (let k = 0; k < s.len; k += 6) ctx2.fillRect(s.x, Math.floor(s.y - k), 2, 4);
            }
            ctx2.globalAlpha = 1;

            ctx2.globalAlpha = 0.08;
            ctx2.fillStyle = "rgba(0,229,255,1)";
            for (let y = 0; y < vh; y += 2) ctx2.fillRect(0, y, vw, 1);
            ctx2.globalAlpha = 1;

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

            ctx2.globalAlpha = 0.55;
            ctx2.fillStyle = o.stroke;
            const layers = Math.min(5, o.hp);
            for (let i = 1; i < layers; i++) {
                const ly = y + i * 9;
                ctx2.fillRect(x + 2, ly, o.w - 4, 1);
            }
            ctx2.globalAlpha = 1;
        };

        const collide = (rx: number, ry: number, rw: number, rh: number, o: Obstacle) => {
            const ox = o.x;
            const oy = groundY - o.h;
            return rx < ox + o.w && rx + rw > ox && ry < oy + o.h && ry + rh > oy;
        };

        const waveHitsObstacle = (w: Wave, o: Obstacle) => {
            const ox = o.x;
            const oy = groundY - o.h;
            const ow = o.w;
            const oh = o.h;

            const closestX = clamp(w.cx, ox, ox + ow);
            const closestY = clamp(w.cy, oy, oy + oh);

            const dx = closestX - w.cx;
            const dy = closestY - w.cy;
            const dist2 = dx * dx + dy * dy;

            const inFront = closestX >= w.cx - 2;
            return inFront && dist2 <= w.radius * w.radius;
        };

        const drawWave = (ctx2: CanvasRenderingContext2D, w: Wave) => {
            ctx2.globalAlpha = 0.9;
            ctx2.strokeStyle = w.color;
            ctx2.lineWidth = 2;
            ctx2.beginPath();
            ctx2.arc(w.cx, w.cy, w.radius, -Math.PI / 2, Math.PI / 2);
            ctx2.stroke();

            ctx2.globalAlpha = 0.35;
            ctx2.strokeStyle = w.color;
            ctx2.lineWidth = 5;
            ctx2.beginPath();
            ctx2.arc(w.cx, w.cy, w.radius + 2, -Math.PI / 2, Math.PI / 2);
            ctx2.stroke();
            ctx2.globalAlpha = 1;
        };

        const drawHUD = (ctx2: CanvasRenderingContext2D) => {
            // score box
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

            // energy bar (5 segments) + live hold preview
            const bx = 8;
            const by = 34;
            const bw = 210;
            const bh = 22;

            ctx2.fillStyle = "rgba(0,0,0,0.45)";
            ctx2.fillRect(bx, by, bw, bh);
            ctx2.strokeStyle = "rgba(0,229,255,0.30)";
            ctx2.lineWidth = 2;
            ctx2.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

            const segGap = 3;
            const segW = Math.floor((bw - 10 - segGap * 4) / 5);
            const sx = bx + 5;
            const sy = by + 5;
            const sh = bh - 10;

            const e = energyRef.current;
            const preview = holdingRef.current ? holdTRef.current : 0;

            const previewGain = gainedFromHold(preview);
            const previewFillTo = clampInt(e + previewGain, 0, 5);

            for (let i = 0; i < 5; i++) {
                const segX = sx + i * (segW + segGap);

                const filled = i < e;
                const prefilled = !filled && holdingRef.current && i < previewFillTo;

                let col = "rgba(255,255,255,0.08)";
                if (filled) {
                    if (i <= 1) col = "rgba(0,229,255,0.75)";
                    else if (i <= 3) col = "rgba(57,255,20,0.75)";
                    else col = "rgba(180,0,255,0.75)";
                } else if (prefilled) {
                    col = "rgba(231,238,247,0.22)";
                }

                ctx2.fillStyle = col;
                ctx2.fillRect(segX, sy, segW, sh);

                ctx2.strokeStyle = "rgba(57,255,20,0.18)";
                ctx2.lineWidth = 1;
                ctx2.strokeRect(segX, sy, segW, sh);

                if (holdingRef.current && i === e) {
                    ctx2.globalAlpha = 0.35;
                    ctx2.fillStyle = "rgba(231,238,247,0.45)";
                    ctx2.fillRect(segX, sy, Math.floor(segW * preview), sh);
                    ctx2.globalAlpha = 1;
                }
            }

            // cooldown overlay
            if (cooldownRef.current > 0) {
                const t = clamp01(cooldownRef.current / COOLDOWN_S);
                ctx2.globalAlpha = 0.22;
                ctx2.fillStyle = "rgba(231,238,247,1)";
                ctx2.fillRect(bx + 2, by + 2, Math.floor((bw - 4) * t), bh - 4);
                ctx2.globalAlpha = 1;
            }

            // instruction line
            ctx2.fillStyle = "rgba(231,238,247,0.75)";
            ctx2.font =
                "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
            ctx2.textAlign = "left";
            ctx2.textBaseline = "top";

            let msg = "";
            if (!aliveRef.current) msg = "SPACE/CLICK: LEADERBOARD";
            else if (cooldownRef.current > 0) msg = "COOLDOWN...";
            else if (energyRef.current === 0) msg = "HOLD SPACE TO CHARGE";
            else msg = "PRESS SPACE TO RELEASE";

            ctx2.fillText(msg, bx + 6, by + bh + 6);

            // game over overlay
            if (!aliveRef.current) {
                blinkRef.current += 1;

                ctx2.fillStyle = "rgba(0,0,0,0.55)";
                ctx2.fillRect(0, 0, vw, vh);

                ctx2.fillStyle = "rgba(231,238,247,0.95)";
                ctx2.textAlign = "center";
                ctx2.font =
                    "bold 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
                ctx2.fillText("GAME OVER", vw / 2, 66);

                ctx2.font =
                    "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
                ctx2.fillText(`PUNTEGGIO: ${scoreRef.current}`, vw / 2, 86);

                const on = Math.floor(blinkRef.current / 22) % 2 === 0;
                if (on) {
                    ctx2.fillStyle = "rgba(57,255,20,0.95)";
                    ctx2.fillText("PREMI SPAZIO/CLICK PER TOP 15", vw / 2, 108);
                }
            }
        };

        const onPointerDown = (e: PointerEvent) => {
            e.preventDefault();

            if (!aliveRef.current) {
                setLbOpen(true);
                return;
            }

            if (energyRef.current > 0) fireIfCharged();
            else beginHoldCharge();
        };

        const onPointerUp = (e: PointerEvent) => {
            e.preventDefault();
            bankCharge();
        };

        const onPointerLeave = () => {
            if (holdingRef.current) {
                holdingRef.current = false;
                holdTRef.current = 0;
                setHoldUI(0);
            }
        };

        canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        window.addEventListener("pointerup", onPointerUp, { passive: false });
        canvas.addEventListener("pointerleave", onPointerLeave);

        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - t0) / 1000);
            t0 = now;

            frameRef.current++;
            elapsedRef.current += dt;

            // cooldown
            if (cooldownRef.current > 0) {
                cooldownRef.current = Math.max(0, cooldownRef.current - dt);
                if (Math.abs(cooldownUI - cooldownRef.current) > 0.05) setCooldownUI(cooldownRef.current);
            }

            // hold meter: veloce all'inizio, poi sempre più lenta (decelerazione)
            if (aliveRef.current && holdingRef.current && cooldownRef.current <= 0 && energyRef.current < 5) {
                const t = elapsedRef.current;
                const base = t < 14 ? 2.6 : 2.2;
                const curve = 2.2;
                const remaining = 1 - holdTRef.current;
                holdTRef.current = Math.min(1, holdTRef.current + dt * base * Math.pow(remaining, curve));

                if (Math.abs(holdUI - holdTRef.current) > 0.015) setHoldUI(holdTRef.current);
            }

            // speed: molto lento early
            const t = elapsedRef.current;
            const base = t < 14 ? 46 : 70;
            const speed = base + Math.min(60, t * 1.05) + Math.min(55, scoreRef.current * 1.55);

            // spawn
            const obs = obstaclesRef.current;
            const rightMost = obs.reduce((m, o) => Math.max(m, o.x), 0);
            const targetAhead = t < 14 ? vw + 540 : vw + 290;
            if (rightMost < targetAhead) spawnObstacle();

            // move obstacles
            if (aliveRef.current) for (const o of obs) o.x -= speed * dt;
            while (obs.length && obs[0].x + obs[0].w < -50) obs.shift();

            // update wave
            const wv = waveRef.current;
            if (wv.active) {
                wv.ttl -= dt;
                wv.cx += wv.speed * dt;
                wv.radius += wv.growth * dt;

                let touched: Obstacle[] = [];
                for (const o of obstaclesRef.current) if (waveHitsObstacle(wv, o)) touched.push(o);

                if (touched.length > 0) {
                    touched.sort((a, b) => a.x - b.x);
                    let budget = wv.power;

                    for (const o of touched) {
                        if (budget <= 0) break;
                        const spend = Math.min(budget, o.hp);
                        o.hp -= spend;
                        budget -= spend;
                        if (o.hp <= 0) scoreRef.current += 1;
                    }

                    obstaclesRef.current = obstaclesRef.current.filter((o) => o.hp > 0);
                    setScoreUI(scoreRef.current);
                }

                if (wv.ttl <= 0 || wv.cx - wv.radius > vw + 20) wv.active = false;
            }

            // draw
            drawBg(ctx, dt);

            const s = 3;
            const rw = 12 * s;
            const rh = 12 * s;
            const ry = Math.floor(groundY - rh);

            for (const o of obstaclesRef.current) {
                drawObstacle(ctx, o);
                if (aliveRef.current && collide(runnerX, ry, rw, rh, o)) {
                    aliveRef.current = false;
                    setAliveUI(false);
                    holdingRef.current = false;
                    holdTRef.current = 0;
                    setHoldUI(0);
                }
            }

            drawRunnerSprite(ctx, runnerX, ry, s, selected, frameRef.current);
            if (wv.active) drawWave(ctx, wv);

            // rim
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = "rgba(0,255,154,0.35)";
            ctx.lineWidth = 1;
            ctx.strokeRect(runnerX - 1, ry - 1, rw + 2, rh + 2);
            ctx.globalAlpha = 1;

            drawHUD(ctx);

            if (energyUI !== energyRef.current) setEnergyUI(energyRef.current);

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
    }, [phase, holdUI, cooldownUI, lbOpen, qualify, nameInput, submitBusy, selected]);

    useEffect(() => {
        if (phase === "run") startGame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // Quando muori e apri overlay, carica leaderboard e verifica qualifica
    useEffect(() => {
        if (!lbOpen) return;
        (async () => {
            await fetchLeaderboard();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lbOpen]);

    useEffect(() => {
        if (!lbOpen) return;
        setQualify(checkQualification(lb, scoreRef.current, mySessionId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lb, lbOpen, mySessionId]);

    const renderAvatar = (ghostId: GhostId) => {
        const g = ghostById.get(ghostId) || GHOSTS[0];
        return (
            <span
                aria-hidden
                style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: g.c1,
                    boxShadow: `0 0 0 1px rgba(0,0,0,0.55), 0 0 0 2px ${g.c2} inset`,
                    position: "relative",
                }}
            >
        {/* mini “pixel face” super schematica */}
                <span
                    style={{
                        position: "absolute",
                        left: 3,
                        top: 5,
                        width: 2,
                        height: 2,
                        background: "rgba(0,0,0,0.85)",
                        boxShadow: "6px 0 rgba(0,0,0,0.85)",
                    }}
                />
      </span>
        );
    };

    return (
        <div style={styles.wrap}>
            <div style={styles.headerRow}>
                <div style={styles.title}>{phase === "pick" ? "Scegli un fantasmino" : aliveUI ? "WAVE BATTERY" : "GAME OVER"}</div>

                {phase === "run" && (
                    <button type="button" style={styles.backBtn} onClick={() => setPhase("pick")} aria-label="Torna alla selezione">
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
                        <div style={{ position: "relative" }}>
                            <canvas ref={runCanvasRef} style={styles.runCanvas} />

                            {lbOpen && !aliveUI && (
                                <div style={styles.lbOverlay}>
                                    <div style={styles.lbPanel}>
                                        <div style={styles.lbTitleRow}>
                                            <div style={styles.lbTitle}>TOP {TOP_N} — LEADERBOARD</div>
                                            <button
                                                type="button"
                                                style={styles.lbClose}
                                                onClick={() => {
                                                    setLbOpen(false);
                                                    goToPickOnGameOverAction();
                                                }}
                                                aria-label="Chiudi e torna alla selezione"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div style={styles.lbSub}>
                      <span style={{ opacity: 0.9 }}>
                        Il tuo score: <b style={{ opacity: 1 }}>{scoreRef.current}</b> <span style={{ opacity: 0.8 }}>({selected.label})</span>
                      </span>
                                            <span style={{ opacity: 0.6 }}> — </span>
                                            <span style={{ opacity: 0.75 }}>{lbLoading ? "Caricamento..." : "Aggiornato"}</span>
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
                                                        <div
                                                            key={row ? row.sessionId : `empty-${i}`}
                                                            style={{
                                                                ...styles.lbRow,
                                                                ...(isMine ? styles.lbRowMine : null),
                                                            }}
                                                        >
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
                                                <div style={{ opacity: 0.9 }}>
                                                    Sei dentro i <b>TOP {TOP_N}</b> (o la lista non è piena). Inserisci il nome:
                                                </div>

                                                <div style={styles.lbFormRow}>
                                                    <div style={styles.lbAvatarBig}>
                                                        {renderAvatar(selected.id)} <span style={{ opacity: 0.8 }}>{selected.label}</span>
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
                                                        onClick={submitScore}
                                                    >
                                                        {submitBusy ? "SALVO..." : "SALVA"}
                                                    </button>
                                                </div>

                                                <div style={{ fontSize: 11, opacity: 0.6 }}>
                                                    Tip: premi <b>Enter</b> per salvare.
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 12, opacity: 0.65 }}>Non sei nei TOP {TOP_N}. Riprova 💾⚡</div>
                                        )}

                                        <div style={styles.lbFooter}>
                                            <button type="button" style={styles.lbBtnSecondary} onClick={fetchLeaderboard}>
                                                ↻ Refresh
                                            </button>
                                            <button
                                                type="button"
                                                style={styles.lbBtnSecondary}
                                                onClick={() => {
                                                    setLbOpen(false);
                                                    startGame();
                                                }}
                                            >
                                                ▶ Rigioca
                                            </button>
                                            <button
                                                type="button"
                                                style={styles.lbBtnSecondary}
                                                onClick={() => {
                                                    setLbOpen(false);
                                                    goToPickOnGameOverAction();
                                                }}
                                            >
                                                ↩ Selezione
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={styles.smallHint}>
            <span style={{ opacity: 0.85 }}>
              Punti: <b style={{ opacity: 1 }}>{scoreUI}</b>
            </span>
                        <span style={{ opacity: 0.65 }}>
              {" "}
                            —{" "}
                            {aliveUI
                                ? energyUI > 0
                                    ? "Press Space/click to release (consumes all)"
                                    : "Hold Space/click then release to bank energy"
                                : "Click o Space per aprire TOP 15"}
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

function clamp01(v: number) {
    return clamp(v, 0, 1);
}

function clampInt(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, Math.floor(v)));
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

    // ===== Leaderboard “pixel panel” =====
    lbOverlay: {
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: 10,
        background: "rgba(0,0,0,0.35)",
    },
    lbPanel: {
        width: "min(560px, 96%)",
        maxHeight: "92%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        border: "2px solid rgba(0,255,154,0.35)",
        background: "rgba(0,0,0,0.78)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        padding: 12,
        fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    lbTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
    lbTitle: { fontSize: 12, letterSpacing: 1.2, opacity: 0.95 },
    lbClose: {
        width: 34,
        height: 28,
        borderRadius: 10,
        border: "1px solid rgba(231,238,247,0.18)",
        background: "rgba(0,0,0,0.20)",
        color: "rgba(231,238,247,0.9)",
        cursor: "pointer",
    },
    lbSub: { fontSize: 11, opacity: 0.78, marginTop: 8, marginBottom: 10 },

    lbBox: {
        borderRadius: 12,
        border: "1px solid rgba(231,238,247,0.14)",
        background: "rgba(0,0,0,0.26)",
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
        background: "linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0.55))",
        borderRadius: 10,
        padding: "6px 8px",
        border: "1px solid rgba(231,238,247,0.12)",
    },

    lbGridHeader: {
        display: "grid",
        gridTemplateColumns: "34px 22px 1fr 80px",
        alignItems: "center",
        gap: 10,
        fontSize: 11,
        letterSpacing: 0.8,
        opacity: 0.9,
    },

    lbList: {
        marginTop: 8,
        display: "grid",
        gap: 6,
        overflowY: "auto",
        paddingRight: 6,
        flex: "1 1 auto",
        minHeight: 0,
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(0,255,154,0.35) rgba(0,0,0,0.25)",
    },

    lbRow: {
        borderRadius: 10,
        border: "1px solid rgba(231,238,247,0.10)",
        background: "rgba(0,0,0,0.12)",
        padding: "6px 8px",
    },

    lbRowMine: {
        background: "rgba(0,229,255,0.12)",
        border: "1px solid rgba(0,255,154,0.35)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.35) inset",
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
    lbColName: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        opacity: 0.95,
    },
    lbColScore: { textAlign: "right", opacity: 0.95 },

    lbForm: { display: "grid", gap: 8, marginTop: 10 },
    lbFormRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

    lbAvatarBig: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 10,
        border: "1px solid rgba(231,238,247,0.14)",
        background: "rgba(0,0,0,0.25)",
        fontSize: 12,
    },

    lbInput: {
        flex: "1 1 180px",
        height: 34,
        borderRadius: 10,
        border: "1px solid rgba(231,238,247,0.18)",
        background: "rgba(0,0,0,0.25)",
        color: "rgba(231,238,247,0.92)",
        padding: "0 10px",
        outline: "none",
        fontSize: 12,
    },

    lbBtn: {
        height: 34,
        padding: "0 12px",
        borderRadius: 10,
        border: "1px solid rgba(0,255,154,0.35)",
        background: "rgba(0,0,0,0.22)",
        color: "rgba(231,238,247,0.95)",
        letterSpacing: 1.0,
        cursor: "pointer",
    },

    lbFooter: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10, flexWrap: "wrap" },

    lbBtnSecondary: {
        height: 32,
        padding: "0 10px",
        borderRadius: 10,
        border: "1px solid rgba(231,238,247,0.16)",
        background: "rgba(0,0,0,0.18)",
        color: "rgba(231,238,247,0.9)",
        cursor: "pointer",
        fontSize: 12,
    },
};