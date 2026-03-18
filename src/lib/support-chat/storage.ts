import type { CheckpointState, LongMemoryState } from "./types";

function readJson<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function writeJson<T>(key: string, value: T) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore
    }
}

export function loadLongMemory(key: string): LongMemoryState {
    const fallback: LongMemoryState = {
        oldContext: "",
        lastSummarizedIndex: 0,
    };

    const data = readJson<Partial<LongMemoryState>>(key, fallback);

    return {
        oldContext: String(data.oldContext ?? ""),
        lastSummarizedIndex: Number(data.lastSummarizedIndex ?? 0),
    };
}

export function saveLongMemory(key: string, memory: LongMemoryState) {
    writeJson<LongMemoryState>(key, {
        oldContext: String(memory.oldContext ?? ""),
        lastSummarizedIndex: Number(memory.lastSummarizedIndex ?? 0),
    });
}

export function resetLongMemory(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
}

export function loadCheckpointState(key: string): CheckpointState {
    const fallback: CheckpointState = {
        orangeCount: 0,
        closed: false,
    };

    const data = readJson<Partial<CheckpointState>>(key, fallback);

    return {
        orangeCount: Number(data.orangeCount ?? 0),
        closed: Boolean(data.closed),
    };
}

export function saveCheckpointState(key: string, state: CheckpointState) {
    writeJson<CheckpointState>(key, {
        orangeCount: Number(state.orangeCount ?? 0),
        closed: Boolean(state.closed),
    });
}

export function resetCheckpointState(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
}