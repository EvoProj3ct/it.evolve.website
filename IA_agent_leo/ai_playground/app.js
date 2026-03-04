import { groqChatOnce, groqChatStream, buildChatPayload } from "./api.js";
import { PROMPT_PRESETS, buildMessages, withOldContext } from "./prompts.js";
import {
    loadConfig,
    saveConfig,
    loadLongMemory,
    saveLongMemory,
    resetLongMemory,
    loadCheckpointState,
    saveCheckpointState,
    resetCheckpointState,
    bindSettingsModal
} from "./settings.js";
import { recordUsage, extractRateLimitFromHeaders, getUsageLedger } from "./meter.js";
import { createDebug } from "./debug.js";

/*****************************************************************
 * Canvas Chat + Groq integration (LOCAL ONLY)
 * Agent pipeline:
 * 0) (optional) Checkpointer -> GREEN/ORANGE/RED
 * 1) (optional) LongMemory summarizer -> updates OLD_CONTEXT when chat grows
 * 2) Main model -> answer (stream/non-stream)
 *
 * Debug: sidebar a destra (collassabile, non perde log)
 * Export: report in tab nuova (print -> salva come PDF)
 *****************************************************************/

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function getCssVar(name, fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
}
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
const $ = (id) => document.getElementById(id);

function safeJsonParse(s){
    try { return JSON.parse(s); } catch { return null; }
}

