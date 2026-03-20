"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

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