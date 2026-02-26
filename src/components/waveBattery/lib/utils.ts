export function rand(a: number, b: number) {
    return Math.floor(a + Math.random() * (b - a + 1));
}

export function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
}

export function clamp01(v: number) {
    return clamp(v, 0, 1);
}

export function clampInt(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, Math.floor(v)));
}