document.addEventListener("DOMContentLoaded", () => {
    // DOM base
    const canvas = $("chatCanvas");
    const ctx = canvas?.getContext("2d");
    const statusChip = $("statusChip");
    const msgInput = $("msgInput");
    const btnSend = $("btnSend");

    const btnSettings = $("btnSettings");
    const settingsBackdrop = $("settingsBackdrop");
    const btnCloseSettings = $("btnCloseSettings");

    const btnExport = $("btnExport");

    const bgColor = $("bgColor");
    const fgColor = $("fgColor");
    const accentColor = $("accentColor");
    const scaleRange = $("scaleRange");
    const scaleVal = $("scaleVal");

    const crtOverlay = $("crtOverlay");
    const toggleCRT = $("toggleCRT");
    const toggleSFX = $("toggleSFX");
    const toggleBoot = $("toggleBoot");

    const btnClear = $("btnClear");
    const btnDemo = $("btnDemo");

    // Debug DOM
    const debugSide = $("debugSide");
    const debugLogEl = $("debugLog");
    const btnClearDebug = $("btnClearDebug");
    const btnToggleDebug = $("btnToggleDebug");

    const required = { canvas, ctx, statusChip, msgInput, btnSend, btnSettings, settingsBackdrop, btnCloseSettings, debugSide, debugLogEl };
    for (const [k,v] of Object.entries(required)){
        if (!v){
            alert(`Errore: elemento DOM mancante: ${k}. Controlla gli id in index.html`);
            return;
        }
    }

    // Debug instance
    const dbg = createDebug({
        enabled: true,
        logEl: debugLogEl,
        persist: true
    });

    btnClearDebug?.addEventListener("click", () => dbg.clear());

    // sidebar collapse state
    const DEBUG_COLLAPSE_KEY = "groq8bit_debug_collapsed_v1";
    function setDebugCollapsed(v){
        debugSide.classList.toggle("collapsed", !!v);
        try { localStorage.setItem(DEBUG_COLLAPSE_KEY, v ? "1" : "0"); } catch {}
        if (btnToggleDebug) btnToggleDebug.textContent = v ? "Show" : "Hide";
    }
    const collapsedInit = (localStorage.getItem(DEBUG_COLLAPSE_KEY) === "1");
    setDebugCollapsed(collapsedInit);

    btnToggleDebug?.addEventListener("click", () => {
        const next = !debugSide.classList.contains("collapsed");
        setDebugCollapsed(next);
    });

    // Error visibility
    window.addEventListener("error", (e) => {
        console.error("JS ERROR:", e.error || e.message);
        statusChip.textContent = "errore-js";
        alert("Errore JS: " + (e?.error?.message || e.message || "unknown"));
    });

    // state
    const state = {
        theme: {
            bg: getCssVar("--bg", "#0b1020"),
            fg: getCssVar("--fg", "#b9ffb2"),
            accent: getCssVar("--accent", "#ffd166"),
        },
        pixelScale: Number(getCssVar("--scale", "2")) || 2,
        fx: { crt:true, sfx:true, boot:true },

        messages: [],
        pending: false,
        pendingDots: 0,
        scrollY: 0,
        maxScrollY: 0,
        abortController: null,

        longMem: loadLongMemory(),         // {oldContext, lastSummarizedIndex}
        checkpoint: loadCheckpointState(), // {orangeCount, closed}
    };

    // ---------- canvas helpers ----------
    function setFont(){
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textBaseline = "top";
    }
    function wrapText(text, maxWidth){
        const words = String(text).split(/\s+/);
        const lines = [];
        let line = "";
        for (const w of words){
            const test = line ? (line + " " + w) : w;
            if (ctx.measureText(test).width <= maxWidth) line = test;
            else {
                if (line) lines.push(line);
                if (ctx.measureText(w).width > maxWidth){
                    let chunk = "";
                    for (const ch of w){
                        const t = chunk + ch;
                        if (ctx.measureText(t).width <= maxWidth) chunk = t;
                        else { if (chunk) lines.push(chunk); chunk = ch; }
                    }
                    line = chunk;
                } else line = w;
            }
        }
        if (line) lines.push(line);
        return lines;
    }
    function hexToRgb(hex){
        const h = hex.replace("#","").trim();
        const full = h.length === 3 ? h.split("").map(c=>c+c).join("") : h;
        const num = parseInt(full,16);
        return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 };
    }
    function colorMix(hexA, hexB, t){
        const a = hexToRgb(hexA), b = hexToRgb(hexB);
        const r = Math.round(a.r + (b.r-a.r)*t);
        const g = Math.round(a.g + (b.g-a.g)*t);
        const bb= Math.round(a.b + (b.b-a.b)*t);
        return `rgb(${r},${g},${bb})`;
    }
    function getNums(){
        return {
            pad: Number(getCssVar("--padding","12")),
            lineH: Number(getCssVar("--lineHeight","22")),
            maxBubbleW: Number(getCssVar("--maxBubbleWidth","420")),
            bpx: Number(getCssVar("--bubblePadX","10")),
            bpy: Number(getCssVar("--bubblePadY","8")),
        };
    }
    function drawPixelPanel(x,y,w,h, fill, stroke){
        ctx.fillStyle = fill;
        ctx.fillRect(x,y,w,h);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1,y+1,w-2,h-2);
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(x+2,y+2,w-4,h-4);
        ctx.globalAlpha = 1;
    }
    function drawRoleBadge(role, x, y, bubbleW, bubbleH, stroke, bgBase){
        const label = role === "user" ? "TU" : role === "assistant" ? "AI" : "SYS";
        const pad = 4, badgeH = 16;
        const badgeW = Math.max(30, Math.ceil(ctx.measureText(label).width) + 10);
        const bx = x + bubbleW - badgeW - pad;
        const by = y + bubbleH - badgeH - pad;
        drawPixelPanel(
            bx, by, badgeW, badgeH,
            colorMix(bgBase, "#000", 0.22),
            colorMix(stroke, "#fff", 0.10)
        );
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = colorMix(stroke, "#fff", 0.35);
        ctx.fillText(label, bx + 6, by + 2);
        ctx.globalAlpha = 1;
    }
    function drawScrollbar(W,H,pad){
        const contentH = H - pad*2;
        if (state.maxScrollY <= 0) return;
        const trackW = 8;
        const x = W - pad - trackW;
        const y = pad;

        ctx.globalAlpha = 0.55;
        drawPixelPanel(x, y, trackW, contentH, "rgba(0,0,0,.18)", colorMix(state.theme.bg, state.theme.fg, 0.15));
        ctx.globalAlpha = 1;

        const ratio = clamp(contentH / (contentH + state.maxScrollY), 0.08, 1);
        const thumbH = Math.max(18, Math.floor(contentH * ratio));
        const t = state.scrollY / state.maxScrollY;
        const thumbY = y + Math.floor((contentH - thumbH) * t);

        drawPixelPanel(
            x + 1, thumbY, trackW - 2, thumbH,
            colorMix(state.theme.bg, state.theme.accent, 0.18),
            colorMix(state.theme.bg, state.theme.accent, 0.50)
        );
    }
    function computeContentHeight(blocks){
        setFont();
        const W = canvas.width;
        const { pad, lineH, maxBubbleW, bpx, bpy } = getNums();
        const bubbleW = clamp(maxBubbleW, 220, W - pad*2);
        const textMaxW = bubbleW - bpx*2;

        let total = 0;
        for (const block of blocks){
            const lines = wrapText(block.text || "", textMaxW);
            const textH = lines.length * lineH;
            const bubbleH = bpy*2 + textH;
            total += bubbleH + 10;
        }
        total += pad*2;
        return total;
    }

    function render(){
        const W = canvas.width, H = canvas.height;
        const { pad, lineH, maxBubbleW, bpx, bpy } = getNums();

        const blocks = [...state.messages];
        if (state.pending){
            const dots = ".".repeat((state.pendingDots % 3) + 1);
            blocks.push({ role:"assistant", text:dots, enteredAt: performance.now() - 120 });
        }

        const contentHeight = computeContentHeight(blocks);
        state.maxScrollY = Math.max(0, contentHeight - H);
        state.scrollY = clamp(state.scrollY, 0, state.maxScrollY);

        ctx.clearRect(0,0,W,H);
        ctx.fillStyle = state.theme.bg;
        ctx.fillRect(0,0,W,H);

        ctx.globalAlpha = 0.06;
        ctx.fillStyle = "#000";
        for (let y=0; y<H; y+=2) ctx.fillRect(0,y,W,1);
        ctx.globalAlpha = 1;

        setFont();

        let cursorY = pad - state.scrollY;

        for (const block of blocks){
            const isUser = block.role === "user";
            const isSystem = block.role === "system";

            const bubbleW = clamp(maxBubbleW, 220, W - pad*2);
            const textMaxW = bubbleW - bpx*2;

            const lines = wrapText(block.text || "", textMaxW);
            const textH = lines.length * lineH;
            const bubbleH = bpy*2 + textH;

            const x = isUser ? (W - pad - bubbleW) : pad;
            const y = cursorY;

            if (y > H + 30) break;
            if (y + bubbleH >= -40){
                const base = state.theme.bg;
                const fg = state.theme.fg;
                const accent = state.theme.accent;

                let bubbleBg, bubbleStroke, bubbleText;
                if (isSystem){
                    bubbleBg = colorMix(base, "#ffffff", 0.06);
                    bubbleStroke = colorMix(base, accent, 0.35);
                    bubbleText = colorMix(fg, "#ffffff", 0.10);
                } else if (isUser){
                    bubbleBg = colorMix(base, accent, 0.18);
                    bubbleStroke = colorMix(base, accent, 0.55);
                    bubbleText = colorMix(fg, "#ffffff", 0.08);
                } else {
                    bubbleBg = colorMix(base, "#000000", 0.10);
                    bubbleStroke = colorMix(base, fg, 0.28);
                    bubbleText = fg;
                }

                let alpha = 1;
                if ((block.enteredAt != null) && state.scrollY < 6){
                    const age = (performance.now() - block.enteredAt) / 160;
                    alpha = clamp(easeOutCubic(age), 0, 1);
                }

                ctx.globalAlpha = alpha;
                drawPixelPanel(x, y, bubbleW, bubbleH, bubbleBg, bubbleStroke);

                ctx.fillStyle = bubbleText;
                let ty = y + bpy;
                for (const ln of lines){
                    ctx.fillText(ln, x + bpx, ty);
                    ty += lineH;
                }
                ctx.globalAlpha = 1;

                drawRoleBadge(block.role, x, y, bubbleW, bubbleH, bubbleStroke, base);
            }

            cursorY += bubbleH + 10;
        }

        drawScrollbar(W,H,pad);
    }

    function resizeCanvas(){
        const wrap = canvas.getBoundingClientRect();
        const s = state.pixelScale;
        canvas.width = Math.max(360, Math.floor(wrap.width / s));
        canvas.height = Math.max(260, Math.floor(wrap.height / s));
        ctx.setTransform(1,0,0,1,0,0);
        ctx.imageSmoothingEnabled = false;
        render();
    }

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);
    window.addEventListener("resize", resizeCanvas);

    canvas.addEventListener("wheel", (e) => {
        if (state.maxScrollY <= 0) return;
        e.preventDefault();
        state.scrollY = clamp(state.scrollY + e.deltaY * 0.9, 0, state.maxScrollY);
        render();
    }, { passive:false });

    // ---------- chat helpers ----------
    function addMessage(role, text){
        state.messages.push({ role, text, enteredAt: performance.now() });
        if (state.scrollY < 6){
            render();
            state.scrollY = state.maxScrollY;
        }
        render();
    }

    function updateLastAssistantText(newText){
        for (let i=state.messages.length-1; i>=0; i--){
            if (state.messages[i].role === "assistant"){
                state.messages[i].text = newText;
                break;
            }
        }
        render();
    }

    function takeLastTurnsForAPI(allMessages, turns){
        const ua = allMessages
            .filter(m => m.role === "user" || m.role === "assistant")
            .map(m => ({ role: m.role, content: m.text }));

        const t = Math.max(0, Number(turns) || 0);
        if (t === 0){
            const lastUser = [...ua].reverse().find(m => m.role === "user");
            return lastUser ? [lastUser] : [];
        }
        const want = t * 2;
        return ua.slice(Math.max(0, ua.length - want));
    }

    function getAllUserAssistant(allMessages){
        return allMessages
            .filter(m => m.role === "user" || m.role === "assistant")
            .map(m => ({ role: m.role, content: m.text }));
    }

    // ---------- debug helpers ----------
    function dlog(cfg, text){
        // logging è governato dal cfg.debugSteps (non dalla visibilità sidebar)
        dbg.setEnabled(!!cfg.debugSteps);
        if (!cfg.debugSteps) return;
        dbg.log(text);
    }

    function dlogUsage(cfg, stage, model, usage, rateLimit){
        if (!cfg.debugSteps) return;
        try{
            const snap = recordUsage({ stage, model, usage, rateLimit });
            const extra = snap?.line ? ` | ${snap.line}` : "";
            dbg.log(`USAGE ${stage} (${model})${extra}`);
        } catch (e){
            dbg.log(`USAGE ${stage} (${model}): (meter error) ${e?.message || String(e)}`);
        }
    }

    // ---------- UI apply ----------
    function applyThemeToCSS(){
        document.documentElement.style.setProperty("--bg", state.theme.bg);
        document.documentElement.style.setProperty("--fg", state.theme.fg);
        document.documentElement.style.setProperty("--accent", state.theme.accent);
        render();
    }
    function applyScaleToCSS(){
        document.documentElement.style.setProperty("--scale", String(state.pixelScale));
        if (scaleVal) scaleVal.textContent = String(state.pixelScale);
        resizeCanvas();
    }
    function applyFx(){
        crtOverlay.classList.toggle("enabled", !!state.fx.crt);
    }

    // ---------- Agent: LongMemory ----------
    async function maybeUpdateLongMemory(cfg){
        if (!cfg.enableLongMemory) return;

        const ua = getAllUserAssistant(state.messages);
        const threshold = (cfg.historyTurns || 0) * 2 + (cfg.longMemoryDecayTurns || 8) * 2;
        if (ua.length <= threshold) return;

        const keep = Math.max(2, (cfg.historyTurns || 0) * 2);
        const cutoff = Math.max(0, ua.length - keep);

        const start = Math.max(0, state.longMem.lastSummarizedIndex || 0);
        const end = cutoff;
        if (end <= start) return;

        const chunk = ua.slice(start, end);
        dlog(cfg, `LongMemory: aggiorno OLD_CONTEXT (range ${start}..${end-1}, ${chunk.length} msg)`);

        const memorySystem = String(cfg.longMemoryPrompt || "").trim();
        if (!memorySystem){
            dlog(cfg, "LongMemory: prompt vuoto -> skip.");
            return;
        }

        const memoryMessages = [
            { role: "system", content: memorySystem },
            { role: "user", content: [
                    "OLD_CONTEXT attuale:",
                    state.longMem.oldContext || "(vuoto)",
                    "",
                    "Messaggi da assorbire:",
                    JSON.stringify(chunk, null, 2),
                    "",
                    "Scrivi il nuovo OLD_CONTEXT:"
                ].join("\n") }
        ];

        const payload = buildChatPayload({
            model: cfg.longMemoryModel,
            messages: memoryMessages,
            temperature: 0.2,
            top_p: 1,
            max_completion_tokens: 400,
            stream: false
        });

        const res = await groqChatOnce({ apiKey: cfg.apiKey, payload, signal: undefined });
        const newOld = (res?.content || "").trim();

        state.longMem.oldContext = newOld;
        state.longMem.lastSummarizedIndex = end;
        saveLongMemory(state.longMem);

        dlog(cfg, `LongMemory: OLD_CONTEXT aggiornato (${newOld.length} chars).`);
        const rl = res?.headers ? extractRateLimitFromHeaders(res.headers) : null;
        dlogUsage(cfg, "longmem", cfg.longMemoryModel, res?.usage, rl);
    }

    // ---------- Agent: Checkpointer ----------
    async function runCheckpointer(cfg, userText){
        if (!cfg.enableCheckpoint) return { light: "GREEN", reason: "disabled" };
        if (!cfg.checkpointUseModel) return { light: "GREEN", reason: "bypass" };

        dlog(cfg, `Checkpointer: valuto semaforo con modello "${cfg.checkpointModel}"...`);

        const uaRecent = takeLastTurnsForAPI(state.messages, Math.min(cfg.historyTurns || 8, 8));
        const preset = PROMPT_PRESETS[cfg.promptPreset] || PROMPT_PRESETS.console_default;
        const baseSystem = (cfg.systemPrompt || preset.system);
        const ctxSystem = withOldContext(baseSystem, state.longMem.oldContext);

        const cpSystem = String(cfg.checkpointPrompt || "").trim();
        if (!cpSystem){
            dlog(cfg, "Checkpointer: prompt vuoto -> bypass GREEN.");
            return { light: "GREEN", reason: "empty_prompt" };
        }

        const cpMessages = [
            { role: "system", content: cpSystem },
            { role: "user", content: [
                    "SYSTEM+OLD_CONTEXT (reference):",
                    ctxSystem,
                    "",
                    "CONVERSAZIONE RECENTE (user/assistant):",
                    JSON.stringify(uaRecent, null, 2),
                    "",
                    "NUOVO MESSAGGIO UTENTE:",
                    userText
                ].join("\n") }
        ];

        const payload = buildChatPayload({
            model: cfg.checkpointModel,
            messages: cpMessages,
            temperature: 0,
            top_p: 1,
            max_completion_tokens: 120,
            stream: false
        });

        const res = await groqChatOnce({ apiKey: cfg.apiKey, payload, signal: undefined });
        const raw = (res?.content || "").trim();

        const parsed = safeJsonParse(raw);
        const light = (parsed?.light || "").toUpperCase();

        const rl = res?.headers ? extractRateLimitFromHeaders(res.headers) : null;
        dlogUsage(cfg, "checkpointer", cfg.checkpointModel, res?.usage, rl);

        if (!["GREEN","ORANGE","RED"].includes(light)){
            dlog(cfg, `Checkpointer: parse fallito -> fallback GREEN. Raw="${raw.slice(0,120)}"`);
            return { light: "GREEN", reason: "parse_fail" };
        }

        dlog(cfg, `Checkpointer: semaforo=${light}${parsed?.reason ? " ("+parsed.reason+")" : ""}`);
        return { light, reason: parsed?.reason || "" };
    }

    function closeConversation(cfg, reason){
        state.checkpoint.closed = true;
        saveCheckpointState(state.checkpoint);
        dlog(cfg, `Conversazione chiusa. Motivo: ${reason}`);
    }

    // ---------- Export report ----------
    function escapeHtml(s){
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    function todayKey(){
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth()+1).padStart(2,"0");
        const dd = String(d.getDate()).padStart(2,"0");
        return `${yyyy}-${mm}-${dd}`;
    }

    function summarizeLedger(ledger){
        const day = todayKey();
        const snap = ledger?.[day] || null;
        if (!snap) return { day, hasData:false, totalCalls:0, totalTokens:0, byModelRows:[], byStageRows:[], topModel:null, lastRateLimitLine:"" };

        const byModel = snap.byModel || {};
        const byModelRows = Object.entries(byModel)
            .map(([model, m]) => ({
                model,
                calls: Number(m.calls || 0),
                tokens: Number(m.tokens || 0),
                lastRateLimitLine: m.lastRateLimitLine || "",
                byStage: m.byStage || {}
            }))
            .sort((a,b) => (b.tokens - a.tokens) || (b.calls - a.calls) || a.model.localeCompare(b.model));

        const stageAgg = {};
        for (const r of byModelRows){
            for (const [stage, st] of Object.entries(r.byStage || {})){
                if (!stageAgg[stage]) stageAgg[stage] = { stage, calls:0, tokens:0 };
                stageAgg[stage].calls += Number(st.calls || 0);
                stageAgg[stage].tokens += Number(st.tokens || 0);
            }
        }
        const byStageRows = Object.values(stageAgg).sort((a,b)=> (b.tokens-a.tokens) || (b.calls-a.calls) || a.stage.localeCompare(b.stage));

        const topModel = byModelRows[0]?.model || null;
        const lastRateLimitLine = byModelRows.find(r => r.lastRateLimitLine)?.lastRateLimitLine || "";

        return {
            day,
            hasData:true,
            totalCalls: Number(snap.total?.calls || 0),
            totalTokens: Number(snap.total?.tokens || 0),
            byModelRows,
            byStageRows,
            topModel,
            lastRateLimitLine
        };
    }

    function buildReportHtml({ cfg, state, debugLines, ledger }){
        const now = new Date();
        const title = `Groq 8-bit Report — ${now.toLocaleString()}`;

        // snapshot “pulito”
        const cfgSafe = { ...cfg, apiKey: cfg.apiKey ? "(hidden)" : "" };
        const checkpointState = { ...state.checkpoint };
        const longMemState = { ...state.longMem };

        const ledgerSummary = summarizeLedger(ledger || {});
        const msgs = (state.messages || []).map(m => ({
            role: m.role,
            text: String(m.text || ""),
            enteredAt: m.enteredAt
        }));

        const chatHtml = msgs.map(m => {
            const role = m.role || "system";
            const label = role === "user" ? "TU" : role === "assistant" ? "AI" : "SYS";
            const cls = role === "user" ? "user" : role === "assistant" ? "assistant" : "system";
            const time = (typeof m.enteredAt === "number") ? new Date(m.enteredAt).toLocaleTimeString() : "";
            return `
              <div class="bubble ${cls}">
                <div class="bubbleTop">
                  <span class="tag">${escapeHtml(label)}</span>
                  <span class="time">${escapeHtml(time)}</span>
                </div>
                <div class="bubbleBody">${escapeHtml(m.text)}</div>
              </div>
            `;
        }).join("\n");

        const byModelRowsHtml = ledgerSummary.byModelRows.map(r => `
          <tr>
            <td class="mono">${escapeHtml(r.model)}</td>
            <td class="num">${r.calls}</td>
            <td class="num">${r.tokens}</td>
            <td class="mono small">${escapeHtml(r.lastRateLimitLine || "")}</td>
          </tr>
        `).join("");

        const byStageRowsHtml = ledgerSummary.byStageRows.map(r => `
          <tr>
            <td class="mono">${escapeHtml(r.stage)}</td>
            <td class="num">${r.calls}</td>
            <td class="num">${r.tokens}</td>
          </tr>
        `).join("");

        const debugBlock = escapeHtml((debugLines || []).join("\n"));

        const jsonPretty = (obj) => escapeHtml(JSON.stringify(obj, null, 2));

        return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root{
    --bg:#0b1020;
    --panel:#121a33;
    --border:#2c3a66;
    --fg:#d6ffe0;
    --muted: rgba(255,255,255,.72);
    --accent:#ffd166;

    --sys: rgba(255,209,102,.15);
    --usr: rgba(255,209,102,.22);
    --ai: rgba(185,255,178,.12);
  }

  *{ box-sizing:border-box; }
  body{
    margin: 22px;
    background: radial-gradient(1200px 800px at 20% 10%, rgba(255,209,102,.10), transparent 60%),
                radial-gradient(900px 700px at 90% 20%, rgba(185,255,178,.08), transparent 55%),
                var(--bg);
    color: var(--fg);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
  }

  h1{ margin:0 0 8px 0; font-size: 18px; }
  h2{ margin:22px 0 10px 0; font-size: 14px; }
  .muted{ color: var(--muted); font-size: 12px; }

  .topbar{
    display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
    border: 2px solid var(--border);
    background: rgba(0,0,0,.18);
    padding: 12px;
    border-radius: 14px;
  }
  .btnRow{ display:flex; gap:10px; flex-wrap:wrap; }
  button,a.btn{
    border: 2px solid var(--border);
    background: rgba(0,0,0,.20);
    color: var(--fg);
    padding: 8px 10px;
    border-radius: 10px;
    cursor:pointer;
    text-decoration:none;
    font-family: inherit;
    font-size: 12px;
  }
  button:hover,a.btn:hover{ filter: brightness(1.08); }

  .grid{
    margin-top: 14px;
    display:grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .cards{
    display:grid;
    grid-template-columns: repeat(4, minmax(160px, 1fr));
    gap: 10px;
  }
  .card{
    border: 2px solid var(--border);
    background: rgba(0,0,0,.18);
    border-radius: 14px;
    padding: 10px;
    min-height: 72px;
  }
  .card .k{ font-size: 11px; color: var(--muted); }
  .card .v{ margin-top: 6px; font-size: 15px; font-weight: 700; }

  .panel{
    border: 2px solid var(--border);
    background: rgba(0,0,0,.18);
    border-radius: 14px;
    padding: 12px;
  }

  .chat{
    display:flex;
    flex-direction:column;
    gap: 10px;
  }
  .bubble{
    border: 2px solid var(--border);
    border-radius: 14px;
    padding: 10px;
    background: rgba(0,0,0,.14);
  }
  .bubble.system{ background: var(--sys); }
  .bubble.user{ background: var(--usr); align-self:flex-end; max-width: 92%; }
  .bubble.assistant{ background: var(--ai); align-self:flex-start; max-width: 92%; }

  .bubbleTop{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    margin-bottom: 6px;
    font-size: 11px;
    color: var(--muted);
  }
  .tag{
    display:inline-block;
    border: 2px solid var(--border);
    padding: 2px 6px;
    border-radius: 999px;
    color: var(--accent);
    background: rgba(0,0,0,.20);
  }
  .time{ opacity:.85; }

  .bubbleBody{
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.45;
    font-size: 12px;
    color: rgba(255,255,255,.88);
  }

  table{
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th,td{
    border-bottom: 1px solid rgba(255,255,255,.12);
    padding: 8px 6px;
    vertical-align: top;
  }
  th{ text-align:left; color: var(--muted); font-weight: 700; }
  .num{ text-align:right; }
  .mono{ font-family: inherit; }
  .small{ font-size: 11px; color: rgba(255,255,255,.72); }

  pre{
    margin:0;
    border: 2px solid var(--border);
    background: rgba(0,0,0,.22);
    border-radius: 14px;
    padding: 12px;
    overflow:auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 11px;
    line-height: 1.5;
  }

  details{
    border: 2px dashed rgba(255,255,255,.18);
    border-radius: 14px;
    padding: 10px;
    background: rgba(0,0,0,.10);
  }
  summary{ cursor:pointer; color: var(--muted); font-weight:700; }

  @media (max-width: 980px){
    .cards{ grid-template-columns: repeat(2, minmax(160px, 1fr)); }
  }

  @media print{
    body{ margin: 0.8cm; background: #fff !important; color: #000; }
    :root{ --bg:#fff; --fg:#000; --border:#000; --muted: rgba(0,0,0,.72); --accent:#000; }
    .topbar, .btnRow { display:none !important; }
    .panel, .bubble, pre, details, table { border-color:#000 !important; background:#fff !important; }
    .tag{ color:#000 !important; }
    .small, .muted{ color: rgba(0,0,0,.75) !important; }
    .bubbleBody{ color:#000 !important; }
  }
</style>
</head>
<body>

  <div class="topbar">
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div class="muted">Suggerimento: usa “Stampa” → “Salva come PDF”. L’HTML si può anche scaricare.</div>
    </div>
    <div class="btnRow">
      <button onclick="window.print()">Stampa / PDF</button>
      <a class="btn" href="#" onclick="downloadHtml(); return false;">Download HTML</a>
    </div>
  </div>

  <div class="grid">
    <section class="panel">
      <h2>OVERVIEW</h2>

      <div class="cards">
        <div class="card">
          <div class="k">Giorno</div>
          <div class="v">${escapeHtml(ledgerSummary.day)}</div>
        </div>
        <div class="card">
          <div class="k">Calls (oggi)</div>
          <div class="v">${ledgerSummary.totalCalls}</div>
        </div>
        <div class="card">
          <div class="k">Tokens (oggi)</div>
          <div class="v">${ledgerSummary.totalTokens}</div>
        </div>
        <div class="card">
          <div class="k">Top model</div>
          <div class="v">${escapeHtml(ledgerSummary.topModel || "-")}</div>
        </div>
      </div>

      <div style="margin-top:10px" class="muted">
        Ultimo rate-limit: <span class="mono">${escapeHtml(ledgerSummary.lastRateLimitLine || "-")}</span>
      </div>

      <div style="margin-top:14px">
        <h2 style="margin: 0 0 10px 0;">Sprechi / Usage breakdown</h2>
        <div class="muted" style="margin-bottom:8px">
          “Sprechi” qui = quanto ti costa ogni stage (main / checkpointer / longmem). Se lo stream non ritorna usage, vedrai tokens=0 ma calls>0.
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div>
            <div class="muted" style="margin-bottom:6px">Per modello</div>
            <table>
              <thead>
                <tr><th>Model</th><th class="num">Calls</th><th class="num">Tokens</th><th>Rate-limit</th></tr>
              </thead>
              <tbody>
                ${byModelRowsHtml || `<tr><td colspan="4" class="small">Nessun dato ledger per oggi.</td></tr>`}
              </tbody>
            </table>
          </div>

          <div>
            <div class="muted" style="margin-bottom:6px">Per stage</div>
            <table>
              <thead>
                <tr><th>Stage</th><th class="num">Calls</th><th class="num">Tokens</th></tr>
              </thead>
              <tbody>
                ${byStageRowsHtml || `<tr><td colspan="3" class="small">Nessun dato stage per oggi.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>1) CHAT (render)</h2>
      <div class="chat">
        ${chatHtml || `<div class="small">Chat vuota.</div>`}
      </div>

      <details style="margin-top:12px">
        <summary>Chat raw (JSON)</summary>
        <pre>${jsonPretty(msgs)}</pre>
      </details>
    </section>

    <section class="panel">
      <h2>2) DEBUG LOG</h2>
      <pre>${debugBlock || "(vuoto)"}</pre>
    </section>

    <section class="panel">
      <h2>3) STATE (LongMemory + Checkpoint)</h2>

      <div class="muted" style="margin-bottom:8px">Snapshot utile per ricostruire comportamenti e “reazioni” del tool.</div>

      <details open>
        <summary>Checkpoint state</summary>
        <pre>${jsonPretty(checkpointState)}</pre>
      </details>

      <details style="margin-top:10px">
        <summary>Long memory store</summary>
        <pre>${jsonPretty(longMemState)}</pre>
      </details>

      <details style="margin-top:10px">
        <summary>OLD_CONTEXT (testo)</summary>
        <pre>${escapeHtml(longMemState?.oldContext || "(vuoto)")}</pre>
      </details>
    </section>

    <section class="panel">
      <h2>4) CONFIG + PROMPTS</h2>

      <details open>
        <summary>Config (apiKey mascherata)</summary>
        <pre>${jsonPretty(cfgSafe)}</pre>
      </details>

      <details style="margin-top:10px">
        <summary>System prompt effettivo (con OLD_CONTEXT se presente)</summary>
        <pre>${escapeHtml(withOldContext((cfg.systemPrompt || ""), (longMemState?.oldContext || "") ))}</pre>
      </details>

      <details style="margin-top:10px">
        <summary>Prompts agent</summary>
        <pre>${escapeHtml([
            "=== longMemoryPrompt ===",
            (cfg.longMemoryPrompt || ""),
            "",
            "=== checkpointPrompt ===",
            (cfg.checkpointPrompt || "")
        ].join("\\n"))}</pre>
      </details>
    </section>

    <section class="panel">
      <h2>5) LEDGER raw (localStorage)</h2>
      <details open>
        <summary>Apri ledger completo</summary>
        <pre>${jsonPretty(ledger || {})}</pre>
      </details>
    </section>
  </div>

<script>
function downloadHtml(){
  const blob = new Blob([document.documentElement.outerHTML], {type:"text/html;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "groq8bit_report.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
</script>
</body>
</html>`;
    }

    function exportReport(){
        const cfg = loadConfig();
        const debugLines = dbg.getLines();
        const ledger = getUsageLedger();

        const html = buildReportHtml({ cfg, state, debugLines, ledger });
        const w = window.open("", "_blank");
        if (!w){
            alert("Popup bloccato: abilita pop-up per esportare il report.");
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
    }

    btnExport?.addEventListener("click", exportReport);

    // ---------- MAIN SEND ----------
    async function onSend(){
        const cfg = loadConfig();
        dbg.setEnabled(!!cfg.debugSteps);

        // visibilità sidebar = cfg.debugSteps (ma il collapse resta indipendente)
        debugSide.style.display = cfg.debugSteps ? "flex" : "none";

        if (state.checkpoint.closed){
            addMessage("assistant", cfg.redMessage || "Conversazione chiusa.");
            return;
        }

        const text = msgInput.value.trim();
        if (!text) return;

        addMessage("user", text);
        msgInput.value = "";

        if (!cfg.apiKey){
            addMessage("assistant", "⚠️ Inserisci la GROQ API KEY in Impostazioni.");
            return;
        }

        // 0) Checkpointer
        try{
            const cp = await runCheckpointer(cfg, text);

            if (cp.light === "RED"){
                addMessage("assistant", cfg.redMessage || "⛔ Fuori contesto. Chiudo.");
                closeConversation(cfg, "RED");
                return;
            }

            if (cp.light === "ORANGE"){
                state.checkpoint.orangeCount = (state.checkpoint.orangeCount || 0) + 1;
                saveCheckpointState(state.checkpoint);

                addMessage("assistant", cfg.orangeMessage || "⚠️ ARANCIONE: riformula e riprova a digitare.");

                if ((state.checkpoint.orangeCount || 0) >= (cfg.orangeLimit || 2)){
                    addMessage("assistant", cfg.redMessage || "⛔ Troppi ARANCIONE. Chiudo.");
                    closeConversation(cfg, `ORANGE x${state.checkpoint.orangeCount}`);
                }
                return;
            }
        } catch (e){
            dlog(cfg, `Checkpointer: errore -> continuo. ${e?.message || String(e)}`);
        }

        // 1) LongMemory update
        try{
            await maybeUpdateLongMemory(cfg);
        } catch (e){
            dlog(cfg, `LongMemory: errore aggiornamento (non blocco). ${e?.message || String(e)}`);
        }

        // 2) Main call
        const preset = PROMPT_PRESETS[cfg.promptPreset] || PROMPT_PRESETS.console_default;
        const baseSystem = (cfg.systemPrompt || preset.system);
        const systemWithMemory = withOldContext(baseSystem, state.longMem.oldContext);

        const history = takeLastTurnsForAPI(state.messages, cfg.historyTurns);
        const apiMessages = buildMessages({
            systemPrompt: systemWithMemory,
            preAssistant: cfg.preAssistant || preset.preAssistant,
            history
        });

        dlog(cfg, `Main: calling model="${cfg.model}" | historyTurns=${cfg.historyTurns} | OLD_CONTEXT=${(state.longMem.oldContext||"").length} chars`);

        const payload = buildChatPayload({
            model: cfg.model,
            messages: apiMessages,
            temperature: cfg.temperature,
            top_p: cfg.top_p,
            max_completion_tokens: cfg.max_completion_tokens,
            seed: cfg.seed,
            stop: cfg.stop,
            stream: cfg.stream
        });

        addMessage("assistant", cfg.stream ? "…" : "attendo…");
        state.pending = true;
        state.pendingDots = 0;
        statusChip.textContent = "attendo…";
        render();

        if (state.abortController) state.abortController.abort();
        state.abortController = new AbortController();

        try{
            if (cfg.stream){
                const res = await groqChatStream({
                    apiKey: cfg.apiKey,
                    payload,
                    signal: state.abortController.signal,
                    onToken: (_delta, cumulative) => updateLastAssistantText(cumulative || "…"),
                    onDone: (finalText) => updateLastAssistantText(finalText || "(vuoto)")
                });

                // se lo stream include usage, lo registriamo (altrimenti tok=0 e ti resta comunque calls)
                const rl = res?.headers ? extractRateLimitFromHeaders(res.headers) : null;
                dlogUsage(cfg, "main", cfg.model, res?.usage, rl);

            } else {
                const res = await groqChatOnce({
                    apiKey: cfg.apiKey,
                    payload,
                    signal: state.abortController.signal
                });
                updateLastAssistantText(res?.content || "(vuoto)");

                const rl = res?.headers ? extractRateLimitFromHeaders(res.headers) : null;
                dlogUsage(cfg, "main", cfg.model, res?.usage, rl);
            }
        } catch (err){
            updateLastAssistantText("Errore API: " + (err?.message || String(err)));
            dlog(cfg, "Main: errore API (vedi console).");
        } finally {
            state.pending = false;
            statusChip.textContent = "pronto";
            render();
        }
    }

    // typing dots
    setInterval(() => {
        if (!state.pending) return;
        state.pendingDots = (state.pendingDots + 1) % 3;
        render();
    }, 320);

    // ---------- Settings bind ----------
    bindSettingsModal({
        btnSettings,
        settingsBackdrop,
        btnCloseSettings,
        onSaved: (cfg) => {
            if (!cfg.systemPrompt){
                cfg.systemPrompt = PROMPT_PRESETS[cfg.promptPreset]?.system || PROMPT_PRESETS.console_default.system;
                saveConfig(cfg);
            }
            dbg.setEnabled(!!cfg.debugSteps);

            // visibilità sidebar = cfg.debugSteps
            debugSide.style.display = cfg.debugSteps ? "flex" : "none";

            dlog(cfg, "Impostazioni salvate.");
        },
        onResetLongMemory: () => {
            resetLongMemory();
            state.longMem = loadLongMemory();
            const cfg = loadConfig();
            dlog(cfg, "OLD_CONTEXT resettato.");
        },
        onResetCheckpoint: () => {
            resetCheckpointState();
            state.checkpoint = loadCheckpointState();
            const cfg = loadConfig();
            dlog(cfg, "Checkpointer state resettato.");
        }
    });

    // ---------- UI events ----------
    btnSend.addEventListener("click", onSend);
    msgInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            onSend();
        }
    });

    bgColor.addEventListener("input", () => { state.theme.bg = bgColor.value; applyThemeToCSS(); });
    fgColor.addEventListener("input", () => { state.theme.fg = fgColor.value; applyThemeToCSS(); });
    accentColor.addEventListener("input", () => { state.theme.accent = accentColor.value; applyThemeToCSS(); });

    scaleRange.addEventListener("input", () => {
        state.pixelScale = Number(scaleRange.value);
        applyScaleToCSS();
    });

    toggleCRT.addEventListener("change", () => { state.fx.crt = toggleCRT.checked; applyFx(); });
    toggleSFX.addEventListener("change", () => { state.fx.sfx = toggleSFX.checked; });
    toggleBoot.addEventListener("change", () => { state.fx.boot = toggleBoot.checked; });

    btnClear.addEventListener("click", () => {
        state.messages = [{ role:"system", text:"Chat pulita.", enteredAt: performance.now() }];
        state.scrollY = 0;
        render();
        const cfg = loadConfig();
        dlog(cfg, "Chat pulita.");
    });

    btnDemo.addEventListener("click", () => {
        const cfg = loadConfig();
        dlog(cfg, "Demo: pipeline agent (checkpointer -> longmem -> main).");
        addMessage("assistant", "Ciao! Prova a scrivere una richiesta. Debug è nella sidebar a destra (collassabile).");
    });

    // ---------- Init ----------
    function init(){
        const cfg = loadConfig();

        bgColor.value = state.theme.bg;
        fgColor.value = state.theme.fg;
        accentColor.value = state.theme.accent;

        scaleRange.value = String(state.pixelScale);
        if (scaleVal) scaleVal.textContent = String(state.pixelScale);

        toggleCRT.checked = state.fx.crt;
        toggleSFX.checked = state.fx.sfx;
        toggleBoot.checked = state.fx.boot;

        applyFx();
        resizeCanvas();

        state.messages = [
            { role:"system", text:"Playground pronto. Apri Impostazioni per attivare LongMemory/Checkpointer.", enteredAt: performance.now() },
            { role:"assistant", text:"Tip: Debug è nella sidebar a destra (collassabile).", enteredAt: performance.now() + 20 }
        ];

        statusChip.textContent = "pronto";
        render();

        dbg.setEnabled(!!cfg.debugSteps);
        debugSide.style.display = cfg.debugSteps ? "flex" : "none";

        dlog(cfg, "Init OK.");
    }

    (document.fonts?.ready ? document.fonts.ready : Promise.resolve()).then(init).catch(init);
});