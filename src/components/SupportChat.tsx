"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

type SupportChatProps = {
    open: boolean;
    onClose: () => void;
};

type Msg = {
    id: string;
    role: "bot" | "user";
    text?: string;
    typing?: boolean;
    ts: number;
};

function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const BOT_GREETING =
    "Ciao, sono Leo, assistente virtuale di Evolve, come posso aiutarti?";

const BOT_FALLBACK_REPLY =
    "Perfetto — grazie! Al momento la chat non è disponibile. Lasciaci obiettivo, budget e tempistiche e ti ricontattiamo subito.";

function MessageText({ text }: { text: string }) {
    const normalized = text.replace(/\r\n/g, "\n").trim();

    if (!normalized) return null;

    const blocks = normalized.split(/\n{2,}/);

    return (
        <div className="supportChatBubbleText">
            {blocks.map((block, blockIndex) => {
                const lines = block.split("\n").filter(Boolean);

                const isBulletList = lines.every((line) => /^[-*]\s+/.test(line.trim()));
                const isNumberList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));

                if (isBulletList) {
                    return (
                        <ul key={blockIndex}>
                            {lines.map((line, i) => (
                                <li key={i}>{line.replace(/^[-*]\s+/, "")}</li>
                            ))}
                        </ul>
                    );
                }

                if (isNumberList) {
                    return (
                        <ol key={blockIndex}>
                            {lines.map((line, i) => (
                                <li key={i}>{line.replace(/^\d+\.\s+/, "")}</li>
                            ))}
                        </ol>
                    );
                }

                return (
                    <p key={blockIndex}>
                        {lines.map((line, i) => (
                            <React.Fragment key={i}>
                                {line}
                                {i < lines.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </p>
                );
            })}
        </div>
    );
}

export function SupportChat({ open, onClose }: SupportChatProps) {
    const [text, setText] = useState("");
    const [messages, setMessages] = useState<Msg[]>([]);
    const [isSending, setIsSending] = useState(false);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const timersRef = useRef<number[]>([]);

    const scrollToBottom = () => {
        const el = bodyRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    };

    useEffect(() => {
        if (!open) return;

        setMessages([
            { id: uid(), role: "bot", text: BOT_GREETING, ts: Date.now() },
        ]);
        setText("");
        setIsSending(false);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);

        const t = window.setTimeout(() => inputRef.current?.focus(), 0);
        timersRef.current.push(t);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (open) return;
        timersRef.current.forEach((t) => window.clearTimeout(t));
        timersRef.current = [];
    }, [open]);

    useEffect(() => {
        if (!open) return;
        scrollToBottom();
    }, [messages, open]);

    const sendBotReply = async (conversation: Msg[]) => {
        const typingId = uid();

        setMessages((prev) => [
            ...prev,
            { id: typingId, role: "bot", typing: true, ts: Date.now() },
        ]);

        try {
            const payloadMessages = conversation
                .filter((m) => !m.typing && typeof m.text === "string" && m.text.trim())
                .map((m) => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: m.text!.trim(),
                }));

            const res = await fetch("/api/support-chat/message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: payloadMessages,
                }),
            });

            if (!res.ok) {
                const raw = await res.text().catch(() => "");
                throw new Error(raw || `HTTP ${res.status}`);
            }

            const data = await res.json();
            const botText =
                typeof data?.text === "string" && data.text.trim()
                    ? data.text.trim()
                    : BOT_FALLBACK_REPLY;

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === typingId
                        ? { ...m, typing: false, text: botText }
                        : m
                )
            );
        } catch (error) {
            console.error("SupportChat API error:", error);

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === typingId
                        ? { ...m, typing: false, text: BOT_FALLBACK_REPLY }
                        : m
                )
            );
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const value = text.trim();
        if (!value || isSending) return;

        const userMessage: Msg = {
            id: uid(),
            role: "user",
            text: value,
            ts: Date.now(),
        };

        const nextConversation = [...messages, userMessage];

        setMessages(nextConversation);
        setText("");
        setIsSending(true);
        inputRef.current?.focus();

        try {
            await sendBotReply(nextConversation);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="supportChatOverlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="supportChatBackdrop" onClick={onClose} />

                    <motion.div
                        className="supportChatPanel"
                        initial={{ y: 10, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 10, opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Powered by Evolve AI"
                    >
                        <div className="supportChatHeader">
                            <div className="supportChatTitle">
                                Leo <span className="supportChatTitleSub">• Powered by Evolve AI</span>
                            </div>

                            <button
                                type="button"
                                className="supportChatClose"
                                onClick={onClose}
                                aria-label="Chiudi chat"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="supportChatBody" ref={bodyRef}>
                            {messages.map((m) => {
                                const isUser = m.role === "user";

                                return (
                                    <div key={m.id} className="supportChatRow">
                                        {isUser ? (
                                            <div className="supportChatSpacer" />
                                        ) : (
                                            <div className="supportChatAvatar">L</div>
                                        )}

                                        <div
                                            className={[
                                                "supportChatBubble",
                                                isUser ? "isUser" : "isBot",
                                                m.typing ? "isTyping" : "",
                                            ].join(" ")}
                                        >
                                            {m.typing ? (
                                                <span
                                                    className="supportChatTyping"
                                                    aria-label="Leo sta scrivendo"
                                                >
                          <span className="dot" />
                          <span className="dot" />
                          <span className="dot" />
                        </span>
                                            ) : (
                                                <MessageText text={m.text ?? ""} />
                                            )}
                                        </div>

                                        {isUser ? (
                                            <div className="supportChatAvatar isUser">TU</div>
                                        ) : (
                                            <div className="supportChatSpacer" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <form className="supportChatComposer" onSubmit={onSubmit}>
                            <input
                                ref={inputRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="supportChatInput"
                                placeholder="Scrivi un messaggio…"
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                className="supportChatSend"
                                aria-label="Invia"
                                disabled={!text.trim() || isSending}
                            >
                                ➤
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}