// settings.js — config storage + long memory storage + checkpoint storage + modal binding

import { groqListModels } from "./api.js";
import { PROMPT_PRESETS, AGENT_PROMPTS } from "./prompts.js";

const CONFIG_KEY = "groq8bit_config_v4";
const LONGMEM_KEY = "groq8bit_longmem_v1";
const CHECKPOINT_KEY = "groq8bit_checkpoint_v1";

// fallback (se /models fallisce). Non è “la verità”,
// la verità è /models che restituisce i modelli disponibili al tuo account.
const FALLBACK_MODEL_IDS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "groq/compound",
    "groq/compound-mini",
    "qwen/qwen3-32b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
];

export function defaultConfig(){
    return {
        // Groq
        apiKey: "",
        model: "openai/gpt-oss-120b",
        temperature: 0.6,
        top_p: 0.9,
        max_completion_tokens: 550,
        seed: "",
        stop: "",
        stream: true,

        // short memory
        historyTurns: 2,

        // prompts
        promptPreset: "console_default",
        systemPrompt: PROMPT_PRESETS.console_default.system,
        preAssistant: PROMPT_PRESETS.console_default.preAssistant,

        // debug
        debugSteps: true,

        // long memory
        enableLongMemory: true,
        longMemoryModel: "llama-3.1-8b-instant",
        longMemoryDecayTurns: 2,
        longMemoryPrompt: AGENT_PROMPTS.longMemoryDefault,

        // checkpoint
        enableCheckpoint: true,
        checkpointUseModel: true,
        checkpointModel: "llama-3.1-8b-instant",
        orangeLimit: 2,
        orangeMessage: "Puoi darmi maggiori dettagli sulla richiesta?",
        redMessage: "Mi dispiace, non posso aiutarti. Per ulteriori informazioni, puoi contattarci su infoevolvecompany@gmail.com.",
        checkpointPrompt: AGENT_PROMPTS.checkpointDefault,
    };
}

export function loadConfig(){
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaultConfig();
    try { return { ...defaultConfig(), ...JSON.parse(raw) }; }
    catch { return defaultConfig(); }
}

export function saveConfig(cfg){
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// --- Long memory store ---
export function loadLongMemory(){
    const raw = localStorage.getItem(LONGMEM_KEY);
    if (!raw) return { oldContext: "", lastSummarizedIndex: 0 };
    try {
        const obj = JSON.parse(raw);
        return {
            oldContext: obj?.oldContext || "",
            lastSummarizedIndex: Number(obj?.lastSummarizedIndex || 0),
        };
    } catch {
        return { oldContext: "", lastSummarizedIndex: 0 };
    }
}

export function saveLongMemory(mem){
    localStorage.setItem(LONGMEM_KEY, JSON.stringify({
        oldContext: String(mem?.oldContext || ""),
        lastSummarizedIndex: Number(mem?.lastSummarizedIndex || 0),
    }));
}

export function resetLongMemory(){
    localStorage.removeItem(LONGMEM_KEY);
}

// --- Checkpoint store ---
export function loadCheckpointState(){
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return { orangeCount: 0, closed: false };
    try {
        const obj = JSON.parse(raw);
        return {
            orangeCount: Number(obj?.orangeCount || 0),
            closed: !!obj?.closed,
        };
    } catch {
        return { orangeCount: 0, closed: false };
    }
}

export function saveCheckpointState(st){
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
        orangeCount: Number(st?.orangeCount || 0),
        closed: !!st?.closed,
    }));
}

export function resetCheckpointState(){
    localStorage.removeItem(CHECKPOINT_KEY);
}

// ---- UI helpers ----
function $(id){ return document.getElementById(id); }

function setSelectOptions(selectEl, ids, currentValue){
    if (!selectEl) return;
    const uniq = Array.from(new Set(ids)).filter(Boolean);
    selectEl.innerHTML = "";
    for (const id of uniq){
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = id;
        selectEl.appendChild(opt);
    }
    if (currentValue && uniq.includes(currentValue)) selectEl.value = currentValue;
    else if (uniq.length) selectEl.value = uniq[0];
}

function ensureValue(selectEl, value){
    if (!selectEl || !value) return;
    const exists = Array.from(selectEl.options).some(o => o.value === value);
    if (!exists){
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value + " (custom)";
        selectEl.insertBefore(opt, selectEl.firstChild);
        selectEl.value = value;
    }
}

function setPresetOptions(selectEl, current){
    if (!selectEl) return;
    selectEl.innerHTML = "";
    for (const [k,v] of Object.entries(PROMPT_PRESETS)){
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = v.name || k;
        selectEl.appendChild(opt);
    }
    if (current && PROMPT_PRESETS[current]) selectEl.value = current;
}

