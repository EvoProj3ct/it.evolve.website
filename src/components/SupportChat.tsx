"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import styles from "./SupportChat.module.css";

import { supportChatApi } from "@/lib/support-chat/client";
import { supportChatConfig } from "@/lib/support-chat/config";
import {
    loadCheckpointState,
    loadLongMemory,
    resetCheckpointState,
    resetLongMemory,
    saveCheckpointState,
    saveLongMemory,
} from "@/lib/support-chat/storage";
import type { SupportChatProps, UiMessage } from "@/lib/support-chat/types";
import {
    getAllUserAssistant,
    mapUiMessagesToChatMessages,
    uid,
} from "@/lib/support-chat/utils";

const BOT_GREETING = supportChatConfig.greeting;

const BOT_FALLBACK_REPLY =
    "Perfetto, grazie. Al momento non riesco a rispondere bene. Se vuoi, scrivici obiettivo, budget e tempistiche e ti ricontattiamo subito.";

function LeoMark() {
    return (
        <svg className={styles.leoMark} width="22" height="20" viewBox="-10 -10 20 18" fill="none" aria-hidden="true" focusable="false">
            <path d="M-4-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H-3V6H-6V8H-10V-4H-8V-6H-6V-8H-4Z" fill="currentColor" />
            <path d="M-6-2h4v5h-4zm8 0h4v5H2Z" fill="#fcfdfb" />
            <path d="M-4 0h2v2h-2zm8 0h2v2H4Z" fill="#101914" />
        </svg>
    );
}

