import { RUNNER_12 } from "./constants";
import type { GameState, GhostDef, Obstacle, Wave } from "./types";
import { clamp, clamp01, clampInt } from "./utils";
import { COOLDOWN_S } from "./constants";

export function drawRunnerSprite(
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

export function drawBg(ctx: CanvasRenderingContext2D, st: GameState, dt: number) {
    const { vw, vh, groundY } = st;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, vw, vh);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "rgba(57,255,20,0.12)";
    for (let x = 0; x <= vw; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, vh);
        ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,229,255,0.08)";
    for (let y = 0; y <= vh; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(vw, y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const streaks = st.streaks;
    for (const s of streaks) {
        s.y += s.spd * dt;
        if (s.y - s.len > vh) {
            s.y = -Math.floor(10 + Math.random() * 50);
            s.len = 18 + Math.random() * 70;
            s.spd = 14 + Math.random() * 55;
            s.a = 0.07 + Math.random() * 0.22;
            s.x = (Math.random() * vw) | 0;
        }
        ctx.globalAlpha = s.a;
        ctx.fillStyle = "rgba(57,255,20,1)";
        for (let k = 0; k < s.len; k += 6) ctx.fillRect(s.x, Math.floor(s.y - k), 2, 4);
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "rgba(0,229,255,1)";
    for (let y = 0; y < vh; y += 2) ctx.fillRect(0, y, vw, 1);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(0,255,154,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 1);
    ctx.lineTo(vw, groundY + 1);
    ctx.stroke();
}

export function drawObstacle(ctx: CanvasRenderingContext2D, st: GameState, o: Obstacle) {
    const { groundY } = st;
    const x = Math.floor(o.x);
    const y = Math.floor(groundY - o.h);

    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, o.w, o.h);

    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, o.w - 2, o.h - 2);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = o.stroke;
    const layers = Math.min(5, o.hp);
    for (let i = 1; i < layers; i++) {
        const ly = y + i * 9;
        ctx.fillRect(x + 2, ly, o.w - 4, 1);
    }
    ctx.globalAlpha = 1;
}

export function drawWave(ctx: CanvasRenderingContext2D, w: Wave) {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.cx, w.cy, w.radius, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w.cx, w.cy, w.radius + 2, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function drawEventOverlay(ctx: CanvasRenderingContext2D, st: GameState) {
    const ev = st.event;
    if (!ev) return;

    ctx.fillStyle = "rgba(0,0,0,0.70)";
    ctx.fillRect(0, 0, st.vw, st.vh);

    const { x, y, w, h } = ev.ui.panel;

    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = "rgba(0,255,154,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    ctx.fillStyle = "rgba(231,238,247,0.95)";
    ctx.font =
        "bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // ✅ RESULT MODE
    if (ev.phase === "result" && ev.result) {
        ctx.fillText(ev.result.title, x + 12, y + 10);

        ctx.globalAlpha = 0.95;
        ctx.font =
            "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        wrapText(ctx, ev.result.body, x + 12, y + 32, w - 24, 12);
        ctx.globalAlpha = 1;

        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(231,238,247,0.65)";
        ctx.font =
            "10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        ctx.fillText("RIPRENDE...", st.vw / 2, y + h + 16);

        return;
    }

    // ✅ CHOOSE MODE
    ctx.fillText(ev.title, x + 12, y + 10);

    ctx.globalAlpha = 0.9;
    ctx.font =
        "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    wrapText(ctx, ev.body, x + 12, y + 28, w - 24, 12);
    ctx.globalAlpha = 1;

    for (let i = 0; i < ev.options.length; i++) {
        const b = ev.ui.buttons[i];
        const hot = i === ev.selectedIndex;

        ctx.fillStyle = hot ? "rgba(0,229,255,0.16)" : "rgba(0,0,0,0.35)";
        ctx.fillRect(b.x, b.y, b.w, b.h);

        ctx.strokeStyle = hot ? "rgba(0,255,154,0.75)" : "rgba(231,238,247,0.18)";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

        ctx.fillStyle = "rgba(231,238,247,0.95)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font =
            "bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        ctx.fillText(ev.options[i].label, b.x + b.w / 2, b.y + b.h / 2);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(231,238,247,0.70)";
    ctx.font =
        "10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    ctx.fillText("TAP PER SCEGLIERE", st.vw / 2, y + h + 16);
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, yy);
            line = words[n] + " ";
            yy += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, yy);
}

