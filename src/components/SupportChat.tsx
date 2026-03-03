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

const BOT_STANDARD_REPLY =
    "Perfetto — grazie! Per ora questa chat è in modalità demo. Lasciami i dettagli (obiettivo, budget, tempistiche) e ti ricontattiamo subito.";

export function SupportChat({ open, onClose }: SupportChatProps) {
    const [text, setText] = useState("");
    const [messages, setMessages] = useState<Msg[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const timersRef = useRef<number[]>([]);

    const scrollToBottom = () => {
        const el = bodyRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    };

    // init/reset when opening
    useEffect(() => {
        if (!open) return;

        setMessages([
            { id: uid(), role: "bot", text: BOT_GREETING, ts: Date.now() },
        ]);
        setText("");

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

    // cleanup timers on close
    useEffect(() => {
        if (open) return;
        timersRef.current.forEach((t) => window.clearTimeout(t));
        timersRef.current = [];
    }, [open]);

    // auto scroll
    useEffect(() => {
        if (!open) return;
        scrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, open]);

    const sendBotStandardReply = () => {
        const typingId = uid();

        setMessages((prev) => [
            ...prev,
            { id: typingId, role: "bot", typing: true, ts: Date.now() },
        ]);

        const t1 = window.setTimeout(() => {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === typingId
                        ? { ...m, typing: false, text: BOT_STANDARD_REPLY }
                        : m
                )
            );
        }, 950);

        timersRef.current.push(t1);
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;

        setMessages((prev) => [
            ...prev,
            { id: uid(), role: "user", text: value, ts: Date.now() },
        ]);

        setText("");
        inputRef.current?.focus();

        sendBotStandardReply();
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
                                 Leo <span className="supportChatTitleSub">• Powered by Evolve AI </span>
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
                                        {/* col 1 */}
                                        {isUser ? (
                                            <div className="supportChatSpacer" />
                                        ) : (
                                            <div className="supportChatAvatar">L</div>
                                        )}

                                        {/* col 2 */}
                                        <div
                                            className={[
                                                "supportChatBubble",
                                                isUser ? "isUser" : "isBot",
                                                m.typing ? "isTyping" : "",
                                            ].join(" ")}
                                        >
                                            {m.typing ? (
                                                <span className="supportChatTyping" aria-label="Leo sta scrivendo">
                          <span className="dot" />
                          <span className="dot" />
                          <span className="dot" />
                        </span>
                                            ) : (
                                                m.text
                                            )}
                                        </div>

                                        {/* col 3 */}
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
                            />
                            <button
                                type="submit"
                                className="supportChatSend"
                                aria-label="Invia"
                                disabled={!text.trim()}
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