function MessageText({ text }: { text: string }) {
    const normalized = text.replace(/\r\n/g, "\n").trim();

    if (!normalized) return null;

    const blocks = normalized.split(/\n{2,}/);

    return (
        <div className={styles.bubbleText}>
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
    const reduceMotion = useReducedMotion();
    const [text, setText] = useState("");
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [isSending, setIsSending] = useState(false);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const timersRef = useRef<number[]>([]);

    const scrollToBottom = () => {
        const el = bodyRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    };

    const replaceTypingMessage = (typingId: string, textValue: string) => {
        setMessages((prev) =>
            prev.map((m) =>
                m.id === typingId
                    ? { ...m, typing: false, text: textValue }
                    : m
            )
        );
    };

    useEffect(() => {
        if (!open) return;

        resetLongMemory(supportChatConfig.storage.longMemoryKey);
        resetCheckpointState(supportChatConfig.storage.checkpointKey);

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

    const sendBotReply = async (conversation: UiMessage[]) => {
        const typingId = uid();

        setMessages((prev) => [
            ...prev,
            { id: typingId, role: "bot", typing: true, ts: Date.now() },
        ]);

        try {
            const allMessages = mapUiMessagesToChatMessages(conversation);
            const uaMessages = getAllUserAssistant(allMessages);

            const lastUserText =
                [...allMessages].reverse().find((m) => m.role === "user")?.content ?? "";

            let memory = loadLongMemory(supportChatConfig.storage.longMemoryKey);
            let checkpoint = loadCheckpointState(supportChatConfig.storage.checkpointKey);

            if (checkpoint.closed) {
                replaceTypingMessage(typingId, supportChatConfig.redMessage);
                return;
            }

            if (supportChatConfig.enableCheckpoint) {
                const cp = await supportChatApi.checkpoint({
                    messages: allMessages,
                    userText: lastUserText,
                    oldContext: memory.oldContext,
                });

                if (cp.light === "RED") {
                    checkpoint = {
                        orangeCount: checkpoint.orangeCount,
                        closed: true,
                    };

                    saveCheckpointState(
                        supportChatConfig.storage.checkpointKey,
                        checkpoint
                    );

                    replaceTypingMessage(typingId, supportChatConfig.redMessage);
                    return;
                }

                if (cp.light === "ORANGE") {
                    const orangeCount = Number(checkpoint.orangeCount || 0) + 1;
                    const closed = orangeCount >= supportChatConfig.orangeLimit;

                    checkpoint = {
                        orangeCount,
                        closed,
                    };

                    saveCheckpointState(
                        supportChatConfig.storage.checkpointKey,
                        checkpoint
                    );

                    replaceTypingMessage(
                        typingId,
                        closed
                            ? supportChatConfig.redMessage
                            : supportChatConfig.orangeMessage
                    );
                    return;
                }

                checkpoint = {
                    orangeCount: 0,
                    closed: false,
                };

                saveCheckpointState(
                    supportChatConfig.storage.checkpointKey,
                    checkpoint
                );
            }

            if (supportChatConfig.enableLongMemory) {
                const unsummarizedCount =
                    uaMessages.length - Number(memory.lastSummarizedIndex || 0);

                if (
                    unsummarizedCount >=
                    Math.max(1, supportChatConfig.longMemoryDecayTurns) * 2
                ) {
                    const nextMemory = await supportChatApi.longMemory({
                        messages: allMessages,
                        memory,
                    });

                    if (
                        nextMemory &&
                        typeof nextMemory.oldContext === "string"
                    ) {
                        memory = nextMemory;
                        saveLongMemory(
                            supportChatConfig.storage.longMemoryKey,
                            memory
                        );
                    }
                }
            }

            const reply = await supportChatApi.message({
                messages: allMessages,
                oldContext: memory.oldContext,
            });

            replaceTypingMessage(
                typingId,
                String(reply?.text ?? "").trim() || BOT_FALLBACK_REPLY
            );
        } catch (error) {
            console.error("SupportChat pipeline error:", error);
            replaceTypingMessage(typingId, BOT_FALLBACK_REPLY);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const value = text.trim();
        if (!value || isSending) return;

        const userMessage: UiMessage = {
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
                    className={styles.overlay}
                    initial={{ opacity: reduceMotion ? 1 : 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: reduceMotion ? 1 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.22 }}
                >
                    <div className={styles.backdrop} onClick={onClose} />

                    <motion.div
                        className={styles.panel}
                        initial={{ y: reduceMotion ? 0 : 14, opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: reduceMotion ? 0 : 8, opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.99 }}
                        transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="support-chat-title"
                    >
                        <div className={styles.header}>
                            <div className={styles.identity}>
                                <span className={styles.leoBadge}><LeoMark /></span>
                                <div>
                                    <div id="support-chat-title" className={styles.title}>Chiedilo a Leo</div>
                                    <div className={styles.subtitle}>Powered by Evolve IA</div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className={styles.close}
                                onClick={onClose}
                                aria-label="Chiudi chat"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" /></svg>
                            </button>
                        </div>

                        <div className={styles.body} ref={bodyRef} role="log" aria-label="Conversazione con Leo">
                            {messages.map((m) => {
                                const isUser = m.role === "user";

                                return (
                                    <div key={m.id} className={styles.row}>
                                        {isUser ? (
                                            <div className={styles.spacer} />
                                        ) : (
                                            <div className={styles.avatar}><LeoMark /></div>
                                        )}

                                        <div
                                            className={[
                                                styles.bubble,
                                                isUser ? styles.userBubble : styles.botBubble,
                                                m.typing ? styles.typingBubble : "",
                                            ].join(" ")}
                                        >
                                            {m.typing ? (
                                                <span
                                                    className={styles.typing}
                                                    aria-label="Leo sta scrivendo"
                                                >
                                                    <span />
                                                    <span />
                                                    <span />
                                                </span>
                                            ) : (
                                                <MessageText text={m.text ?? ""} />
                                            )}
                                        </div>

                                        {isUser ? (
                                            <div className={`${styles.avatar} ${styles.userAvatar}`}>TU</div>
                                        ) : (
                                            <div className={styles.spacer} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <form className={styles.composer} onSubmit={onSubmit}>
                            <input
                                ref={inputRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className={styles.input}
                                placeholder="Scrivi un messaggio…"
                                aria-label="Scrivi un messaggio a Leo"
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                className={styles.send}
                                aria-label="Invia"
                                disabled={!text.trim() || isSending}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