export function drawHUD(ctx: CanvasRenderingContext2D, st: GameState) {
    const { vw, alive, score, energy, holding, holdT, cooldown, groundY, runnerX, blink } = st;

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(8, 8, 210, 22);
    ctx.strokeStyle = "rgba(0,229,255,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(9, 9, 208, 20);

    ctx.fillStyle = "rgba(231,238,247,0.95)";
    ctx.font =
        "bold 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`SCORE ${score}`, 16, 19);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(231,238,247,0.85)";
    ctx.font =
        "bold 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    ctx.fillText(`★x${st.stars}  2x${st.doubles}`, 210, 19);

    const bx = 8;
    const by = 34;
    const bw = 210;
    const bh = 22;

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = "rgba(0,229,255,0.30)";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

    const segGap = 3;
    const segW = Math.floor((bw - 10 - segGap * 4) / 5);
    const sx = bx + 5;
    const sy = by + 5;
    const sh = bh - 10;

    const preview = holding ? holdT : 0;
    const previewGain = gainedFromHold(preview);
    const previewFillTo = clampInt(energy + previewGain, 0, 5);

    for (let i = 0; i < 5; i++) {
        const segX = sx + i * (segW + segGap);

        const filled = i < energy;
        const prefilled = !filled && holding && i < previewFillTo;

        let col = "rgba(255,255,255,0.08)";
        if (filled) {
            if (i <= 1) col = "rgba(0,229,255,0.75)";
            else if (i <= 3) col = "rgba(57,255,20,0.75)";
            else col = "rgba(180,0,255,0.75)";
        } else if (prefilled) {
            col = "rgba(231,238,247,0.22)";
        }

        ctx.fillStyle = col;
        ctx.fillRect(segX, sy, segW, sh);

        ctx.strokeStyle = "rgba(57,255,20,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(segX, sy, segW, sh);

        if (holding && i === energy) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = "rgba(231,238,247,0.45)";
            ctx.fillRect(segX, sy, Math.floor(segW * preview), sh);
            ctx.globalAlpha = 1;
        }
    }

    if (cooldown > 0) {
        const t = clamp01(cooldown / COOLDOWN_S);
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(231,238,247,1)";
        ctx.fillRect(bx + 2, by + 2, Math.floor((bw - 4) * t), bh - 4);
        ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "rgba(231,238,247,0.75)";
    ctx.font =
        "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let msg = "";
    if (!alive) msg = "SPACE/CLICK: LEADERBOARD";
    else if (st.paused && st.event) msg = st.event.phase === "result" ? "ESITO..." : "EVENT...";
    else if (cooldown > 0) msg = "COOLDOWN...";
    else if (energy === 0) msg = "HOLD SPACE TO CHARGE";
    else msg = "PRESS SPACE TO RELEASE";

    ctx.fillText(msg, bx + 6, by + bh + 6);

    if (!alive) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, st.vw, st.vh);

        ctx.fillStyle = "rgba(231,238,247,0.95)";
        ctx.textAlign = "center";
        ctx.font =
            "bold 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        ctx.fillText("GAME OVER", st.vw / 2, 66);

        ctx.font =
            "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        ctx.fillText(`PUNTEGGIO: ${score}`, st.vw / 2, 86);

        const on = Math.floor(blink / 22) % 2 === 0;
        if (on) {
            ctx.fillStyle = "rgba(57,255,20,0.95)";
            ctx.fillText("PREMI SPAZIO/CLICK PER TOP 15", st.vw / 2, 108);
        }
    }

    const s = 3;
    const rw = 12 * s;
    const rh = 12 * s;
    const ry = Math.floor(groundY - rh);

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(0,255,154,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(runnerX - 1, ry - 1, rw + 2, rh + 2);
    ctx.globalAlpha = 1;

    if (alive && st.paused && st.event) {
        drawEventOverlay(ctx, st);
    }
}

function gainedFromHold(t: number) {
    if (t >= 0.86) return 5;
    if (t >= 0.72) return 4;
    if (t >= 0.56) return 3;
    if (t >= 0.36) return 2;
    if (t >= 0.18) return 1;
    return 0;
}

export function collide(st: GameState, rx: number, ry: number, rw: number, rh: number, o: Obstacle) {
    const ox = o.x;
    const oy = st.groundY - o.h;
    return rx < ox + o.w && rx + rw > ox && ry < oy + o.h && ry + rh > oy;
}

export function waveHitsObstacle(st: GameState, w: Wave, o: Obstacle) {
    const ox = o.x;
    const oy = st.groundY - o.h;
    const ow = o.w;
    const oh = o.h;

    const closestX = clamp(w.cx, ox, ox + ow);
    const closestY = clamp(w.cy, oy, oy + oh);

    const dx = closestX - w.cx;
    const dy = closestY - w.cy;
    const dist2 = dx * dx + dy * dy;

    const inFront = closestX >= w.cx - 2;
    return inFront && dist2 <= w.radius * w.radius;
}