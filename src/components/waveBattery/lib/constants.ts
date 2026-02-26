import type { GhostDef } from "./types";

export const GHOSTS: GhostDef[] = [
    { id: "red", label: "Rosso", c1: "#d94b4b", c2: "#a83636", c3: "#f2b1b1" },
    { id: "green", label: "Verde", c1: "#4bd971", c2: "#2fa24b", c3: "#b7f2c6" },
    { id: "purple", label: "Viola", c1: "#7c67ff", c2: "#5847bf", c3: "#c9c2ff" },
    { id: "white", label: "Bianco", c1: "#f2f2f2", c2: "#cfcfcf", c3: "#ffffff" },
];

export const FLUO = ["#39ff14", "#00e5ff", "#b400ff", "#00ff9a"];

export const COOLDOWN_S = 0.65;

// sprite 12x12 pieno
export const RUNNER_12: number[][] = [
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