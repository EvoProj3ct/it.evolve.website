// app/api/score/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

type GhostId = "red" | "green" | "purple" | "white";

const LB_KEY = "lb:wavebattery:global"; // zset: member=sid score=best
const META_KEY = "lb:wavebattery:meta"; // hash: sid -> json
const RL_PREFIX = "wb:rl:"; // string key per sid (rate-limit)

function clampInt(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, Math.floor(v)));
}

function validGhost(x: any): x is GhostId {
    return x === "red" || x === "green" || x === "purple" || x === "white";
}

function cookieOptions() {
    return {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production", // ✅ dev-friendly
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    };
}

function getOrCreateSid(req: NextRequest) {
    const existing = req.cookies.get("wb_sid")?.value;
    if (existing) return { sid: existing, needSetCookie: false };
    return { sid: crypto.randomUUID(), needSetCookie: true };
}

export async function POST(req: NextRequest) {
    const { sid, needSetCookie } = getOrCreateSid(req);

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
    }

    const score = clampInt(Number(body?.score ?? 0), 0, 999999);
    const name = String(body?.name ?? "").trim().slice(0, 16);
    const ghost = body?.ghost;

    if (name.length < 2) {
        return NextResponse.json({ ok: false, error: "Name too short" }, { status: 400 });
    }
    if (!validGhost(ghost)) {
        return NextResponse.json({ ok: false, error: "Bad ghost" }, { status: 400 });
    }
    if (!Number.isFinite(score) || score <= 0) {
        return NextResponse.json({ ok: false, error: "Bad score" }, { status: 400 });
    }

    // ✅ atomic soft rate-limit: one submit every 3s per sid (SET NX EX)
    const rlKey = `${RL_PREFIX}${sid}`;
    const locked = await kv.set(rlKey, 1, { nx: true, ex: 3 });

    if (!locked) {
        const res = NextResponse.json({ ok: false, error: "Too fast" }, { status: 429 });
        if (needSetCookie) res.cookies.set("wb_sid", sid, cookieOptions());
        return res;
    }

    // save meta
    await kv.hset(META_KEY, { [sid]: JSON.stringify({ name, ghost }) });

    // update best score (try GT if supported; fallback otherwise)
    try {
        // Some KV/Redis wrappers support: zadd(key, {score, member}, { gt: true })
        // If yours doesn't, it will throw and we fallback to zscore+zadd.
        // @ts-expect-error optional wrapper feature
        await kv.zadd(LB_KEY, { score, member: sid }, { gt: true });
    } catch {
        const prev = await kv.zscore(LB_KEY, sid);
        if (prev === null || score > Number(prev)) {
            await kv.zadd(LB_KEY, { score, member: sid });
        }
    }

    const res = NextResponse.json({ ok: true });
    if (needSetCookie) res.cookies.set("wb_sid", sid, cookieOptions());
    return res;
}