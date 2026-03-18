import type { ChatMessage, UiMessage } from "./types";

export function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function mapUiMessagesToChatMessages(messages: UiMessage[]): ChatMessage[] {
    return messages
        .filter((m) => !m.typing && typeof m.text === "string" && m.text.trim().length > 0)
        .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text!.trim(),
        }));
}

export function takeLastTurnsForAPI(allMessages: ChatMessage[], turns: number): ChatMessage[] {
    const ua = allMessages.filter(
        (m) => m.role === "user" || m.role === "assistant",
    );

    const safeTurns = Math.max(0, Number(turns) || 0);

    if (safeTurns === 0) {
        const lastUser = [...ua].reverse().find((m) => m.role === "user");
        return lastUser ? [lastUser] : [];
    }

    const want = safeTurns * 2;
    return ua.slice(Math.max(0, ua.length - want));
}

export function getAllUserAssistant(allMessages: ChatMessage[]): ChatMessage[] {
    return allMessages.filter(
        (m) => m.role === "user" || m.role === "assistant",
    );
}

export function safeJsonParse<T>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}