async function loadModelsIntoSelects({ apiKey, modelSelects, cfg }){
    // “tutti i modelli gratuiti” => in pratica: tutti i modelli disponibili al tuo account/API key.
    let ids = [];

    if (apiKey){
        try{
            const { ids: fetched } = await groqListModels({ apiKey });
            if (fetched?.length) ids = fetched;
        } catch (e){
            console.warn("Models fetch failed, using fallback.", e);
        }
    }

    if (!ids.length) ids = FALLBACK_MODEL_IDS.slice();

    const [mainSel, longSel, cpSel] = modelSelects;

    setSelectOptions(mainSel, ids, cfg.model);
    setSelectOptions(longSel, ids, cfg.longMemoryModel);
    setSelectOptions(cpSel, ids, cfg.checkpointModel);

    // preserva eventuali valori custom salvati
    ensureValue(mainSel, cfg.model);
    ensureValue(longSel, cfg.longMemoryModel);
    ensureValue(cpSel, cfg.checkpointModel);
}

// ---- Modal binding ----
export function bindSettingsModal({
                                      btnSettings,
                                      settingsBackdrop,
                                      btnCloseSettings,
                                      onSaved,
                                      onResetLongMemory,
                                      onResetCheckpoint
                                  }){
    const apiKeyInput = $("apiKey");
    const modelSelect = $("modelId");
    const tempInput = $("temperature");
    const topPInput = $("top_p");
    const maxTokInput = $("max_completion_tokens");
    const seedInput = $("seed");
    const stopInput = $("stop");
    const streamToggle = $("stream");
    const historyTurnsInput = $("historyTurns");
    const debugStepsToggle = $("debugSteps");

    const presetSelect = $("promptPreset");
    const systemTextarea = $("systemPrompt");
    const preAssistantTextarea = $("preAssistant");

    const enableLongMemory = $("enableLongMemory");
    const longMemoryModel = $("longMemoryModel");
    const longMemoryDecayTurns = $("longMemoryDecayTurns");
    const longMemoryPrompt = $("longMemoryPrompt");
    const oldContextView = $("oldContextView");
    const btnResetLongMemory = $("btnResetLongMemory");

    const enableCheckpoint = $("enableCheckpoint");
    const checkpointUseModel = $("checkpointUseModel");
    const checkpointModel = $("checkpointModel");
    const orangeLimit = $("orangeLimit");
    const orangeMessage = $("orangeMessage");
    const redMessage = $("redMessage");
    const checkpointPrompt = $("checkpointPrompt");
    const btnResetCheckpoint = $("btnResetCheckpoint");

    const btnReloadModels = $("btnReloadModels");

    function openSettings(){
        settingsBackdrop.classList.add("open");
        settingsBackdrop.setAttribute("aria-hidden","false");
    }
    function closeSettings(){
        settingsBackdrop.classList.remove("open");
        settingsBackdrop.setAttribute("aria-hidden","true");
    }

    function hydrateUI(cfg){
        if (apiKeyInput) apiKeyInput.value = cfg.apiKey || "";
        if (tempInput) tempInput.value = String(cfg.temperature);
        if (topPInput) topPInput.value = String(cfg.top_p);
        if (maxTokInput) maxTokInput.value = String(cfg.max_completion_tokens);
        if (seedInput) seedInput.value = String(cfg.seed || "");
        if (stopInput) stopInput.value = String(cfg.stop || "");
        if (streamToggle) streamToggle.checked = !!cfg.stream;
        if (historyTurnsInput) historyTurnsInput.value = String(cfg.historyTurns);
        if (debugStepsToggle) debugStepsToggle.checked = !!cfg.debugSteps;

        setPresetOptions(presetSelect, cfg.promptPreset);
        if (systemTextarea) systemTextarea.value = cfg.systemPrompt || "";
        if (preAssistantTextarea) preAssistantTextarea.value = cfg.preAssistant || "";

        if (enableLongMemory) enableLongMemory.checked = !!cfg.enableLongMemory;
        if (longMemoryDecayTurns) longMemoryDecayTurns.value = String(cfg.longMemoryDecayTurns ?? 8);
        if (longMemoryPrompt) longMemoryPrompt.value = cfg.longMemoryPrompt || AGENT_PROMPTS.longMemoryDefault;

        if (enableCheckpoint) enableCheckpoint.checked = !!cfg.enableCheckpoint;
        if (checkpointUseModel) checkpointUseModel.checked = !!cfg.checkpointUseModel;
        if (orangeLimit) orangeLimit.value = String(cfg.orangeLimit ?? 2);
        if (orangeMessage) orangeMessage.value = cfg.orangeMessage || "";
        if (redMessage) redMessage.value = cfg.redMessage || "";
        if (checkpointPrompt) checkpointPrompt.value = cfg.checkpointPrompt || AGENT_PROMPTS.checkpointDefault;

        const mem = loadLongMemory();
        if (oldContextView) oldContextView.value = mem.oldContext || "";

        loadModelsIntoSelects({
            apiKey: cfg.apiKey,
            modelSelects: [modelSelect, longMemoryModel, checkpointModel],
            cfg
        }).catch(console.warn);
    }

    function readUIIntoConfig(cfg){
        const next = { ...cfg };

        if (apiKeyInput) next.apiKey = apiKeyInput.value.trim();
        if (modelSelect) next.model = modelSelect.value;

        if (tempInput) next.temperature = Number(tempInput.value);
        if (topPInput) next.top_p = Number(topPInput.value);
        if (maxTokInput) next.max_completion_tokens = Number(maxTokInput.value);

        if (seedInput) next.seed = seedInput.value.trim();
        if (stopInput) next.stop = stopInput.value;
        if (streamToggle) next.stream = !!streamToggle.checked;

        if (historyTurnsInput) next.historyTurns = Math.max(0, Number(historyTurnsInput.value) || 0);
        if (debugStepsToggle) next.debugSteps = !!debugStepsToggle.checked;

        if (presetSelect) next.promptPreset = presetSelect.value;
        if (systemTextarea) next.systemPrompt = systemTextarea.value;
        if (preAssistantTextarea) next.preAssistant = preAssistantTextarea.value;

        if (enableLongMemory) next.enableLongMemory = !!enableLongMemory.checked;
        if (longMemoryModel) next.longMemoryModel = longMemoryModel.value;
        if (longMemoryDecayTurns) next.longMemoryDecayTurns = Math.max(0, Number(longMemoryDecayTurns.value) || 0);
        if (longMemoryPrompt) next.longMemoryPrompt = longMemoryPrompt.value;

        if (enableCheckpoint) next.enableCheckpoint = !!enableCheckpoint.checked;
        if (checkpointUseModel) next.checkpointUseModel = !!checkpointUseModel.checked;
        if (checkpointModel) next.checkpointModel = checkpointModel.value;
        if (orangeLimit) next.orangeLimit = Math.max(1, Number(orangeLimit.value) || 2);
        if (orangeMessage) next.orangeMessage = orangeMessage.value;
        if (redMessage) next.redMessage = redMessage.value;
        if (checkpointPrompt) next.checkpointPrompt = checkpointPrompt.value;

        return next;
    }

    // preset change -> se textarea vuota o uguale a un preset, rimpiazza
    if (presetSelect && systemTextarea){
        presetSelect.addEventListener("change", () => {
            const preset = PROMPT_PRESETS[presetSelect.value] || PROMPT_PRESETS.console_default;
            const current = systemTextarea.value.trim();
            const matchesAnyPreset = Object.values(PROMPT_PRESETS).some(p => (p.system||"").trim() === current);
            if (!current || matchesAnyPreset) systemTextarea.value = preset.system;
        });
    }

    // open
    btnSettings.addEventListener("click", () => {
        const cfg = loadConfig();
        hydrateUI(cfg);
        openSettings();
    });

    // close/save
    btnCloseSettings.addEventListener("click", () => {
        const cfg = loadConfig();
        const next = readUIIntoConfig(cfg);
        saveConfig(next);
        closeSettings();
        onSaved?.(next);

        // refresh OLD_CONTEXT view
        const mem = loadLongMemory();
        if (oldContextView) oldContextView.value = mem.oldContext || "";
    });

    // click outside
    settingsBackdrop.addEventListener("click", (e) => {
        if (e.target === settingsBackdrop) btnCloseSettings.click();
    });

    // reload models
    if (btnReloadModels){
        btnReloadModels.addEventListener("click", async () => {
            const cfg = loadConfig();
            if (apiKeyInput) cfg.apiKey = apiKeyInput.value.trim();
            saveConfig(cfg);

            await loadModelsIntoSelects({
                apiKey: cfg.apiKey,
                modelSelects: [modelSelect, longMemoryModel, checkpointModel],
                cfg
            });

            const refreshed = readUIIntoConfig(cfg);
            saveConfig(refreshed);

            const mem = loadLongMemory();
            if (oldContextView) oldContextView.value = mem.oldContext || "";
        });
    }

    // reset long memory
    if (btnResetLongMemory){
        btnResetLongMemory.addEventListener("click", () => {
            onResetLongMemory?.();
            const mem = loadLongMemory();
            if (oldContextView) oldContextView.value = mem.oldContext || "";
        });
    }

    // reset checkpoint
    if (btnResetCheckpoint){
        btnResetCheckpoint.addEventListener("click", () => {
            onResetCheckpoint?.();
        });
    }
}