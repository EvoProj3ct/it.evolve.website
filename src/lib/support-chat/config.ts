import { AGENT_PROMPTS, PROMPT_PRESETS } from "./prompts";
import type { SupportChatConfig } from "./types";

export const supportChatConfig: SupportChatConfig = {
    greeting: "Ciao, sono Leo, assistente virtuale di Evolve, come posso aiutarti?",

    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    top_p: 1,
    max_completion_tokens: 120,
    stream: false,
    historyTurns: 8,

    promptPreset: "console_default",
    systemPrompt: PROMPT_PRESETS.console_default.system,
    preAssistant: PROMPT_PRESETS.console_default.preAssistant,

    enableLongMemory: true,
    longMemoryModel: "llama-3.1-8b-instant",
    longMemoryDecayTurns: 2,
    longMemoryPrompt: AGENT_PROMPTS.longMemoryDefault,

    enableCheckpoint: true,
    checkpointUseModel: true,
    checkpointModel: "llama-3.1-8b-instant",
    orangeLimit: 2,
    orangeMessage: "⚠️ Quasi fuori contesto. Puoi riformulare meglio la richiesta?",
    redMessage: "⛔ Conversazione fuori contesto. Ricominciamo da una richiesta legata ai servizi Evolve.",
    checkpointPrompt: AGENT_PROMPTS.checkpointDefault,

    storage: {
        longMemoryKey: "support_chat_long_memory_v1",
        checkpointKey: "support_chat_checkpoint_v1",
    },
};