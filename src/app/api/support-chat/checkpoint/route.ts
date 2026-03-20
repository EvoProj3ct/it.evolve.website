import { NextResponse } from "next/server";

import { buildChatPayload, groqChatOnce } from "@/lib/groq/server";
import { supportChatConfig } from "@/lib/support-chat/config";
import { withOldContext } from "@/lib/support-chat/prompts";
import type { ChatMessage, CheckpointLight } from "@/lib/support-chat/types";
import { safeJsonParse, takeLastTurnsForAPI } from "@/lib/support-chat/utils";

type RequestBody = {
    messages: ChatMessage[];
    userText: string;
    oldContext?: string;
};

type CheckpointModelOutput = {
    light?: CheckpointLight | string;
    reason?: string;
};

function normalizeLight(value: unknown): CheckpointLight | null {
    const v = String(value ?? "").trim().toUpperCase();

    if (v === "GREEN" || v === "ORANGE" || v === "RED") {
        return v;
    }

    return null;
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as RequestBody;
        const cfg = supportChatConfig;

        if (!cfg.enableCheckpoint || !cfg.checkpointUseModel) {
            return NextResponse.json({
                light: "GREEN" as CheckpointLight,
                reason: "disabled",
            });
        }

        const messages = Array.isArray(body.messages) ? body.messages : [];
        const userText = String(body.userText ?? "").trim();
        const oldContext = String(body.oldContext ?? "");

        if (!userText) {
            return NextResponse.json({
                light: "GREEN" as CheckpointLight,
                reason: "OK",
            });
        }

        const ctxSystem = withOldContext(cfg.systemPrompt, oldContext);
        const recent = takeLastTurnsForAPI(messages, Math.min(cfg.historyTurns, 8));

        const cpMessages: ChatMessage[] = [
            {
                role: "system",
                content: cfg.checkpointPrompt,
            },
            {
                role: "user",
                content: [
                    "SYSTEM+OLD_CONTEXT DI RIFERIMENTO:",
                    ctxSystem,
                    "",
                    "CONVERSAZIONE RECENTE:",
                    JSON.stringify(recent, null, 2),
                    "",
                    "ULTIMO MESSAGGIO UTENTE:",
                    userText,
                ].join("\n"),
            },
        ];

        const payload = buildChatPayload({
            model: cfg.checkpointModel,
            messages: cpMessages,
            temperature: 0,
            top_p: 1,
            max_completion_tokens: 40,
            stream: false,
            response_format: {
                type: "json_object",
            },
        });

        const res = await groqChatOnce({ payload });
        const parsed = safeJsonParse<CheckpointModelOutput>(res.content.trim());

        const light = normalizeLight(parsed?.light);

        if (!light) {
            return NextResponse.json({
                light: "GREEN" as CheckpointLight,
                reason: "parse_fail",
            });
        }

        return NextResponse.json({
            light,
            reason: String(parsed?.reason ?? "").trim().slice(0, 12),
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Errore sconosciuto";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}