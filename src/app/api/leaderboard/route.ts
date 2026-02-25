import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

type GhostId = "red" | "green" | "purple" | "white";

const LB_KEY = "lb:wavebattery:global";
const META_KEY = "lb:wavebattery:meta";
const TOP_N = 15;

export async function GET(req: NextRequest) {
    let sid = req.cookies.get("wb_sid")?.value;
    const needSetCookie = !sid;
    if (!sid) sid = crypto.randomUUID();

    // top N con score
    const raw = await kv.zrange(LB_KEY, 0, TOP_N - 1, { rev: true, withScores: true });
    const pairs = (Array.isArray(raw) ? raw : []) as Array<{ member: string; score: number }>;

    // prendi meta per ogni member (semplice e TS-friendly)
    const metas = await Promise.all(
        pairs.map((p) => kv.hget<string>(META_KEY, p.member))
    );

    const top = pairs.map((p, i) => {
        let meta: any = null;
        try {
            meta = metas[i] ? JSON.parse(String(metas[i])) : null;
        } catch {}

        return {
            sessionId: p.member,
            score: Number(p.score),
            name: meta?.name ?? "???",
            ghost: (meta?.ghost as GhostId) ?? "red",
        };
    });

    const myScore = await kv.zscore(LB_KEY, sid);
    const myMetaRaw = await kv.hget<string>(META_KEY, sid);

    let myMeta: any = null;
    try {
        myMeta = myMetaRaw ? JSON.parse(String(myMetaRaw)) : null;
    } catch {}

    const res = NextResponse.json({
        ok: true,
        top,
        me: {
            sessionId: sid,
            bestScore: myScore === null ? null : Number(myScore),
            name: myMeta?.name ?? null,
            ghost: (myMeta?.ghost as GhostId) ?? null,
        },
    });

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