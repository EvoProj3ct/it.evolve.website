// api.js — Groq Chat Completions via fetch (browser) + streaming SSE + models list
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function safeJsonParse(text) {
    try { return JSON.parse(text); } catch { return null; }
}

function normalizeStop(stopRaw) {
    if (!stopRaw) return null;
    const parts = String(stopRaw)
        .split(/\n|,/g)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 4);
    if (parts.length === 0) return null;
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
                                     stream
                                 }){
    const body = {
        model,
        messages,
        stream: !!stream,
    };

    if (temperature !== null && temperature !== undefined) body.temperature = Number(temperature);
    if (top_p !== null && top_p !== undefined) body.top_p = Number(top_p);
    if (max_completion_tokens !== null && max_completion_tokens !== undefined) body.max_completion_tokens = Number(max_completion_tokens);

    const stopNorm = normalizeStop(stop);
    if (stopNorm) body.stop = stopNorm;

    if (seed !== null && seed !== undefined && seed !== "") body.seed = Number(seed);
    if (user) body.user = String(user);

    return body;
}

export async function groqChatOnce({ apiKey, payload, signal }){
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} — ${text || res.statusText}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage || null;

    return { content, usage, headers: res.headers, raw: json };
}

export async function groqChatStream({ apiKey, payload, onToken, onDone, signal }){
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...payload, stream: true }),
        signal,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} — ${text || res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let full = "";
    let lastUsage = null;

    while (true){
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts){
            const lines = part.split("\n");
            for (const line of lines){
                const l = line.trim();
                if (!l.startsWith("data:")) continue;

                const data = l.slice(5).trim();
                if (data === "[DONE]") {
                    onDone?.(full);
                    return { content: full, usage: lastUsage, headers: res.headers };
                }

                const parsed = safeJsonParse(data);

                // alcuni provider possono includere usage verso fine stream
                if (parsed?.usage) lastUsage = parsed.usage;

                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length){
                    full += delta;
                    onToken?.(delta, full);
                }
            }
        }
    }

    onDone?.(full);
    return { content: full, usage: lastUsage, headers: res.headers };
}

// GET /models (OpenAI-compatible)
export async function groqListModels({ apiKey, signal }){
    const res = await fetch(`${GROQ_BASE_URL}/models`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiKey}` },
        signal,
    });

    if (!res.ok){
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} — ${text || res.statusText}`);
    }

    const json = await res.json();
    // OpenAI-style: { data: [{id,...}, ...] }
    const ids = (json?.data || [])
        .map(x => x?.id)
        .filter(Boolean)
        .sort((a,b)=>a.localeCompare(b));

    return { ids, raw: json };
}