import { NextResponse } from "next/server";

import { buildChatPayload, groqChatOnce } from "@/lib/groq/server";
import { supportChatConfig } from "@/lib/support-chat/config";
import type { ChatMessage, LongMemoryState } from "@/lib/support-chat/types";
import { getAllUserAssistant } from "@/lib/support-chat/utils";

type RequestBody = {
    messages: ChatMessage[];
    memory: LongMemoryState;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as RequestBody;
        const cfg = supportChatConfig;

        if (!cfg.enableLongMemory) {
            return NextResponse.json(body.memory);
        }

        const messages = Array.isArray(body.messages) ? body.messages : [];
        const memory: LongMemoryState = {
            oldContext: String(body.memory?.oldContext ?? ""),
            lastSummarizedIndex: Number(body.memory?.lastSummarizedIndex ?? 0),
        };

        const ua = getAllUserAssistant(messages);

        const threshold =
            cfg.historyTurns * 2 + cfg.longMemoryDecayTurns * 2;

        if (ua.length <= threshold) {
            return NextResponse.json(memory);
        }

        const keep = Math.max(2, cfg.historyTurns * 2);
        const cutoff = Math.max(0, ua.length - keep);

        const start = Math.max(0, memory.lastSummarizedIndex || 0);
        const end = cutoff;

        if (end <= start) {
            return NextResponse.json(memory);
        }

        const chunk = ua.slice(start, end);

        const memoryMessages: ChatMessage[] = [
            {
                role: "system",
                content: cfg.longMemoryPrompt,
            },
            {
                role: "user",
                content: [
                    "OLD_CONTEXT attuale:",
                    memory.oldContext || "(vuoto)",
                    "",
                    "Messaggi da assorbire:",
                    JSON.stringify(chunk, null, 2),
                    "",
                    "Scrivi il nuovo OLD_CONTEXT:",
                ].join("\n"),
            },
        ];

        const payload = buildChatPayload({
            model: cfg.longMemoryModel,
            messages: memoryMessages,
            temperature: 0.2,
            top_p: 1,
            max_completion_tokens: 400,
            stream: false,
        });

        const res = await groqChatOnce({ payload });
        const nextMemory: LongMemoryState = {
            oldContext: res.content.trim(),
            lastSummarizedIndex: end,
        };

        return NextResponse.json(nextMemory);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Errore sconosciuto";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}