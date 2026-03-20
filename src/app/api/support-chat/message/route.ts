import { NextResponse } from "next/server";

import { buildChatPayload, groqChatOnce } from "@/lib/groq/server";
import { supportChatConfig } from "@/lib/support-chat/config";
import { buildMessages, withOldContext } from "@/lib/support-chat/prompts";
import type { ChatMessage } from "@/lib/support-chat/types";
import { takeLastTurnsForAPI } from "@/lib/support-chat/utils";

type RequestBody = {
    messages: ChatMessage[];
    oldContext?: string;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as RequestBody;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const oldContext = String(body.oldContext ?? "");
        const cfg = supportChatConfig;

        const systemWithMemory = withOldContext(cfg.systemPrompt, oldContext);
        const history = takeLastTurnsForAPI(messages, cfg.historyTurns);

        const apiMessages = buildMessages({
            systemPrompt: systemWithMemory,
            preAssistant: cfg.preAssistant,
            history,
        });

        const payload = buildChatPayload({
            model: cfg.model,
            messages: apiMessages,
            temperature: cfg.temperature,
            top_p: cfg.top_p,
            max_completion_tokens: cfg.max_completion_tokens,
            stream: false,
        });

        const res = await groqChatOnce({ payload });

        return NextResponse.json({
            text: String(res.content || "").trim() || "(vuoto)",
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Errore sconosciuto";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}