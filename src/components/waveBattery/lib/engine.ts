import { COOLDOWN_S, FLUO } from "./constants";
import type { GameSnapshot, GameState, GhostDef, Obstacle, Streak } from "./types";
import { clampInt, rand } from "./utils";
import { collide, waveHitsObstacle } from "./render";
import { applyEventChoice, createEvent, pickRandomEventKind } from "./events";

export type Engine = {
    state: GameState;
    reset(): void;
    setGhost(g: GhostDef): void;

    beginHold(): void;
    endHoldAndBank(): void;
    fireIfCharged(): void;

    // eventi in-game
    moveEventSelection(dir: -1 | 1): void;
    confirmEventSelection(): void;
    chooseEvent(index: number): void;

    update(dt: number): void;
    snapshot(): GameSnapshot;
};

export function createWaveBatteryEngine(initialGhost: GhostDef): Engine {
    const vw = 320;
    const vh = 180;
    const groundY = vh - 26;
    const runnerX = 56;

    const MAX_OBS = 120;

    const mkStreaks = (): Streak[] =>
        Array.from({ length: 26 }).map((_, i) => ({
            x: (i * 17) % 320,
            y: Math.random() * 180,
            len: 18 + Math.random() * 60,
            spd: 14 + Math.random() * 45,
            a: 0.07 + Math.random() * 0.18,
        }));

    const st: GameState = {
        vw,
        vh,
        groundY,
        runnerX,

        frame: 0,
        elapsed: 0,
        blink: 0,

        alive: true,
        score: 0,

        energy: 0,
        holding: false,
        holdT: 0,
        cooldown: 0,

        wave: {
            active: false,
            power: 1,
            damageLeft: 0,
            color: "#00e5ff",
            cx: 0,
            cy: 0,
            radius: 0,
            speed: 0,
            growth: 0,
            ttl: 0,
        },

        pendingDoubleShots: 0,

        obstacles: [],
        streaks: mkStreaks(),

        ghost: initialGhost,

        stars: 0,
        doubles: 0,

        paused: false,
        event: null,

        killsSinceEvent: 0,
        nextEventAtKills: rand(5, 9),
    };

    const maxHpAtTime = (t: number) => {
        if (t < 14) return 1;
        if (t < 30) return 2;
        if (t < 50) return 3;
        if (t < 75) return 4;
        return 5;
    };

    const spawnObstacle = () => {
        const t = st.elapsed;
        const score = st.score;

        const early = t < 14;
        const gap = early ? rand(170, 260) : Math.random() < 0.25 ? rand(70, 95) : rand(95, 170);

        const last = st.obstacles[st.obstacles.length - 1];
        const startX = last ? last.x + last.w + gap : st.vw + 200;

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
        st.obstacles.push({ x: startX, w, h, hp, stroke });

        if (st.obstacles.length > MAX_OBS) st.obstacles.splice(0, st.obstacles.length - MAX_OBS);
    };

    const powerFromEnergy = (e: number): 1 | 2 | 3 => {
        if (e >= 5) return 3;
        if (e >= 3) return 2;
        return 1;
    };

    const gainedFromHold = (t: number) => {
        if (t >= 0.86) return 5;
        if (t >= 0.72) return 4;
        if (t >= 0.56) return 3;
        if (t >= 0.36) return 2;
        if (t >= 0.18) return 1;
        return 0;
    };

    const maybeTriggerEvent = () => {
        if (!st.alive) return;
        if (st.paused) return;
        if (st.event) return;

        if (st.killsSinceEvent >= st.nextEventAtKills) {
            const kind = pickRandomEventKind(st);
            st.event = createEvent(st, kind);
            st.paused = true;

            st.killsSinceEvent = 0;
            st.nextEventAtKills = rand(5, 10);
        }
    };

    const reset = () => {
        st.score = 0;
        st.alive = true;

        st.energy = 0;
        st.holding = false;
        st.holdT = 0;

        st.cooldown = 0;
        st.wave.active = false;
        st.wave.damageLeft = 0;

        st.pendingDoubleShots = 0;

        st.obstacles = [];
        st.frame = 0;
        st.elapsed = 0;
        st.blink = 0;

        st.streaks = mkStreaks();

        st.stars = 0;
        st.doubles = 0;

        st.paused = false;
        st.event = null;

        st.killsSinceEvent = 0;
        st.nextEventAtKills = rand(5, 9);

        for (let i = 0; i < 4; i++) spawnObstacle();
    };

    const setGhost = (g: GhostDef) => {
        st.ghost = g;
    };

    const beginHold = () => {
        if (!st.alive) return;
        if (st.paused) return;
        if (st.cooldown > 0) return;
        if (st.energy >= 5) return;
        st.holding = true;
    };

    const endHoldAndBank = () => {
        if (!st.alive) return;
        if (st.paused) return;
        if (!st.holding) return;
        st.holding = false;

        const gained = gainedFromHold(st.holdT);
        if (gained > 0) st.energy = clampInt(st.energy + gained, 0, 5);

        st.holdT = 0;
    };

    const spawnWave = (power: 1 | 2 | 3) => {
        const color = power === 1 ? "#00e5ff" : power === 2 ? "#39ff14" : "#b400ff";
        const speed = power === 1 ? 270 : power === 2 ? 340 : 430;
        const growth = power === 1 ? 200 : power === 2 ? 285 : 380;
        const ttl = power === 1 ? 0.32 : power === 2 ? 0.38 : 0.46;

        const s = 3;
        const rw = 12 * s;

        st.wave = {
            active: true,
            power,
            damageLeft: power,
            color,
            cx: st.runnerX + rw + 8,
            cy: st.groundY - 10,
            radius: power === 1 ? 12 : power === 2 ? 16 : 20,
            speed,
            growth,
            ttl,
        };
    };

    const fireIfCharged = () => {
        if (!st.alive) return;
        if (st.paused) return;
        if (st.cooldown > 0) return;
        if (st.energy <= 0) return;

        const power = powerFromEnergy(st.energy);

        st.pendingDoubleShots = st.doubles;
        spawnWave(power);

        st.energy = 0;
        st.cooldown = COOLDOWN_S;
    };

    const moveEventSelection = (dir: -1 | 1) => {
        if (!st.event) return;
        if (st.event.phase !== "choose") return;
        const n = st.event.options.length;
        st.event.selectedIndex = (st.event.selectedIndex + dir + n) % n;
    };

    const chooseEvent = (index: number) => {
        if (!st.event) return;
        if (st.event.phase !== "choose") return;
        const i = clampInt(index, 0, st.event.options.length - 1);
        st.event.selectedIndex = i;
        confirmEventSelection();
    };

    const confirmEventSelection = () => {
        if (!st.event) return;
        if (st.event.phase !== "choose") return;
        const opt = st.event.options[st.event.selectedIndex];
        if (!opt) return;
        applyEventChoice(st, st.event, opt.id);
    };

    const update = (dtIn: number) => {
        const dt = Math.min(0.05, dtIn);

        st.frame += 1;
        st.elapsed += dt;

        if (!st.alive) {
            st.blink += 1;
            return;
        }

        // ✅ gestione pausa evento + countdown esito
        if (st.paused && st.event) {
            if (st.event.phase === "result" && st.event.result) {
                st.event.result.ttl -= dt;
                if (st.event.result.ttl <= 0) {
                    st.event = null;
                    st.paused = false;
                }
            }
            return;
        }

        // cooldown
        if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dt);

        // HOLD (con STAR: accelera)
        if (st.holding && st.cooldown <= 0 && st.energy < 5) {
            const t = st.elapsed;

            const base = t < 14 ? 2.8 : 2.35;
            const curve = 1.25;
            const remaining = 1 - st.holdT;

            const starMul = 1 + 0.4 * st.stars;

            st.holdT = Math.min(1, st.holdT + dt * base * starMul * Math.pow(remaining, curve));
        }

        // speed
        const t = st.elapsed;
        const base = t < 14 ? 46 : 70;
        const speed = base + Math.min(60, t * 1.05) + Math.min(55, st.score * 1.55);

        // spawn
        const obs = st.obstacles;
        const rightMost = obs.reduce((m, o) => Math.max(m, o.x), 0);
        const targetAhead = t < 14 ? st.vw + 540 : st.vw + 290;
        if (rightMost < targetAhead) spawnObstacle();

        // move obstacles
        for (const o of obs) o.x -= speed * dt;

        // cleanup offscreen
        while (obs.length && obs[0].x + obs[0].w < -60) obs.shift();

        // update wave
        const wv = st.wave;
        if (wv.active) {
            wv.ttl -= dt;
            wv.cx += wv.speed * dt;
            wv.radius += wv.growth * dt;

            if (wv.damageLeft > 0) {
                const touched: Obstacle[] = [];
                for (const o of st.obstacles) if (waveHitsObstacle(st, wv, o)) touched.push(o);

                if (touched.length > 0) {
                    touched.sort((a, b) => a.x - b.x);

                    let killsNow = 0;

                    for (const o of touched) {
                        if (wv.damageLeft <= 0) break;

                        const spend = Math.min(wv.damageLeft, o.hp);
                        o.hp -= spend;
                        wv.damageLeft -= spend;

                        if (o.hp <= 0) {
                            killsNow += 1;
                            st.score += 1;
                        }
                    }

                    st.obstacles = st.obstacles.filter((o) => o.hp > 0);

                    if (killsNow > 0) {
                        st.killsSinceEvent += killsNow;
                        maybeTriggerEvent();
                    }
                }
            }

            // finisce danno => spegni e, se hai DOUBLE, spara extra power1
            if (wv.damageLeft <= 0) {
                wv.active = false;

                if (st.pendingDoubleShots > 0) {
                    st.pendingDoubleShots -= 1;
                    spawnWave(1);
                }
            }

            if (wv.active && (wv.ttl <= 0 || wv.cx - wv.radius > st.vw + 20)) {
                wv.active = false;

                if (st.pendingDoubleShots > 0) {
                    st.pendingDoubleShots -= 1;
                    spawnWave(1);
                }
            }
        }

        // collisions
        const s = 3;
        const rw = 12 * s;
        const rh = 12 * s;
        const ry = Math.floor(st.groundY - rh);

        for (const o of st.obstacles) {
            if (collide(st, st.runnerX, ry, rw, rh, o)) {
                if (st.stars > 0) {
                    st.stars -= 1;
                    o.hp = 0;
                    st.obstacles = st.obstacles.filter((x) => x.hp > 0);
                    st.holding = false;
                    st.holdT = 0;
                } else {
                    st.alive = false;
                    st.holding = false;
                    st.holdT = 0;
                }
                break;
            }
        }

        if (!st.alive) st.blink += 1;
    };

    const snapshot = (): GameSnapshot => ({
        alive: st.alive,
        score: st.score,
        energy: st.energy,
        holding: st.holding,
        holdT: st.holdT,
        cooldown: st.cooldown,
        blink: st.blink,

        stars: st.stars,
        doubles: st.doubles,

        paused: st.paused,
        event: st.event,
    });

    reset();

    return {
        state: st,
        reset,
        setGhost,
        beginHold,
        endHoldAndBank,
        fireIfCharged,

        moveEventSelection,
        confirmEventSelection,
        chooseEvent,

        update,
        snapshot,
    };
}