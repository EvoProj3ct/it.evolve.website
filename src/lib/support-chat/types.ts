export type ApiChatRole = "system" | "user" | "assistant";
export type UiChatRole = "bot" | "user";

export type SupportChatProps = {
    open: boolean;
    onClose: () => void;
};

export type UiMessage = {
    id: string;
    role: UiChatRole;
    text?: string;
    typing?: boolean;
    ts: number;
};

export type ChatMessage = {
    role: ApiChatRole;
    content: string;
};

export type PromptPresetKey = "console_default" | "debug_tester";
export type CheckpointLight = "GREEN" | "ORANGE" | "RED";

export type LongMemoryState = {
    oldContext: string;
    lastSummarizedIndex: number;
};

export type CheckpointState = {
    orangeCount: number;
    closed: boolean;
};

export type SupportChatConfig = {
    greeting: string;

    model: string;
    temperature: number;
    top_p: number;
    max_completion_tokens: number;
    stream: boolean;
    historyTurns: number;

    promptPreset: PromptPresetKey;
    systemPrompt: string;
    preAssistant: string;

    enableLongMemory: boolean;
    longMemoryModel: string;
    longMemoryDecayTurns: number;
    longMemoryPrompt: string;

    enableCheckpoint: boolean;
    checkpointUseModel: boolean;
    checkpointModel: string;
    orangeLimit: number;
    orangeMessage: string;
    redMessage: string;
    checkpointPrompt: string;

    storage: {
        longMemoryKey: string;
        checkpointKey: string;
    };
};