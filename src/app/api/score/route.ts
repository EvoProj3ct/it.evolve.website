import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

type GhostId = "red" | "green" | "purple" | "white";

const LB_KEY = "lb:wavebattery:global"; // sorted set
const META_KEY = "lb:wavebattery:meta"; // hash: sid -> json string

function clampInt(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, Math.floor(v)));
}

function validGhost(x: any): x is GhostId {
    return x === "red" || x === "green" || x === "purple" || x === "white";
}

export async function POST(req: NextRequest) {
    let sid = req.cookies.get("wb_sid")?.value;
    const needSetCookie = !sid;

    if (!sid) sid = crypto.randomUUID();

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
    }

    const score = clampInt(Number(body?.score ?? 0), 0, 999999);
    const name = String(body?.name ?? "").trim().slice(0, 16);
    const ghost = body?.ghost;

    if (!name || name.length < 2) {
        return NextResponse.json({ ok: false, error: "Name too short" }, { status: 400 });
    }
    if (!validGhost(ghost)) {
        return NextResponse.json({ ok: false, error: "Bad ghost" }, { status: 400 });
    }
    if (!Number.isFinite(score) || score <= 0) {
        return NextResponse.json({ ok: false, error: "Bad score" }, { status: 400 });
    }

    // rate-limit soft: 1 submit ogni 3s per sessione
    const rlKey = `wb:rl:${sid}`;
    const was = await kv.get<number>(rlKey);
    if (was) {
        const res = NextResponse.json({ ok: false, error: "Too fast" }, { status: 429 });
        if (needSetCookie) {
            res.cookies.set("wb_sid", sid, {
                httpOnly: true,
                sameSite: "lax",
                secure: true,
                path: "/",
                maxAge: 60 * 60 * 24 * 365,
            });
        }
        return res;
    }
    await kv.set(rlKey, 1, { ex: 3 });

    // salva meta
    await kv.hset(META_KEY, { [sid]: JSON.stringify({ name, ghost }) });

    // salva best score (senza GT: facciamo check manuale)
    const prev = await kv.zscore(LB_KEY, sid);
    if (prev === null || score > Number(prev)) {
        await kv.zadd(LB_KEY, { score, member: sid });
    }

    const res = NextResponse.json({ ok: true });
    if (needSetCookie) {
        res.cookies.set("wb_sid", sid, {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
        });
    }
    return res;
}