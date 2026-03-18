import type {
    ChatMessage,
    CheckpointLight,
    LongMemoryState,
} from "./types";

type CheckpointResponse = {
    light: CheckpointLight;
    reason?: string;
};

type MessageResponse = {
    text: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
    }

    return (await res.json()) as T;
}

export const supportChatApi = {
    checkpoint(payload: {
        messages: ChatMessage[];
        userText: string;
        oldContext: string;
    }) {
        return postJson<CheckpointResponse>("/api/support-chat/checkpoint", payload);
    },

    longMemory(payload: {
        messages: ChatMessage[];
        memory: LongMemoryState;
    }) {
        return postJson<LongMemoryState>("/api/support-chat/long-memory", payload);
    },

    message(payload: {
        messages: ChatMessage[];
        oldContext: string;
    }) {
        return postJson<MessageResponse>("/api/support-chat/message", payload);
    },
};