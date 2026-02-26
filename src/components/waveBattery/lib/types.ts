export type GhostId = "red" | "green" | "purple" | "white";

export type GhostDef = {
    id: GhostId;
    label: string;
    c1: string;
    c2: string;
    c3: string;
};

export type Phase = "pick" | "run";

export type Obstacle = {
    x: number;
    w: number;
    h: number;
    hp: number;
    stroke: string;
};

export type Wave = {
    active: boolean;
    power: 1 | 2 | 3;
    damageLeft: number;
    color: string;
    cx: number;
    cy: number;
    radius: number;
    speed: number;
    growth: number;
    ttl: number;
};

export type Streak = {
    x: number;
    y: number;
    len: number;
    spd: number;
    a: number;
};

export type LbRow = { sessionId: string; score: number; name: string; ghost: GhostId };

export type LeaderboardPayload = {
    ok: true;
    top: LbRow[];
    me: { sessionId: string; bestScore: number | null; name: string | null; ghost: GhostId | null };
};

// ===== EVENTS =====
export type EventKind = "beggar" | "choosePower" | "doubleOrNothing" | "stumbleLose" | "foundGain";

export type EventOptionId =
    | "ACCEPT"
    | "REFUSE"
    | "STAR"
    | "DOUBLE"
    | "LEAVE"
    | "BET";

export type EventOption = {
    id: EventOptionId;
    label: string;
};

export type EventState = {
    kind: EventKind;
    title: string;
    body: string;
    amount: number;

    options: EventOption[];
    selectedIndex: number;

    ui: {
        panel: { x: number; y: number; w: number; h: number };
        buttons: Array<{ x: number; y: number; w: number; h: number }>;
    };

    // ✅ NEW
    phase: "choose" | "result";
    result?: { title: string; body: string; ttl: number };
};

export type GameState = {
    vw: number;
    vh: number;

    groundY: number;
    runnerX: number;

    frame: number;
    elapsed: number;
    blink: number;

    alive: boolean;
    score: number;

    energy: number; // 0..5
    holding: boolean;
    holdT: number; // 0..1
    cooldown: number;

    wave: Wave;

    // DOUBLE = onde extra power1 in sequenza
    pendingDoubleShots: number;

    obstacles: Obstacle[];
    streaks: Streak[];

    ghost: GhostDef;

    // powerups
    stars: number;   // 0..3
    doubles: number; // 0..3

    // events
    paused: boolean;
    event: EventState | null;

    // pacing eventi
    killsSinceEvent: number;
    nextEventAtKills: number;
};

export type GameSnapshot = {
    alive: boolean;
    score: number;
    energy: number;
    holding: boolean;
    holdT: number;
    cooldown: number;
    blink: number;

    stars: number;
    doubles: number;

    paused: boolean;
    event: EventState | null;
};