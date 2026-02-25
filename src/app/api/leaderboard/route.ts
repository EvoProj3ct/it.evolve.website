// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

type GhostId = "red" | "green" | "purple" | "white";

const LB_KEY = "lb:wavebattery:global";
const META_KEY = "lb:wavebattery:meta";
const TOP_N = 15;

function cookieOptions() {
    return {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    };
}

function getOrCreateSid(req: NextRequest) {
    const existing = req.cookies.get("wb_sid")?.value;
    if (existing) return { sid: existing, needSetCookie: false };
    return { sid: crypto.randomUUID(), needSetCookie: true };
}

// robust parsing for zrange(..., {withScores:true}) across wrappers
const toPairs = (raw: any): Array<{ member: string; score: number }> => {
    if (!Array.isArray(raw)) return [];

    // Case A: flat ["sid1", 12, "sid2", 7]
    if (raw.length >= 2 && typeof raw[0] === "string" && !Array.isArray(raw[0])) {
        const out: Array<{ member: string; score: number }> = [];
        for (let i = 0; i < raw.length - 1; i += 2) {
            const member = raw[i];
            const score = Number(raw[i + 1]);
            if (typeof member === "string" && member.length > 0 && Number.isFinite(score)) {
                out.push({ member, score });
            }
        }
        return out;
    }

    // Case B: tuples [[sid, score], ...]
    if (raw.length && Array.isArray(raw[0])) {
        return raw
            .map((t: any) => ({ member: t?.[0], score: Number(t?.[1]) }))
            .filter(
                (p: any) =>
                    typeof p.member === "string" && p.member.length > 0 && Number.isFinite(p.score)
            );
    }

    // Case C: objects [{member, score}, ...]
    return raw
        .map((it: any) => ({ member: it?.member, score: Number(it?.score) }))
        .filter(
            (p: any) =>
                typeof p.member === "string" && p.member.length > 0 && Number.isFinite(p.score)
        );
};

export async function GET(req: NextRequest) {
    const { sid, needSetCookie } = getOrCreateSid(req);

    // avoid caching
    const headers = new Headers();
    headers.set("Cache-Control", "no-store, max-age=0");

    // 1) read top N (best first)
    const raw = await kv.zrange(LB_KEY, 0, TOP_N - 1, { rev: true, withScores: true });
    const pairs = toPairs(raw);

    // 2) fetch meta for those members (robust: always hget in parallel)
    const members = pairs.map((p) => p.member);
    const metas = await Promise.all(members.map((m) => kv.hget<string>(META_KEY, m)));

    const top = pairs.map((p, i) => {
        let meta: any = null;
        try {
            meta = metas[i] ? JSON.parse(String(metas[i])) : null;
        } catch {}

        return {
            sessionId: p.member,
            score: p.score,
            name: meta?.name ?? "???",
            ghost: (meta?.ghost as GhostId) ?? "red",
        };
    });

    // 3) my best + my meta (for prefill + highlight)
    const [myScore, myMetaRaw] = await Promise.all([
        kv.zscore(LB_KEY, sid),
        kv.hget<string>(META_KEY, sid),
    ]);

    let myMeta: any = null;
    try {
        myMeta = myMetaRaw ? JSON.parse(String(myMetaRaw)) : null;
    } catch {}

    const res = NextResponse.json(
        {
            ok: true,
            top,
            me: {
                sessionId: sid,
                bestScore: myScore === null ? null : Number(myScore),
                name: myMeta?.name ?? null,
                ghost: (myMeta?.ghost as GhostId) ?? null,
            },
        },
        { headers }
    );

    if (needSetCookie) res.cookies.set("wb_sid", sid, cookieOptions());
    return res;
}