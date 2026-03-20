import "server-only";

import type { ChatMessage } from "@/lib/support-chat/types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export type GroqChatPayload = {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    top_p?: number;
    max_completion_tokens?: number;
    stop?: string | string[] | null;
    seed?: number;
    user?: string;
    stream?: boolean;
    response_format?: {
        type: "json_object";
    };
};

function normalizeStop(stopRaw?: string | string[] | null) {
    if (!stopRaw) return null;

    if (Array.isArray(stopRaw)) {
        const arr = stopRaw.map((x) => String(x).trim()).filter(Boolean).slice(0, 4);
        return arr.length ? arr : null;
    }

    const parts = String(stopRaw)
        .split(/\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);

    if (!parts.length) return null;
    return parts.length === 1 ? parts[0] : parts;
}

export function buildChatPayload({
                                     model,
                                     messages,
                                     temperature,
                                     top_p,
                                     max_completion_tokens,
                                     stop,
                                     seed,
                                     user,
                                     stream,
                                     response_format,
                                 }: GroqChatPayload): GroqChatPayload {
    const body: GroqChatPayload = {
        model,
        messages,
        stream: Boolean(stream),
    };

    if (temperature !== undefined && temperature !== null) {
        body.temperature = Number(temperature);
    }

    if (top_p !== undefined && top_p !== null) {
        body.top_p = Number(top_p);
    }

    if (max_completion_tokens !== undefined && max_completion_tokens !== null) {
        body.max_completion_tokens = Number(max_completion_tokens);
    }

    const stopNorm = normalizeStop(stop);
    if (stopNorm) body.stop = stopNorm;

    if (seed !== undefined && seed !== null && !Number.isNaN(Number(seed))) {
        body.seed = Number(seed);
    }

    if (user) {
        body.user = String(user);
    }

    if (response_format) {
        body.response_format = response_format;
    }

    return body;
}

function getGroqApiKey() {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error("Missing GROQ_API_KEY in environment.");
    }

    return apiKey;
}

export async function groqChatOnce({
                                       payload,
                                       signal,
                                   }: {
    payload: GroqChatPayload;
    signal?: AbortSignal;
}) {
    const apiKey = getGroqApiKey();

    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal,
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Groq error ${res.status}: ${text || res.statusText}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";

    return {
        content: typeof content === "string" ? content : JSON.stringify(content),
        usage: json?.usage ?? null,
        raw: json,
    };
}