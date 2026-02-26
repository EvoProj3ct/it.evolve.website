import type { LeaderboardPayload } from "./types";

export async function fetchLeaderboard(): Promise<LeaderboardPayload | null> {
    try {
        const res = await fetch("/api/leaderboard", { method: "GET" });
        const data = (await res.json()) as LeaderboardPayload;
        return data?.ok ? data : null;
    } catch {
        return null;
    }
}

export async function submitScore(payload: { score: number; name: string; ghost: string }) {
    await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}